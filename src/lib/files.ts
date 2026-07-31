import { readdirSync, statSync } from "fs";
import { extname, join } from "path";
import { SUPPORTED_EXTENSIONS } from "./types";

/**
 * Given a list of paths (files or directories), returns all supported image/video files.
 * Directories are scanned recursively.
 */
export function collectFiles(paths: string[]): string[] {
  const result: string[] = [];

  for (const p of paths) {
    const stat = statSync(p, { throwIfNoEntry: false });
    if (!stat) continue;

    if (stat.isDirectory()) {
      scanDirectory(p, result);
    } else if (isSupportedFile(p)) {
      result.push(p);
    }
  }

  return result.sort();
}

function scanDirectory(dir: string, result: string[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, result);
    } else if (isSupportedFile(entry.name)) {
      result.push(fullPath);
    }
  }
}

function isSupportedFile(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(extname(filePath).toLowerCase());
}
