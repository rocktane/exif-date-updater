#!/bin/bash
#
# install-lightroom-action.sh — Install fix-dates.sh as a Lightroom Classic export action
#
# Usage: ./install-lightroom-action.sh [export_actions_dir]
#
# On macOS, Lightroom only runs applications after an export, so this wraps the
# script in a droplet. The droplet keeps its own copy of fix-dates.sh: run this
# again after changing the script.

set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
dest="${1:-$HOME/Library/Application Support/Adobe/Lightroom/Export Actions}"
app="$dest/Fix EXIF Dates.app"

mkdir -p "$dest"
[ -e "$app" ] && mv "$app" "$(mktemp -d)/"

osacompile -o "$app" <<'APPLESCRIPT'
on open theItems
	set command to quoted form of (POSIX path of (path to me) & "Contents/Resources/fix-dates.sh")
	repeat with theItem in theItems
		set command to command & " " & quoted form of POSIX path of theItem
	end repeat
	do shell script command
end open
APPLESCRIPT

cp "$script_dir/fix-dates.sh" "$app/Contents/Resources/fix-dates.sh"
chmod +x "$app/Contents/Resources/fix-dates.sh"

# Adding a file breaks the signature made by osacompile.
codesign --force --sign - "$app"

echo "Installed: $app"
