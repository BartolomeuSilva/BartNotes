#!/bin/bash
cd /home/bfsilva/Documentos/BartNotes/Linux

# Create pkg structure
mkdir -p pkg/opt/bartnotes
mkdir -p pkg/usr/bin
mkdir -p pkg/usr/share/applications
mkdir -p pkg/usr/share/icons/hicolor/512x512/apps

# Copy files
cp -r AppDir/* pkg/opt/bartnotes/
cp AppDir/bartnotes.png pkg/usr/share/icons/hicolor/512x512/apps/

# Fix .desktop for system-wide install and copy
sed 's/^Exec=AppRun/Exec=\/opt\/bartnotes\/AppRun/' AppDir/bartnotes.desktop > pkg/usr/share/applications/bartnotes.desktop

# Create symlink
ln -s /opt/bartnotes/AppRun pkg/usr/bin/bartnotes

# Build DEB
fpm -s dir -t deb -n "bartnotes" -v 1.0.0 --architecture amd64 -C pkg .
mv bartnotes_1.0.0_amd64.deb BartNotes_1.0.0_amd64.deb

# Build RPM
fpm -s dir -t rpm -n "bartnotes" -v 1.0.0 --architecture x86_64 -C pkg .
mv bartnotes-1.0.0-1.x86_64.rpm BartNotes-1.0.0-1.x86_64.rpm

# Build AppImage
wget -q "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage" -O /tmp/appimagetool
chmod +x /tmp/appimagetool
/tmp/appimagetool AppDir BartNotes_1.0.0_amd64.AppImage

# Cleanup
rm -rf pkg
