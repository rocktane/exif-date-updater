# EXIF Date Updater

Restore file dates (creation + modification) from EXIF metadata after Lightroom Classic exports.

Two tools:

- **Tinycast / Raycast extension** — interactive, with preview before applying
- **Shell script** — for automation / Lightroom post-export

## Tinycast / Raycast Extension

### Install in Tinycast

```bash
npm install
npx ray build -e dist -o dist
```

Then, in Tinycast: **Settings → Extensions → Install → Add from folder**, and choose `dist`.
Install again the same way after each change.

### Install in Raycast

```bash
npm install
npm run dev
```

### Usage

1. Select files or folders in Finder
2. Launch "Update File Dates from EXIF"
3. Review the list (green = will update, grey = already correct, yellow = no EXIF)
4. Press Enter to apply

## Shell Script

### Prerequisites

```bash
brew install exiftool
```

### Usage

```bash
./scripts/fix-dates.sh photo.jpg
./scripts/fix-dates.sh ~/Photos/Export/
```

## Lightroom Classic Post-Export Action

To automatically fix dates after every Lightroom export:

### 1. Install the Export Action

On macOS, Lightroom only runs applications after an export, so this wraps the script in a droplet:

```bash
./scripts/install-lightroom-action.sh
```

The droplet keeps its own copy of the script: run this again after changing `fix-dates.sh`.

### 2. Configure in Lightroom

1. Open Export dialog
2. Scroll to **Post-Processing**
3. In "After Export", select **Fix EXIF Dates** (restart Lightroom if it isn't listed)
4. Save the settings as an export preset to keep them

Every export will now automatically restore the original capture dates.

## Supported Formats

JPEG, HEIC/HEIF, TIFF, PNG, DNG, CR2, CR3, NEF, ARW, ORF, RW2, RAF, MOV, MP4

## Date Detection Strategy

Checks multiple EXIF/QuickTime fields and uses the **earliest** date found:

- `DateTimeOriginal` (EXIF standard)
- `CreateDate` (EXIF)
- `DateTimeDigitized` (EXIF)
- `MediaCreateDate` (QuickTime)
- `GPSDateStamp` (GPS)
