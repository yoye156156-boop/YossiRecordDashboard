#!/usr/bin/env bash
set -euo pipefail

API=${VITE_API_URL:-http://localhost:3001}

echo "🟢 Smoke: API on $API"
npx kill-port 3001 >/dev/null 2>&1 || true
(node server.cjs &>/dev/null &) && sleep 1

code=$(curl -s -o /dev/null -w "%{http_code}" "$API/api/recordings")
[[ "$code" == "200" ]] || { echo "❌ /api/recordings HTTP $code"; exit 1; }

count=$(curl -s "$API/api/recordings" | grep -o '"name":"' | wc -l || true)
echo "📦 Items: $count"

testfile="${HOME}/test_440hz.wav"
if [[ -f "$testfile" ]]; then
  up=$(curl -sS -F "file=@${testfile}" "$API/api/upload" | tr -d '\n')
  echo "⬆️  Upload: $up"
else
  echo "⚠️  ${testfile} not found, skipping upload."
fi

echo "✅ API smoke passed."
echo "👉 Run client: cd dashboard && VITE_API_URL=$API npm run dev -- --host --port 5173"
