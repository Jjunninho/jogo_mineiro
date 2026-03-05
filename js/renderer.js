// ============================================================
//  renderer.js  –  Todas as funções de desenho do canvas
//  Depende de: config.js, player.js, ores.js, enemies.js, particles.js
// ============================================================

// --- PARALLAX BACKGROUND ------------------------------------

function getCaveHash(x, y) {
  const sin = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return sin - Math.floor(sin);
}

function drawCaveParallaxLayer(ctx, canvas, camX, camY, parallaxFactor, layerIndex, time) {
  const tileSize = 120;
  const offsetX  = -(camX * parallaxFactor) % tileSize;
  const offsetY  = -(camY * parallaxFactor) % tileSize;
  const startX   = Math.floor((camX * parallaxFactor) / tileSize);
  const startY   = Math.floor((camY * parallaxFactor) / tileSize);
  const cols     = Math.ceil(canvas.width  / tileSize) + 1;
  const rows     = Math.ceil(canvas.height / tileSize) + 1;

  for (let y = -1; y <= rows; y++) {
    for (let x = -1; x <= cols; x++) {
      const gx = startX + x, gy = startY + y;
      const px = x * tileSize + offsetX, py = y * tileSize + offsetY;
      const h  = getCaveHash(gx, gy + layerIndex * 1000);

      if (layerIndex === 0) {
        if (h > 0.3) {
          ctx.fillStyle = '#100a18';
          ctx.beginPath();
          ctx.arc(px + 60, py + 60, 70 + h * 40, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (layerIndex === 1) {
        if (h < 0.15) {
          const isPurple = getCaveHash(gx, gy + 500) > 0.5;
          const pulse = Math.sin(time * 3 + h * 10) * 0.4 + 0.6;
          ctx.fillStyle = isPurple ? `rgba(138,43,226,${pulse})` : `rgba(65,105,225,${pulse})`;
          ctx.beginPath();
          ctx.moveTo(px + 40, py + 100);
          ctx.lineTo(px + 50 + h * 10, py + 40);
          ctx.lineTo(px + 60 + h * 20, py + 100);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${pulse * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(px + 45, py + 95);
          ctx.lineTo(px + 50 + h * 10, py + 50);
          ctx.lineTo(px + 55 + h * 20, py + 95);
          ctx.fill();
        } else if (h > 0.85) {
          ctx.strokeStyle = `rgba(218,165,32,${0.15 + h * 0.2})`;
          ctx.lineWidth   = 2 + h * 3;
          ctx.lineCap     = 'round';
          ctx.beginPath();
          ctx.moveTo(px, py + h * 100);
          ctx.lineTo(px + 60, py + 40 - h * 20);
          ctx.lineTo(px + 120, py + 30 + h * 40);
          ctx.stroke();
        }
      } else if (layerIndex === 2) {
        if (h > 0.9) {
          const pulse = Math.sin(time * 2 + h * 20) * 0.3 + 0.7;
          const colorHash = getCaveHash(gx, gy + 1500);
          let tc;
          if (colorHash < 0.33) tc = `rgba(165,42,42,${pulse})`;
          else if (colorHash < 0.66) tc = `rgba(204,85,0,${pulse})`;
          else tc = `rgba(34,139,34,${pulse})`;
          ctx.fillStyle = tc;
          const tw = 20 + h * 10, th = 30 + h * 15;
          ctx.beginPath();
          ctx.moveTo(px + tileSize/2, py + tileSize - th);
          ctx.lineTo(px + tileSize/2 - tw/2, py + tileSize);
          ctx.lineTo(px + tileSize/2 + tw/2, py + tileSize);
          ctx.fill();
        }
        if (h < 0.1) {
          ctx.fillStyle = '#16101e';
          ctx.fillRect(px + 20, py + 20, 50 + h * 50, 40 + h * 50);
        }
      }
    }
  }
}

function drawBackground(ctx, canvas) {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#0a0510');
  grad.addColorStop(1, '#050208');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const time = Date.now() * 0.001;
  drawCaveParallaxLayer(ctx, canvas, cameraX, cameraY, 0.1, 0, time);
  drawCaveParallaxLayer(ctx, canvas, cameraX, cameraY, 0.3, 1, time);
  drawCaveParallaxLayer(ctx, canvas, cameraX, cameraY, 0.6, 2, time);
}

// --- TILES ---------------------------------------------------

function getTileHash(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 3266489917);
  return (h >>> 0) / 4294967296;
}

// ─── PADRÕES DE CAVERNA PROCEDURAIS ─────────────────────────
// Cada padrão usa: hash (determinístico por tile), colors (paleta do bioma),
// time (para animação) e acesso a isSolidCell para contexto espacial.
// TILE_SIZE = 8px → tudo desenhado pixel a pixel.

function _drawPattern(ctx, gx, gy, sx, sy, pattern, colors, time) {
  const hash  = getTileHash(gx, gy);
  const hash2 = getTileHash(gx + 997, gy + 443); // segundo hash independente
  const cx    = sx + TILE_SIZE / 2;
  const cy    = sy + TILE_SIZE / 2;

  switch (pattern) {

    // ── Quadradinhos dispersos (fungos/matrix) ───────────────
    case 'matrix':
      if (hash > 0.85) {
        ctx.globalAlpha = (hash - 0.85) * 4;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      }
      break;

    // ── Grade fina ───────────────────────────────────────────
    case 'crosshatch':
      if (hash > 0.88) {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(sx + 3, sy,      2, TILE_SIZE);
        ctx.fillRect(sx,     sy + 3, TILE_SIZE, 2);
      }
      break;

    // ── Pontos estelares ─────────────────────────────────────
    case 'dots':
      if (hash > 0.9) {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(sx + 3, sy + 3, 2, 2);
      }
      break;

    // ── Linhas horizontais suaves ─────────────────────────────
    case 'lines':
      if (hash > 0.82) {
        ctx.globalAlpha = (hash - 0.82) * 1.8;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(sx, sy + Math.floor(hash2 * TILE_SIZE), TILE_SIZE, 1);
      }
      break;

    // ── Estrelinhas pulsantes ─────────────────────────────────
    case 'sparkle': {
      if (hash > 0.87) {
        const pulse = Math.sin(time * (2.5 + hash * 5) + gx * 0.73 + gy * 1.37) * 0.5 + 0.5;
        const alpha = pulse * (hash - 0.87) * 7.5;
        // Cruz/estrela na cor do bioma
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(cx - 1, cy - 3, 2, 7);  // vertical
        ctx.fillRect(cx - 3, cy - 1, 7, 2);  // horizontal
        // Núcleo branco brilhante
        ctx.globalAlpha = alpha * 0.9;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(cx, cy, 1, 1);
      }
      break;
    }

    // ── Veios diagonais (rachaduras) ──────────────────────────
    case 'veins': {
      if (hash > 0.78) {
        ctx.globalAlpha = (hash - 0.78) * 2.2;
        ctx.fillStyle   = colors.lit;
        const dir = hash2 > 0.5 ? 1 : -1;
        // Linha diagonal pixel a pixel
        for (let i = 0; i < TILE_SIZE; i++) {
          const yy = dir === 1 ? i : TILE_SIZE - 1 - i;
          ctx.fillRect(sx + i, sy + yy, 1, 1);
        }
        // Segunda rachadura paralela esparsa
        if (hash > 0.92) {
          ctx.globalAlpha *= 0.5;
          const off = Math.floor(hash2 * 3) + 1;
          for (let i = 0; i < TILE_SIZE - off; i++) {
            const yy = dir === 1 ? i + off : TILE_SIZE - 1 - i - off;
            ctx.fillRect(sx + i, sy + yy, 1, 1);
          }
        }
      }
      break;
    }

    // ── Estalactites/estalagmites contextuais ─────────────────
    case 'stalactite': {
      if (hash > 0.80) {
        const aboveSolid = isSolidCell(gx, gy - 1);
        const belowSolid = isSolidCell(gx, gy + 1);
        const h = 1 + Math.floor((hash - 0.80) * 25); // altura 1-5 px
        ctx.fillStyle = colors.lit;

        if (aboveSolid) {
          // Estalactite caindo do teto
          const pulse = Math.sin(time * 0.8 + gx * 0.5) * 0.2 + 0.7;
          ctx.globalAlpha = pulse;
          for (let i = 0; i < h; i++) {
            const w = Math.max(1, h - i);
            ctx.fillRect(cx - Math.floor(w / 2), sy + i, w, 1);
          }
          // Gotícula pulsante na ponta
          if (hash > 0.91) {
            const drip = Math.sin(time * 2.5 + gx * 1.1) * 0.5 + 0.5;
            ctx.globalAlpha = drip * 0.8;
            ctx.fillStyle   = colors.lit;
            ctx.fillRect(cx, sy + h, 1, 1);
          }
        }

        if (belowSolid && hash2 > 0.45) {
          // Estalagmite subindo do chão
          ctx.fillStyle   = colors.lit;
          ctx.globalAlpha = 0.65;
          for (let i = 0; i < h; i++) {
            const w = Math.max(1, h - i);
            ctx.fillRect(cx - Math.floor(w / 2), sy + TILE_SIZE - 1 - i, w, 1);
          }
        }
      }
      break;
    }

    // ── Cristais diamante pulsantes ───────────────────────────
    case 'crystal': {
      if (hash > 0.86) {
        const pulse = Math.sin(time * 2.8 + gx * 0.91 + gy * 1.17) * 0.45 + 0.55;
        const alpha = pulse * (hash - 0.86) * 7;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = colors.lit;
        // Forma de diamante (losango)
        ctx.fillRect(cx,     sy + 1, 1, 1);
        ctx.fillRect(cx - 1, sy + 2, 3, 1);
        ctx.fillRect(cx - 2, sy + 3, 5, 1);
        ctx.fillRect(cx - 2, sy + 4, 5, 1);
        ctx.fillRect(cx - 1, sy + 5, 3, 1);
        ctx.fillRect(cx,     sy + 6, 1, 1);
        // Reflexo branco no topo do cristal
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(cx,     sy + 2, 1, 1);
        ctx.fillRect(cx - 1, sy + 3, 1, 1);
      }
      break;
    }

    // ── Brasas / Ember (lava, basalto) ────────────────────────
    case 'ember': {
      if (hash > 0.84) {
        // Tremulação rápida e irregular como brasa viva
        const flicker = Math.sin(time * (6 + hash * 10) + gx * 1.73 + gy * 2.31) * 0.5 + 0.5;
        const alpha   = flicker * (hash - 0.84) * 6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle   = colors.lit;
        ctx.fillRect(cx - 1, cy - 1, 3, 3);
        // Núcleo branco-quente
        ctx.globalAlpha = alpha * flicker;
        ctx.fillStyle   = '#ffffff';
        ctx.fillRect(cx, cy, 1, 1);
        // Faísca extra esporádica
        if (hash > 0.95 && flicker > 0.7) {
          ctx.globalAlpha = (flicker - 0.7) * 2;
          ctx.fillStyle   = colors.lit;
          ctx.fillRect(cx + Math.round((hash2 - 0.5) * 4), cy - 2, 1, 1);
        }
      }
      break;
    }

    // ── Ondas fluidas (água) ──────────────────────────────────
    case 'flow': {
      if (hash > 0.72) {
        // Duas linhas onduladas por tile com fases diferentes
        const wave1 = Math.sin(time * 1.4 + gx * 0.38) * 1.8;
        const wave2 = Math.sin(time * 1.0 + gx * 0.55 + 2.1) * 1.5;
        const line1Y = sy + Math.floor(TILE_SIZE * 0.35 + wave1);
        const line2Y = sy + Math.floor(TILE_SIZE * 0.70 + wave2);
        ctx.fillStyle   = colors.lit;
        ctx.globalAlpha = (hash - 0.72) * 2.0;
        ctx.fillRect(sx, line1Y, TILE_SIZE, 1);
        ctx.globalAlpha = (hash - 0.72) * 1.2;
        ctx.fillRect(sx, line2Y, TILE_SIZE, 1);
      }
      break;
    }

    // ── Favo de mel (hex grid) ────────────────────────────────
    case 'hex': {
      // Coloca pontos em posições de grade hexagonal
      // linhas pares: offset 0 — linhas ímpares: offset +4
      const rowParity = gy % 2;
      const colParity = gx % 2;
      if (rowParity === colParity) {
        const pulse = Math.sin(time * 1.5 + gx * 0.6 + gy * 0.9) * 0.35 + 0.55;
        ctx.globalAlpha = pulse * (0.25 + hash * 0.3);
        ctx.fillStyle   = colors.lit;
        // Hexágono simplificado como cruz 3×3 com cantos cortados
        ctx.fillRect(cx - 1, cy - 2, 3, 1); // topo
        ctx.fillRect(cx - 2, cy - 1, 5, 3); // meio
        ctx.fillRect(cx - 1, cy + 2, 3, 1); // base
        // Anel externo mais suave para tiles pares
        if (hash > 0.6) {
          ctx.globalAlpha *= 0.35;
          ctx.fillRect(cx - 2, cy - 3, 5, 1);
          ctx.fillRect(cx - 3, cy - 1, 1, 3);
          ctx.fillRect(cx + 3,  cy - 1, 1, 3);
          ctx.fillRect(cx - 2, cy + 3, 5, 1);
        }
      }
      break;
    }

    // ── Runas / Glifos gravados ───────────────────────────────
    case 'runes': {
      if (hash > 0.92) {
        const pulse = Math.sin(time * 1.1 + gx * 0.44 + gy * 0.77) * 0.4 + 0.6;
        ctx.globalAlpha = pulse * (hash - 0.92) * 12;
        ctx.fillStyle   = colors.lit;
        const runeType  = Math.floor(hash2 * 6);
        // 6 glifos pixel-art distintos dentro de 8×8
        if (runeType === 0) {
          // ᛏ: barra vertical + duas hastes
          ctx.fillRect(cx,     sy + 1, 1, 6);
          ctx.fillRect(cx - 2, sy + 2, 2, 1);
          ctx.fillRect(cx + 1, sy + 2, 2, 1);
          ctx.fillRect(cx - 1, sy + 5, 3, 1);
        } else if (runeType === 1) {
          // ᚱ: quadrado aberto com diagonal
          ctx.fillRect(cx - 2, sy + 1, 5, 1);
          ctx.fillRect(cx - 2, sy + 1, 1, 4);
          ctx.fillRect(cx + 2, sy + 1, 1, 4);
          ctx.fillRect(cx - 2, sy + 4, 5, 1);
          ctx.fillRect(cx,     sy + 5, 1, 1); // diagonal
          ctx.fillRect(cx + 1, sy + 6, 1, 1);
        } else if (runeType === 2) {
          // X duplo
          for (let i = 0; i < 5; i++) {
            ctx.fillRect(sx + 1 + i, sy + 1 + i, 1, 1);
            ctx.fillRect(sx + 5 - i, sy + 1 + i, 1, 1);
          }
          ctx.fillRect(cx - 1, cy - 1, 3, 3); // núcleo central
        } else if (runeType === 3) {
          // Triângulo apontando pra cima
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(cx - i, sy + 1 + i, i * 2 + 1, 1);
          }
          ctx.fillRect(sx + 1, sy + 5, TILE_SIZE - 2, 1);
        } else if (runeType === 4) {
          // H: duas barras e uma travessa
          ctx.fillRect(cx - 2, sy + 1, 1, 6);
          ctx.fillRect(cx + 2, sy + 1, 1, 6);
          ctx.fillRect(cx - 2, sy + 4, 5, 1);
        } else {
          // Seta para cima
          ctx.fillRect(cx,     sy + 1, 1, 6);
          ctx.fillRect(cx - 2, sy + 3, 2, 1);
          ctx.fillRect(cx + 1, sy + 3, 2, 1);
          ctx.fillRect(cx - 1, sy + 2, 3, 1);
        }
      }
      break;
    }
  }

  ctx.globalAlpha = 1.0;
}

// ─── TILE VAZIO (espaço da caverna) ──────────────────────────
// biome e colors chegam pré-calculados por drawWorld (cache de coluna)
// time chegam pré-calculado (uma chamada Date.now() por frame)

function drawVoidTile(ctx, gx, gy, sx, sy, biome, colors, time) {
  // Base escura com matiz do bioma
  ctx.globalAlpha = 0.4;
  ctx.fillStyle   = colors.depB;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  ctx.globalAlpha = 1.0;

  // Padrão procedural do bioma
  _drawPattern(ctx, gx, gy, sx, sy, biome.pattern, colors, time);

  // Sombras de contato com paredes (profundidade)
  if (isSolidCell(gx, gy - 1)) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(sx, sy, TILE_SIZE, 2);
  }
  if (isSolidCell(gx, gy + 1)) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx, sy + TILE_SIZE - 2, TILE_SIZE, 2);
  }
}

