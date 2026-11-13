// Telefoni e tablet (puntatore touch, niente hover): solo qui si alleggerisce il lavoro.
// Su PC tutto resta com'era.
const MOBILE = matchMedia("(hover:none) and (pointer:coarse)").matches;

const people = {
  francesco: {
    name: "Francesco",
    intro: "Un pensiero mio per il tuo compleanno.",
    photo: "",
    letter: "Cara nonna, mi manca passare intere giornate da te, come facevamo da piccoli: andare in piscina, andare all'orto, prendere piccoli pulcini e coniglietti, giocare a casa tua con i legnetti, aspettare che finisse di piovere per poter stare fuori a scoppiare le bolle di sapone, tu che insisti per darci il gelato, andare nei boschi e i viaggi in Calabria, con tante figure, urla, litigate, bagni al mare, esaurimenti, caldo insopportabile e avventure mistiche. Ora, purtroppo, le cose sono cambiate: sono cresciuto, gli impegni sono aumentati e la scuola mi stanca. Detto questo Ti voglio tanto bene, Ti auguro tutto il bene del mondo e mi piacerebbe passare pi\u00f9 tempo con te.",
    sign: "Francesco"
  }
};

const modal = document.getElementById("personModal");
const modalName = document.getElementById("modalName");
const modalIntro = document.getElementById("modalIntro");
const modalLetter = document.getElementById("modalLetter");
const modalSign = document.getElementById("modalSign");
const modalPhotoText = document.getElementById("modalPhotoText");
const modalPhoto = document.querySelector(".modal-photo");
const modalLayout = document.querySelector(".modal-layout");
let previousFocus = null;
let photoFlight = null;

function preparePhotoFlight(source) {
  if (REDUCE || !source) return null;
  const photo = source.querySelector(".person-photo");
  if (!photo) return null;
  const rect = photo.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  const clone = photo.cloneNode(true);
  const previousVisibility = photo.style.visibility;
  clone.setAttribute("aria-hidden", "true");
  clone.setAttribute("inert", "");
  clone.setAttribute("tabindex", "-1");
  clone.style.cssText += `;position:fixed;z-index:110;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;margin:0;transform:translate3d(0,0,0);transform-origin:top left;transition:none;pointer-events:none;overflow:hidden;will-change:transform,opacity;`;
  photo.style.visibility = "hidden";
  modalPhoto.classList.remove("photo-arrived");
  modalPhoto.classList.add("photo-arriving");
  document.body.append(clone);
  photoFlight = { clone, photo, previousVisibility, sourceRect: rect, animation: null, frame: 0, revealTimer: 0 };
  return photoFlight;
}

function finishPhotoFlight(arrived = false) {
  if (!photoFlight) return;
  const flight = photoFlight;
  photoFlight = null;
  if (flight.frame) cancelAnimationFrame(flight.frame);
  if (flight.revealTimer) clearTimeout(flight.revealTimer);
  if (flight.animation && flight.animation.playState !== "finished") flight.animation.cancel();
  flight.clone.remove();
  flight.photo.style.visibility = flight.previousVisibility;
  modalPhoto.classList.remove("photo-arriving");
  modalPhoto.classList.toggle("photo-arrived", arrived);
}

function animatePhotoFlight(flight) {
  if (photoFlight !== flight || !modal.classList.contains("is-open")) return;
  const target = modalPhoto.getBoundingClientRect();
  const source = flight.sourceRect;
  if (!target.width || !target.height) {
    finishPhotoFlight();
    return;
  }
  const dx = target.left - source.left;
  const dy = target.top - source.top;
  const scaleX = target.width / source.width;
  const scaleY = target.height / source.height;
  const arc = Math.min(70, Math.abs(dy) * .16 + 24);
  flight.animation = flight.clone.animate([
    { offset: 0, transform: "translate3d(0,0,0) scale(1,1)" },
    { offset: .52, transform: `translate3d(${dx * .52}px,${dy * .52 - arc}px,0) scale(${1 + (scaleX - 1) * .52},${1 + (scaleY - 1) * .52})` },
    { offset: 1, transform: `translate3d(${dx}px,${dy}px,0) scale(${scaleX},${scaleY})` }
  ], { duration: 1450, easing: "cubic-bezier(.22,.75,.22,1)", fill: "forwards" });
  flight.animation.onfinish = () => finishPhotoFlight(true);
  flight.revealTimer = setTimeout(() => {
    if (photoFlight !== flight) return;
    modalPhoto.classList.add("photo-arrived");
    flight.clone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 290, easing: "ease-out", fill: "forwards" });
  }, 1450 * .8);
}

function openPerson(key, source) {
  const person = people[key] || people.francesco;
  previousFocus = document.activeElement;
  const hasPhoto = typeof person.photo === "string" && person.photo.includes("<img");
  const flight = hasPhoto ? preparePhotoFlight(source) : null;
  pauseEmbers();
  inkSet(modalName, person.name, 1550, true);
  inkSet(modalIntro, person.intro, 2200, true);
  inkSet(modalLetter, person.letter, 2700, true);
  const signDelay = 2700 + (modalLetter._t || 0) + 180;
  inkSet(modalSign, person.sign, signDelay, true);
  modalPhotoText.innerHTML = person.photo || "";
  modalPhoto.classList.toggle("has-photo", hasPhoto);
  modalLayout.classList.toggle("without-photo", !hasPhoto);
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.getElementById("modalClose").focus();
  if (flight) flight.frame = requestAnimationFrame(() => {
    flight.frame = requestAnimationFrame(() => animatePhotoFlight(flight));
  });
}
function closePerson() {
  finishPhotoFlight();
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  startEmbers();
  if (previousFocus) previousFocus.focus();
}

