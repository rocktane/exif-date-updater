import exifr from "exifr";
import { closeSync, openSync, readSync } from "fs";

const HEAD_BYTES = 1024 * 1024;

/** EXIF/QuickTime date fields to check, in no particular order — we take the earliest */
const DATE_FIELDS = [
  "DateTimeOriginal",
  "CreateDate",
  "DateTimeDigitized",
  "MediaCreateDate",
  "GPSDateStamp",
] as const;

interface ExifDateResult {
  date: Date;
  source: string;
}

/**
 * Reads multiple EXIF/QuickTime date fields and returns the earliest valid date.
 */
export async function getExifDate(
  filePath: string,
): Promise<ExifDateResult | null> {
  try {
    const tags = await exifr.parse(readFileHead(filePath), {
      pick: [...DATE_FIELDS],
      tiff: true,
      exif: true,
      gps: true,
      icc: false,
      iptc: false,
      xmp: true,
      jfif: false,
      ihdr: false,
    } as Parameters<typeof exifr.parse>[1]);

    if (!tags) return null;

    let earliest: ExifDateResult | null = null;

    for (const field of DATE_FIELDS) {
      const value = tags[field];
      if (!value) continue;

      const date = value instanceof Date ? value : new Date(value);
      if (isNaN(date.getTime())) continue;

      if (!earliest || date.getTime() < earliest.date.getTime()) {
        earliest = { date, source: field };
      }
    }

    return earliest;
  } catch (error) {
    console.error(`Could not read EXIF from ${filePath}:`, error);
    return null;
  }
}

/**
 * exifr opens paths with fs.promises.open, which Tinycast does not provide, so
 * it gets the bytes instead. EXIF sits near the start of the file, and reading
 * only the head avoids loading a whole video or large RAW into memory.
 */
function readFileHead(filePath: string): Buffer {
  const fd = openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const bytesRead = readSync(fd, buffer, 0, HEAD_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    closeSync(fd);
  }
}
