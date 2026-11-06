import {
  List,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
  getSelectedFinderItems,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { statSync } from "fs";
import { basename } from "path";
import { FileInfo, DATE_TOLERANCE_SECONDS } from "./lib/types";
import { getExifDate } from "./lib/exif";
import { setFileDates } from "./lib/dates";
import { collectFiles } from "./lib/files";

type Phase = "scanning" | "ready" | "applying" | "done";

export default function Command() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [phase, setPhase] = useState<Phase>("scanning");

  // Phase 1 — Scan
  useEffect(() => {
    (async () => {
      try {
        const items = await getSelectedFinderItems();
        if (items.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No Finder selection",
            message: "Select files or folders in Finder first",
          });
          return;
        }

        const paths = items.map((item) => item.path);
        const filePaths = collectFiles(paths);

        if (filePaths.length === 0) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No supported files found",
          });
          return;
        }

        const results: FileInfo[] = [];

        for (const filePath of filePaths) {
          const stat = statSync(filePath);
          const exifResult = await getExifDate(filePath);

          let status: FileInfo["status"];
          if (!exifResult) {
            status = "skipped_no_exif";
          } else if (
            Math.abs(stat.mtimeMs - exifResult.date.getTime()) <
            DATE_TOLERANCE_SECONDS * 1000
          ) {
            status = "skipped_same";
          } else {
            status = "pending";
          }

          results.push({
            path: filePath,
            name: basename(filePath),
            currentDate: stat.mtime,
            exifDate: exifResult?.date ?? null,
            exifSource: exifResult?.source ?? null,
            status,
          });
        }

        setFiles(results);
        setPhase("ready");
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: String(error),
        });
      }
    })();
  }, []);

  // Phase 3 — Apply
  const applyDates = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) {
      await showToast({
        style: Toast.Style.Animated,
        title: "Nothing to update",
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: `Update ${pendingFiles.length} file${pendingFiles.length > 1 ? "s" : ""}?`,
      message:
        "File creation and modification dates will be set to their EXIF dates.",
      primaryAction: { title: "Apply", style: Alert.ActionStyle.Default },
    });

    if (!confirmed) return;

    setPhase("applying");
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Updating dates…",
      message: `0 / ${pendingFiles.length}`,
    });

    const updated = [...files];
    let doneCount = 0;

    for (const file of updated) {
      if (file.status !== "pending" || !file.exifDate) continue;

      try {
        setFileDates(file.path, file.exifDate);
        file.status = "updated";
      } catch (err) {
        file.status = "error";
        file.error = String(err);
      }

      doneCount++;
      toast.message = `${doneCount} / ${pendingFiles.length}`;
    }

    setFiles([...updated]);
    setPhase("done");

    const errorCount = updated.filter((f) => f.status === "error").length;
    const successCount = updated.filter((f) => f.status === "updated").length;

    if (errorCount > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Done with errors",
        message: `${successCount} updated, ${errorCount} failed`,
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "Done!",
        message: `${successCount} file${successCount > 1 ? "s" : ""} updated`,
      });
    }
  }, [files]);

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const skippedCount = files.filter(
    (f) => f.status === "skipped_no_exif" || f.status === "skipped_same",
  ).length;
  const updatedCount = files.filter((f) => f.status === "updated").length;

  const navigationTitle =
    phase === "scanning"
      ? "Scanning…"
      : phase === "applying"
        ? "Applying…"
        : phase === "done"
          ? `Done — ${updatedCount} updated`
          : `${pendingCount} to update${skippedCount > 0 ? ` (${skippedCount} skipped)` : ""}`;

  return (
    <List
      isLoading={phase === "scanning" || phase === "applying"}
      navigationTitle={navigationTitle}
    >
      {files.map((file) => (
        <List.Item
          key={file.path}
          icon={getIcon(file)}
          title={file.name}
          subtitle={getSubtitle(file)}
          accessories={getAccessories(file)}
          actions={
            phase === "ready" && pendingCount > 0 ? (
              <ActionPanel>
                <Action
                  title="Apply All"
                  icon={Icon.CheckCircle}
                  onAction={applyDates}
                />
              </ActionPanel>
            ) : undefined
          }
        />
      ))}
    </List>
  );
}

function getIcon(file: FileInfo): { source: Icon; tintColor: Color } {
  switch (file.status) {
    case "pending":
      return { source: Icon.Clock, tintColor: Color.Green };
    case "skipped_no_exif":
      return { source: Icon.QuestionMarkCircle, tintColor: Color.Yellow };
    case "skipped_same":
      return { source: Icon.CheckCircle, tintColor: Color.SecondaryText };
    case "updated":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "error":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

function getSubtitle(file: FileInfo): string {
  switch (file.status) {
    case "pending":
      return `${formatDate(file.currentDate)} → ${formatDate(file.exifDate!)}`;
    case "skipped_no_exif":
      return "No EXIF date found";
    case "skipped_same":
      return "Already correct";
    case "updated":
      return `Updated to ${formatDate(file.exifDate!)}`;
    case "error":
      return `Error: ${file.error}`;
  }
}

function getAccessories(file: FileInfo): List.Item.Accessory[] {
  if (file.exifSource) {
    return [{ text: file.exifSource, tooltip: `Date from ${file.exifSource}` }];
  }
  return [];
}

function formatDate(date: Date): string {
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