document.querySelectorAll("[data-person]").forEach((button) => {
  button.addEventListener("click", () => openPerson(button.dataset.person, button));
});
document.getElementById("modalClose").addEventListener("click", closePerson);
modal.addEventListener("click", (event) => {
  if (event.target.dataset.close === "true") closePerson();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && photoZoom.classList.contains("is-open")) closePhotoZoom();
  else if (event.key === "Escape" && modal.classList.contains("is-open")) closePerson();
});

// ===== Zoom della foto del mosaico: visualizzatore a tasselli (deep zoom) =====
// La foto gigante non viene mai caricata intera: si scaricano solo i tasselli visibili
// al livello di dettaglio giusto. Nel frattempo si vede l'anteprima già presente nella pagina.
const mosaicPhotoButton = document.getElementById("mosaicZoomOpen");
const mosaicPhoto = mosaicPhotoButton.querySelector(".mosaic-photo");
const photoZoom = document.getElementById("photoZoom");
const photoZoomStage = document.getElementById("photoZoomStage");
const photoZoomCanvas = document.getElementById("photoZoomCanvas");
const photoZoomReset = document.getElementById("photoZoomReset");
const photoZoomHint = document.getElementById("photoZoomHint");
const photoZoomCtx = photoZoomCanvas.getContext("2d", { alpha: false });
if (MOBILE) photoZoomHint.textContent = "Pizzica per ingrandire · trascina per muoverti · doppio tocco per lo zoom";

const PZ_IMG_W = Number(mosaicPhotoButton.dataset.width) || 0;
const PZ_IMG_H = Number(mosaicPhotoButton.dataset.height) || 0;
const PZ_TILE = Number(mosaicPhotoButton.dataset.tileSize) || 512;
const PZ_LEVELS = Number(mosaicPhotoButton.dataset.levels) || 0;
const PZ_TILES_PATH = (mosaicPhotoButton.dataset.tiles || "").replace(/\/$/, "");
const PZ_MAX_SCALE = 2000;     // pixel schermo per pixel della foto: oltre non c'è più nulla da vedere
const PZ_STEP = 1.6;           // fattore dei pulsanti + e −
const PZ_MAX_ACTIVE = 6;       // download di tasselli in parallelo
const PZ_MAX_CACHED = MOBILE ? 64 : 140; // tasselli decodificati tenuti in memoria (~1 MB l'uno)
const PZ_BG = "#170f0b";
const PZ_LEVEL_FX = [];        // fattori di scala di ogni livello (livello 0 = foto piena)
const PZ_LEVEL_FY = [];
const PZ_LEVEL_COLS = [];
const PZ_LEVEL_ROWS = [];
for (let l = 0; l < PZ_LEVELS; l++) {
  const lw = Math.ceil(PZ_IMG_W / 2 ** l);
  const lh = Math.ceil(PZ_IMG_H / 2 ** l);
  PZ_LEVEL_FX[l] = PZ_IMG_W / lw;
  PZ_LEVEL_FY[l] = PZ_IMG_H / lh;
  PZ_LEVEL_COLS[l] = Math.ceil(lw / PZ_TILE);
  PZ_LEVEL_ROWS[l] = Math.ceil(lh / PZ_TILE);
}

const pz = {
  open: false,
  w: 0, h: 0, left: 0, top: 0, dpr: 1,       // dimensioni dell'area in px CSS
  fit: 1, scale: 1, cx: 0, cy: 0,            // cx, cy = punto della foto al centro dello schermo
  atFit: true,
  raf: 0, last: 0, dirty: false, frame: 0,
  anim: null, glide: null,
  pointers: new Map(), gesture: null, lastTap: null, tapStart: null,
  tiles: new Map(), active: 0, label: "",
  previousFocus: null
};
const pzReduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

function pzClamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

// Tiene la foto dentro lo schermo: centrata se è più piccola, altrimenti non esce dai bordi.
function pzConstrain(scale, cx, cy) {
  const halfW = pz.w / 2 / scale;
  const halfH = pz.h / 2 / scale;
  return {
    scale,
    cx: PZ_IMG_W * scale <= pz.w ? PZ_IMG_W / 2 : pzClamp(cx, halfW, PZ_IMG_W - halfW),
    cy: PZ_IMG_H * scale <= pz.h ? PZ_IMG_H / 2 : pzClamp(cy, halfH, PZ_IMG_H - halfH)
  };
}

function pzApply(view) {
  const v = pzConstrain(pzClamp(view.scale, pz.fit, PZ_MAX_SCALE), view.cx, view.cy);
  pz.scale = v.scale; pz.cx = v.cx; pz.cy = v.cy;
  pz.atFit = pz.scale <= pz.fit * 1.0001;
  pz.dirty = true;
  pzSchedule();
}

// Nuova vista che tiene fermo sotto (px, py) il punto della foto che c'era prima.
function pzViewZoomedAt(scale, px, py) {
  const target = pzClamp(scale, pz.fit, PZ_MAX_SCALE);
  const ax = px - pz.w / 2;
  const ay = py - pz.h / 2;
  const ix = pz.cx + ax / pz.scale;
  const iy = pz.cy + ay / pz.scale;
  return pzConstrain(target, ix - ax / target, iy - ay / target);
}

