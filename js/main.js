import { FRAME_COUNT, FRAME_PATH, IMAGE_SIZE, TARGETS } from './sequence-config.js';
import { progressToFrame, frameToProgress, cameraAt, rangeOpacity } from './timeline.js';

const { gsap, ScrollTrigger, Lenis } = window;
gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById('bike-canvas');
const ctx = canvas.getContext('2d');
const section = document.getElementById('sequence');
const progressBar = document.getElementById('progress-bar');
const loader = document.getElementById('loader');
const loaderPct = document.getElementById('loader-pct');
const BG = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#E9DDC9';

const fadeEls = [...document.querySelectorAll('[data-frames]')].map((el) => ({
  el,
  range: el.dataset.frames.split(',').map(Number),
}));
const labels = [...document.querySelectorAll('.label')].map((el) => ({
  el,
  anchor: el.dataset.anchor.split(',').map(Number),
  anchorPortrait: (el.dataset.anchorPortrait ?? el.dataset.anchor).split(',').map(Number),
}));
const railItems = [...document.querySelectorAll('.rail li')];

/* ---------- Preload frames ---------- */

const res = Math.min(window.innerWidth, window.innerHeight * 16 / 9) * Math.min(devicePixelRatio, 2) > 1100 ? 1080 : 540;
const frames = new Array(FRAME_COUNT);
let loaded = 0;

const poster = new Image();
poster.src = 'public/assets/bicycle/poster.webp';
poster.decode().then(() => { frames[0] ??= poster; requestRender(); }).catch(() => {});

