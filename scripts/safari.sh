#!/bin/sh
# npm run safari (on a Mac with Xcode): builds the Safari Web Extension into
# dist/safari-extension/ and wraps it in an Xcode project in safari/ (an iPhone
# app and a Mac app, each carrying the extension), then opens it. The project
# points at dist/safari-extension/, so after a change `npm run extension` and
# Run in Xcode is enough; run this again only to start the project over.
#
# safari/ stays out of git: Xcode writes your Apple team into it.
# BUNDLE_ID picks the app's bundle identifier (default: one made from your Mac
# user name, unique enough for a free Apple ID).
set -eu
cd "$(dirname "$0")/.."

if ! xcrun --find safari-web-extension-packager >/dev/null 2>&1 && ! xcrun --find safari-web-extension-converter >/dev/null 2>&1; then
  echo "safari: needs Xcode (from the Mac App Store), opened once so it finishes installing" >&2
  exit 1
fi

npm run extension

ID="${BUNDLE_ID:-local.$(id -un | tr -cd 'A-Za-z0-9').reddit-restyle}"
TOOL=safari-web-extension-packager
xcrun --find "$TOOL" >/dev/null 2>&1 || TOOL=safari-web-extension-converter

xcrun "$TOOL" dist/safari-extension \
  --project-location safari \
  --app-name "Reddit Restyle" \
  --bundle-identifier "$ID" \
  --swift --no-open --force

# The iPhone runs iOS 16: Xcode otherwise targets the newest iOS, and the app won't install
find safari -name project.pbxproj -exec sed -i '' 's/IPHONEOS_DEPLOYMENT_TARGET = [0-9.]*;/IPHONEOS_DEPLOYMENT_TARGET = 16.0;/' {} +

echo "safari: project in safari/ (bundle id $ID). Opening Xcode."
open safari/*/*.xcodeproj 2>/dev/null || open safari/*.xcodeproj