function pzMeasure() {
  const rect = photoZoomStage.getBoundingClientRect();
  pz.left = rect.left; pz.top = rect.top;
  pz.w = Math.max(1, rect.width); pz.h = Math.max(1, rect.height);
  pz.dpr = Math.min(window.devicePixelRatio || 1, 3);
  const bw = Math.round(pz.w * pz.dpr);
  const bh = Math.round(pz.h * pz.dpr);
  if (photoZoomCanvas.width !== bw || photoZoomCanvas.height !== bh) {
    photoZoomCanvas.width = bw;
    photoZoomCanvas.height = bh;
  }
  const wasAtFit = pz.atFit;
  pz.fit = Math.min((pz.w * 0.94) / PZ_IMG_W, Math.max(120, pz.h - 180) / PZ_IMG_H); // spazio per suggerimento e pulsanti
  pzApply({ scale: wasAtFit ? pz.fit : pz.scale, cx: pz.cx || PZ_IMG_W / 2, cy: pz.cy || PZ_IMG_H / 2 });
}

// ----- Animazioni e inerzia -----
function pzStop() {
  pz.anim = null;
  pz.glide = null;
}

function pzAnimateTo(view, ms = 260) {
  const to = pzConstrain(pzClamp(view.scale, pz.fit, PZ_MAX_SCALE), view.cx, view.cy);
  if (pzReduceMotion.matches || ms <= 0) {
    pzStop();
    pzApply(to);
    return;
  }
  pz.glide = null;
  pz.anim = { t0: 0, ms, from: { scale: pz.scale, cx: pz.cx, cy: pz.cy }, to };
  pzSchedule();
}

function pzStepAnim(now) {
  const a = pz.anim;
  if (!a.t0) a.t0 = now;
  const t = Math.min(1, (now - a.t0) / a.ms);
  const e = 1 - Math.pow(1 - t, 3);
  const scale = Math.exp(Math.log(a.from.scale) + (Math.log(a.to.scale) - Math.log(a.from.scale)) * e);
  // Il centro si muove in modo lineare rispetto a 1/scala: tiene fermo il punto sotto il dito/mouse.
  const inv0 = 1 / a.from.scale;
  const inv1 = 1 / a.to.scale;
  const u = Math.abs(inv1 - inv0) > 1e-12 ? (1 / scale - inv0) / (inv1 - inv0) : e;
  pzApply({
    scale,
    cx: a.from.cx + (a.to.cx - a.from.cx) * u,
    cy: a.from.cy + (a.to.cy - a.from.cy) * u
  });
  if (t >= 1) pz.anim = null;
}

function pzStepGlide(dt) {
  const g = pz.glide;
  pzApply({ scale: pz.scale, cx: pz.cx - (g.vx * dt) / pz.scale, cy: pz.cy - (g.vy * dt) / pz.scale });
  const decay = Math.exp(-dt * 0.0045);
  g.vx *= decay;
  g.vy *= decay;
  if (Math.hypot(g.vx, g.vy) < 0.02) pz.glide = null;
}

// ----- Tasselli -----
function pzTileKey(l, x, y) { return `${l}/${x}_${y}`; }

function pzGetTile(l, x, y) {
  const key = pzTileKey(l, x, y);
  let tile = pz.tiles.get(key);
  if (!tile) {
    tile = { key, l, x, y, state: 0, img: null, used: 0 }; // 0 da caricare, 1 in corso, 2 pronto, 3 errore
    pz.tiles.set(key, tile);
  }
  return tile;
}

function pzLoadTile(tile) {
  tile.state = 1;
  pz.active++;
  const img = new Image();
  img.decoding = "async";
  img.src = `${PZ_TILES_PATH}/${tile.l}/${tile.x}_${tile.y}.jpg`;
  const done = (ok) => {
    pz.active--;
    if (pz.tiles.get(tile.key) === tile) {
      tile.state = ok ? 2 : 3;
      tile.used = pz.frame;
      tile.img = ok ? img : null;
      if (ok) pzEvict();
    }
    if (pz.open) { pz.dirty = true; pzSchedule(); }
  };
  if (img.decode) img.decode().then(() => done(true), () => done(false));
  else { img.onload = () => done(true); img.onerror = () => done(false); }
}

function pzEvict() {
  let ready = 0;
  pz.tiles.forEach((t) => { if (t.state === 2) ready++; });
  if (ready <= PZ_MAX_CACHED) return;
  const old = [...pz.tiles.values()].filter((t) => t.state === 2 && t.used < pz.frame - 1).sort((a, b) => a.used - b.used);
  for (const t of old) {
    if (ready <= PZ_MAX_CACHED * 0.8) break;
    pz.tiles.delete(t.key);
    ready--;
  }
}

// ----- Disegno -----
function pzPaint(img, rx0, ry0, rx1, ry1, sxA, syA, sxB, syB, maxW, maxH) {
  // (rx0..rx1, ry0..ry1) = bordi arrotondati della zona sullo schermo (px del canvas, anche fuori dal canvas)
  // (sxA..sxB, syA..syB) = la stessa zona nelle coordinate dell'immagine sorgente
  const cw = photoZoomCanvas.width;
  const ch = photoZoomCanvas.height;
  const dx0 = Math.max(rx0, 0), dx1 = Math.min(rx1, cw);
  const dy0 = Math.max(ry0, 0), dy1 = Math.min(ry1, ch);
  if (dx1 <= dx0 || dy1 <= dy0 || rx1 <= rx0 || ry1 <= ry0) return;
  const u0 = (dx0 - rx0) / (rx1 - rx0), u1 = (dx1 - rx0) / (rx1 - rx0);
  const v0 = (dy0 - ry0) / (ry1 - ry0), v1 = (dy1 - ry0) / (ry1 - ry0);
  const sx = pzClamp(sxA + (sxB - sxA) * u0, 0, maxW);
  const sy = pzClamp(syA + (syB - syA) * v0, 0, maxH);
  const sw = Math.min(maxW - sx, (sxB - sxA) * (u1 - u0));
  const sh = Math.min(maxH - sy, (syB - syA) * (v1 - v0));
  if (sw <= 0 || sh <= 0) return;
  photoZoomCtx.drawImage(img, sx, sy, sw, sh, dx0, dy0, dx1 - dx0, dy1 - dy0);
}

