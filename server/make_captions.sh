#!/usr/bin/env bash
: "${MODE:=}" # safe default for MODE (prevents unbound variable under set -u)
set -Eeuo pipefail

usage(){ echo "Usage: $0 <input-media> [--out-base PATH] [--chunk N] [--paragraphs true|false] [--diarize] [--ass] [--burn] [--bg black|waveform|image:/path.jpg] \
[--font FONT] [--fontsize N] [--autosize true|false] [--basefontsize N] [--fontcolor #RRGGBB] [--outline N] [--shadow N] [--box true|false] [--boxcolor #RRGGBB[AA]] [--align N] [--marginv N]"; }

[[ $# -ge 1 ]] || { usage; exit 1; }
IN="$1"; shift || true
[[ -f "$IN" ]] || { echo "Input file not found: $IN" >&2; exit 1; }

# ברירות מחדל
OUT_BASE="/tmp/$(basename "${IN%.*}")"
CHUNK=10
PARAGRAPHS=true
DIARIZE=false
MAKE_ASS=false
BURN=false
BG="black"  # לאודיו-בלבד: black|waveform|image:/path.jpg

# עיצוב ASS
ASS_FONT="Rubik"
ASS_FONTSIZE=28
ASS_AUTOSIZE=true
ASS_BASEFONTSIZE=28
ASS_FONTCOLOR="#FFFFFF"
ASS_OUTLINE=3
ASS_SHADOW=0
ASS_BOX=false
ASS_BOXCOLOR="#00000080"  # RGBA (AA בסוף אופציונלי)
ASS_ALIGN=2
ASS_MARGINV=50

# פרסינג דגלים
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out-base) OUT_BASE="$2"; shift 2;;
    --chunk) CHUNK="$2"; shift 2;;
    --paragraphs) PARAGRAPHS="$2"; shift 2;;
    --diarize) DIARIZE=true; shift;;
    --ass) MAKE_ASS=true; shift;;
    --burn) BURN=true; shift;;
    --bg) BG="$2"; shift 2;;
    --font) ASS_FONT="$2"; shift 2;;
    --fontsize) ASS_FONTSIZE="$2"; ASS_AUTOSIZE=false; shift 2;;
    --autosize) ASS_AUTOSIZE="$2"; shift 2;;
    --basefontsize) ASS_BASEFONTSIZE="$2"; shift 2;;
    --fontcolor) ASS_FONTCOLOR="$2"; shift 2;;
    --outline) ASS_OUTLINE="$2"; shift 2;;
    --shadow) ASS_SHADOW="$2"; shift 2;;
    --box) ASS_BOX="$2"; shift 2;;
    --boxcolor) ASS_BOXCOLOR="$2"; shift 2;;
    --align) ASS_ALIGN="$2"; shift 2;;
    --marginv) ASS_MARGINV="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown option: $1" >&2; usage; exit 2;;
  esac
done

# נתיבי עבודה/פלט
TMP_BASE="$(mktemp -u /tmp/rec_XXXXXXXX)"
TMP_WAV="${TMP_BASE}.16k.wav"
JSON="${TMP_BASE}.json"
VTT="${OUT_BASE}.vtt"
SRT="${OUT_BASE}.srt"
ASS="${OUT_BASE}.ass"
BURN_OUT="${OUT_BASE}.burned.mp4"

echo "==> [1/6] Normalizing audio -> $TMP_WAV (mono, 16kHz, PCM s16)"
ffmpeg -y -nostdin -v error -i "$IN" -ac 1 -ar 16000 -sample_fmt s16 "$TMP_WAV"

echo "==> [2/6] Deepgram transcribe (he) -> $JSON"
if command -v dg >/dev/null 2>&1; then
  ARGS=(transcribe "$TMP_WAV" --model whisper-large --language he --smart_format true --tier base --detect_language false --out "$JSON")
  [[ "$PARAGRAPHS" == "true" ]] && ARGS+=(--paragraphs true)
  [[ "$DIARIZE" == "true" ]] && ARGS+=(--diarize true)
  dg "${ARGS[@]}"
else
  : "${DEEPGRAM_API_KEY:?Please export DEEPGRAM_API_KEY or install 'dg' CLI}"
  URL="https://api.deepgram.com/v1/listen?model=whisper-large&language=he&smart_format=true"
  [[ "$PARAGRAPHS" == "true" ]] && URL="${URL}&paragraphs=true"
  [[ "$DIARIZE" == "true" ]] && URL="${URL}&diarize=true"
  HTTP=$(curl -sS -o "$JSON" -w "%{http_code}" \
    -X POST "$URL" -H "Authorization: Token ${DEEPGRAM_API_KEY}" -H "Content-Type: audio/wav" \
    --data-binary @"$TMP_WAV")
  [[ "$HTTP" == "200" ]] || { echo "Deepgram error (HTTP $HTTP)"; head -n 80 "$JSON" || true; exit 1; }
