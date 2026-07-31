export interface FileInfo {
  path: string;
  name: string;
  /** Current file modification date */
  currentDate: Date;
  /** Earliest EXIF date found, if any */
  exifDate: Date | null;
  /** Which EXIF field the date was sourced from */
  exifSource: string | null;
  /** Status of the file */
  status: "pending" | "skipped_no_exif" | "skipped_same" | "updated" | "error";
  /** Error message if status is "error" */
  error?: string;
}

export const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".heic",
  ".heif",
  ".tiff",
  ".tif",
  ".png",
  ".dng",
  ".cr2",
  ".cr3",
  ".nef",
  ".arw",
  ".orf",
  ".rw2",
  ".raf",
  ".mov",
  ".mp4",
]);

/** Tolerance in seconds — if dates differ by less than this, consider them the same */
export const DATE_TOLERANCE_SECONDS = 2;