// Disegna un tassello; se non è ancora arrivato usa quello del livello più grossolano già pronto.
function pzPaintTile(l, x, y, a, d) {
  const key = pzTileKey(l, x, y);
  const tile = pz.tiles.get(key);
  if (tile && tile.state === 2) {
    tile.used = pz.frame;
    const fx = PZ_LEVEL_FX[l], fy = PZ_LEVEL_FY[l];
    pzPaint(tile.img, d.x0, d.y0, d.x1, d.y1,
      a.x0 / fx - x * PZ_TILE, a.y0 / fy - y * PZ_TILE, a.x1 / fx - x * PZ_TILE, a.y1 / fy - y * PZ_TILE,
      tile.img.naturalWidth, tile.img.naturalHeight);
    return;
  }
  if (l + 1 >= PZ_LEVELS) return; // sotto resta visibile l'anteprima
  const nl = l + 1;
  const nx = Math.floor((a.x0 + a.x1) / 2 / PZ_LEVEL_FX[nl] / PZ_TILE);
  const ny = Math.floor((a.y0 + a.y1) / 2 / PZ_LEVEL_FY[nl] / PZ_TILE);
  pzPaintTile(nl, nx, ny, a, d);
}

function pzDraw() {
  pz.frame++;
  const ctx = photoZoomCtx;
  const cw = photoZoomCanvas.width;
  const ch = photoZoomCanvas.height;
  const dpr = pz.dpr;
  const s = pz.scale * dpr; // pixel del canvas per pixel della foto
  const ox = (pz.w / 2 - pz.cx * pz.scale) * dpr;
  const oy = (pz.h / 2 - pz.cy * pz.scale) * dpr;

  ctx.fillStyle = PZ_BG;
  ctx.fillRect(0, 0, cw, ch);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "medium";

  // 1) base: l'anteprima, sempre disponibile
  if (mosaicPhoto.complete && mosaicPhoto.naturalWidth) {
    const pw = mosaicPhoto.naturalWidth, ph = mosaicPhoto.naturalHeight;
    pzPaint(mosaicPhoto, Math.round(ox), Math.round(oy), Math.round(ox + PZ_IMG_W * s), Math.round(oy + PZ_IMG_H * s),
      0, 0, pw, ph, pw, ph);
  }

  // 2) tasselli del livello di dettaglio giusto (più un anello di margine da precaricare)
  if (!PZ_LEVELS) return;
  const ideal = Math.floor(Math.log2(1 / s));
  if (ideal >= PZ_LEVELS) return; // da così lontano basta l'anteprima
  const level = Math.max(0, ideal);

  const fx = PZ_LEVEL_FX[level], fy = PZ_LEVEL_FY[level];
  const cols = PZ_LEVEL_COLS[level], rows = PZ_LEVEL_ROWS[level];
  const lw = Math.ceil(PZ_IMG_W / 2 ** level), lh = Math.ceil(PZ_IMG_H / 2 ** level);
  const vx0 = -ox / s, vx1 = (cw - ox) / s;
  const vy0 = -oy / s, vy1 = (ch - oy) / s;
  const tx0 = pzClamp(Math.floor(vx0 / fx / PZ_TILE), 0, cols - 1);
  const tx1 = pzClamp(Math.floor(vx1 / fx / PZ_TILE), 0, cols - 1);
  const ty0 = pzClamp(Math.floor(vy0 / fy / PZ_TILE), 0, rows - 1);
  const ty1 = pzClamp(Math.floor(vy1 / fy / PZ_TILE), 0, rows - 1);
  const centerX = pz.cx, centerY = pz.cy;
  const wanted = [];

  for (let ty = ty0 - 1; ty <= ty1 + 1; ty++) {
    for (let tx = tx0 - 1; tx <= tx1 + 1; tx++) {
      if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) continue;
      const visible = tx >= tx0 && tx <= tx1 && ty >= ty0 && ty <= ty1;
      const tw = Math.min(PZ_TILE, lw - tx * PZ_TILE);
      const th = Math.min(PZ_TILE, lh - ty * PZ_TILE);
      const a = { x0: tx * PZ_TILE * fx, y0: ty * PZ_TILE * fy, x1: (tx * PZ_TILE + tw) * fx, y1: (ty * PZ_TILE + th) * fy };
      const tile = pzGetTile(level, tx, ty);
      if (tile.state === 0) wanted.push({ tile, dist: Math.hypot((a.x0 + a.x1) / 2 - centerX, (a.y0 + a.y1) / 2 - centerY) - (visible ? 1e9 : 0) });
      if (!visible) continue;
      const d = { x0: Math.round(ox + a.x0 * s), y0: Math.round(oy + a.y0 * s), x1: Math.round(ox + a.x1 * s), y1: Math.round(oy + a.y1 * s) };
      pzPaintTile(level, tx, ty, a, d);
    }
  }

  // 3) avvia i download, prima i tasselli visibili e più vicini al centro
  wanted.sort((p, q) => p.dist - q.dist);
  for (const item of wanted) {
    if (pz.active >= PZ_MAX_ACTIVE) break;
    pzLoadTile(item.tile);
  }
}

function pzFormatZoom() {
  const pct = (pz.scale / pz.fit) * 100;
  return pct < 10000 ? `${Math.round(pct).toLocaleString("it-IT")}%` : `×${Math.round(pct / 100).toLocaleString("it-IT")}`;
}

