# EXIF Date Updater

Restore file dates (creation + modification) from EXIF metadata after Lightroom Classic exports.

Two tools:
- **Raycast extension** — interactive, with preview before applying
- **Shell script** — for automation / Lightroom post-export

## Raycast Extension

### Install

```bash
npm install
npm run dev
```

### Usage

1. Select files or folders in Finder
2. Launch "Update File Dates from EXIF" in Raycast
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

### 1. Create an Automator Application

1. Open **Automator** → **New Document** → **Application**
2. Add action: **Run Shell Script**
3. Set "Pass input" to **as arguments**
4. Paste:
   ```bash
   /path/to/raycast-exif-updater/scripts/fix-dates.sh "$@"
   ```
   (replace `/path/to` with the actual path)
5. Save as `Fix EXIF Dates.app`

### 2. Install as Export Action

Move or symlink the `.app` into Lightroom's export actions folder:

```bash
ln -s "/path/to/Fix EXIF Dates.app" \
  ~/Library/Application\ Support/Adobe/Lightroom/Export\ Actions/
```

### 3. Configure in Lightroom

1. Open Export dialog
2. Scroll to **Post-Processing**
3. In "After Export", select **Fix EXIF Dates**

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
