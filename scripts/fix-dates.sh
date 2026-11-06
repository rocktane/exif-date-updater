#!/bin/bash
#
# fix-dates.sh — Restore file dates from EXIF metadata
#
# Usage: ./fix-dates.sh <file_or_directory> [file_or_directory ...]
#
# Requires: exiftool (brew install exiftool)
#
# Designed for use as a Lightroom Classic post-export action (see install-lightroom-action.sh).

set -euo pipefail

# Apps launched by macOS, like Lightroom, don't get the terminal's PATH.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

if ! command -v exiftool &>/dev/null; then
  echo "Error: exiftool is required. Install with: brew install exiftool" >&2
  exit 1
fi

if [ $# -eq 0 ]; then
  echo "Usage: $0 <file_or_directory> [file_or_directory ...]" >&2
  exit 1
fi

updated=0
skipped=0
errors=0

paths=()
for arg in "$@"; do
  if [ -e "$arg" ]; then
    paths+=("$arg")
  else
    echo "WARN: not found: $arg" >&2
  fi
done

apply_dates() {
  local file="$1"
  shift

  # Each remaining argument is Tag=Value; keep the earliest date
  local earliest_ts=""
  local earliest_src=""
  local entry val
  for entry in "$@"; do
    val="${entry#*=}"
    # exiftool with -d '%s' gives epoch seconds, except for values it can't
    # convert, like a date without a time (GPSDateStamp) or an empty date
    if ! [[ "$val" =~ ^-?[0-9]+$ ]]; then
      continue
    fi

    if [ -z "$earliest_ts" ] || [ "$val" -lt "$earliest_ts" ]; then
      earliest_ts="$val"
      earliest_src="${entry%%=*}"
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

if [ ${#paths[@]} -gt 0 ]; then
  # One exiftool process for the whole batch: starting it costs far more than
  # reading a file. The path comes last, so it may contain the separator.
  while IFS='|' read -r original create digitized media gps file; do
    apply_dates "$file" \
      "DateTimeOriginal=$original" \
      "CreateDate=$create" \
      "DateTimeDigitized=$digitized" \
      "MediaCreateDate=$media" \
      "GPSDateStamp=$gps"
  done < <(exiftool -r -m -q -q -i HIDDEN -d '%s' \
    -ext jpg -ext jpeg -ext heic -ext heif -ext tiff -ext tif -ext png -ext dng \
    -ext cr2 -ext cr3 -ext nef -ext arw -ext orf -ext rw2 -ext raf -ext mov -ext mp4 \
    -p '$DateTimeOriginal|$CreateDate|$DateTimeDigitized|$MediaCreateDate|$GPSDateStamp|$Directory/$FileName' \
    "${paths[@]}")
fi

echo ""
echo "Done: $updated updated, $skipped skipped, $errors errors"
