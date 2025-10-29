#!/usr/bin/env bash
# תיקון אוטומטי לקובץ .ass כך שיכלול סגנון ברירת מחדל נקי
# שימוש: ./fix_ass_style.sh /tmp/rec_hpuxpeig.ass

ASS_FILE="$1"
if [[ ! -f "$ASS_FILE" ]]; then
  echo "❌ לא נמצא קובץ: $ASS_FILE"
  exit 1
fi

# מחיקה של שורות [V4+ Styles] ישנות (אם קיימות) ויצירה מחדש
awk '
BEGIN {found_styles=0}
{
  if ($0 ~ /^\[V4\+ Styles\]/) {
    found_styles=1
    print "[V4+ Styles]"
    print "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"
    print "Style: Default,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
    next
  }
  if ($0 ~ /^\[Events\]/) {
    if (!found_styles) {
      print "[V4+ Styles]"
      print "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"
      print "Style: Default,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
      print ""
    }
    found_styles=0
  }
  print
}' "$ASS_FILE" > "${ASS_FILE}.fixed" && mv "${ASS_FILE}.fixed" "$ASS_FILE"

echo "✅ עודכן הסגנון בקובץ $ASS_FILE"
