#!/bin/bash
cd /home/bfsilva/Documentos/BartNotes/Linux

# Create RPM build directories
mkdir -p rpmbuild/{BUILD,BUILDROOT,RPMS,SOURCES,SPECS,SRPMS}
RPM_BUILD_DIR=$(pwd)/rpmbuild

# Copy AppDir to SOURCES so rpmbuild can find it during %install
cp -r AppDir $RPM_BUILD_DIR/SOURCES/

# Create SPEC file
cat <<EOF > "$RPM_BUILD_DIR/SPECS/bartnotes.spec"
Name:           bartnotes
Version:        1.0.0
Release:        1
Summary:        BartNotes App

License:        MIT
URL:            https://github.com/BartolomeuSilva
AutoReqProv: no

%description
BartNotes Linux application.

%install
mkdir -p %{buildroot}/opt/bartnotes
mkdir -p %{buildroot}/usr/bin
mkdir -p %{buildroot}/usr/share/applications
mkdir -p %{buildroot}/usr/share/icons/hicolor/512x512/apps

cp -r %{_topdir}/SOURCES/AppDir/* %{buildroot}/opt/bartnotes/
cp %{_topdir}/SOURCES/AppDir/bartnotes.png %{buildroot}/usr/share/icons/hicolor/512x512/apps/
cp %{_topdir}/SOURCES/AppDir/bartnotes.desktop %{buildroot}/usr/share/applications/
sed -i 's/^Exec=.*/Exec=\/opt\/bartnotes\/AppRun/' %{buildroot}/usr/share/applications/bartnotes.desktop
sed -i 's/^Icon=.*/Icon=\/opt\/bartnotes\/bartnotes.png/' %{buildroot}/usr/share/applications/bartnotes.desktop
ln -s /opt/bartnotes/AppRun %{buildroot}/usr/bin/bartnotes

%files
/opt/bartnotes/
/usr/bin/bartnotes
/usr/share/applications/bartnotes.desktop
/usr/share/icons/hicolor/512x512/apps/bartnotes.png
EOF

# Build RPM
rpmbuild -bb --define "_topdir $RPM_BUILD_DIR" "$RPM_BUILD_DIR/SPECS/bartnotes.spec"

# Copy output
find rpmbuild/RPMS -name "*.rpm" -exec cp {} ./BartNotes-1.0.0-1.x86_64.rpm \;
rm -rf rpmbuild