fi

# בדיקת תוצאות
HAS_WORDS=$(jq 'has("results") and (.results.channels[0].alternatives[0].words|type=="array" and length>0)' "$JSON")
HAS_TXT=$(jq -r '.results.channels[0].alternatives[0].transcript // "" | length>0' "$JSON")
[[ "$HAS_WORDS" == "true" || "$HAS_TXT" == "true" ]] || { echo "No words/transcript returned. Cannot create captions."; exit 1; }

echo "==> [3/6] Preparing converter (Node)…"
CONVERTER_JS="/usr/local/bin/dg_converter_plus.cjs"
[[ -f "$CONVERTER_JS" ]] || { echo "Missing $CONVERTER_JS (install it first)"; exit 1; }

echo "==> [4/6] Converting JSON -> $VTT & $SRT (paragraphs=$PARAGRAPHS, chunk=$CHUNK)"
node "$CONVERTER_JS" "$JSON" "$VTT" "$SRT" "$PARAGRAPHS" "$CHUNK"

# זיהוי אם יש וידאו ורזולוציה (ל־autosize)
HAS_VIDEO=false; VID_W=1920; VID_H=1080
if command -v ffprobe >/dev/null 2>&1; then
  if ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$IN" 2>/dev/null | grep -q 'x'; then
    HAS_VIDEO=true
    RES=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$IN" 2>/dev/null | head -n1)
    VID_W="${RES%x*}"; VID_H="${RES#*x}"
  fi
else
  echo "(!) ffprobe לא נמצא — מניחים 1920x1080; התקן עם: sudo apt install ffmpeg"
fi

# אוטומציית גודל פונט (יחסי לגובה הפריים; בסיס=ASS_BASEFONTSIZE לגובה 1080)
if [[ "$ASS_AUTOSIZE" == "true" ]]; then
  # fontsize = base * (VID_H/1080)
  ASS_FONTSIZE=$(awk -v base="$ASS_BASEFONTSIZE" -v h="$VID_H" 'BEGIN{printf("%.0f", base*(h/1080))}')
fi

# נייצר ASS אם ביקשת --ass או אם נבצע burn על אודיו-בלבד
NEED_ASS=false
if [[ "$MAKE_ASS" == "true" ]]; then NEED_ASS=true; fi
if [[ "$BURN" == "true" && "$HAS_VIDEO" == "false" ]]; then NEED_ASS=true; fi

if [[ "$NEED_ASS" == "true" ]]; then
  echo "==> [5/6] Creating ASS -> $ASS (font=$ASS_FONT, size=$ASS_FONTSIZE, color=$ASS_FONTCOLOR, outline=$ASS_OUTLINE, shadow=$ASS_SHADOW, box=$ASS_BOX, boxColor=$ASS_BOXCOLOR, align=$ASS_ALIGN, marginV=$ASS_MARGINV)"
  ASS_JS="/usr/local/bin/srt2ass_he.cjs"
  [[ -f "$ASS_JS" ]] || { echo "Missing $ASS_JS (install it first)"; exit 1; }
  node "$ASS_JS" "$SRT" "$ASS" "$ASS_FONT" "$ASS_FONTSIZE" "$ASS_ALIGN" "$ASS_MARGINV" "$ASS_FONTCOLOR" "$ASS_OUTLINE" "$ASS_SHADOW" "$ASS_BOX" "$ASS_BOXCOLOR"
fi

