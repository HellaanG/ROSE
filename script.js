'use strict';

// Happy Anniversary rose: seed -> sprout -> leaves -> bud -> full bloom.
// Music starts only after the visitor clicks, because browsers block autoplay.

const canvas = document.getElementById('roseCanvas');
const ctx = canvas.getContext('2d');
const music = document.getElementById('bgMusic');
const startBtn = document.getElementById('startBtn');
const replayBtn = document.getElementById('replayBtn');
const musicStatus = document.getElementById('musicStatus');

const W = canvas.width;
const H = canvas.height;
const DURATION = 34; // seconds; the song loops until the rose is fully grown
const cx = 400;
const cy = 285;

const C = {
  burgundy: '#650b29', rose: '#8f1740', pink: '#bd5277', blush: '#df91aa',
  green: '#174d2b', leaf: '#286a3b', leafLight: '#78a66c', heart: '#f5a9c0',
  gold: '#e7c18b', soil: '#302016'
};

const loveLanguages = [
  'I LOVE YOU', 'நான் உன்னை காதலிக்கிறேன்', 'நான் உன்னை நேசிக்கிறேன்',
  'Saya sayang awak', 'Aku cinta kamu', '我爱你', '我愛你', '愛してる',
  '大好きです', '사랑해', '사랑해요', "Je t'aime", 'Te amo', 'Ti amo',
  'Ich liebe dich', 'Eu te amo', 'Amo-te', 'Я тебя люблю', 'Я кохаю тебе',
  'أحبك', 'मुझे तुमसे प्यार है', 'Mahal kita', 'Nakupenda', 'Ngiyakuthanda',
  'Seni seviyorum', 'Ik hou van jou', 'Jeg elsker dig', 'Jeg elsker deg',
  'Kocham cię', 'Miluji tě', 'Te iubesc', 'Szeretlek', 'Volim te',
  "Σ' αγαπώ", 'T’estimo', 'Mo nifẹ rẹ', 'Ez te hez dikim', 'Wo ai ni'
];

let rafId = 0;
let startTime = null;
let running = false;
let particles = [];

// Rose silhouette with softly scalloped edges.
const flowerShape = new Path2D();
for (let i = 0; i <= 720; i++) {
  const a = (i / 720) * Math.PI * 2;
  const r = 1 + 0.055 * Math.cos(7 * a + 0.25) + 0.018 * Math.cos(14 * a);
  const x = cx + 222 * r * Math.cos(a);
  const y = cy + 185 * r * Math.sin(a);
  if (i === 0) flowerShape.moveTo(x, y); else flowerShape.lineTo(x, y);
}
flowerShape.closePath();

// Plant stem is defined from soil upwards so the dash reveal grows from the seed.
const stemPath = new Path2D();
stemPath.moveTo(400, 875);
stemPath.bezierCurveTo(416, 760, 382, 620, 400, 455);

const leftLeaf = new Path2D();
leftLeaf.moveTo(398, 655);
leftLeaf.bezierCurveTo(340, 605, 270, 610, 230, 665);
leftLeaf.bezierCurveTo(275, 716, 350, 705, 398, 655);
leftLeaf.closePath();

const rightLeaf = new Path2D();
rightLeaf.moveTo(402, 755);
rightLeaf.bezierCurveTo(470, 700, 545, 718, 575, 775);
rightLeaf.bezierCurveTo(530, 825, 455, 817, 402, 755);
rightLeaf.closePath();

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
function phase(t, from, to) { return smooth((t - from) / (to - from)); }

