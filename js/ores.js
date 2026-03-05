// ============================================================
//  ores.js  –  Minérios coletáveis e power-ups no mundo
//  Depende de: config.js, player.js, particles.js, audio.js
// ============================================================

const ORE_DEFS = [
  { id: 'coal',    label: 'Carvão',   color: '#8a8a8a', pts: 5,   rarity: 0.10, minDist: 15 },
  { id: 'iron',    label: 'Ferro',    color: '#c87848', pts: 25,  rarity: 0.055, minDist: 30 },
  { id: 'gold',    label: 'Ouro',     color: '#ffd700', pts: 75,  rarity: 0.022, minDist: 60 },
  { id: 'diamond', label: 'Diamante', color: '#00e5ff', pts: 200, rarity: 0.007, minDist: 100 },
];

const POWERUP_DEFS = [
  { id: 'speed',  label: 'Velocidade +60%', color: '#ff6b35', duration: 12000 },
  { id: 'jump',   label: 'Pulo +50%',       color: '#4caf50', duration: 12000 },
  { id: 'shield', label: 'Escudo (3 hits)', color: '#2196f3', duration: 0, hits: 3 },
  { id: 'magnet', label: 'Ímã (8s)',        color: '#ce93d8', duration: 8000  },
];

let oreList     = [];
let powerupList = [];

// ---- Geração ------------------------------------------------

function placeOres(startCol, endCol) {
  for (let x = startCol; x < endCol; x++) {
    if (!grid[x] || x < 18) continue;
    for (let y = 1; y < WORLD_ROWS - 1; y++) {
      if (grid[x][y] !== 0) continue;
      // Precisa de pelo menos um vizinho sólido (minério "na parede")
      const nearSolid = isSolidCell(x - 1, y) || isSolidCell(x + 1, y) ||
                        isSolidCell(x, y - 1) || isSolidCell(x, y + 1);
      if (!nearSolid) continue;

      const dist = x - 10; // distância do spawn
      const r    = Math.random();
      let   acc  = 0;
      for (const def of ORE_DEFS) {
        if (dist < def.minDist) continue;
        acc += def.rarity;
        if (r < acc) {
          oreList.push({ gx: x, gy: y, px: x * TILE_SIZE, py: y * TILE_SIZE, def, collected: false });
          break;
        }
      }
    }
  }
}

function placePowerups(startCol, endCol) {
  // ~1 power-up a cada 45–75 colunas
  for (let x = startCol + 25; x < endCol - 5; x += 45 + Math.floor(Math.random() * 30)) {
    if (!grid[x]) continue;
    // Encontra chão
    for (let y = 5; y < WORLD_ROWS - 5; y++) {
      if (grid[x][y] === 0 && isSolidCell(x, y + 1) && !isSolidCell(x, y - 1)) {
        const def = POWERUP_DEFS[Math.floor(Math.random() * POWERUP_DEFS.length)];
        powerupList.push({ gx: x, gy: y, px: x * TILE_SIZE, py: y * TILE_SIZE, def, collected: false });
        break;
      }
    }
  }
}

// ---- Coleta -------------------------------------------------

function activatePowerup(def, px, py) {
  sfx.powerup();
  spawnPowerupParticles(px + TILE_SIZE / 2, py + TILE_SIZE / 2, def.color);
  addFloatingText(px + TILE_SIZE / 2, py - 12, def.label.toUpperCase(), def.color, 12);

  if (def.id === 'shield') {
    playerStats.shield = def.hits;
    addFloatingText(px + TILE_SIZE / 2, py - 24, '🛡 ESCUDO!', '#2196f3', 13);
  } else {
    playerStats.activePowerups = playerStats.activePowerups.filter(p => p.type !== def.id);
    playerStats.activePowerups.push({ type: def.id, endTime: Date.now() + def.duration });
  }
}