function pzTick(now) {
  pz.raf = 0;
  if (!pz.open) return;
  const dt = pz.last ? Math.min(48, now - pz.last) : 16;
  pz.last = now;
  if (pz.anim) pzStepAnim(now);
  if (pz.glide) pzStepGlide(dt);
  if (pz.dirty) {
    pz.dirty = false;
    pzDraw();
    const label = pzFormatZoom();
    if (label !== pz.label) {
      pz.label = label;
      photoZoomReset.textContent = label;
    }
  }
  if (pz.anim || pz.glide) pzSchedule();
  else pz.last = 0;
}

function pzSchedule() {
  if (!pz.raf && pz.open) pz.raf = requestAnimationFrame(pzTick);
}

// ----- Apertura e chiusura -----
function openPhotoZoom() {
  if (!mosaicPhoto.complete || !mosaicPhoto.naturalWidth || !PZ_IMG_W || !PZ_IMG_H) return;
  pz.previousFocus = document.activeElement;
  pz.open = true;
  pz.atFit = true;
  pz.cx = PZ_IMG_W / 2;
  pz.cy = PZ_IMG_H / 2;
  pz.label = "";
  photoZoom.classList.add("is-open");
  photoZoom.setAttribute("aria-hidden", "false");
  photoZoomHint.classList.remove("is-hidden");
  document.body.style.overflow = "hidden";
  pzMeasure();
  document.getElementById("photoZoomClose").focus();
}

function closePhotoZoom() {
  pz.open = false;
  pzStop();
  pz.pointers.clear();
  pz.gesture = null;
  if (pz.raf) cancelAnimationFrame(pz.raf);
  pz.raf = 0;
  pz.last = 0;
  pz.tiles.clear(); // libera la memoria dei tasselli
  photoZoom.classList.remove("is-open");
  photoZoom.setAttribute("aria-hidden", "true");
  document.body.style.overflow = modal.classList.contains("is-open") ? "hidden" : "";
  if (pz.previousFocus) pz.previousFocus.focus();
}

function updateMosaicPhotoAvailability() {
  const available = mosaicPhoto.complete && mosaicPhoto.naturalWidth > 0;
  mosaicPhotoButton.classList.toggle("is-empty", !available);
  mosaicPhotoButton.disabled = !available;
}
mosaicPhoto.addEventListener("load", updateMosaicPhotoAvailability);
mosaicPhoto.addEventListener("error", updateMosaicPhotoAvailability);
updateMosaicPhotoAvailability();
mosaicPhotoButton.addEventListener("click", openPhotoZoom);
document.getElementById("photoZoomClose").addEventListener("click", closePhotoZoom);
photoZoom.addEventListener("click", (event) => {
  if (event.target.closest("[data-zoom-close]")) closePhotoZoom();
});
new ResizeObserver(() => { if (pz.open) pzMeasure(); }).observe(photoZoomStage);

// ----- Comandi: pulsanti, tastiera, rotella, dita -----
function pzHideHint() { photoZoomHint.classList.add("is-hidden"); }

function pzZoomBy(factor, px = pz.w / 2, py = pz.h / 2, ms = 240) {
  pzHideHint();
  const base = pz.anim ? pz.anim.to : { scale: pz.scale, cx: pz.cx, cy: pz.cy };
  const ax = px - pz.w / 2, ay = py - pz.h / 2;
  const target = pzClamp(base.scale * factor, pz.fit, PZ_MAX_SCALE);
  const ix = base.cx + ax / base.scale, iy = base.cy + ay / base.scale;
  pzAnimateTo({ scale: target, cx: ix - ax / target, cy: iy - ay / target }, ms);
}

function pzReset() {
  pzHideHint();
  pzAnimateTo({ scale: pz.fit, cx: PZ_IMG_W / 2, cy: PZ_IMG_H / 2 }, 320);
}

photoZoom.addEventListener("click", (event) => {
  const button = event.target.closest("[data-zoom-step]");
  if (button) pzZoomBy(button.dataset.zoomStep === "1" ? PZ_STEP : 1 / PZ_STEP);
});
photoZoomReset.addEventListener("click", pzReset);

document.addEventListener("keydown", (event) => {
  if (!pz.open || event.ctrlKey || event.metaKey || event.altKey) return;
  const pan = (dx, dy) => {
    event.preventDefault();
    pzHideHint();
    pzStop();
    pzApply({ scale: pz.scale, cx: pz.cx + (dx * pz.w * 0.18) / pz.scale, cy: pz.cy + (dy * pz.h * 0.18) / pz.scale });
  };
  if (event.key === "+" || event.key === "=") { event.preventDefault(); pzZoomBy(PZ_STEP); }
  else if (event.key === "-" || event.key === "_") { event.preventDefault(); pzZoomBy(1 / PZ_STEP); }
  else if (event.key === "0") { event.preventDefault(); pzReset(); }
  else if (event.key === "ArrowLeft") pan(-1, 0);
  else if (event.key === "ArrowRight") pan(1, 0);
  else if (event.key === "ArrowUp") pan(0, -1);
  else if (event.key === "ArrowDown") pan(0, 1);
});

photoZoomStage.addEventListener("wheel", (event) => {
  event.preventDefault();
  pzHideHint();
  pzStop();
  const unit = event.deltaMode === 1 ? 33 : event.deltaMode === 2 ? pz.h : 1;
  const k = event.ctrlKey ? 0.012 : 0.0022; // ctrl = pizzico sul trackpad
  const rect = photoZoomStage.getBoundingClientRect();
  const view = pzViewZoomedAt(pz.scale * Math.exp(-event.deltaY * unit * k), event.clientX - rect.left, event.clientY - rect.top);
  pzApply(view);
}, { passive: false });