function drawSoil() {
  ctx.save();
  const g = ctx.createLinearGradient(320, 865, 480, 900);
  g.addColorStop(0, '#4a3021'); g.addColorStop(1, '#160d09');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(400, 884, 95, 13, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawSeed(p) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = p;
  ctx.translate(400, 866); ctx.rotate(-0.48);
  const g = ctx.createLinearGradient(-14, -20, 14, 20);
  g.addColorStop(0, '#c19a69'); g.addColorStop(.45, '#77502f'); g.addColorStop(1, '#352018');
  ctx.fillStyle = g; ctx.shadowColor = '#b8895b'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 18, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#d0a777'; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawStem(p) {
  if (p <= 0) return;
  ctx.save();
  const g = ctx.createLinearGradient(390, 460, 410, 880);
  g.addColorStop(0, C.leafLight); g.addColorStop(.5, C.leaf); g.addColorStop(1, '#10371f');
  ctx.strokeStyle = g; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.shadowColor = '#4c9a55'; ctx.shadowBlur = 9;
  const dashLength = 520;
  ctx.setLineDash([dashLength, dashLength]);
  ctx.lineDashOffset = dashLength * (1 - p);
  ctx.stroke(stemPath);
  ctx.setLineDash([]);
  // Fine highlight along the stem.
  ctx.globalAlpha = p * .5; ctx.strokeStyle = '#9abe83'; ctx.lineWidth = 2;
  ctx.stroke(stemPath);
  ctx.restore();
}

function drawLeaves(p) {
  if (p <= 0) return;
  ctx.save();
  ctx.globalAlpha = p;
  const g = ctx.createLinearGradient(230, 620, 570, 820);
  g.addColorStop(0, '#729e60'); g.addColorStop(.48, C.leaf); g.addColorStop(1, '#123e24');
  ctx.fillStyle = g; ctx.shadowColor = '#3c8750'; ctx.shadowBlur = 10;
  // Slight scale-up makes leaves unfold rather than pop in.
  ctx.translate(400, 700); ctx.scale(.72 + .28 * p, .72 + .28 * p); ctx.translate(-400, -700);
  ctx.fill(leftLeaf); ctx.fill(rightLeaf);
  ctx.shadowBlur = 0; ctx.strokeStyle = '#a3c58c'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(398, 655); ctx.quadraticCurveTo(310, 640, 230, 665);
  ctx.moveTo(402, 755); ctx.quadraticCurveTo(490, 755, 575, 775); ctx.stroke();
  ctx.restore();
}

function drawBud(p) {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = p;
  ctx.translate(400, 465); ctx.scale(.75 + .25 * p, .75 + .25 * p);
  // Green sepals around the bud.
  ctx.fillStyle = '#245b34';
  ctx.beginPath(); ctx.moveTo(-12, 18); ctx.quadraticCurveTo(-55, -12, -53, -61);
  ctx.quadraticCurveTo(-22, -39, 0, -20); ctx.quadraticCurveTo(22, -39, 53, -61);
  ctx.quadraticCurveTo(55, -12, 12, 18); ctx.closePath(); ctx.fill();
  const g = ctx.createRadialGradient(-18, -66, 4, 0, -38, 72);
  g.addColorStop(0, '#d16b8c'); g.addColorStop(.38, '#8e1741'); g.addColorStop(1, '#390619');
  ctx.fillStyle = g; ctx.shadowColor = '#a51c4c'; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(0, 18);
  ctx.bezierCurveTo(-72, -12, -58, -105, 0, -112);
  ctx.bezierCurveTo(58, -105, 72, -12, 0, 18); ctx.fill();
  ctx.strokeStyle = '#d47b96'; ctx.lineWidth = 2; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(-2, -98); ctx.quadraticCurveTo(28, -64, 4, -25); ctx.stroke();
  ctx.restore();
}

function drawFlowerBase(p) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
  const g = ctx.createRadialGradient(385, 265, 8, 400, 300, 255);
  g.addColorStop(0, '#c35b7c'); g.addColorStop(.2, '#a12a51');
  g.addColorStop(.58, '#650b29'); g.addColorStop(1, '#300515');
  ctx.fillStyle = g; ctx.shadowColor = '#8c1640'; ctx.shadowBlur = 25; ctx.fill(flowerShape);
  ctx.shadowBlur = 0; ctx.strokeStyle = '#b34a6d'; ctx.lineWidth = 2; ctx.stroke(flowerShape);
  ctx.restore();
}

function drawPetalLayers(p) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
  ctx.globalAlpha = .52;
  // Curved petal ribs give the flower depth without obscuring the words.
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.quadraticCurveTo(cx + Math.cos(a + .3) * 105, cy + Math.sin(a + .3) * 88,
      cx + Math.cos(a) * 202, cy + Math.sin(a) * 168);
    ctx.strokeStyle = i % 2 ? '#d47b96' : '#4b071f'; ctx.lineWidth = 2; ctx.stroke();
  }
  // Inner curled petal.
  ctx.globalAlpha = .7; ctx.strokeStyle = '#e08aa5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(400, 300); ctx.bezierCurveTo(455, 255, 485, 320, 438, 352);
  ctx.bezierCurveTo(395, 380, 365, 330, 400, 300); ctx.stroke();
  ctx.restore();
}

