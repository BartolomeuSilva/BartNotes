#!/bin/bash
cd /home/bfsilva/Documentos/BartNotes/Linux

# Setup folders for deb
rm -rf deb-pkg control.tar.gz data.tar.gz debian-binary
mkdir -p deb-pkg/usr/bin deb-pkg/opt/bartnotes deb-pkg/usr/share/applications deb-pkg/usr/share/icons/hicolor/512x512/apps

# Copy files
cp -r AppDir/* deb-pkg/opt/bartnotes/
cp AppDir/bartnotes.png deb-pkg/usr/share/icons/hicolor/512x512/apps/
cp AppDir/bartnotes.desktop deb-pkg/usr/share/applications/
sed -i 's/^Exec=.*/Exec=\/opt\/bartnotes\/AppRun/' deb-pkg/usr/share/applications/bartnotes.desktop
sed -i 's/^Icon=.*/Icon=\/opt\/bartnotes\/bartnotes.png/' deb-pkg/usr/share/applications/bartnotes.desktop
ln -s /opt/bartnotes/AppRun deb-pkg/usr/bin/bartnotes

mkdir -p deb-pkg/DEBIAN
cat <<EOF > deb-pkg/DEBIAN/control
Package: bartnotes
Version: 1.0.0
Architecture: amd64
Maintainer: Bartolomeusilva
Description: BartNotes App
EOF

# Build Deb using tar and ar
cd deb-pkg
tar -czf ../data.tar.gz usr opt
cd DEBIAN
tar -czf ../../control.tar.gz control
cd ../..
echo "2.0" > debian-binary
ar rc BartNotes_1.0.0_amd64.deb debian-binary control.tar.gz data.tar.gz

rm -rf deb-pkg control.tar.gz data.tar.gz debian-binary