// Muat bertahap: tiap frame ke-16, lalu ke-8, ke-4 …, agar seluruh timeline
// cepat punya cakupan kasar sebelum semua frame selesai.
function loadOrder() {
  const order = [];
  const seen = new Set();
  for (let step = 16; step >= 1; step /= 2) {
    for (let i = 0; i < FRAME_COUNT; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  return order;
}

async function preload() {
  const queue = loadOrder();
  const worker = async () => {
    while (queue.length) {
      const i = queue.shift();
      const img = new Image();
      const ok = await new Promise((resolve) => {
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = FRAME_PATH(res, i);
      });
      if (ok) frames[i] = img;
      loaded++;
      loaderPct.textContent = Math.round((loaded / FRAME_COUNT) * 100);
      requestRender();
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  loader.classList.add('is-done');
}

// Frame terdekat yang sudah termuat (fallback selama preload).
function nearest(i) {
  for (let d = 0; d < FRAME_COUNT; d++) {
    if (frames[i - d]) return frames[i - d];
    if (frames[i + d]) return frames[i + d];
  }
  return null;
}

/* ---------- Canvas renderer ---------- */

let vw = 0, vh = 0, dpr = 1;
let geom = { x: 0, y: 0, w: 0, h: 0 };

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = Math.round(vw * dpr);
  canvas.height = Math.round(vh * dpr);
  requestRender();
}

function computeGeometry(frame) {
  const z = cameraAt(frame);
  const portrait = vw / vh < 1;
  // Landscape: cover. Portrait: lebar sepeda ≈ lebar layar, potong sisi saat close-up.
  const base = portrait
    ? (vw / IMAGE_SIZE.w) * 1.7
    : Math.max(vw / IMAGE_SIZE.w, vh / IMAGE_SIZE.h);
  const s = base * z;
  const w = IMAGE_SIZE.w * s;
  const h = IMAGE_SIZE.h * s;
  // Saat diperkecil, geser sepeda sedikit ke bawah untuk ruang headline.
  const shift = Math.min(1, (1 - z) / 0.26) * (portrait ? 0.04 : 0.1) * vh;
  return { x: (vw - w) / 2, y: (vh - h) / 2 + shift, w, h };
}

function drawImage(img, alpha) {
  if (!img) return;
  ctx.globalAlpha = alpha;
  ctx.drawImage(img, geom.x, geom.y, geom.w, geom.h);
}

function feather() {
  // Leburkan tepi frame ke warna background halaman.
  ctx.globalAlpha = 1;
  const r = Math.hypot(vw, vh) / 2;
  const g = ctx.createRadialGradient(vw / 2, vh * 0.55, r * 0.45, vw / 2, vh * 0.55, r * 1.05);
  g.addColorStop(0, 'rgba(233,221,201,0)');
  g.addColorStop(1, BG);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);

  const edge = (x0, y0, x1, y1, fill) => {
    const lg = ctx.createLinearGradient(x0, y0, x1, y1);
    lg.addColorStop(0, BG);
    lg.addColorStop(1, 'rgba(233,221,201,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(...fill);
  };
  // Scrim kiri & kanan-bawah saat close-up agar teks tetap terbaca.
  const zoomIn = Math.min(1, Math.max(0, (cameraAt(state.frame) - 0.74) / 0.26));
  if (zoomIn > 0) {
    ctx.globalAlpha = zoomIn;
    // Portrait: teks berada di atas/bawah gambar, scrim kiri tidak perlu.
    const left = ctx.createLinearGradient(0, 0, Math.max(vw * 0.5, 420), 0);
    left.addColorStop(0, 'rgba(233,221,201,0.92)');
    left.addColorStop(0.55, 'rgba(233,221,201,0.6)');
    left.addColorStop(1, 'rgba(233,221,201,0)');
    ctx.fillStyle = left;
    if (vw >= vh) ctx.fillRect(0, 0, vw, vh);
    const br = ctx.createRadialGradient(vw, vh, 0, vw, vh, Math.max(vw * 0.42, 380));
    br.addColorStop(0, 'rgba(233,221,201,0.95)');
    br.addColorStop(0.6, 'rgba(233,221,201,0.55)');
    br.addColorStop(1, 'rgba(233,221,201,0)');
    ctx.fillStyle = br;
    ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = 1;
  }

  const fx = Math.max(24, geom.w * (vw < vh ? 0.12 : 0.06));
  const fy = Math.max(24, geom.h * (vw < vh ? 0.26 : 0.08));
  if (geom.x > -fx) { edge(geom.x, 0, geom.x + fx, 0, [geom.x, 0, fx, vh]); edge(geom.x + geom.w, 0, geom.x + geom.w - fx, 0, [geom.x + geom.w - fx, 0, fx, vh]); }
  if (geom.y > -fy) { edge(0, geom.y, 0, geom.y + fy, [0, geom.y, vw, fy]); edge(0, geom.y + geom.h, 0, geom.y + geom.h - fy, [0, geom.y + geom.h - fy, vw, fy]); }
}

let state = { frame: 0, phase: 'hero', progress: 0 };
let raf = 0;

function requestRender() {
  if (!raf) raf = requestAnimationFrame(render);
}

function render() {
  raf = 0;
  const { frame, phase, progress } = state;
  const i = Math.floor(frame);
  const frac = frame - i;

  geom = computeGeometry(frame);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 1;
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, vw, vh);

  // Blend dua frame berurutan: gerak halus saat scroll pelan, crossfade di pergantian shot.
  drawImage(frames[i] ?? nearest(i), 1);
  if (frac > 0.01 && i + 1 < FRAME_COUNT && frames[i + 1]) drawImage(frames[i + 1], frac);
  feather();

  for (const { el, range } of fadeEls) {
    const o = rangeOpacity(frame, range);
    el.style.opacity = o;
    el.style.visibility = o > 0.001 ? 'visible' : 'hidden';
    el.style.setProperty('--rise', `${(1 - o) * 24}px`);
  }

  for (const { el, anchor: a, anchorPortrait } of labels) {
    const anchor = vw < vh ? anchorPortrait : a;
    el.style.left = `${geom.x + anchor[0] * geom.w}px`;
    el.style.top = `${geom.y + anchor[1] * geom.h}px`;
  }

  for (const li of railItems) li.classList.toggle('is-active', li.dataset.phase === phase || (phase === 'hero' && li.dataset.phase === 'reveal') || (phase === 'end' && li.dataset.phase === 'final'));
  progressBar.style.transform = `scaleX(${progress})`;
}

/* ---------- Scroll ---------- */

const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(0);

const trigger = ScrollTrigger.create({
  trigger: section,
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    state = { ...progressToFrame(self.progress), progress: self.progress };
    requestRender();
  },
});

function scrollToFrame(frame) {
  const y = trigger.start + frameToProgress(frame) * (trigger.end - trigger.start);
  lenis.scrollTo(y, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
}

document.querySelectorAll('[data-goto]').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const key = a.dataset.goto;
    scrollToFrame(key in TARGETS ? TARGETS[key] : Number(key));
  });
});

/* ---------- Init ---------- */

window.addEventListener('resize', () => { resize(); ScrollTrigger.refresh(); });
resize();
preload();

gsap.from('.nav', { y: -16, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.2 });
gsap.from('.chapter--hero > *', { y: 28, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out', delay: 0.35 });