# צריבה
if [[ "$BURN" == "true" ]]; then
  echo "==> [6/6] Burn subtitles -> $BURN_OUT (HAS_VIDEO=$HAS_VIDEO, bg=$BG)"
  if [[ "$HAS_VIDEO" == "true" ]]; then
    if [[ -f "$ASS" ]]; then
      ffmpeg -y -i "$IN" -vf "ass=${ASS}" -c:a copy "$BURN_OUT"
    else
      ffmpeg -y -i "$IN" -vf "subtitles=${SRT}" -c:a copy "$BURN_OUT"
    fi
  else
    # אודיו-בלבד: לבחור רקע
    case "$BG" in
      black)
        ffmpeg -y -f lavfi -i color=c=black:s=${VID_W}x${VID_H}:r=30 -i "$IN" \
               -vf "ass=${ASS}" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "$BURN_OUT"
        ;;
      waveform)
        ffmpeg -y -i "$IN" \
          -filter_complex "aformat=channel_layouts=mono,showwaves=s=${VID_W}x${VID_H}:mode=line:rate=30,format=yuv420p,ass=${ASS}" \
          -c:v libx264 -c:a aac -shortest "$BURN_OUT"
        ;;
      image:*)
        IMG_PATH="${BG#image:}"; [[ -f "$IMG_PATH" ]] || { echo "Image not found: $IMG_PATH"; exit 1; }
        ffmpeg -y -loop 1 -framerate 30 -i "$IMG_PATH" -i "$IN" \
               -vf "scale=${VID_W}:${VID_H},ass=${ASS}" -c:v libx264 -pix_fmt yuv420p -c:a aac -shortest "$BURN_OUT"
        ;;
      *) echo "Unknown --bg: $BG"; exit 2;;
    esac
  fi
fi

echo "Done."
echo "VTT: $VTT"
echo "SRT: $SRT"
[[ -f "$ASS" ]] && echo "ASS: $ASS"
[[ "$BURN" == "true" && -f "$BURN_OUT" ]] && echo "Burned MP4: $BURN_OUT"

# ==========================
# מצב יוסי 🎙️
# ==========================
apply_mode_yossi() {
  FONT_NAME="Rubik"
  ASS_OUTLINE=3
  ASS_SHADOW=1
  ASS_BORDERSTYLE=3
  ASS_PRIMARY="&H00FFFFFF"
  ASS_BACK="&H80000000"
  ASS_ALIGNMENT=2
  ASS_MARGIN_V=80
  AUTOSIZE_SUBS=true

  if ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "$INPUT" | grep -q 'video'; then
    BG_MODE="video"
  else
    BG_MODE="waveform"
  fi

  FORCE_STYLE="FontName=${FONT_NAME},Outline=${ASS_OUTLINE},Shadow=${ASS_SHADOW},BorderStyle=${ASS_BORDERSTYLE},PrimaryColour=${ASS_PRIMARY},BackColour=${ASS_BACK},Alignment=${ASS_ALIGNMENT},MarginV=${ASS_MARGIN_V}"
}

# alias למצב אוטומטי
if [[ "${MODE:-}" == "auto" || "$MODE" == "yossi" ]]; then
  apply_mode_yossi
fi

# ---- ניתוח ארגומנטים: --mode ----
MODE=""
REMAINING_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="$2"; shift 2 ;;
    --mode=*)
      MODE="${1#*=}"; shift ;;
    *)
      REMAINING_ARGS+=("$1"); shift ;;
  esac
done
set -- "${REMAINING_ARGS[@]}"


# ==========================
# מצב יוסי 🎙️
# ==========================

# ---- פרסינג --mode ----
MODE=""
REMAINING_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode) MODE="$2"; shift 2 ;;
    --mode=*) MODE="${1#*=}"; shift ;;
    *) REMAINING_ARGS+=("$1"); shift ;;
  esac
done
set -- "${REMAINING_ARGS[@]}"

# ---- פונקציות עזר ----
is_video() { ffprobe -v error -select_streams v:0 -show_entries stream=codec_type -of csv=p=0 "$1" | grep -q 'video'; }
is_audio() { ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of csv=p=0 "$1" | grep -q 'audio'; }

apply_mode_yossi() {
  FONT_NAME="Rubik"
  ASS_OUTLINE=3
  ASS_SHADOW=1
  ASS_BORDERSTYLE=3
  ASS_PRIMARY="&H00FFFFFF"
  ASS_BACK="&H80000000"
  ASS_ALIGNMENT=2
  ASS_MARGIN_V=80
  AUTOSIZE_SUBS=true

  if is_audio "$INPUT"; then
    BG_MODE="waveform"
  else
    BG_MODE="video"
  fi

  FORCE_STYLE="FontName=${FONT_NAME},Outline=${ASS_OUTLINE},Shadow=${ASS_SHADOW},BorderStyle=${ASS_BORDERSTYLE},PrimaryColour=${ASS_PRIMARY},BackColour=${ASS_BACK},Alignment=${ASS_ALIGNMENT},MarginV=${ASS_MARGIN_V}"
}

# הערה: את ההפעלה בפועל של מצב יוסי עדיף לשים אחרי שקבעת INPUT,
# ממש לפני בניית filter_complex:
# if [[ "${MODE:-}" == "auto" || "$MODE" == "yossi" ]]; then
#   apply_mode_yossi
# fi