function collectItems() {
  if (gameState !== 'playing') return;

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;

  // Raio de coleta base
  const oreReach = TILE_SIZE * 2;

  // Ímã: raio expandido
  const magnetActive = hasPowerup('magnet');
  const magnetRange  = 120;

  for (const ore of oreList) {
    if (ore.collected) continue;
    const dx  = (ore.px + TILE_SIZE / 2) - cx;
    const dy  = (ore.py + TILE_SIZE / 2) - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const reach = magnetActive ? magnetRange : oreReach;
    if (dist < reach) {
      ore.collected = true;
      playerStats.score += ore.def.pts;
      playerStats.oresCollected[ore.def.id]++;
      spawnOreParticles(ore.px + TILE_SIZE / 2, ore.py + TILE_SIZE / 2, ore.def);
      sfx.collect(ore.def.id);
    }
  }

  // Power-ups
  for (const pu of powerupList) {
    if (pu.collected) continue;
    const dx = (pu.px + TILE_SIZE / 2) - cx;
    const dy = (pu.py + TILE_SIZE / 2) - cy;
    if (Math.abs(dx) < TILE_SIZE * 2.2 && Math.abs(dy) < TILE_SIZE * 2.2) {
      pu.collected = true;
      activatePowerup(pu.def, pu.px, pu.py);
    }
  }
}

// ---- Desenho ------------------------------------------------

function drawOres(ctx) {
  const time       = Date.now() * 0.0022;
  const vStartCol  = Math.floor(cameraX / TILE_SIZE) - 2;
  const vEndCol    = vStartCol + Math.ceil(ctx.canvas.width / TILE_SIZE) + 4;

  for (const ore of oreList) {
    if (ore.collected || ore.gx < vStartCol || ore.gx > vEndCol) continue;
    const sx     = ore.px - cameraX + shakeOffX;
    const sy     = ore.py - cameraY + shakeOffY;
    const pulse  = 0.65 + Math.sin(time + ore.gx * 0.47 + ore.gy * 0.81) * 0.35;

    // Halo brilhante
    ctx.save();
    ctx.globalAlpha  = 0.30 * pulse;
    ctx.shadowColor  = ore.def.color;
    ctx.shadowBlur   = 10;
    ctx.fillStyle    = ore.def.color;
    ctx.fillRect(sx - 1, sy - 1, TILE_SIZE + 2, TILE_SIZE + 2);
    ctx.restore();

    // Ponto central do minério
    const s   = 5;
    const off = (TILE_SIZE - s) / 2;
    ctx.fillStyle = ore.def.color;
    ctx.fillRect(sx + off, sy + off, s, s);
    // Brilho especular
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillRect(sx + off, sy + off, 2, 2);
  }
}

function drawPowerups(ctx) {
  const time      = Date.now() * 0.003;
  const vStartCol = Math.floor(cameraX / TILE_SIZE) - 2;
  const vEndCol   = vStartCol + Math.ceil(ctx.canvas.width / TILE_SIZE) + 4;

  for (const pu of powerupList) {
    if (pu.collected || pu.gx < vStartCol || pu.gx > vEndCol) continue;

    const bob   = Math.sin(time * 1.8 + pu.gx * 0.7) * 3;
    const sx    = pu.px - cameraX + shakeOffX;
    const sy    = pu.py - cameraY + shakeOffY + bob;
    const pulse = 0.55 + Math.sin(time * 2.5) * 0.45;
    const cx2   = sx + TILE_SIZE / 2;
    const cy2   = sy + TILE_SIZE / 2;
    const r     = TILE_SIZE * 0.65;

    // Glow externo
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.shadowColor = pu.def.color;
    ctx.shadowBlur  = 14;
    ctx.fillStyle   = pu.def.color;
    ctx.beginPath();
    ctx.arc(cx2, cy2, r * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Corpo
    ctx.fillStyle = pu.def.color;
    ctx.beginPath();
    ctx.arc(cx2, cy2, r, 0, Math.PI * 2);
    ctx.fill();

    // Borda branca
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Letra identificadora
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pu.def.id[0].toUpperCase(), cx2, cy2 + 3);
    ctx.textAlign = 'left';
  }
}