function pzPointerPos(event) {
  return { x: event.clientX - pz.left, y: event.clientY - pz.top };
}

function pzBeginGesture() {
  const pts = [...pz.pointers.values()];
  if (pts.length === 1) {
    pz.gesture = { type: "pan", x: pts[0].x, y: pts[0].y, cx: pz.cx, cy: pz.cy, samples: [{ t: performance.now(), x: pts[0].x, y: pts[0].y }] };
  } else if (pts.length >= 2) {
    const [p, q] = pts;
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    pz.gesture = {
      type: "pinch",
      dist: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)),
      scale: pz.scale,
      ix: pz.cx + (mx - pz.w / 2) / pz.scale,
      iy: pz.cy + (my - pz.h / 2) / pz.scale
    };
  } else {
    pz.gesture = null;
  }
}

photoZoomStage.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  pzHideHint();
  pzStop();
  photoZoomStage.setPointerCapture(event.pointerId);
  pz.pointers.set(event.pointerId, pzPointerPos(event));
  pzBeginGesture();
  pz.tapStart = { t: performance.now(), x: event.clientX, y: event.clientY, moved: false, multi: pz.pointers.size > 1 };
  if (pz.pointers.size === 1) photoZoomCanvas.classList.add("is-dragging");
});

photoZoomStage.addEventListener("pointermove", (event) => {
  if (!pz.pointers.has(event.pointerId) || !pz.gesture) return;
  const pos = pzPointerPos(event);
  pz.pointers.set(event.pointerId, pos);
  if (pz.tapStart && Math.hypot(event.clientX - pz.tapStart.x, event.clientY - pz.tapStart.y) > 6) pz.tapStart.moved = true;
  const g = pz.gesture;
  if (g.type === "pan") {
    g.samples.push({ t: performance.now(), x: pos.x, y: pos.y });
    if (g.samples.length > 8) g.samples.shift();
    pzApply({ scale: pz.scale, cx: g.cx - (pos.x - g.x) / pz.scale, cy: g.cy - (pos.y - g.y) / pz.scale });
  } else {
    const [p, q] = [...pz.pointers.values()];
    const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
    const scale = pzClamp(g.scale * (Math.hypot(p.x - q.x, p.y - q.y) / g.dist), pz.fit, PZ_MAX_SCALE);
    pzApply({ scale, cx: g.ix - (mx - pz.w / 2) / scale, cy: g.iy - (my - pz.h / 2) / scale });
  }
});

function pzEndPointer(event) {
  if (!pz.pointers.has(event.pointerId)) return;
  const wasPan = pz.gesture && pz.gesture.type === "pan";
  const samples = wasPan ? pz.gesture.samples : [];
  pz.pointers.delete(event.pointerId);
  const tap = pz.tapStart;
  const isTap = event.type === "pointerup" && tap && !tap.moved && !tap.multi && performance.now() - tap.t < 300;
  pz.tapStart = null;
  if (pz.pointers.size === 0) photoZoomCanvas.classList.remove("is-dragging");

  if (isTap) {
    const now = performance.now();
    const pos = pzPointerPos(event);
    const prev = pz.lastTap;
    if (prev && now - prev.t < 340 && Math.hypot(pos.x - prev.x, pos.y - prev.y) < 30) {
      // doppio tocco / doppio clic: dalla vista intera alla risoluzione reale, altrimenti torna alla vista intera
      pz.lastTap = null;
      if (pz.scale > pz.fit * 1.2) pzReset();
      else pzZoomBy(Math.max(3, 1 / pz.dpr / pz.fit), pos.x, pos.y, 320);
      return;
    }
    pz.lastTap = { t: now, x: pos.x, y: pos.y };
  }

  if (pz.pointers.size === 0 && wasPan && event.type === "pointerup" && samples.length > 1) {
    const last = samples[samples.length - 1];
    const first = samples.find((s) => last.t - s.t <= 100) || samples[0];
    const span = last.t - first.t;
    if (span > 0 && performance.now() - last.t < 60 && !pzReduceMotion.matches) {
      const vx = (last.x - first.x) / span, vy = (last.y - first.y) / span;
      if (Math.hypot(vx, vy) > 0.08) {
        pz.glide = { vx: pzClamp(vx, -4, 4), vy: pzClamp(vy, -4, 4) };
        pzSchedule();
      }
    }
  }
  pzBeginGesture(); // se resta un dito, riparte il trascinamento da lì
}
photoZoomStage.addEventListener("pointerup", pzEndPointer);
photoZoomStage.addEventListener("pointercancel", pzEndPointer);

// Reveal gli elementi quando entrano nella schermata.
const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const siblings = [...entry.target.parentElement.children];
      const index = siblings.indexOf(entry.target);
      entry.target.style.transitionDelay = `${Math.min(index * 75, 420)}ms`;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

