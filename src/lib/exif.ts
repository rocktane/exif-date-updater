import exifr from "exifr";

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
export async function getExifDate(filePath: string): Promise<ExifDateResult | null> {
  try {
    const tags = await exifr.parse(filePath, {
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
  } catch {
    return null;
  }
}
