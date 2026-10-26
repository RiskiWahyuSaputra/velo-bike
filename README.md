# VELO — Scroll-Driven Bicycle Landing Page

Landing page sepeda premium berbasis **scroll-driven image sequence**. Seluruh halaman adalah satu
section sticky berisi `<canvas>`; frame sepeda dirender berdasarkan progres scroll (bukan memutar video).

## Stack
- HTML5, CSS3, JavaScript (ES modules), tanpa build step
- Canvas 2D untuk image sequence
- GSAP + ScrollTrigger (progres scroll, animasi intro) & Lenis (smooth scroll) via CDN

## Menjalankan
```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

## Struktur
```
index.html
css/style.css
js/
  main.js             # preload, renderer canvas, scroll, navigasi
  timeline.js         # pemetaan progress scroll ⇄ indeks frame, kamera, opasitas teks
  sequence-config.js  # jumlah frame, fase, pergantian shot, zoom kamera, target navigasi
scripts/extract-frames.sh
public/assets/bicycle/
  1080/frame_0001.webp …  # 1920×1080 (desktop)
  540/frame_0001.webp …   # 960×540  (mobile)
  poster.webp
```

## Fase (indeks frame 0-based)
| Fase | Frame | Isi |
|---|---|---|
| Hero | 0 | Sepeda utuh tampak samping |
| 1 · Reveal | 0–50 | Sepeda berputar ke 3/4 lalu kembali |
| 2 · Detail | 50–267 | Close-up rangka, drivetrain, roda, lalu kamera mundur |
| 3 · Exploded | 267–303 | Komponen mulai terpisah |
| 4 · Showcase | 303–315 | Exploded view penuh + label komponen |
| 5 · Reassembly | 315–336 | Komponen menyatu kembali |
| 6 · Final | 336–397 | Hero shot akhir |

Teks editorial muncul/menghilang berdasarkan **indeks frame** (atribut `data-frames="in0,in1,out0,out1"`),
sehingga selalu sinkron dengan gambar. Pergantian shot di video diberi crossfade di canvas.

## Mengganti video
```bash
./scripts/extract-frames.sh /path/ke/video.mp4
```
Sesuaikan `SEGMENTS` di skrip dan `PHASES`/`CUTS`/`FRAME_COUNT` di `js/sequence-config.js` bila urutan berubah.
