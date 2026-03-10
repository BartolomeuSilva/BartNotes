Global Typography Upgrade (16px)
The user thinks the font is too small and requested a global increase to 16px.

Proposed Changes
[MODIFY] 
index.css
Update global and component-specific font sizes.

Global Body:
Change font-size: 15px to font-size: 16px.
UI Elements:
.btn: Increase from 13px to 14px.
.note-item p:
Title: Increase from 13px to 15px.
Preview: Increase from 12px to 14px.
.toast: Increase from 13px to 14px.
.markdown-preview p: Will inherit the base 16px.
.editor-textarea: Is already 16px, but I will check if any adjustments are needed.
Refinement: Ensure line heights and spacing remain balanced with the larger text.
Verification Plan
Manual Verification
Verify the main text body in notes.
Check the sidebar and note list labels.
Ensure buttons and tooltips remain legible and don't overflow.

