import { utimesSync } from "fs";
import { execFileSync } from "child_process";

/**
 * Sets both the modification date (utime) and creation date (birthtime via SetFile) of a file.
 */
export function setFileDates(filePath: string, date: Date): void {
  // Set modification and access times via Node.js
  utimesSync(filePath, date, date);

  // Set creation date (birthtime) via macOS SetFile command
  // Format: "MM/DD/YYYY HH:MM:SS"
  const formatted = formatSetFileDate(date);
  execFileSync("/usr/bin/SetFile", ["-d", formatted, filePath]);
}

function formatSetFileDate(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}
