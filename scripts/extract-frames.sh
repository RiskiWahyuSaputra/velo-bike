#!/usr/bin/env bash
# Ekstrak video referensi menjadi image sequence (urutan scroll), dalam dua resolusi:
#   public/assets/bicycle/1080/frame_0001.webp  (1920x1080, upscale lanczos + sharpen)
#   public/assets/bicycle/540/frame_0001.webp   (960x540, untuk mobile)
# Pemakaian: ./scripts/extract-frames.sh /path/ke/video.mp4
set -euo pipefail

SRC="${1:?path video wajib diisi}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/assets/bicycle"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Grading ringan agar background video menyatu dengan palet beige halaman.
GRADE="curves=all='0/0 0.3/0.42 0.55/0.78 0.8/0.93 1/1',colorbalance=rm=0.02:bm=-0.02"

# Urutan segmen (indeks frame asli @24fps, inklusif) sesuai fase storytelling.
# Harus sinkron dengan SEGMENTS di js/sequence-config.js.
SEGMENTS=(
  "186 236"   # 1 Hero reveal  — tampak samping, berputar ke 3/4 lalu kembali
  "0 49"      # 2 Detail       — close-up rangka & head tube
  "299 358"   # 2 Detail       — close-up drivetrain (crankset, rantai, pedal)
  "359 418"   # 2 Detail       — low angle roda & fork
  "50 96"     # 2 Detail       — kamera mundur ke sepeda utuh
  "97 131"    # 3 Exploded     — komponen mulai terpisah
  "132 144"   # 4 Showcase     — exploded view penuh
  "145 165"   # 5 Reassembly   — komponen menyatu kembali
  "419 479"   # 6 Final hero shot
)

for res in 1080 540; do
  w=$(( res * 16 / 9 ))
  mkdir -p "$TMP/$res"
  sharpen=""; [[ $res == 1080 ]] && sharpen=",unsharp=5:5:0.5"
  q=82; [[ $res == 540 ]] && q=76
  echo "→ render ${w}x${res}"
  ffmpeg -v error -y -i "$SRC" \
    -vf "$GRADE,scale=${w}:${res}:flags=lanczos${sharpen}" \
    -c:v libwebp -quality $q -compression_level 5 -start_number 0 \
    "$TMP/$res/src_%04d.webp"

  rm -rf "${OUT:?}/$res"; mkdir -p "$OUT/$res"
  i=1
  for seg in "${SEGMENTS[@]}"; do
    read -r a b <<<"$seg"
    for ((n=a; n<=b; n++)); do
      cp "$TMP/$res/$(printf 'src_%04d.webp' "$n")" "$OUT/$res/$(printf 'frame_%04d.webp' "$i")"
      i=$((i+1))
    done
  done
  echo "  $((i-1)) frame → $OUT/$res"
done

# Poster hero (frame pertama) untuk tampilan awal sebelum sequence termuat.
cp "$OUT/1080/frame_0001.webp" "$OUT/poster.webp"
