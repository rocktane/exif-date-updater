#!/bin/bash
#
# fix-dates.sh — Restore file dates from EXIF metadata
#
# Usage: ./fix-dates.sh <file_or_directory> [file_or_directory ...]
#
# Requires: exiftool (brew install exiftool)
#
# Designed for use as a Lightroom Classic post-export action (via Automator droplet).

set -euo pipefail

if ! command -v exiftool &>/dev/null; then
  echo "Error: exiftool is required. Install with: brew install exiftool" >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file_or_directory> [file_or_directory ...]" >&2
  exit 1
fi

SUPPORTED_EXT='jpg|jpeg|heic|heif|tiff|tif|png|dng|cr2|cr3|nef|arw|orf|rw2|raf|mov|mp4'

updated=0
skipped=0
errors=0

process_file() {
  local file="$1"

  # Check extension
  local ext="${file##*.}"
  ext=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  if ! echo "$ext" | grep -qE "^($SUPPORTED_EXT)$"; then
    return
  fi

  # Read all date fields and find the earliest
  local earliest_ts=""
  local earliest_src=""

  for tag in DateTimeOriginal CreateDate DateTimeDigitized MediaCreateDate GPSDateStamp; do
    local val
    val=$(exiftool -s3 -d '%s' -"$tag" "$file" 2>/dev/null) || continue
    if [ -z "$val" ] || [ "$val" = "0000:00:00 00:00:00" ]; then
      continue
    fi

    # exiftool with -d '%s' gives epoch seconds
    if [ -z "$earliest_ts" ] || [ "$val" -lt "$earliest_ts" ] 2>/dev/null; then
      earliest_ts="$val"
      earliest_src="$tag"
    fi
  done

  if [ -z "$earliest_ts" ]; then
    echo "SKIP (no EXIF date): $file"
    ((skipped++)) || true
    return
  fi

  # Format for touch: [[CC]YY]MMDDhhmm[.ss]
  local touch_date
  touch_date=$(date -r "$earliest_ts" '+%Y%m%d%H%M.%S')

  # Format for SetFile: "MM/DD/YYYY HH:MM:SS"
  local setfile_date
  setfile_date=$(date -r "$earliest_ts" '+%m/%d/%Y %H:%M:%S')

  # Apply dates
  touch -t "$touch_date" "$file"
  /usr/bin/SetFile -d "$setfile_date" "$file" 2>/dev/null || true

  echo "OK ($earliest_src): $file"
  ((updated++)) || true
}

# Process all arguments (files and directories)
for arg in "$@"; do
  if [ -d "$arg" ]; then
    while IFS= read -r -d '' file; do
      process_file "$file"
    done < <(find "$arg" -type f -print0)
  elif [ -f "$arg" ]; then
    process_file "$arg"
  else
    echo "WARN: not found: $arg" >&2
  fi
done

echo ""
echo "Done: $updated updated, $skipped skipped, $errors errors"
