// ============================================================
//  particles.js  –  Sistema de partículas e textos flutuantes
// ============================================================

let particles    = [];
let floatingTexts = [];

// --- API de criação ---

function addParticle({ x, y, vx = 0, vy = 0, life = 40, color = '#fff', size = 3, gravity = true }) {
  particles.push({ x, y, vx, vy, life, maxLife: life, color, size, gravity });
}

function addFloatingText(x, y, text, color = '#fff', size = 13) {
  floatingTexts.push({ x, y, vy: -1.1, text, color, size, life: 65, maxLife: 65 });
}

// --- Emissores específicos ---

function spawnOreParticles(px, py, def) {
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.7 + Math.random() * 2.2;
    addParticle({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 30 + Math.random() * 25,
      color: def.color,
      size: 1.5 + Math.random() * 2.5,
    });
  }
  addFloatingText(px, py - 6, `+${def.pts}`, def.color, 13);
}

function spawnEnemyDeathParticles(px, py) {
  for (let i = 0; i < 12; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 3;
    addParticle({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.5,
      life: 28 + Math.random() * 22,
      color: i % 2 === 0 ? '#e04040' : '#ff8840',
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnPowerupParticles(px, py, color) {
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2;
    const speed = 1.5 + Math.random() * 2.5;
    addParticle({
      x: px, y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 50 + Math.random() * 20,
      color,
      size: 2.5 + Math.random() * 2,
      gravity: false,
    });
  }
  // Burst of white sparks
  for (let i = 0; i < 8; i++) {
    addParticle({
      x: px, y: py,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5 - 1,
      life: 20,
      color: '#ffffff',
      size: 2,
    });
  }
}

function spawnSwingParticles(px, py, facing) {
  for (let i = 0; i < 5; i++) {
    addParticle({
      x: px, y: py,
      vx: facing * (1 + Math.random() * 2),
      vy: -0.5 + Math.random() * 1,
      life: 12,
      color: '#c8c870',
      size: 2,
      gravity: false,
    });
  }
}

// --- Update & Draw ---

function updateParticles() {
  for (const p of particles) {
    p.x  += p.vx;
    p.y  += p.vy;
    if (p.gravity) { p.vy += 0.10; p.vx *= 0.93; }
    else           { p.vx *= 0.97; p.vy *= 0.97; }
    p.life--;
  }
  for (const t of floatingTexts) {
    t.y  += t.vy;
    t.vy *= 0.95;
    t.life--;
  }
  particles = particles.filter(p => p.life > 0);
  floatingTexts = floatingTexts.filter(t => t.life > 0);
}

function drawParticles(ctx) {
  // Dots
  for (const p of particles) {
    ctx.globalAlpha = (p.life / p.maxLife) * 0.9;
    ctx.fillStyle   = p.color;
    const sx = p.x - cameraX + shakeOffX;
    const sy = p.y - cameraY + shakeOffY;
    ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Floating texts
  ctx.textAlign = 'center';
  for (const t of floatingTexts) {
    ctx.globalAlpha = Math.min(1, (t.life / t.maxLife) * 1.4);
    ctx.fillStyle   = t.color;
    ctx.font        = `bold ${t.size}px 'Courier New', monospace`;
    ctx.fillText(t.text, t.x - cameraX + shakeOffX, t.y - cameraY + shakeOffY);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign   = 'left';
}