function drawRoseWords(p) {
  if (p <= 0) return;
  const shades = ['#d77b98', '#b94b70', '#8c2045', '#e29ab0', '#a62e55'];
  ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
  ctx.clip(flowerShape);
  let row = 0;
  for (let y = 125; y <= 475; y += 15) {
    // Offset alternate rows to create a woven typographic texture.
    let x = row % 2 ? -120 : -55;
    let index = row * 5;
    while (x < W + 120) {
      const phrase = loveLanguages[index % loveLanguages.length];
      ctx.font = '600 11px Arial, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = shades[index % shades.length];
      ctx.globalAlpha = .88;
      ctx.fillText(phrase, x, y);
      x += ctx.measureText(phrase).width + 13;
      index++;
    }
    row++;
  }
  ctx.restore();
}

function drawHeart(x, y, size, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.scale(size / 16, size / 16);
  ctx.fillStyle = C.heart; ctx.shadowColor = '#e879a3'; ctx.shadowBlur = 12;
  ctx.beginPath(); ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-25, -10, -17, -27, 0, -13);
  ctx.bezierCurveTo(17, -27, 25, -10, 0, 6); ctx.fill(); ctx.restore();
}

function drawSparkle(x, y, size, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5;
  ctx.shadowColor = C.gold; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size); ctx.lineTo(x, y + size); ctx.stroke(); ctx.restore();
}

function makeParticles() {
  particles = Array.from({ length: 72 }, () => ({
    x: 65 + Math.random() * 670,
    y: 90 + Math.random() * 760,
    size: 3 + Math.random() * 5,
    speed: 10 + Math.random() * 22,
    phase: Math.random() * Math.PI * 2,
    isHeart: Math.random() > .48
  }));
}

function drawParticles(seconds, visibility) {
  if (visibility <= 0) return;
  for (const particle of particles) {
    const y = ((particle.y - seconds * particle.speed) % 850 + 850) % 850 + 40;
    const twinkle = .25 + .75 * ((Math.sin(seconds * 2.2 + particle.phase) + 1) / 2);
    const alpha = visibility * twinkle;
    if (particle.isHeart) drawHeart(particle.x, y, particle.size, alpha);
    else drawSparkle(particle.x, y, particle.size, alpha);
  }
}

function render(seconds) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#050205'; ctx.fillRect(0, 0, W, H);

  drawSoil();
  // Seed: 0-4s. Sprout/stem: 4-15s. Leaves: 10-17s.
  const seedP = phase(seconds, 0, 2.5);
  const stemP = phase(seconds, 4, 15);
  const leafP = phase(seconds, 10, 17);
  const budP = phase(seconds, 15, 21);
  const bloomP = phase(seconds, 21, 32);

  drawSeed(seedP * (1 - phase(seconds, 5, 7)));
  drawStem(stemP);
  drawLeaves(leafP);

  // Bud fades away as the full flower opens.
  const budOpacity = budP * (1 - bloomP);
  drawBud(budOpacity);

  if (bloomP > 0) {
    drawFlowerBase(bloomP);
    drawRoseWords(bloomP);
    drawPetalLayers(bloomP);
  }

  drawParticles(seconds, phase(seconds, 0, 2));
}

function stopAnimation() {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  running = false;
}

function frame(timestamp) {
  if (!running) return;
  if (startTime === null) startTime = timestamp;
  const seconds = (timestamp - startTime) / 1000;
  render(Math.min(seconds, DURATION));

  if (seconds < DURATION) {
    rafId = requestAnimationFrame(frame);
  } else {
    stopAnimation();
    music.pause();
    music.currentTime = 0;
    musicStatus.textContent = 'Our little rose has finally bloomed. ❤️';
    startBtn.textContent = '❤️ Watch Our Love Grow Again';
  }
}

async function startSurprise() {
  stopAnimation();
  startTime = null;
  makeParticles();
  running = true;
  render(0);
  rafId = requestAnimationFrame(frame);

  // Browsers require a user click before audio can play.
  music.pause();
  music.currentTime = 0;
  try {
    await music.play();
    musicStatus.textContent = 'Our special song is playing... ❤️';
  } catch (error) {
    musicStatus.textContent = 'Please check that song.mp3 is in the same folder as index.html.';
    console.error('Audio playback failed:', error);
  }

  replayBtn.disabled = false;
  startBtn.textContent = '❤️ Restart Our Rose';
}

startBtn.addEventListener('click', startSurprise);
replayBtn.addEventListener('click', startSurprise);

// Draw a calm starting screen; the animation begins after the surprise button is clicked.
render(0);
