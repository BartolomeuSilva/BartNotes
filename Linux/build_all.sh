#!/bin/bash
cd /home/bfsilva/Documentos/BartNotes/Linux

# 1. Build AppImage
/tmp/appimagetool --appimage-extract-and-run AppDir BartNotes_1.0.0_amd64.AppImage

# 2. Build Deb
bash build_deb.sh

# 3. Build RPM
bash build_rpm.sh
