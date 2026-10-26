// Konfigurasi image sequence. Indeks frame 0-based = frame_0001.webp.
// Urutan frame dibuat oleh scripts/extract-frames.sh (lihat SEGMENTS di sana).

export const FRAME_COUNT = 398;
export const FRAME_PATH = (res, i) =>
  `public/assets/bicycle/${res}/frame_${String(i + 1).padStart(4, '0')}.webp`;
export const IMAGE_SIZE = { w: 1920, h: 1080 };

// Fase storytelling: rentang frame [from, to] + porsi panjang scroll (weight).
// from === to berarti "tahan" di frame itu.
export const PHASES = [
  { id: 'hero',       from: 0,   to: 0,   weight: 0.5 },
  { id: 'reveal',     from: 0,   to: 50,  weight: 1.4 },
  { id: 'detail',     from: 50,  to: 267, weight: 4.2 },
  { id: 'explode',    from: 267, to: 303, weight: 1.5 },
  { id: 'showcase',   from: 303, to: 315, weight: 1.8 },
  { id: 'reassembly', from: 315, to: 336, weight: 1.2 },
  { id: 'final',      from: 336, to: 397, weight: 1.4 },
  { id: 'end',        from: 397, to: 397, weight: 0.7 },
];

// Pergantian shot di video (antara frame i dan i+1). Langkah ini diberi porsi
// scroll lebih panjang sehingga tampil sebagai crossfade, bukan lompatan.
export const CUTS = [50, 100, 220, 336];
export const CUT_COST = 10;

// "Kamera" canvas: skala & geser vertikal per frame (bukan animasi komponen).
// Shot sepeda utuh diperkecil sedikit agar ada ruang untuk teks editorial.
export const CAMERA = [
  [0, 0.74], [50, 0.74], [51, 1], [228, 1], [267, 0.74],
  [290, 0.68], [320, 0.68], [345, 0.74], [397, 0.74],
];

// Target navigasi (indeks frame).
export const TARGETS = { overview: 24, engineering: 60, components: 309 };