// ===== Inchiostro, carta bruciata, particelle =====
const REDUCE = matchMedia("(prefers-reduced-motion: reduce)").matches;
let magic = false;
const LITE = /lite/.test(location.search);
const ready = Promise.all([new Promise(r => setTimeout(r, REDUCE ? 0 : 2100)), document.fonts ? document.fonts.ready : 0]);
function split(el) {
  const walk = n => [...n.childNodes].forEach(c => {
    if (c.nodeType === 3) {
      const f = document.createDocumentFragment();
      c.textContent.split(/(\s+)/).forEach(t => {
        if (!t) return;
        if (/^\s+$/.test(t)) return f.append(t);
        const w = document.createElement("span"); w.className = "w";
        [...t].forEach(ch => { const s = document.createElement("span"); s.className = "ch"; s.textContent = ch; w.append(s); });
        f.append(w);
      });
      c.replaceWith(f);
    } else if (c.nodeType === 1 && c.tagName !== "BR") walk(c);
  });
  el.setAttribute("aria-label", el.textContent);
  walk(el);
  const chars = el.querySelectorAll(".ch");
  if (chars.length > 60) {
    const ws = el.querySelectorAll(".w");
    ws.forEach((w, i) => w.style.setProperty("--wi", i));
    el._t = ws.length * 40 + 800; el.classList.add("long");
  } else {
    chars.forEach((c, i) => c.style.setProperty("--i", i));
    el._t = chars.length * 65 + 900;
  }
  el.classList.add("ink");
}
async function write(el, waitForReady = true) {
  if (waitForReady) await ready;
  await new Promise(r => setTimeout(r, +el.dataset.d || 150));
  el.classList.add("writing");
  setTimeout(() => {
    el.classList.add("dry");
    if (el.id === "typewriterText") { const r = el.getBoundingClientRect(); celebrate(r.left + r.width / 2, r.top + r.height / 2); }
  }, el._t);
}
function inkSet(el, text, d, immediate = false) {
  el.classList.remove("writing", "dry", "ink", "long"); el.textContent = text; el.dataset.d = d;
  if (REDUCE) return; split(el); write(el, !immediate);
}
const dedEl = document.getElementById("typewriterText");
dedEl.dataset.t = dedEl.textContent;
document.getElementById("replayButton").addEventListener("click", () => inkSet(dedEl, dedEl.dataset.t, 100));

if (!REDUCE) {
  const seq = new Map();
  const inkObs = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    inkObs.unobserve(e.target);
    const s = e.target.closest(".hero"), k = seq.get(s) || 0;
    if (s) { seq.set(s, k + 1); e.target.dataset.d = k * 700; }
    write(e.target);
  }), { threshold: .3 });
  document.querySelectorAll("h1,h2,.section-kicker,.hero-subtitle,.intro-text,.quote-inner p,.quote-signature,.side-note,.mosaic-heading>p:last-child,.finale-content>p,.notes h3,.notes p,.dedication-note").forEach(el => {
    if (el.closest(".modal")) return;
    split(el); inkObs.observe(el);
  });
  // le carte ritrovano il loro posto dopo l'entrata
  document.querySelectorAll(".reveal").forEach(el => new MutationObserver((m, o) => {
    if (el.classList.contains("is-visible")) { o.disconnect(); setTimeout(() => { el.classList.remove("reveal", "is-visible"); el.style.transitionDelay = ""; }, 1800); }
  }).observe(el, { attributes: true, attributeFilter: ["class"] }));
}
// Burn intro
const burnEl = document.getElementById("introBurn");
if (REDUCE || LITE) burnEl.remove(); else setTimeout(() => burnEl.remove(), 2500);

// Braci e polvere dorata (sprite pre-renderizzato, niente shadowBlur)
const cv = document.getElementById("embers"), cx = cv.getContext("2d");
const spr = document.createElement("canvas"); spr.width = spr.height = 24;
{ const c = spr.getContext("2d"), g = c.createRadialGradient(12, 12, 0, 12, 12, 12);
  g.addColorStop(0, "#ffe9a8"); g.addColorStop(.35, "#ffb347cc"); g.addColorStop(1, "#ffb34700");
  c.fillStyle = g; c.fillRect(0, 0, 24, 24); }