// ─── TILE SÓLIDO 2.5D ────────────────────────────────────────

function drawSolidTile25D(ctx, gx, gy, sx, sy, pal, biome, time) {
  const topEmpty    = !isSolidCell(gx, gy - 1);
  const leftEmpty   = !isSolidCell(gx - 1, gy);
  const rightEmpty  = !isSolidCell(gx + 1, gy);
  const bottomEmpty = !isSolidCell(gx, gy + 1);

  if (bottomEmpty) {
    ctx.fillStyle = pal.depB;
    ctx.fillRect(sx + 1, sy + TILE_SIZE, TILE_SIZE - 1, DEPTH_PX);
  }
  if (rightEmpty) {
    ctx.fillStyle = pal.depR;
    ctx.fillRect(sx + TILE_SIZE, sy + 1, DEPTH_PX, TILE_SIZE - 1 + (bottomEmpty ? DEPTH_PX : 0));
  }
  if (leftEmpty) {
    ctx.fillStyle = pal.depL;
    ctx.fillRect(sx - 1, sy + 1, 1, TILE_SIZE - 1 + (bottomEmpty ? DEPTH_PX : 0));
  }
  ctx.fillStyle = topEmpty ? pal.top : pal.mid;
  ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
  if (topEmpty) {
    ctx.fillStyle = pal.lit;
    ctx.fillRect(sx, sy, TILE_SIZE, 1);
  }

  // --- O SEGREDO 2.0: Hash Forte gerando Frequências Únicas ---
  let bHash = 0;
  for (let i = 0; i < biome.id.length; i++) {
    bHash = Math.imul(bHash ^ biome.id.charCodeAt(i), 3432918353);
    bHash = (bHash << 13) | (bHash >>> 19);
  }
  bHash = (bHash >>> 0); // Converte para número positivo grande

  // Frequências exclusivas deste bioma (distância entre os pontos)
  const freqX = 3.0 + (bHash % 500) / 100;     // Varia de 3.0 a 8.0
  const freqY = 4.0 + ((bHash / 13) % 600) / 100; // Varia de 4.0 a 10.0

  // 1. Decorações no TOPO do bloco (topDecor)
  if (topEmpty) {
    if (biome.topDecor === 'crystals' && Math.sin(gx * freqX + gy * freqY) > 0.75) {
      const cx2 = sx + TILE_SIZE * 0.5;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = pal.lit;
      ctx.beginPath(); ctx.moveTo(cx2, sy - 4); ctx.lineTo(cx2 - 2, sy); ctx.lineTo(cx2 + 2, sy); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1.0;
    }
    if (biome.topDecor === 'embers' && Math.sin(gx * freqY + gy * freqX) > 0.82) { // Invertido X e Y pra variar
      const pulse = Math.sin(time * 3 + gx * 0.5) * 0.3 + 0.5;
      ctx.globalAlpha = pulse;
      ctx.fillStyle = pal.lit;
      ctx.fillRect(sx + 1, sy, TILE_SIZE - 2, 1);
      ctx.globalAlpha = 1.0;
    }
    if (biome.topDecor === 'shrooms' && Math.sin(gx * (freqX*0.8) + gy * (freqY*1.2)) > 0.70) {
      const cx2 = sx + TILE_SIZE * 0.5;
      const glw  = Math.sin(time * 2 + gx * 0.7) * 0.3 + 0.5;
      ctx.globalAlpha = glw;
      ctx.fillStyle = pal.lit;
      ctx.beginPath(); ctx.ellipse(cx2, sy - 3, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = pal.top;
      ctx.fillRect(cx2 - 1, sy - 3, 2, 3);
    }
  }

  // 2. VOXEL GLOW (blocos brilhantes) - AGORA VAI!
  if (biome.voxelGlow === 'pulse_blocks') {
    if (Math.sin(gx * freqX + gy * freqY) > 0.85) {
      const glow = Math.sin(time * 2 + gx * 0.6 + gy * 0.3) * 0.2 + 0.15;
      ctx.globalAlpha = glow;
      ctx.fillStyle = pal.lit; 
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1.0;
    }
  }
}

// --- MUNDO COMPLETO ------------------------------------------

function drawWorld(ctx, canvas) {
  drawBackground(ctx, canvas);

  const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
  const endCol   = Math.min(generatedCols, startCol + Math.ceil(canvas.width  / TILE_SIZE) + 3);
  const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
  const endRow   = Math.min(WORLD_ROWS, startRow + Math.ceil(canvas.height / TILE_SIZE) + 3);

  // Cache por coluna: getBiomeColors e getBiomeAt são caros (blending hex)
  // Calculamos UMA VEZ por coluna visível em vez de por tile
  const colBiome  = new Array(endCol);
  const colColors = new Array(endCol);
  for (let x = startCol; x < endCol; x++) {
    colBiome[x]  = getBiomeAt(x);
    colColors[x] = getBiomeColors(x);
  }

  // Date.now() uma única vez por frame
  const time = Date.now() * 0.001;

  for (let y = startRow; y < endRow; y++) {
    for (let x = startCol; x < endCol; x++) {
      const sx = x * TILE_SIZE - cameraX + shakeOffX;
      const sy = y * TILE_SIZE - cameraY + shakeOffY;
      if (grid[x][y] === 0)
        drawVoidTile(ctx, x, y, sx, sy, colBiome[x], colColors[x], time);
      else
        drawSolidTile25D(ctx, x, y, sx, sy, colColors[x], colBiome[x], time);
    }
  }

  drawOres(ctx);
  drawPowerups(ctx);
  drawEnemies(ctx);
  drawParticles(ctx);

  // Overlay de bioma
  const playerBiome = getBiomeAt(Math.floor(player.x / TILE_SIZE)).id;
  if (playerBiome === 'fungi') {
    const sporeT     = Date.now();
    const sporePulse = Math.sin(sporeT * 0.0012) * 0.035 + 0.07;
    ctx.fillStyle = `rgba(20,83,45,${sporePulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = '#4ade80';
    for (let i = 0; i < 8; i++) {
      const fx = ((sporeT * 0.00008 * (1 + i*0.3) + i * 0.137) % 1) * canvas.width;
      const fy = ((sporeT * 0.00005 * (1 + i*0.2) + i * 0.211) % 1) * canvas.height;
      ctx.beginPath(); ctx.arc(fx, fy, 1.5 + Math.sin(sporeT*0.003+i)*1, 0, Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  if (playerBiome === 'water') {
    const now   = Date.now();
    const pulse = Math.sin(now * 0.0015) * 0.04 + 0.13;
    ctx.fillStyle = `rgba(7,50,100,${pulse})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.globalAlpha  = 0.04;
    ctx.strokeStyle  = '#7dd3fc';
    ctx.lineWidth    = 1.5;
    for (let i = 0; i < 6; i++) {
      const wx  = (now * 0.0004 + i * 0.17) % 1;
      const x2  = wx * canvas.width;
      const wig = Math.sin(now * 0.002 + i) * 18;
      ctx.beginPath();
      ctx.moveTo(x2, 0);
      ctx.bezierCurveTo(x2 + wig, canvas.height*0.3, x2 - wig, canvas.height*0.6, x2 + wig*0.5, canvas.height);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// --- JOGADOR -------------------------------------------------

function drawPlayer(ctx) {
  if (gameState !== 'playing') return;
  if (playerStats.iframes > 0 && Math.floor(Date.now() / 75) % 2 === 0) return;

  const px = Math.round(player.x - cameraX + shakeOffX);
  const py = Math.round(player.y - cameraY + shakeOffY);
  const f  = player.facing; // 1 = direita, -1 = esquerda
  const now = Date.now();

  // ==========================================
  // DESENHO DA NAVE
  // ==========================================
  if (player.inShip) {
    const bob = Math.sin(now * 0.005) * 2; // Flutuação suave visual

    ctx.save();
    // Centraliza o desenho no meio da nave
    ctx.translate(px + player.w/2, py + player.h/2 + bob);

    // Fogo do propulsor (Luz azul embaixo)
    const thrust = Math.random() * 4 + (Math.abs(player.vx) * 2);
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(0, 6 + thrust); ctx.fill();

    // Cúpula de vidro transparente
    ctx.fillStyle = 'rgba(150, 220, 255, 0.4)';
    ctx.beginPath(); ctx.arc(0, -2, 8, Math.PI, 0); ctx.fill();

    // Cabeça do mineirinho lá dentro (pra dar charme!)
    ctx.fillStyle = '#e5b84e'; ctx.fillRect(-3, -5, 6, 5); // pele
    ctx.fillStyle = '#5a3010'; ctx.fillRect(-4, -7, 8, 2); // capacete

    // Corpo da nave (Disco de metal)
    ctx.fillStyle = '#556677';
    ctx.beginPath(); ctx.ellipse(0, 4, 12, 4, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#334455';
    ctx.beginPath(); ctx.ellipse(0, 5, 12, 3, 0, 0, Math.PI*2); ctx.fill();

    // Canhão de laser na frente
    ctx.fillStyle = '#222';
    ctx.fillRect(f * 10, 2, f * 4, 2);
    ctx.fillStyle = '#ff2255'; // Ponta vermelha
    ctx.fillRect(f * 13, 2.5, f * 2, 1);

    ctx.restore();

    // Aura tecnológica da nave
    ctx.strokeStyle = `rgba(0, 229, 255, ${0.3 + Math.sin(now*0.01)*0.2})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 2, py - 2 + bob, player.w + 4, player.h + 4);

    return; // <-- Importante: Sai da função pra NÃO desenhar o humano!
  }

  // ── Animação de andar ──────────────────────────────────────
  // walkCycle: oscila 0→1→0 enquanto se move no chão
  const isWalking = player.onGround && Math.abs(player.vx) > 0.3;
  const walkCycle = isWalking ? Math.sin(now * 0.018) : 0;
  // Bob vertical do corpo enquanto anda (2px de bounce)
  const bodyBob   = isWalking ? Math.abs(walkCycle) * 2 : 0;
  // Alternância de pernas: +1 ou -1 por frame de ciclo
  const legSwing  = walkCycle; // -1..+1

  // ── Squash & stretch no pulo/queda ────────────────────────
  let squashX = 0, squashY = 0;
  if (!player.onGround) {
    if (player.vy < -2) { squashX = -1; squashY = 1; }   // subindo: estica
    else if (player.vy > 3) { squashX = 1; squashY = -1; } // caindo: achata
  }

  // ── Paleta de cores ───────────────────────────────────────
  const skin       = '#e5b84e';
  const skinShade  = '#c9962f';
  const helmet     = '#5a3010';
  const helmetTop  = '#7a4820';
  const helmetRim  = '#8a5828';
  const shirt      = '#3a7fbf';
  const shirtShade = '#235a8f';
  const pants      = '#2b3a67';
  const pantsShade = '#1a2748';
  const boots      = '#3b2612';
  const bootsole   = '#251508';
  const eye        = '#1b0f05';
  const pupil      = '#000000';
  const belt       = '#4a2a0a';
  const beltBuckle = '#c8a030';
  const lamp       = '#ffcc44';
  const lampGlow   = '#ffe890';
  const lampCore   = '#ffffff';

  // ── Auras de power-up ─────────────────────────────────────
  if (hasPowerup('speed')) {
    const pulse = Math.sin(now * 0.008) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(255,107,53,${0.18 * pulse})`;
    ctx.fillRect(px - 5, py - 5, player.w + 10, player.h + 10);
    // Trilha de velocidade
    ctx.fillStyle = `rgba(255,140,60,${0.12 * pulse})`;
    ctx.fillRect(px - 8 * f, py + 4, 6, player.h - 8);
  }
  if (hasPowerup('jump')) {
    const pulse = Math.sin(now * 0.01) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(76,175,80,${0.18 * pulse})`;
    ctx.fillRect(px - 5, py - 5, player.w + 10, player.h + 10);
  }
  if (playerStats.shield > 0) {
    const pulse = Math.sin(now * 0.012) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(33,150,243,${0.8 * pulse})`;
    ctx.lineWidth   = 2;
    ctx.strokeRect(px - 3, py - 3, player.w + 6, player.h + 6);
    // Segundo anel mais suave
    ctx.strokeStyle = `rgba(100,200,255,${0.25 * pulse})`;
    ctx.lineWidth   = 4;
    ctx.strokeRect(px - 5, py - 5, player.w + 10, player.h + 10);
  }

  // ── Sombra no chão ────────────────────────────────────────
  const shadowAlpha = player.onGround ? 0.22 : 0.10;
  ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
  ctx.fillRect(px + 2 + squashX, py + player.h + 2 - squashY, 14 - squashX * 2, 3);

  // ── BASE Y com bob e squash ───────────────────────────────
  const by = py + Math.round(bodyBob) + squashY; // base y ajustada

  // ═══════════════════════════════════════════════════════════
  //  PERNAS — desenhadas atrás do corpo
  // ═══════════════════════════════════════════════════════════
  const leg1Swing = Math.round(legSwing * 2);   // perna dianteira
  const leg2Swing = Math.round(-legSwing * 2);  // perna traseira

  // Perna traseira (mais escura, atrás)
  ctx.fillStyle = pantsShade;
  ctx.fillRect(px + (f === 1 ? 5 : 9),  by + 20 + leg2Swing, 3, 4 - squashY);
  // Bota traseira
  ctx.fillStyle = bootsole;
  ctx.fillRect(px + (f === 1 ? 4 : 8),  by + 24 + leg2Swing - squashY, 4, 1);
  ctx.fillStyle = boots;
  ctx.fillRect(px + (f === 1 ? 4 : 8),  by + 22 + leg2Swing - squashY, 4, 2);

  // Perna dianteira
  ctx.fillStyle = pants;
  ctx.fillRect(px + (f === 1 ? 10 : 5), by + 20 + leg1Swing, 3, 4 - squashY);
  // Bota dianteira
  ctx.fillStyle = bootsole;
  ctx.fillRect(px + (f === 1 ? 10 : 4), by + 24 + leg1Swing - squashY, 5, 1);
  ctx.fillStyle = boots;
  ctx.fillRect(px + (f === 1 ? 10 : 4), by + 22 + leg1Swing - squashY, 4, 2);

  // ═══════════════════════════════════════════════════════════
  //  CORPO
  // ═══════════════════════════════════════════════════════════
  // Corpo / pele base
  ctx.fillStyle = skin;
  ctx.fillRect(px + 4 + squashX, by + 8, 10 - squashX * 2, 14 + squashY);

  // Sombra lateral do corpo
  ctx.fillStyle = skinShade;
  ctx.fillRect(f === 1 ? px + 12 : px + 4, by + 8, 2, 14 + squashY);

  // Camisa
  ctx.fillStyle = shirt;
  ctx.fillRect(px + 4 + squashX, by + 13, 10 - squashX * 2, 5);

  // Sombra da camisa
  ctx.fillStyle = shirtShade;
  ctx.fillRect(f === 1 ? px + 12 : px + 4, by + 13, 2, 5);

  // Cinto
  ctx.fillStyle = belt;
  ctx.fillRect(px + 4 + squashX, by + 18, 10 - squashX * 2, 2);
  // Fivela do cinto no centro
  ctx.fillStyle = beltBuckle;
  ctx.fillRect(px + 8, by + 18, 2, 2);

  // ═══════════════════════════════════════════════════════════
  //  BRAÇO TRASEIRO (atrás do corpo)
  // ═══════════════════════════════════════════════════════════
  const armBackSwing = Math.round(legSwing * 2); // move junto com perna dianteira
  ctx.fillStyle = shirtShade;
  ctx.fillRect(px + (f === 1 ? 4 : 12), by + 13 + armBackSwing, 2, 5);
  // Mão traseira
  ctx.fillStyle = skinShade;
  ctx.fillRect(px + (f === 1 ? 4 : 12), by + 18 + armBackSwing, 2, 2);

  // ═══════════════════════════════════════════════════════════
  //  CAPACETE
  // ═══════════════════════════════════════════════════════════
  // Base do capacete
  ctx.fillStyle = helmet;
  ctx.fillRect(px + 2 + squashX, by + 2, 14 - squashX * 2, 8);
  // Faixa superior do capacete (reflexo)
  ctx.fillStyle = helmetTop;
  ctx.fillRect(px + 3 + squashX, by + 2, 10 - squashX * 2, 2);
  // Aba direcional do capacete
  ctx.fillStyle = helmetRim;
  if (f === 1) ctx.fillRect(px + 15, by + 5, 3, 3);
  else         ctx.fillRect(px,      by + 5, 3, 3);
  // Detalhe lateral (rebite/ventilação)
  ctx.fillStyle = helmetTop;
  if (f === 1) ctx.fillRect(px + 13, by + 4, 1, 2);
  else         ctx.fillRect(px + 4,  by + 4, 1, 2);

  // ═══════════════════════════════════════════════════════════
  //  ROSTO
  // ═══════════════════════════════════════════════════════════
  // Olho branco (esclera pequena)
  ctx.fillStyle = '#e8e8d0';
  if (f === 1) ctx.fillRect(px + 11, by + 7, 3, 2);
  else         ctx.fillRect(px + 4,  by + 7, 3, 2);
  // Íris
  ctx.fillStyle = eye;
  if (f === 1) ctx.fillRect(px + 12, by + 7, 2, 2);
  else         ctx.fillRect(px + 4,  by + 7, 2, 2);
  // Pupila
  ctx.fillStyle = pupil;
  if (f === 1) ctx.fillRect(px + 13, by + 8, 1, 1);
  else         ctx.fillRect(px + 4,  by + 8, 1, 1);

  // ═══════════════════════════════════════════════════════════
  //  BRAÇO DA FRENTE
  // ═══════════════════════════════════════════════════════════
  const armFrontSwing = Math.round(-legSwing * 2); // contrapasso com perna dianteira
  ctx.fillStyle = shirt;
  if (f === 1) ctx.fillRect(px + 14, by + 13 + armFrontSwing, 2, 5);
  else         ctx.fillRect(px + 2,  by + 13 + armFrontSwing, 2, 5);
  // Mão da frente
  ctx.fillStyle = skin;
  if (f === 1) ctx.fillRect(px + 14, by + 18 + armFrontSwing, 2, 2);
  else         ctx.fillRect(px + 2,  by + 18 + armFrontSwing, 2, 2);

  // ═══════════════════════════════════════════════════════════
  //  LÂMPADA DO CAPACETE
  // ═══════════════════════════════════════════════════════════
  const lampX = f === 1 ? px + 16 : px;
  const lampY = by + 4;
  const lampFlicker = 0.85 + Math.sin(now * 0.007) * 0.15; // tremulação suave

  // Cone de luz no chão (projetado à frente)
  ctx.fillStyle = `rgba(255,220,130,${0.06 * lampFlicker})`;
  if (f === 1) ctx.fillRect(lampX + 2,  lampY - 8, 22, 20);
  else         ctx.fillRect(lampX - 22, lampY - 8, 22, 20);

  // Glow externo da lâmpada
  ctx.fillStyle = `rgba(255,232,130,${0.45 * lampFlicker})`;
  ctx.fillRect(lampX - 1, lampY - 1, 5, 5);
  // Corpo da lâmpada
  ctx.fillStyle = lamp;
  ctx.fillRect(lampX, lampY, 3, 3);
  // Núcleo branco brilhante
  ctx.fillStyle = lampCore;
  ctx.fillRect(lampX + 1, lampY, 1, 1);

  // ═══════════════════════════════════════════════════════════
  //  PICARETA (swing)
  // ═══════════════════════════════════════════════════════════
  if (player.swingTimer > 0) {
    const prog = 1 - player.swingTimer / 18;
    const arcX = f === 1 ? px + player.w + 2 : px - 2;
    const arcY = by + player.h * 0.38;
    const sweep = Math.PI * 0.65 * prog;
    const base  = f === 1 ? -0.6 : Math.PI + 0.6;
    const a     = base + f * sweep;

    ctx.save();
    // Cabo da picareta
    ctx.strokeStyle = `rgba(160,110,50,${1 - prog * 0.5})`;
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.beginPath();
    ctx.moveTo(arcX, arcY);
    ctx.lineTo(arcX + Math.cos(a) * 14 * f, arcY + Math.sin(Math.abs(a)) * 11);
    ctx.stroke();
    // Brilho do cabo
    ctx.strokeStyle = `rgba(210,160,80,${0.6 - prog * 0.3})`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(arcX, arcY);
    ctx.lineTo(arcX + Math.cos(a) * 10 * f, arcY + Math.sin(Math.abs(a)) * 8);
    ctx.stroke();
    // Cabeça da picareta (metal)
    ctx.fillStyle = `rgba(190,190,190,${1 - prog * 0.4})`;
    const hx = arcX + Math.cos(a) * 14 * f - 2;
    const hy = arcY + Math.sin(Math.abs(a)) * 11 - 2;
    ctx.fillRect(hx, hy, 5, 4);
    // Brilho da picareta
    ctx.fillStyle = `rgba(255,255,255,${0.7 - prog * 0.5})`;
    ctx.fillRect(hx, hy, 2, 1);
    // Trilha de swing
    ctx.strokeStyle = `rgba(210,210,90,${(1 - prog) * 0.4})`;
    ctx.lineWidth   = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    const aStart = base;
    const aEnd   = a;
    for (let t = 0; t <= 1; t += 0.25) {
      const at = aStart + (aEnd - aStart) * t;
      const tx = arcX + Math.cos(at) * 14 * f;
      const ty = arcY + Math.sin(Math.abs(at)) * 11;
      t === 0 ? ctx.moveTo(tx, ty) : ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Aura do gás extrator
    if (playerStats.gasBuffTimer > 0) {
      ctx.strokeStyle = `rgba(0, 255, 200, ${Math.sin(now * 0.01) * 0.5 + 0.5})`;
      ctx.lineWidth   = 2;
      ctx.strokeRect(player.x - cameraX - 2 + shakeOffX, player.y - cameraY - 2 + shakeOffY, player.w + 4, player.h + 4);
    }

    ctx.restore();
  }
}

// --- MINIMAP -------------------------------------------------

// --- MINIMAP -------------------------------------------------

function drawMinimap(ctx, canvas) {
  const mapW = 220, mapH = 120, pad = 14;
  const x    = canvas.width - mapW - pad;
  const y    = pad;

  // Fundo do minimapa
  ctx.fillStyle = 'rgba(5,5,8,0.88)';
  ctx.fillRect(x - 4, y - 4, mapW + 8, mapH + 8);
  
  if (!minimapCanvas) return;

  // O SEGREDO: Mantém a proporção real dos blocos (não esmaga)
  // Como a altura é 400 blocos e mapH é 120, a proporção é 0.3
  // Logo, a largura de 220px comporta ~733 blocos (pouco mais de 1 bioma)
  const viewCols = Math.floor(mapW * (WORLD_ROWS / mapH)); 
  
  const pCol = player.x / TILE_SIZE;
  let startCol = pCol - viewCols / 2;
  if (startCol < 0) startCol = 0;
  
  const maxStart = Math.max(0, generatedCols - viewCols);
  if (startCol > maxStart) startCol = maxStart;

  const sWidth = Math.min(viewCols, generatedCols - startCol);
  const dWidth = (sWidth / viewCols) * mapW;

  // Desenha apenas a "janela" atual do minimapa
  ctx.drawImage(
    minimapCanvas, 
    startCol, 0, sWidth, WORLD_ROWS, // Recorte da imagem original
    x, y, dWidth, mapH               // Onde vai desenhar na tela
  );

  // Função auxiliar para mapear as coordenadas do mundo para a tela do minimapa
  const worldToMapX = (wx) => x + ((wx / TILE_SIZE) - startCol) * (mapW / viewCols);
  const worldToMapY = (wy) => y + (wy / (WORLD_ROWS * TILE_SIZE)) * mapH;

  ctx.save();
  // Corta tudo que sair fora da caixa do minimapa (clip)
  ctx.beginPath();
  ctx.rect(x, y, mapW, mapH);
  ctx.clip();

  // Inimigos
  for (const e of enemies) {
    if (!e.alive) continue;
    const ex = worldToMapX(e.x);
    const ey = worldToMapY(e.y);
    if (ex >= x && ex <= x + mapW) {
      ctx.fillStyle = '#e04040';
      ctx.fillRect(ex - 1, ey - 1, 2, 2);
    }
  }

  // Retângulo da Câmera (o que você está vendo na tela principal)
  const viewX = worldToMapX(cameraX);
  const viewY = worldToMapY(cameraY);
  const viewW = (canvas.width / TILE_SIZE) * (mapW / viewCols);
  const viewH = (canvas.height / (WORLD_ROWS * TILE_SIZE)) * mapH;
  ctx.strokeStyle = '#f8e08c'; 
  ctx.lineWidth = 1;
  ctx.strokeRect(viewX, viewY, viewW, viewH);

  // Ponto do Jogador
  const dotX = worldToMapX(player.x);
  const dotY = worldToMapY(player.y);
  ctx.fillStyle = '#6ef3ff';
  ctx.fillRect(dotX - 2, dotY - 2, 4, 4);

  ctx.restore();

  ctx.fillStyle = '#f5d4a2'; ctx.font = '12px Arial';
  ctx.fillText('MINIMAPA', x + 6, y - 8);
}

// --- HUD COMPLETO --------------------------------------------

function _drawHeart(ctx, x, y, filled) {
  const s = 10;
  ctx.fillStyle   = filled ? '#e84040' : '#2a0808';
  ctx.strokeStyle = filled ? '#ff6060' : '#440a0a';
  ctx.lineWidth   = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + s/2, y + s*0.82);
  ctx.bezierCurveTo(x+s/2, y+s*0.58, x, y+s*0.35, x, y+s*0.24);
  ctx.bezierCurveTo(x, y, x+s*0.35, y, x+s*0.5, y+s*0.18);
  ctx.bezierCurveTo(x+s*0.65, y, x+s, y, x+s, y+s*0.24);
  ctx.bezierCurveTo(x+s, y+s*0.35, x+s/2, y+s*0.58, x+s/2, y+s*0.82);
  ctx.closePath(); ctx.fill(); ctx.stroke();
}

function drawHUD(ctx) {
  const now = Date.now();

  const panelH = 148 + playerStats.activePowerups.filter(p => p.endTime > now).length * 14;
  ctx.fillStyle = 'rgba(4,2,8,0.82)';
  ctx.fillRect(8, 8, 218, panelH);
  ctx.strokeStyle = 'rgba(80,40,20,0.6)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(8, 8, 218, panelH);

  ctx.fillStyle = '#d4a870';
  ctx.font      = 'bold 12px monospace';
  ctx.fillText('⛏ MINEIRO 2.5D', 18, 28);
  const _curBiome = getBiomeAt(Math.floor(player.x / TILE_SIZE));
  ctx.fillStyle = _curBiome.nameColor;
  ctx.font      = 'bold 9px monospace';
  ctx.fillText(_curBiome.name, 148, 28);

  if (_biomeNotif && _biomeNotif.life > 0) {
    const alpha = Math.min(1, _biomeNotif.life/40) * Math.min(1, (_biomeNotif.life > 180 ? 1 : _biomeNotif.life/50));
    const cw = ctx.canvas.width;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = 'rgba(0,0,0,0.65)';
    ctx.fillRect(cw/2 - 120, 60, 240, 36);
    ctx.strokeStyle = _biomeNotif.color;
    ctx.lineWidth   = 1.5;
    ctx.strokeRect(cw/2 - 120, 60, 240, 36);
    ctx.fillStyle  = _biomeNotif.color;
    ctx.font       = 'bold 18px monospace';
    ctx.textAlign  = 'center';
    ctx.fillText(_biomeNotif.name, cw/2, 84);
    ctx.textAlign  = 'left';
    ctx.restore();
  }

  ctx.fillStyle = '#998870'; ctx.font = '10px monospace';
  ctx.fillText('GÁS', 18, 46);

  const barW = 100, barH = 10, barX = 46, barY = 38;
  ctx.fillStyle = '#1a0f0f'; ctx.fillRect(barX, barY, barW, barH);
  const gasPct  = Math.max(0, playerStats.hp / playerStats.maxHp);
  ctx.fillStyle = gasPct > 0.5 ? '#4caf50' : gasPct > 0.25 ? '#ffc107' : '#f44336';
  ctx.fillRect(barX, barY, barW * gasPct, barH);
  ctx.strokeStyle = '#5a3525'; ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 1; i <= 4; i++) ctx.fillRect(barX + (barW/5)*i, barY, 1, barH);

  if (playerStats.gasBuffTimer > 0) {
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 9px monospace';
    ctx.fillText(`⚡${Math.ceil(playerStats.gasBuffTimer/60)}s`, barX + barW + 4, barY + 9);
  }
  if (playerStats.torchTimer > 0) {
    ctx.fillStyle = '#ffaa20'; ctx.font = 'bold 9px monospace';
    ctx.fillText(`🔦${Math.ceil(playerStats.torchTimer/60)}s`, barX + barW + 36, barY + 9);
  }
  if (playerStats.rocketTimer > 0) {
    ctx.fillStyle = '#ff8c00'; ctx.font = 'bold 9px monospace';
    ctx.fillText(`🚀${Math.ceil(playerStats.rocketTimer/60)}s`, barX + barW + 70, barY + 9);
  }

  let row = 62;
  if (playerStats.shield > 0) {
    ctx.fillStyle = '#2196f3'; ctx.font = '10px monospace';
    ctx.fillText(`🛡 ESCUDO: ${'●'.repeat(playerStats.shield)}${'○'.repeat(3-playerStats.shield)}`, 18, row);
    row += 16;
  }

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 14px monospace';
  ctx.fillText(`${String(playerStats.score).padStart(7,'0')}`, 18, row + 2);
  ctx.fillStyle = '#555'; ctx.font = '10px monospace';
  ctx.fillText(`REC ${String(playerStats.bestScore).padStart(7,'0')}`, 18, row + 16);
  row += 32;

  const oc = playerStats.oresCollected;
  ctx.font = '10px monospace';
  ctx.fillStyle = ORE_DEFS[0].color; ctx.fillText(`■ ${oc.coal}`,    18,  row);
  ctx.fillStyle = ORE_DEFS[1].color; ctx.fillText(`■ ${oc.iron}`,    60,  row);
  ctx.fillStyle = ORE_DEFS[2].color; ctx.fillText(`■ ${oc.gold}`,    100, row);
  ctx.fillStyle = ORE_DEFS[3].color; ctx.fillText(`■ ${oc.diamond}`, 140, row);
  row += 16;

  ctx.fillStyle = '#668866'; ctx.font = '10px monospace';
  ctx.fillText(`DIST ${playerStats.distRecord}t  KILLS ${playerStats.enemiesKilled}`, 18, row);
  row += 14;

  for (const pu of playerStats.activePowerups) {
    if (pu.endTime <= now) continue;
    const def = POWERUP_DEFS.find(d => d.id === pu.type);
    if (!def) continue;
    const secs = ((pu.endTime - now) / 1000).toFixed(1);
    const pct  = (pu.endTime - now) / def.duration;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(18, row+2, 190, 10);
    ctx.fillStyle = def.color + '88';          ctx.fillRect(18, row+2, 190*pct, 10);
    ctx.fillStyle = def.color; ctx.font = 'bold 9px monospace';
    ctx.fillText(`${def.id.toUpperCase()} ${secs}s`, 22, row+10);
    row += 14;
  }

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, ctx.canvas.height - 22, ctx.canvas.width, 22);
  ctx.fillStyle = '#554433'; ctx.font = '10px monospace';
  ctx.fillText('A/D:Mover  W/SPC:Pular  Z/X:Picareta  1-6:Ferramentas  Q:Menu  R:Reiniciar', 12, ctx.canvas.height - 8);
}

// --- TELA DE MORTE -------------------------------------------

function drawGameOver(ctx) {
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, 0, cw, ch);

  const pw = 380, ph = 280;
  const px = cw/2 - pw/2, py = ch/2 - ph/2;
  ctx.fillStyle = 'rgba(12,3,3,0.96)'; ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = '#8b1010'; ctx.lineWidth = 2; ctx.strokeRect(px, py, pw, ph);
  ctx.strokeStyle = 'rgba(139,16,16,0.3)'; ctx.lineWidth = 1;
  ctx.strokeRect(px+4, py+4, pw-8, ph-8);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#cc2020'; ctx.font = 'bold 34px monospace';
  ctx.fillText('VOCÊ MORREU', cw/2, py+46);

  ctx.strokeStyle = '#441010'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(px+20, py+56); ctx.lineTo(px+pw-20, py+56); ctx.stroke();

  ctx.fillStyle = '#ffd700'; ctx.font = 'bold 22px monospace';
  ctx.fillText(`PONTOS: ${playerStats.score}`, cw/2, py+82);

  if (playerStats.score >= playerStats.bestScore && playerStats.score > 0) {
    ctx.fillStyle = '#ff9900'; ctx.font = 'bold 13px monospace';
    ctx.fillText('✨ NOVO RECORDE! ✨', cw/2, py+100);
  } else {
    ctx.fillStyle = '#665544'; ctx.font = '12px monospace';
    ctx.fillText(`Recorde: ${playerStats.bestScore}`, cw/2, py+100);
  }

  const oc = playerStats.oresCollected;
  ctx.fillStyle = '#998870'; ctx.font = '12px monospace';
  ctx.fillText(`Carvão ${oc.coal}  Ferro ${oc.iron}  Ouro ${oc.gold}  Diamante ${oc.diamond}`, cw/2, py+128);
  ctx.fillText(`Inimigos: ${playerStats.enemiesKilled}  Distância: ${playerStats.distRecord} tiles`, cw/2, py+148);

  ctx.strokeStyle = '#441010';
  ctx.beginPath(); ctx.moveTo(px+20, py+160); ctx.lineTo(px+pw-20, py+160); ctx.stroke();

  const blink = Math.floor(Date.now()/480) % 2;
  ctx.fillStyle = blink ? '#ffd700' : '#887700'; ctx.font = 'bold 16px monospace';
  ctx.fillText('[ R ]  Recomeçar com mesma seed', cw/2, py+192);
  ctx.fillStyle = blink ? '#88aaff' : '#445588'; ctx.font = '13px monospace';
  ctx.fillText('[ 🎲 ]  Nova seed aleatória', cw/2, py+216);
  ctx.textAlign = 'left';
}
