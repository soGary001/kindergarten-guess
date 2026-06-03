#!/usr/bin/env bash
# Generate 9 Memphis-style animal scene images via DashScope/Bailian wanx text-to-image.
# Async flow: create task -> poll -> download. Requires BAILIAN_API_KEY in env.
set -euo pipefail

: "${BAILIAN_API_KEY:?set BAILIAN_API_KEY}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_ASSETS="$ROOT/assets/animals"
OUT_PUBLIC="$ROOT/public/animals"
mkdir -p "$OUT_ASSETS" "$OUT_PUBLIC"

MODEL="wanx2.1-t2i-turbo"
CREATE="https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
TASKS="https://dashscope.aliyuncs.com/api/v1/tasks"

# id|prompt-subject
ANIMALS=(
  "monkey|a cute happy monkey holding a banana, long curly tail"
  "kangaroo|a cute kangaroo with a baby in its pouch, hopping"
  "elephant|a cute elephant with a big trunk"
  "turtle|a cute turtle with a patterned shell"
  "tiger|a cute friendly tiger with bold stripes"
  "crab|a cute red crab with big claws by the sea"
  "bird|a cute little bird with a beak eating seeds"
  "snake|a cute friendly green snake"
  "spider|a cute friendly spider on a web, eight legs"
)

STYLE="Memphis design illustration, pastel pink background, scattered geometric shapes (circles, zigzags, triangles, dots), bold black outlines, flat vector, playful children's exhibition style, centered, square, no text, no words"

gen() {
  local id="$1" subject="$2"
  local prompt="$subject, $STYLE"
  echo "▶ $id: creating task…"
  local resp task_id
  resp=$(curl -sS -X POST "$CREATE" \
    -H "Authorization: Bearer $BAILIAN_API_KEY" \
    -H "X-DashScope-Async: enable" \
    -H "Content-Type: application/json" \
    -d "$(python3 -c 'import json,sys; print(json.dumps({"model":sys.argv[1],"input":{"prompt":sys.argv[2]},"parameters":{"size":"1024*1024","n":1}}))' "$MODEL" "$prompt")")
  task_id=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("output",{}).get("task_id",""))' <<<"$resp")
  if [ -z "$task_id" ]; then echo "✗ $id: no task_id. Response: $resp"; return 1; fi
  echo "   task_id=$task_id  polling…"

  local status url tries=0
  while :; do
    sleep 3; tries=$((tries+1))
    local t
    t=$(curl -sS "$TASKS/$task_id" -H "Authorization: Bearer $BAILIAN_API_KEY")
    status=$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("output",{}).get("task_status",""))' <<<"$t")
    case "$status" in
      SUCCEEDED)
        url=$(python3 -c 'import json,sys; r=json.load(sys.stdin)["output"]["results"][0]; print(r.get("url",""))' <<<"$t")
        break;;
      FAILED|UNKNOWN)
        echo "✗ $id: task $status -> $t"; return 1;;
      *) [ $tries -ge 40 ] && { echo "✗ $id: timeout ($status)"; return 1; } || true;;
    esac
  done

  echo "   downloading…"
  curl -sS -L "$url" -o "$OUT_ASSETS/$id.png"
  cp "$OUT_ASSETS/$id.png" "$OUT_PUBLIC/$id.png"
  echo "✓ $id -> assets/animals/$id.png ($(du -h "$OUT_ASSETS/$id.png" | cut -f1))"
}

for entry in "${ANIMALS[@]}"; do
  gen "${entry%%|*}" "${entry#*|}"
done
echo "Done. $(ls "$OUT_ASSETS"/*.png | wc -l | tr -d ' ') images in assets/animals/"