let P = [];
function size() { cv.width = innerWidth >> 1; cv.height = innerHeight >> 1; cx.setTransform(.5, 0, 0, .5, 0, 0); }
// Sul telefono "resize" scatta a ogni comparsa/scomparsa della barra di Chrome mentre si scorre:
// ridimensionare la canvas ogni volta la svuota e la rialloca. Si rifà solo per cambi veri (rotazione).
let sizeW = innerWidth, sizeH = innerHeight;
addEventListener("resize", () => {
  if (MOBILE && innerWidth === sizeW && Math.abs(innerHeight - sizeH) < 160) return;
  sizeW = innerWidth; sizeH = innerHeight; size();
});
size();
function spawn(x, y, b) {
  const a = Math.random() * 6.28, s = b ? 1 + Math.random() * 4 : .3 + Math.random() * .6;
  P.push({ x, y, vx: b ? Math.cos(a) * s : (Math.random() - .5) * .4, vy: b ? Math.sin(a) * s - 1 : -s, r: 1 + Math.random() * 2, l: b ? 70 + Math.random() * 70 : 300 + Math.random() * 300 });
}
let particleLimit = 16;
function burst(x, y, n) { if (!REDUCE) for (let i = 0; i < Math.min(n, particleLimit); i++) spawn(x, y, true); }
function celebrate(x, y) {
  if (REDUCE) return;
  const sparkCount = Math.max(12, Math.min(20, particleLimit + 4));
  const colors = ["#b72e3d", "#d34b50", "#e7b45d"];
  const centers = [
    { x: Math.max(28, x - 62), y: Math.max(48, y - 24) },
    { x: Math.min(innerWidth - 28, x + 62), y: Math.max(48, y - 68) }
  ];
  centers.forEach((center, burstIndex) => {
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + burstIndex * .16;
      const speed = 1.2 + Math.random() * 2.3;
      const life = 48 + Math.random() * 24;
      P.push({
        kind: "firework",
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: 1 + Math.random() * 1.4,
        color: colors[(i + burstIndex) % colors.length],
        l: life,
        maxL: life
      });
    }
  });
  for (let i = 0; i < 9; i++) {
    const life = 95 + Math.random() * 45;
    P.push({
      kind: "heart",
      x: x + (Math.random() - .5) * 112,
      y: y + 12 + Math.random() * 20,
      vx: (Math.random() - .5) * 1.5,
      vy: -1.5 - Math.random() * 1.5,
      size: 7 + Math.random() * 6,
      rotation: (Math.random() - .5) * .8,
      spin: (Math.random() - .5) * .025,
      color: colors[Math.floor(Math.random() * 2)],
      l: life,
      maxL: life
    });
  }
}
let last = 0, frames = 0, frameTime = 0, emberRaf = 0;
function tick(t) {
  emberRaf = 0;
  if (document.hidden || modal.classList.contains("is-open")) return;
  if (MOBILE && t - last < 30) { emberRaf = requestAnimationFrame(tick); return; }
  const raw = t - last, dt = Math.min(2.5, raw / 16.67 || 1); last = t;
  frameTime += raw;
  if (++frames >= 90) {
    const fps = frames * 1000 / frameTime;
    const lo = MOBILE ? 24 : 50, hi = MOBILE ? 27 : 57; // su telefono il ciclo gira volutamente a ~30 fps
    particleLimit = fps < lo ? 8 : fps > hi ? 16 : particleLimit;
    frames = 0;
    frameTime = 0;
  }
  cx.clearRect(0, 0, innerWidth, innerHeight);
  if (P.length < Math.min(magic ? 40 : 16, particleLimit) && Math.random() < .3 * dt) spawn(Math.random() * innerWidth, innerHeight + 10);
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i];
    p.l -= dt;
    if (p.l <= 0) { P.splice(i, 1); continue; }
    const previousX = p.x, previousY = p.y;
    p.x += (p.vx + (p.kind ? 0 : Math.sin(p.l / 30) * .2)) * dt;
    p.y += p.vy * dt;
    if (p.kind === "firework") {
      p.vx *= Math.pow(.986, dt);
      p.vy += .035 * dt;
    } else if (p.kind === "heart") {
      p.vx *= Math.pow(.99, dt);
      p.vy += .018 * dt;
      p.rotation += p.spin * dt;
    } else if (p.vy > -.3) p.vy *= Math.pow(.985, dt);
    cx.globalAlpha = p.kind ? Math.min(1, p.l / 18) : Math.min(1, p.l / 60) * (.55 + .45 * Math.sin(p.l / 6));
    if (p.kind === "firework") {
      cx.beginPath();
      cx.moveTo(previousX, previousY);
      cx.lineTo(p.x, p.y);
      cx.strokeStyle = p.color;
      cx.lineWidth = p.r;
      cx.stroke();
    } else if (p.kind === "heart") {
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rotation);
      cx.scale(p.size / 16, p.size / 16);
      cx.beginPath();
      cx.moveTo(0, 5);
      cx.bezierCurveTo(-12, -2, -8, -9, -3, -8);
      cx.bezierCurveTo(0, -8, 0, -5, 0, -4);
      cx.bezierCurveTo(1, -8, 5, -10, 8, -7);
      cx.bezierCurveTo(13, -2, 8, 3, 0, 10);
      cx.closePath();
      cx.fillStyle = p.color;
      cx.fill();
      cx.restore();
    } else {
      const d = p.r * 6; cx.drawImage(spr, p.x - d / 2, p.y - d / 2, d, d);
    }
  }
  emberRaf = requestAnimationFrame(tick);
}
function startEmbers() {
  if (REDUCE || LITE || document.hidden || modal.classList.contains("is-open") || emberRaf) return;
  last = performance.now();
  emberRaf = requestAnimationFrame(tick);
}
function pauseEmbers() {
  if (emberRaf) cancelAnimationFrame(emberRaf);
  emberRaf = 0;
}
document.addEventListener("visibilitychange", () => document.hidden ? pauseEmbers() : startEmbers());
if (!REDUCE && !LITE) { setTimeout(() => { burst(innerWidth / 2, innerHeight * .55, 40); startEmbers(); }, 1900); } else cv.remove();

// Gocce d'inchiostro al click, parallasse e barra di scrittura
addEventListener("click", e => {
  if (REDUCE || e.target.closest(".letter-card")) return;
  for (let i = 0; i < 4; i++) {
    const d = document.createElement("i"), s = 6 + Math.random() * 16;
    d.className = "drop";
    d.style.cssText = `left:${e.clientX + (Math.random() - .5) * 50}px;top:${e.clientY + (Math.random() - .5) * 50}px;width:${s}px;height:${s}px;animation-delay:${i * 40}ms`;
    document.body.append(d); setTimeout(() => d.remove(), 1900);
  }
});
const heroArt = document.querySelector(".hero-art");
let mx = 0, my = 0, mraf = 0;
if (!MOBILE) addEventListener("pointermove", e => {
  mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5;
  if (mraf) return;
  mraf = requestAnimationFrame(() => { mraf = 0; if (scrollY < innerHeight) { heroArt.style.setProperty("--mx", mx); heroArt.style.setProperty("--my", my); } });
}, { passive: true });
const bar = document.getElementById("inkProgress");
let sraf = 0;
addEventListener("scroll", () => {
  if (sraf) return;
  sraf = requestAnimationFrame(() => { sraf = 0; bar.style.transform = `scaleX(${scrollY / (document.documentElement.scrollHeight - innerHeight)})`; });
}, { passive: true });

// Mette in pausa le animazioni della copertina quando non si vede
const heroEl = document.querySelector(".hero");
new IntersectionObserver(([e]) => heroEl.classList.toggle("hero-off", !e.isIntersecting)).observe(heroEl);
