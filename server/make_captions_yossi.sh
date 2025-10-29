#!/usr/bin/env bash
set -euo pipefail

# ========= Helper: print usage =========
usage() {
  cat <<USG
Usage:
  yossi <input-media> [--mode yossi|auto|doc] [--patient NAME] [--stamp ts|none] [other flags...]
  yossi --batch <dir> [--mode ...] [--patient ...] [--stamp ...]
  yossi            # interactive wizard (pick file/dir, mode, patient, stamp)

Tips:
  --mode doc       (16:9, תיעוד מקצועי, watermark אופציונלי, שמירה ב ./archive)
  --mode yossi     (עיצוב "מצב יוסי" + waveform לאודיו)
  --mode auto      כמו yossi
  --patient "שם"   שם מטופל ל-watermark ולשם הקובץ בארכיון
  --stamp ts|none  חותמת זמן בתחילת כל שורת כתובית (ts=ברירת מחדל במצב doc)
  --batch DIR      עיבוד כל קבצי המדיה בתיקייה (wav/mp3/m4a/mp4/mov)
USG
}

# ========= Simple pickers (no external deps; use fzf if available) =========
has_fzf() { command -v fzf >/dev/null 2>&1; }

pick_file() {
  local start="${1:-.}"
  if has_fzf; then
    find "$start" -maxdepth 3 -type f \( -iname "*.wav" -o -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.mp4" -o -iname "*.mov" \) \
      | fzf --prompt="בחר/י קובץ מדיה: " --height=20 --border --layout=reverse --ansi || return 1
  else
    mapfile -t arr < <(find "$start" -maxdepth 3 -type f \( -iname "*.wav" -o -iname "*.mp3" -o -iname "*.m4a" -o -iname "*.mp4" -o -iname "*.mov" \))
    [[ ${#arr[@]} -gt 0 ]] || { echo "❌ לא נמצאו קבצי מדיה תחת $start"; return 1; }
    echo "בחר/י קובץ:"
    local i=1; for f in "${arr[@]}"; do printf "%2d) %s\n" "$i" "$f"; ((i++)); done
    read -rp "מספר קובץ: " idx
    [[ "$idx" =~ ^[0-9]+$ ]] && (( idx>=1 && idx<=${#arr[@]} )) || return 1
    echo "${arr[idx-1]}"
  fi
}

pick_dir() {
  local start="${1:-.}"
  if has_fzf; then
    find "$start" -maxdepth 3 -type d | fzf --prompt="בחר/י תיקייה: " --height=20 --border --layout=reverse --ansi || return 1
  else
    mapfile -t arr < <(find "$start" -maxdepth 3 -type d)
    [[ ${#arr[@]} -gt 0 ]] || { echo "❌ לא נמצאו תיקיות תחת $start"; return 1; }
    echo "בחר/י תיקייה:"
    local i=1; for d in "${arr[@]}"; do printf "%2d) %s\n" "$i" "$d"; ((i++)); done
    read -rp "מספר תיקייה: " idx
    [[ "$idx" =~ ^[0-9]+$ ]] && (( idx>=1 && idx<=${#arr[@]} )) || return 1
    echo "${arr[idx-1]}"
  fi
}

ask() { # ask "שאלה" "ברירת-מחדל"
  local q="$1"; local def="${2:-}"
  if [[ -n "$def" ]]; then
    read -rp "$q [$def]: " ans || true
    echo "${ans:-$def}"
  else
    read -rp "$q: " ans || true
    echo "$ans"
  fi
}

# ========= If no args -> interactive wizard =========
if [[ $# -eq 0 ]]; then
  echo "🧭 אשף ידידותי ליצירת וידאו תיעודי/יוסי"
  echo "--------------------------------------"
  echo "בחר/י פעולה:"
  echo "  1) קובץ יחיד"
  echo "  2) עיבוד תיקייה שלמה (batch)"
  read -rp "בחירה [1/2]: " act
  if [[ "$act" == "2" ]]; then
    DIR="$(pick_dir "./recordings" || true)"
    [[ -n "$DIR" ]] || { echo "בוטל."; exit 1; }
    MODE="$(ask 'מצב (doc/yossi/auto)' 'doc')"
    PATIENT="$(ask 'שם מטופל (אופציונלי)' '')"
    STAMP="$(ask 'חותמת זמן לכל שורה? (ts/none)' "$( [[ "$MODE" == "doc" ]] && echo ts || echo none )")"
    echo; echo "סיכום:"
    echo " • תיקייה: $DIR"
    echo " • מצב:    $MODE"
    echo " • מטופל:  ${PATIENT:-—}"
    echo " • stamp:   $STAMP"
    read -rp "להמשיך? [Enter] " _

    if [[ -n "$PATIENT" ]]; then
      exec "$0" --batch "$DIR" --mode "$MODE" --patient "$PATIENT" --stamp "$STAMP"
    else
      exec "$0" --batch "$DIR" --mode "$MODE" --stamp "$STAMP"
    fi
  else
    FILE="$(pick_file "./recordings" || true)"
    [[ -n "$FILE" ]] || { echo "בוטל."; exit 1; }
    MODE="$(ask 'מצב (doc/yossi/auto)' 'doc')"
    PATIENT="$(ask 'שם מטופל (אופציונלי)' '')"
    STAMP="$(ask 'חותמת זמן לכל שורה? (ts/none)' "$( [[ "$MODE" == "doc" ]] && echo ts || echo none )")"
    echo; echo "סיכום:"
    echo " • קובץ:   $FILE"
    echo " • מצב:    $MODE"
    echo " • מטופל:  ${PATIENT:-—}"
    echo " • stamp:   $STAMP"
    read -rp "להמשיך? [Enter] " _
    if [[ -n "$PATIENT" ]]; then
      set -- "$FILE" --mode "$MODE" --patient "$PATIENT" --stamp "$STAMP"
    else
      set -- "$FILE" --mode "$MODE" --stamp "$STAMP"
    fi
  fi
fi

# ================== Non-interactive path (existing logic) ==================

# ------- batch mode -------
if [[ "${1:-}" == "--batch" ]]; then
  [[ $# -ge 2 ]] || usage
  DIR="$2"; shift 2 || true
  shopt -s nullglob
  files=( "$DIR"/*.wav "$DIR"/*.mp3 "$DIR"/*.m4a "$DIR"/*.mp4 "$DIR"/*.mov )
  [[ ${#files[@]} -gt 0 ]] || { echo "❌ No media in $DIR"; exit 2; }
  for f in "${files[@]}"; do
    echo "—— Processing: $f ——"
    "$(readlink -f "$0")" "$f" "$@"
  done
  exit 0
fi

INPUT="$1"; shift || true
[[ -f "$INPUT" ]] || { echo "❌ Input not found: $INPUT" >&2; exit 2; }

# ------- parse our friendly flags -------
MODE=""; PATIENT=""; STAMP=""; PASS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)    MODE="${2:-}"; shift 2; continue ;;
    --mode=*)  MODE="${1#*=}"; shift; continue ;;
    --patient) PATIENT="${2:-}"; shift 2; continue ;;
    --patient=*) PATIENT="${1#*=}"; shift; continue ;;
    --stamp)   STAMP="${2:-}"; shift 2; continue ;;
    --stamp=*) STAMP="${1#*=}"; shift; continue ;;
    *)         PASS+=("$1"); shift ;;
  esac
done
set -- "${PASS[@]}"

# defaults
[[ -n "${MODE}"  ]] || MODE="doc"
if [[ "${MODE}" == "doc" ]]; then
  [[ -n "${STAMP}" ]] || STAMP="ts"
else
  [[ -n "${STAMP}" ]] || STAMP="none"
fi

# ------- output paths -------
BASENAME="$(basename -- "$INPUT")"
STEM="${BASENAME%.*}"
OUTBASE="/tmp/${STEM}"
ASS_FILE="${OUTBASE}.ass"
BURNED="${OUTBASE}.burned.mp4"
ARCHIVE_DIR="./archive"
mkdir -p "$ARCHIVE_DIR"
suffix=""
[[ -n "$PATIENT" ]] && suffix="_$(echo "$PATIENT" | tr ' /' '__')"
ARCHIVE_FILE="${ARCHIVE_DIR}/${STEM}${suffix}_$(date +%Y%m%d-%H%M%S).mp4"

# ------- probe video presence -------
HAS_VIDEO=false
if ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "$INPUT" | grep -q video; then
  HAS_VIDEO=true
fi

# ------- base style flags to make_captions.sh (no burn) -------
BASE_STYLE_FLAGS=(
  --font Rubik
  --autosize true
  --fontcolor "#FFFFFF"
  --outline 3
  --shadow 1
  --box true
  --boxcolor "#00000080"
  --align 2
  --marginv 80
  --ass
  --out-base "$OUTBASE"
)
PREPEND=("${BASE_STYLE_FLAGS[@]}")
if [[ "$HAS_VIDEO" == false ]]; then
  PREPEND+=(--bg waveform)
fi

export MODE="${MODE:-}"

# step 1: generate captions/ASS only (support both names)
bash ./make_captions.sh "$INPUT" "${PREPEND[@]}" || bash ./make_captions.sh "$INPUT" "${PREPEND[@]}"

[[ -s "$ASS_FILE" ]] || { echo "❌ ASS not found: $ASS_FILE" >&2; exit 2; }

# step 1.5: inject styles + WM style
awk '
BEGIN {found_styles=0}
{
  if ($0 ~ /^\[V4\+ Styles\]/) {
    found_styles=1
    print "[V4+ Styles]"
    print "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"
    print "Style: Default,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
    print "Style: tl,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
    print "Style: WM,DejaVu Sans,28,&H00FFFFFF,&H00FFFFFF,&H00000000,&H73000000,0,0,0,0,100,100,0,0,3,1,0,7,40,30,40,1"
    skip=1; next
  }
  if ($0 ~ /^\[Events\]/) {
    if (!found_styles) {
      print "[V4+ Styles]"
      print "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding"
      print "Style: Default,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
      print "Style: tl,Rubik,56,&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,3,3,1,2,30,30,80,1"
      print "Style: WM,DejaVu Sans,28,&H00FFFFFF,&H00FFFFFF,&H00000000,&H73000000,0,0,0,0,100,100,0,0,3,1,0,7,40,30,40,1"
      print ""
    }
    found_styles=0
  }
  if (!skip) print
  skip=0
}' "$ASS_FILE" > "${ASS_FILE}.fixed" && mv "${ASS_FILE}.fixed" "$ASS_FILE"

# optional watermark (ASS dialogue) in doc mode
WATERMARK_ON=${DOC_WATERMARK:-true}
BASE_WM_TEXT="תיעוד טיפול — לשימוש מקצועי בלבד"
[[ -n "$PATIENT" ]] && BASE_WM_TEXT+=" • מטופל: ${PATIENT}"
WM_TEXT=${DOC_WATERMARK_TEXT:-"$BASE_WM_TEXT"}

DUR_SEC=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$INPUT" | awk '{printf "%.2f",$0}')
printf -v DUR "0:%02d:%05.2f" "$(awk -v s="$DUR_SEC" 'BEGIN{m=int(s/60); print m}')" "$(awk -v s="$DUR_SEC" 'BEGIN{printf "%.2f", s%60}')"

if [[ "$MODE" == "doc" && "$WATERMARK_ON" == "true" ]]; then
  printf 'Dialogue: 0,0:00:00.00,%s,WM,,0,0,0,,%s\n' "$DUR" "$WM_TEXT" >> "$ASS_FILE"
fi

# optional per-line timestamp
STAMP_TS=false
[[ "${STAMP}" == "ts" ]] && STAMP_TS=true
if $STAMP_TS; then
  awk '
    BEGIN{FS=",";OFS=","}
    /^Dialogue:/ {
      st=$2; sub(/\r/,"",st); sub(/\..*$/,"",st)
      txt=$0; for(i=1;i<=9;i++) sub(/^[^,]*,/,"",txt)
      print $1,$2,$3,$4,$5,$6,$7,$8,$9, "{\\c&H808080&}[" st "]\\N" txt
      next
    }
    {print}
  ' "$ASS_FILE" > "${ASS_FILE}.ts" && mv "${ASS_FILE}.ts" "$ASS_FILE"
fi;

# burn (ASS only)
CANVAS_W=${CANVAS_W:-1920}
CANVAS_H=${CANVAS_H:-1080}
if $HAS_VIDEO; then
  if [[ "$MODE" == "doc" ]]; then
    VF="scale=w=${CANVAS_W}:h=${CANVAS_H}:force_original_aspect_ratio=decrease,pad=${CANVAS_W}:${CANVAS_H}:(ow-iw)/2:(oh-ih)/2,ass='${ASS_FILE}'"
  else
    VF="ass='${ASS_FILE}'"
  fi
  ffmpeg -y -i "$INPUT" -vf "$VF" -c:v libx264 -crf 18 -preset medium -c:a aac -movflags +faststart "/tmp/${STEM}.burned.mp4"
else
  ffmpeg -y -i "$INPUT" \
    -filter_complex "[0:a]aformat=channel_layouts=stereo,asplit=2[a1][a2];[a1]showwaves=s=${CANVAS_W}x${CANVAS_H}:mode=line:rate=25,format=yuv420p[v0];[v0]ass='${ASS_FILE}'[v]" \
    -map "[v]" -map "[a2]" \
    -c:v libx264 -crf 18 -preset medium -c:a aac -shortest -movflags +faststart "/tmp/${STEM}.burned.mp4"
fi

cp -f "/tmp/${STEM}.burned.mp4" "./archive/${STEM}$( [[ -n "$suffix" ]] && echo "$suffix" ).$(date +%Y%m%d-%H%M%S).mp4"

echo "✅ Done:"
echo "  • Final:   /tmp/${STEM}.burned.mp4"
echo "  • Archive: ./archive/${STEM}$( [[ -n "$suffix" ]] && echo "$suffix" ).$(date +%Y%m%d-%H%M%S).mp4"
