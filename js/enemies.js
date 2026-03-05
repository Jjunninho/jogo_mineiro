// ============================================================
//  enemies.js  –  Tipos de inimigos, IA e dano
//  Biomas: cave(bat,slime,spider) | crystal(bat,golem,spider)
//          basalt(lavabat,slime,spider) | water(piranha)
//  Depende de: config.js, player.js, particles.js, audio.js
// ============================================================

let enemies       = [];
let _dmgCooldown  = 0;
const MAX_ENEMIES = 110;

// ─── CRIAÇÃO ─────────────────────────────────────────────────

function createBat(x, y) {
  return { type:'bat', x, y, vx:0, vy:0,
    hp:1, maxHp:1, w:12, h:8, damage:1, speed:1.4, aggroRange:210,
    alive:true, points:10, wingPhase:Math.random()*Math.PI*2, hitFlash:0 };
}

function createSlime(x, y) {
  return { type:'slime', x, y, vx:0, vy:0,
    hp:3, maxHp:3, w:14, h:10, damage:1, speed:0.75, aggroRange:150,
    alive:true, points:15, jumpTimer:55+Math.floor(Math.random()*60),
    onGround:false, hitFlash:0 };
}

function createSpider(x, y) {
  return { type:'spider', x, y, vx:0, vy:0,
    hp:2, maxHp:2, w:12, h:12, damage:2, speed:2.0, aggroRange:140,
    alive:true, points:25, homeY:y, state:'hanging', hitFlash:0 };
}

// ── NOVO: Golem de Cristal (bioma cristais) ──────────────────
function createGolem(x, y) {
  return { type:'golem', x, y, vx:0, vy:0,
    hp:10, maxHp:10, w:22, h:30, damage:3, speed:0.55, aggroRange:200,
    alive:true, points:50, dir:1, patrolTimer:100+Math.floor(Math.random()*80),
    onGround:false, hitFlash:0, crystalPulse:Math.random()*Math.PI*2 };
}

// ── NOVO: Morcego de Lava (bioma basalto) ────────────────────
function createLavaBat(x, y) {
  return { type:'lavabat', x, y, vx:0, vy:0,
    hp:2, maxHp:2, w:14, h:9, damage:2, speed:2.4, aggroRange:260,
    alive:true, points:20, wingPhase:Math.random()*Math.PI*2, hitFlash:0 };
}

// ── NOVO: Piranha (bioma água) ───────────────────────────────
function createPiranha(x, y) {
  return { type:'piranha', x, y, vx:(Math.random()<0.5?1.6:-1.6), vy:0,
    hp:2, maxHp:2, w:16, h:8, damage:3, speed:2.8, aggroRange:220,
    alive:true, points:30, tailPhase:Math.random()*Math.PI*2, hitFlash:0 };
}

// ── NOVO: Cogumelo Explosivo (bioma fungos) ──────────────────
function createFungus(x, y) {
  return { type:'fungus', x, y, vx:0, vy:0,
    hp:5, maxHp:5, w:18, h:18, damage:2, speed:0.4, aggroRange:160,
    alive:true, points:40, bobPhase:Math.random()*Math.PI*2,
    sporeTimer: 80+Math.floor(Math.random()*60), hitFlash:0 };
}

// ── NOVO: Esporo Voador (bioma fungos) ───────────────────────
function createSpore(x, y) {
  return { type:'spore', x, y, vx:0, vy:0,
    hp:1, maxHp:1, w:10, h:10, damage:1, speed:1.5, aggroRange:180,
    alive:true, points:15, bobPhase:Math.random()*Math.PI*2, hitFlash:0 };
}

// Wisp (Fantasma que atravessa blocos)
function createWisp(x, y) {
  return { type:'wisp', x, y, vx:0, vy:0, hp:3, maxHp:3, w:10, h:10, damage:2, speed:0.8, aggroRange:300, alive:true, points:35, hitFlash:0 };
}
// Beetle (Besouro blindado de chão)
function createBeetle(x, y) {
  return { type:'beetle', x, y, vx:1, vy:0, hp:6, maxHp:6, w:16, h:12, damage:3, speed:0.5, aggroRange:100, alive:true, points:40, onGround:false, hitFlash:0 };
}

// ─── SPAWN COM BIOMAS ────────────────────────────────────────

function spawnEnemiesInRange(startCol, endCol) {
  if (enemies.length >= MAX_ENEMIES) return;

  for (let x = Math.max(startCol, 25); x < endCol - 5; x++) {
    if (!grid[x] || enemies.length >= MAX_ENEMIES) break;
    
    const biome = getBiomeAt(x); // Pega a def do bioma (agora tem a lista .enemies)

    for (let y = 2; y < WORLD_ROWS - 2; y++) {
      if (grid[x][y] !== 0) continue;
      if (enemies.length >= MAX_ENEMIES) break;

      const floorBelow = isSolidCell(x, y + 1);
      const ceilAbove  = isSolidCell(x, y - 1);
      const openAbove  = !ceilAbove;
      const r = Math.random();

      // Sorteia qual inimigo da lista do bioma vai spawnar
      if (r < 0.015 && biome.enemies.length > 0) {
        // Pega um inimigo aleatório da lista autorizada pelo bioma
        const enemyType = biome.enemies[Math.floor(Math.random() * biome.enemies.length)];
        const px = x * TILE_SIZE + 2;
        const py = y * TILE_SIZE;

        switch(enemyType) {
          case 'bat':     if(openAbove) enemies.push(createBat(px, py+2)); break;
          case 'slime':   if(floorBelow) enemies.push(createSlime(px, py+TILE_SIZE-10)); break;
          case 'spider':  if(ceilAbove) enemies.push(createSpider(px, py+2)); break;
          case 'golem':   if(floorBelow) enemies.push(createGolem(px, py+TILE_SIZE-30)); break;
          case 'lavabat': if(openAbove) enemies.push(createLavaBat(px, py+2)); break;
          case 'piranha': enemies.push(createPiranha(px, py+2)); break; // Spawna livre na água
          case 'fungus':  if(floorBelow) enemies.push(createFungus(px, py+TILE_SIZE-20)); break;
          case 'spore':   if(ceilAbove) enemies.push(createSpore(px, py+2)); break;
          case 'wisp':    enemies.push(createWisp(px, py+2)); break; // Spawna no ar livre
          case 'beetle':  if(floorBelow) enemies.push(createBeetle(px, py+TILE_SIZE-12)); break;
        }
      }
    }
  }
}
// ─── COLISÃO COM O MUNDO ─────────────────────────────────────

function _rectSolid(x, y, w, h) {
  const x0=Math.floor(x/TILE_SIZE), x1=Math.floor((x+w-1)/TILE_SIZE);
  const y0=Math.floor(y/TILE_SIZE), y1=Math.floor((y+h-1)/TILE_SIZE);
  for (let tx=x0; tx<=x1; tx++)
    for (let ty=y0; ty<=y1; ty++)
      if (isSolidCell(tx,ty)) return true;
  return false;
}

function _moveSolid(e) {
  const nx = e.x + e.vx;
  if (!_rectSolid(nx, e.y, e.w, e.h)) { e.x = nx; }
  else { e.vx = -e.vx * 0.3; }
  const ny = e.y + e.vy;
  if (!_rectSolid(e.x, ny, e.w, e.h)) { e.y = ny; if (e.vy>0) e.onGround=false; }
  else { if (e.vy>0) e.onGround=true; e.vy=0; }
}

// ─── IA DOS INIMIGOS ─────────────────────────────────────────

function _updateBat(e) {
  e.wingPhase += 0.16;
  const dx=(player.x+player.w/2)-(e.x+e.w/2);
  const dy=(player.y+player.h/2)-(e.y+e.h/2);
  const dist=Math.sqrt(dx*dx+dy*dy)||1;
  if (dist < e.aggroRange) {
    e.vx += (dx/dist)*0.16; e.vy += (dy/dist)*0.13 + Math.sin(e.wingPhase)*0.06;
  } else { e.vy += Math.sin(e.wingPhase*0.4)*0.04; e.vx*=0.97; e.vy*=0.97; }
  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  e.vy = Math.max(-e.speed, Math.min(e.speed, e.vy));
  e.x += e.vx; e.y += e.vy;
  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
  e.y = Math.max(0, Math.min(WORLD_H-e.h, e.y));
}

function _updateSlime(e) {
  e.vy = Math.min(e.vy+0.38, 9);
  const dx=(player.x+player.w/2)-(e.x+e.w/2);
  if (Math.abs(dx) < e.aggroRange) e.vx += Math.sign(dx)*0.07;
  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx))*0.90;
  if (e.onGround) { e.jumpTimer--; if (e.jumpTimer<=0) { e.vy=-5.8; e.onGround=false; e.jumpTimer=70+Math.floor(Math.random()*60); } }
  _moveSolid(e);
}

function _updateSpider(e) {
  const dx=(player.x+player.w/2)-(e.x+e.w/2);
  const dy=(player.y+player.h/2)-(e.y+e.h/2);
  const dist=Math.sqrt(dx*dx+dy*dy)||1;
  if (e.state==='hanging') {
    e.vx=0; e.vy=0;
    if (dist < e.aggroRange && dy > 0) e.state='dropping';
  } else if (e.state==='dropping') {
    e.vy = Math.min(e.vy+0.55, e.speed*2.5);
    e.vx += Math.sign(dx)*0.12;
    e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
    _moveSolid(e);
    if (e.onGround) e.state='climbing';
  } else if (e.state==='climbing') {
    e.vy = Math.max(e.vy-0.18, -e.speed*1.8);
    e.vx *= 0.88;
    e.x+=e.vx; e.y+=e.vy;
    if (e.y<=e.homeY) { e.y=e.homeY; e.vy=0; e.vx=0; e.state='hanging'; }
  }
}

// ── NOVO: Golem patrulha e persegue ──────────────────────────
function _updateGolem(e) {
  e.crystalPulse += 0.06;
  e.vy = Math.min(e.vy + 0.42, 9); // gravidade
  const dx = (player.x+player.w/2) - (e.x+e.w/2);

  if (Math.abs(dx) < e.aggroRange) {
    // Perseguição lenta
    e.vx = Math.sign(dx) * e.speed;
  } else {
    // Patrulha
    e.patrolTimer--;
    if (e.patrolTimer <= 0) {
      e.dir *= -1;
      e.patrolTimer = 80 + Math.floor(Math.random() * 100);
    }
    e.vx = e.dir * e.speed * 0.5;
  }
  _moveSolid(e);

  // Emite faíscas de cristal ocasionalmente
  if (Math.random() < 0.04) {
    addParticle({ x:e.x+e.w/2+(Math.random()-0.5)*10, y:e.y+4,
      vx:(Math.random()-0.5)*1.5, vy:-Math.random()*2,
      life:18+Math.random()*12, color:Math.random()<0.5?'#c084fc':'#818cf8',
      size:2+Math.random()*2, gravity:false });
  }
}

// ── NOVO: Morcego de lava ─────────────────────────────────────
function _updateLavaBat(e) {
  e.wingPhase += 0.2;
  const dx=(player.x+player.w/2)-(e.x+e.w/2);
  const dy=(player.y+player.h/2)-(e.y+e.h/2);
  const dist=Math.sqrt(dx*dx+dy*dy)||1;
  if (dist < e.aggroRange) {
    e.vx += (dx/dist)*0.22; e.vy += (dy/dist)*0.18 + Math.sin(e.wingPhase)*0.07;
  } else { e.vx*=0.97; e.vy*=0.97; }
  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  e.vy = Math.max(-e.speed, Math.min(e.speed, e.vy));
  e.x += e.vx; e.y += e.vy;
  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
  e.y = Math.max(0, Math.min(WORLD_H-e.h, e.y));

  // Rastro de fogo
  if (Math.random() < 0.25) {
    addParticle({ x:e.x+e.w/2, y:e.y+e.h/2,
      vx:(Math.random()-0.5)*1.2, vy:Math.random()*1.5+0.5,
      life:10+Math.random()*10,
      color:Math.random()<0.5?'#f97316':'#fbbf24',
      size:1.5+Math.random()*2, gravity:false });
  }
}

// ── NOVO: Piranha — nada em espaços vazios ────────────────────
function _updatePiranha(e) {
  e.tailPhase += 0.22;
  const dx=(player.x+player.w/2)-(e.x+e.w/2);
  const dy=(player.y+player.h/2)-(e.y+e.h/2);
  const dist=Math.sqrt(dx*dx+dy*dy)||1;

  if (dist < e.aggroRange) {
    // Perseguição agressiva
    e.vx += (dx/dist)*0.30;
    e.vy += (dy/dist)*0.18;
  } else {
    // Nada horizontal em patrulha
    e.vx += e.vx > 0 ? 0.04 : -0.04;
  }

  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  e.vy = Math.max(-e.speed*0.7, Math.min(e.speed*0.7, e.vy));

  // Colisão com paredes (inverte direção)
  const nx = e.x + e.vx;
  if (!_rectSolid(nx, e.y, e.w, e.h)) { e.x = nx; }
  else { e.vx *= -0.9; }

  const ny = e.y + e.vy;
  if (!_rectSolid(e.x, ny, e.w, e.h)) { e.y = ny; }
  else { e.vy *= -0.9; }

  // Bolhas d'água ocasionais
  if (Math.random() < 0.06) {
    addParticle({ x:e.x+e.w/2+(Math.random()-0.5)*6, y:e.y,
      vx:(Math.random()-0.5)*0.5, vy:-0.5-Math.random()*0.8,
      life:30+Math.random()*20, color:'rgba(150,210,255,0.6)',
      size:1.5+Math.random()*2, gravity:false });
  }

  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
  e.y = Math.max(0, Math.min(WORLD_H-e.h, e.y));
}

// ── NOVO: Cogumelo Explosivo ─────────────────────────────────
function _updateFungus(e) {
  e.bobPhase += 0.04;
  e.vy = Math.min(e.vy + 0.40, 9);
  _moveSolid(e);

  const dx = (player.x+player.w/2) - (e.x+e.w/2);
  const dy = (player.y+player.h/2) - (e.y+e.h/2);
  const dist = Math.sqrt(dx*dx+dy*dy)||1;

  if (dist < e.aggroRange) {
    // Avança devagar na direção do jogador
    e.vx += Math.sign(dx) * 0.06;
    e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  } else {
    e.vx *= 0.88;
  }

  // Emite esporos verdes periodicamente
  e.sporeTimer--;
  if (e.sporeTimer <= 0) {
    e.sporeTimer = 80 + Math.floor(Math.random()*60);
    for (let i = 0; i < 5; i++) {
      addParticle({ x:e.x+e.w/2, y:e.y,
        vx:(Math.random()-0.5)*3, vy:-1.5-Math.random()*2,
        life:35+Math.random()*20, color:Math.random()<0.5?'#4ade80':'#86efac',
        size:2+Math.random()*2, gravity:true });
    }
  }

  // Pulsa (bob) visualmente
  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
}

// ── NOVO: Esporo (funguinho) ──────────────────────────────────
function _updateSpore(e) {
  e.bobPhase += 0.08;
  e.vy = Math.min(e.vy+0.35, 8);
  _moveSolid(e);

  const dx = (player.x+player.w/2) - (e.x+e.w/2);
  const dy = (player.y+player.h/2) - (e.y+e.h/2);
  const dist = Math.sqrt(dx*dx+dy*dy)||1;

  if (dist < e.aggroRange) {
    e.vx += (dx/dist)*0.14;
    e.vy += (dy/dist)*0.05;
  }
  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  e.x += e.vx * 0.4;
  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
}

// ── NOVO: Fantasma Wisp (Atravessa Paredes) ───────────────────
function _updateWisp(e) {
  const dx = (player.x + player.w/2) - (e.x + e.w/2);
  const dy = (player.y + player.h/2) - (e.y + e.h/2);
  const dist = Math.sqrt(dx*dx + dy*dy) || 1;
  
  // Persegue o jogador lentamente ignorando colisão
  if (dist < e.aggroRange) {
    e.vx += (dx/dist) * 0.04;
    e.vy += (dy/dist) * 0.04;
  } else {
    e.vx *= 0.95;
    e.vy *= 0.95;
  }
  
  e.vx = Math.max(-e.speed, Math.min(e.speed, e.vx));
  e.vy = Math.max(-e.speed, Math.min(e.speed, e.vy));
  e.x += e.vx;
  e.y += e.vy;
  
  // Limites do mundo (não foge do mapa)
  e.x = Math.max(0, Math.min(generatedCols*TILE_SIZE-e.w, e.x));
  e.y = Math.max(0, Math.min(WORLD_H-e.h, e.y));

  // Rastro etéreo
  if (Math.random() < 0.15) {
    addParticle({ x: e.x+e.w/2, y: e.y+e.h/2, 
      vx: (Math.random()-0.5)*0.5, vy: -Math.random()*0.8, 
      life: 25, color: 'rgba(96, 165, 250, 0.6)', size: 2, gravity: false });
  }
}

function _drawWisp(ctx, e, sx, sy, time) {
  const cx = sx + e.w/2;
  const cy = sy + e.h/2 + Math.sin(time*4 + e.x)*2; // Flutua suavemente
  
  ctx.save();
  ctx.globalAlpha = 0.7 + Math.sin(time*6)*0.2; // Pulsa opacidade
  
  // Halo brilhante
  ctx.shadowColor = '#3b82f6';
  ctx.shadowBlur = 12;
  ctx.fillStyle = '#60a5fa';
  ctx.beginPath(); ctx.arc(cx, cy, e.w*0.6, 0, Math.PI*2); ctx.fill();
  
  // Núcleo branco
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#eff6ff';
  ctx.beginPath(); ctx.arc(cx, cy, e.w*0.25, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── NOVO: Besouro Blindado (Patrulha de Chão) ─────────────────
function _updateBeetle(e) {
  e.vy = Math.min(e.vy + 0.4, 8); // Gravidade pesada
  
  // Movimento horizontal
  const nx = e.x + e.vx;
  if (!_rectSolid(nx, e.y, e.w, e.h)) { 
    e.x = nx; 
  } else { 
    e.vx *= -1; // Bateu na parede, vira pro outro lado
  }
  
  // Movimento vertical (colisão com o chão)
  const ny = e.y + e.vy;
  if (!_rectSolid(e.x, ny, e.w, e.h)) { 
    e.y = ny; 
  } else { 
    e.vy = 0; 
  }
}

function _drawBeetle(ctx, e, sx, sy, time) {
  const cx = sx + e.w/2;
  const cy = sy + e.h/2;
  const dir = e.vx > 0 ? 1 : -1;
  
  // Patinhas animadas andando
  ctx.strokeStyle = '#1c1917';
  ctx.lineWidth = 1.5;
  const walk = Math.sin(time * 18) * 2;
  for(let i=-1; i<=1; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i*3, cy);
    ctx.lineTo(cx + i*4 + walk*dir*(i%2===0?1:-1), cy + e.h/2 + 2);
    ctx.stroke();
  }
  
  // Casco duro (Cinza escuro)
  ctx.fillStyle = '#44403c';
  ctx.beginPath(); ctx.ellipse(cx, cy, e.w/2, e.h/2, 0, 0, Math.PI*2); ctx.fill();
  
  // Brilho no casco para dar volume
  ctx.fillStyle = '#78716c';
  ctx.beginPath(); ctx.ellipse(cx, cy-2, e.w*0.35, e.h*0.3, 0, 0, Math.PI*2); ctx.fill();
  
  // Olhinhos vermelhos bravos
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx + dir*4, cy - 2, 2, 2);
}



// ─── LOOP DE UPDATE ──────────────────────────────────────────

function updateEnemies() {
  if (gameState !== 'playing') return;
  if (_dmgCooldown > 0) _dmgCooldown--;

  // Mantém só inimigos relativamente próximos do jogador/câmera.
  // Isso evita lotação eterna do array e libera vagas para biomas novos.
  const keepL = cameraX - 1400;
  const keepR = cameraX + 2400;
  const keepT = cameraY - 900;
  const keepB = cameraY + 1700;

  enemies = enemies.filter(e =>
    e.alive &&
    e.x + e.w > keepL &&
    e.x < keepR &&
    e.y + e.h > keepT &&
    e.y < keepB
  );

  const camL = cameraX - 120,  camR = cameraX + 1080;
  const camT = cameraY - 120,  camB = cameraY + 660;

  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.x < camL || e.x > camR || e.y < camT || e.y > camB) continue;

  switch (e.type) {
      case 'bat':     _updateBat(e);     break;
      case 'slime':   _updateSlime(e);   break;
      case 'spider':  _updateSpider(e);  break;
      case 'golem':   _updateGolem(e);   break;
      case 'lavabat': _updateLavaBat(e); break;
      case 'piranha': _updatePiranha(e); break;
      case 'fungus':  _updateFungus(e);  break;
      case 'spore':   _updateSpore(e);   break;
      // ADICIONE ESTAS DUAS LINHAS:
      case 'wisp':    _updateWisp(e);    break;
      case 'beetle':  _updateBeetle(e);  break;
    }

    _checkEnemyHitsPlayer(e);
  }

  enemies = enemies.filter(e => e.alive);
}

function _checkEnemyHitsPlayer(e) {
  if (_dmgCooldown > 0) return;
  if (e.x < player.x+player.w && e.x+e.w > player.x &&
      e.y < player.y+player.h && e.y+e.h > player.y) {
    damagePlayer(e.damage);
    _dmgCooldown = 55;
  }
}

// ─── DANO AO JOGADOR ─────────────────────────────────────────

function damagePlayer(amount) {
  if (playerStats.iframes > 0 || gameState !== 'playing') return;
  if (playerStats.shield > 0) {
    playerStats.shield--;
    playerStats.iframes = 55;
    triggerShake(3,5);
    sfx.hurt();
    addFloatingText(player.x+player.w/2, player.y-12, 'ESCUDO!', '#2196f3', 12);
    return;
  }
  playerStats.hp = Math.max(0, playerStats.hp - amount);
  playerStats.iframes = 90;
  triggerShake(6,9);
  sfx.hurt();
  addFloatingText(player.x+player.w/2, player.y-12, `-${amount} HP`, '#ff4444', 13);
  if (playerStats.hp <= 0) {
    gameState = 'dead';
    if (playerStats.score > playerStats.bestScore) playerStats.bestScore = playerStats.score;
    sfx.death();
  }
}

// ─── ATAQUE DO JOGADOR ────────────────────────────────────────

function playerAttack() {
  if (gameState !== 'playing') return;
  const reach=30;
  const cx=player.x+player.w/2+player.facing*reach*0.6;
  const cy=player.y+player.h*0.45;
  let hit=false;
  for (const e of enemies) {
    if (!e.alive) continue;
    const dx=(e.x+e.w/2)-cx, dy=(e.y+e.h/2)-cy;
    if (Math.abs(dx)<reach && Math.abs(dy)<reach) { hitEnemy(e); hit=true; }
  }
  if (hit) sfx.enemyHit(); else sfx.swing();
}

function hitEnemy(e) {
  e.hp--;
  e.hitFlash = 8;
  e.vx += player.facing * 2.5;
  e.vy -= 1.5;
  if (e.hp <= 0) {
    e.alive = false;
    playerStats.enemiesKilled++;
    playerStats.score += e.points;
    spawnEnemyDeathParticles(e.x+e.w/2, e.y+e.h/2);
    addFloatingText(e.x+e.w/2, e.y-6, `+${e.points}`, '#ff9060', 12);
    // Cogumelo explode em 2 esporinhos ao morrer
    if (e.type === 'fungus') {
      for (let s = 0; s < 2; s++)
        enemies.push(createSpore(e.x + e.w/2 + (s===0?-6:6), e.y));
      addFloatingText(e.x+e.w/2, e.y-14, 'ESPOROS!', '#4ade80', 11);
    }
  } else {
    addParticle({ x:e.x+e.w/2, y:e.y+e.h/2, vx:0, vy:-1.5, life:18, color:'#fff', size:3 });
  }
}

// ─── DESENHO ─────────────────────────────────────────────────

function drawEnemies(ctx) {
  const time = Date.now() * 0.001;
  for (const e of enemies) {
    if (!e.alive) continue;
    const sx=Math.round(e.x-cameraX+shakeOffX);
    const sy=Math.round(e.y-cameraY+shakeOffY);
    if (sx<-40||sx>ctx.canvas.width+40||sy<-40||sy>ctx.canvas.height+40) continue;

    ctx.save();
    if (e.hitFlash > 0) { ctx.globalAlpha=0.7+Math.sin(e.hitFlash*1.5)*0.3; ctx.filter='brightness(3)'; }

   switch (e.type) {
      case 'bat':     _drawBat(ctx, e, sx, sy, time);     break;
      case 'slime':   _drawSlime(ctx, e, sx, sy);         break;
      case 'spider':  _drawSpider(ctx, e, sx, sy, time);  break;
      case 'golem':   _drawGolem(ctx, e, sx, sy, time);   break;
      case 'lavabat': _drawLavaBat(ctx, e, sx, sy, time); break;
      case 'piranha': _drawPiranha(ctx, e, sx, sy, time); break;
      case 'fungus':  _drawFungus(ctx, e, sx, sy, time);  break;
      case 'spore':   _drawSpore(ctx, e, sx, sy, time);   break;
      // ADICIONE ESTAS DUAS LINHAS:
      case 'wisp':    _drawWisp(ctx, e, sx, sy, time);    break;
      case 'beetle':  _drawBeetle(ctx, e, sx, sy, time);  break;
    }
    ctx.restore();

    // Barra de HP
    if (e.hp < e.maxHp) {
      ctx.fillStyle='#1a1a1a'; ctx.fillRect(sx, sy-6, e.w, 3);
      const pct = e.hp/e.maxHp;
      ctx.fillStyle = pct>0.5?'#50e050':'#e05050';
      ctx.fillRect(sx, sy-6, e.w*pct, 3);
    }
  }
}

function _drawBat(ctx, e, sx, sy, time) {
  const flap=Math.sin(time*12+e.wingPhase)*5;
  const cx=sx+e.w/2, cy=sy+e.h/2;
  ctx.fillStyle='#6a3a8a';
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-10,cy+flap); ctx.lineTo(cx-6,cy+e.h*0.7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+10,cy+flap); ctx.lineTo(cx+6,cy+e.h*0.7); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#4a2a6a';
  ctx.beginPath(); ctx.ellipse(cx,cy,e.w*0.38,e.h*0.52,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#ff3333';
  ctx.fillRect(cx-3,cy-1,2,2); ctx.fillRect(cx+1,cy-1,2,2);
}

function _drawSlime(ctx, e, sx, sy) {
  const hpR=e.hp/e.maxHp;
  const g=Math.floor(100+hpR*90);
  const cx=sx+e.w/2, cy=sy+e.h*0.62;
  ctx.fillStyle='rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(cx,sy+e.h+1,e.w*0.5,2,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=`rgb(25,${g},50)`;
  ctx.beginPath(); ctx.ellipse(cx,cy,e.w*0.52,e.h*0.48,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=`rgba(100,${g+60},80,0.4)`;
  ctx.beginPath(); ctx.ellipse(cx-2,cy-3,e.w*0.22,e.h*0.15,-0.4,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#fff'; ctx.fillRect(sx+2,sy+3,4,4); ctx.fillRect(sx+e.w-6,sy+3,4,4);
  ctx.fillStyle='#000'; ctx.fillRect(sx+3,sy+4,2,2); ctx.fillRect(sx+e.w-5,sy+4,2,2);
}

function _drawSpider(ctx, e, sx, sy, time) {
  const cx=sx+e.w/2, cy=sy+e.h/2;
  if (e.state==='hanging'||e.state==='climbing') {
    ctx.strokeStyle='rgba(220,220,220,0.35)'; ctx.lineWidth=0.8;
    ctx.beginPath(); ctx.moveTo(cx,sy); ctx.lineTo(cx,sy-35); ctx.stroke();
  }
  ctx.strokeStyle='#1a0a1a'; ctx.lineWidth=1;
  for (let i=0;i<4;i++) {
    const legY=cy+(i-1.5)*2.5, wig=Math.sin(time*6+i*0.8)*2;
    ctx.beginPath(); ctx.moveTo(cx-2,legY); ctx.lineTo(cx-8-i,legY-2+wig); ctx.lineTo(cx-13-i,legY+3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx+2,legY); ctx.lineTo(cx+8+i,legY-2+wig); ctx.lineTo(cx+13+i,legY+3); ctx.stroke();
  }
  ctx.fillStyle='#1a0a20'; ctx.beginPath(); ctx.ellipse(cx,cy+3,e.w*0.32,e.h*0.38,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#2a1a30'; ctx.beginPath(); ctx.arc(cx,cy-2,e.w*0.3,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#e94560'; ctx.fillRect(cx-4,cy-4,2,2); ctx.fillRect(cx+2,cy-4,2,2); ctx.fillRect(cx-2,cy-2,2,2);
}

// ── NOVO: Golem de Cristal ────────────────────────────────────
function _drawGolem(ctx, e, sx, sy, time) {
  const pulse = Math.sin(e.crystalPulse)*0.4+0.6;
  const cx    = sx+e.w/2;

  // Sombra
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cx,sy+e.h+2,e.w*0.55,3,0,0,Math.PI*2); ctx.fill();

  // Corpo de pedra
  ctx.fillStyle='#2e2040';
  ctx.fillRect(sx+2, sy+8, e.w-4, e.h-8);

  // Ombros arredondados
  ctx.fillStyle='#3d2a55';
  ctx.fillRect(sx, sy+10, 5, e.h-16);
  ctx.fillRect(sx+e.w-5, sy+10, 5, e.h-16);

  // Cabeça
  ctx.fillStyle='#2a1a40';
  ctx.fillRect(sx+4, sy, e.w-8, 12);

  // Cristais na armadura (3 shard no peito)
  const shardPositions = [[cx-6,sy+16],[cx,sy+12],[cx+6,sy+16]];
  for (const [px,py] of shardPositions) {
    ctx.fillStyle=`rgba(167,139,250,${pulse})`;
    ctx.beginPath();
    ctx.moveTo(px, py-7); ctx.lineTo(px-3, py+3); ctx.lineTo(px+3, py+3);
    ctx.closePath(); ctx.fill();
    // brilho
    ctx.fillStyle=`rgba(255,255,255,${pulse*0.5})`;
    ctx.beginPath();
    ctx.moveTo(px, py-6); ctx.lineTo(px-1, py); ctx.lineTo(px+1, py);
    ctx.closePath(); ctx.fill();
  }

  // Olhos roxo brilhante
  ctx.save();
  ctx.shadowColor='#c084fc'; ctx.shadowBlur=8;
  ctx.fillStyle=`rgba(192,132,252,${pulse})`;
  ctx.fillRect(sx+5, sy+3, 4, 4);
  ctx.fillRect(sx+e.w-9, sy+3, 4, 4);
  ctx.restore();

  // Faíscas de cristal externas (aura)
  ctx.save();
  ctx.globalAlpha=0.3*pulse;
  ctx.strokeStyle='#c084fc'; ctx.lineWidth=1;
  ctx.strokeRect(sx-2, sy-2, e.w+4, e.h+4);
  ctx.restore();
}

// ── NOVO: Morcego de Lava ─────────────────────────────────────
function _drawLavaBat(ctx, e, sx, sy, time) {
  const flap=Math.sin(time*14+e.wingPhase)*6;
  const cx=sx+e.w/2, cy=sy+e.h/2;

  // Glow de fogo
  ctx.save();
  ctx.globalAlpha=0.25;
  ctx.fillStyle='#f97316';
  ctx.beginPath(); ctx.arc(cx,cy,e.w*0.9,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Asas — laranja escuro
  ctx.fillStyle='#7c2d12';
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-12,cy+flap); ctx.lineTo(cx-7,cy+e.h*0.8); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+12,cy+flap); ctx.lineTo(cx+7,cy+e.h*0.8); ctx.closePath(); ctx.fill();

  // Veias de lava nas asas
  ctx.strokeStyle='rgba(249,115,22,0.6)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx-9,cy+flap*0.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+9,cy+flap*0.7); ctx.stroke();

  // Corpo vermelho-laranja
  ctx.fillStyle='#991b1b';
  ctx.beginPath(); ctx.ellipse(cx,cy,e.w*0.4,e.h*0.55,0,0,Math.PI*2); ctx.fill();

  // Olhos laranja
  ctx.fillStyle='#fb923c';
  ctx.fillRect(cx-3,cy-1,2,2); ctx.fillRect(cx+1,cy-1,2,2);
}

// ── NOVO: Piranha ─────────────────────────────────────────────
function _drawPiranha(ctx, e, sx, sy, time) {
  const dir   = e.vx >= 0 ? 1 : -1;  // direção de nado
  const tail  = Math.sin(e.tailPhase) * 4;
  const cx    = sx + e.w/2;
  const cy    = sy + e.h/2;

  // Bolhas d'água ao redor
  ctx.save();
  ctx.globalAlpha=0.2;
  ctx.fillStyle='#7dd3fc';
  ctx.beginPath(); ctx.arc(cx-(dir*3),cy,e.w*0.9,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // Cauda (oscila)
  ctx.fillStyle='#7f1d1d';
  ctx.beginPath();
  ctx.moveTo(cx - dir*6, cy - 3 + tail);
  ctx.lineTo(cx - dir*e.w/2 - 3, cy - 5);
  ctx.lineTo(cx - dir*e.w/2 - 3, cy + 5);
  ctx.closePath(); ctx.fill();

  // Corpo principal
  ctx.fillStyle='#b91c1c';
  ctx.beginPath(); ctx.ellipse(cx, cy, e.w*0.44, e.h*0.46, 0, 0, Math.PI*2); ctx.fill();

  // Barriga mais clara
  ctx.fillStyle='#fca5a5';
  ctx.beginPath(); ctx.ellipse(cx-(dir*1), cy+1, e.w*0.22, e.h*0.22, 0, 0, Math.PI*2); ctx.fill();

  // Nadadeira dorsal
  ctx.fillStyle='#991b1b';
  ctx.beginPath();
  ctx.moveTo(cx-2, cy-e.h*0.45);
  ctx.lineTo(cx+dir*4, cy-e.h*0.7);
  ctx.lineTo(cx+4, cy-e.h*0.45);
  ctx.closePath(); ctx.fill();

  // Boca com dentes
  const mouthX = cx + dir * (e.w*0.4);
  ctx.fillStyle='#7f1d1d';
  ctx.beginPath();
  ctx.arc(mouthX, cy, 4, dir > 0 ? -Math.PI*0.5 : Math.PI*0.5, dir > 0 ? Math.PI*0.5 : -Math.PI*0.5);
  ctx.closePath(); ctx.fill();

  // Dentes brancos (triângulos agressivos)
  ctx.fillStyle='#f9fafb';
  for (let i = 0; i < 2; i++) {
    const ty = cy - 2 + i * 4;
    ctx.beginPath();
    ctx.moveTo(mouthX, ty);
    ctx.lineTo(mouthX + dir*4, ty + 1);
    ctx.lineTo(mouthX, ty + 2);
    ctx.closePath(); ctx.fill();
  }

  // Olho amarelo brilhante
  const eyeX = cx + dir*3;
  ctx.fillStyle='#fbbf24';
  ctx.beginPath(); ctx.arc(eyeX, cy-2, 2.5, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle='#000';
  ctx.beginPath(); ctx.arc(eyeX+dir*0.5, cy-2, 1.2, 0, Math.PI*2); ctx.fill();
}

// ── NOVO: Cogumelo Explosivo ──────────────────────────────────
function _drawFungus(ctx, e, sx, sy, time) {
  const bob = Math.sin(e.bobPhase + time*1.5) * 1.5;
  const cx  = sx + e.w/2;
  const baseY = sy + e.h + bob;

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath(); ctx.ellipse(cx, baseY+2, e.w*0.55, 3, 0, 0, Math.PI*2); ctx.fill();

  // Talo branco-esverdeado
  ctx.fillStyle = '#d1fae5';
  ctx.fillRect(cx-4, sy+10+bob, 8, e.h-10);

  // Chapéu (cap) — círculo achatado
  const hpR = e.hp/e.maxHp;
  const capG = Math.floor(130 + hpR*80);
  ctx.fillStyle = `rgb(20,${capG},50)`;
  ctx.beginPath(); ctx.ellipse(cx, sy+9+bob, e.w*0.58, e.h*0.30, 0, 0, Math.PI*2); ctx.fill();

  // Pintas brancas no chapéu
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [dx,dy] of [[-5,1],[0,-3],[5,2],[-3,3],[4,-1]]) {
    ctx.beginPath(); ctx.arc(cx+dx, sy+9+dy+bob, 1.5, 0, Math.PI*2); ctx.fill();
  }

  // Brilho esverdeado pulsante (bioluminescência)
  const glow = Math.sin(time*2.5 + e.bobPhase)*0.25+0.25;
  ctx.save();
  ctx.globalAlpha = glow;
  ctx.fillStyle   = '#4ade80';
  ctx.beginPath(); ctx.ellipse(cx, sy+9+bob, e.w*0.6, e.h*0.32, 0, 0, Math.PI*2); ctx.fill();
  ctx.restore();

  // Olhinhos vermelhos
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(cx-4, sy+7+bob, 3, 3);
  ctx.fillRect(cx+1, sy+7+bob, 3, 3);
}

// ── NOVO: Esporinho (mini-fungo) ──────────────────────────────
function _drawSpore(ctx, e, sx, sy, time) {
  const bob = Math.sin(e.bobPhase + time*3) * 2;
  const cx  = sx + e.w/2;

  // Mini chapéu
  ctx.fillStyle = '#166534';
  ctx.beginPath(); ctx.ellipse(cx, sy+4+bob, e.w*0.52, e.h*0.32, 0, 0, Math.PI*2); ctx.fill();

  // Mini talo
  ctx.fillStyle = '#bbf7d0';
  ctx.fillRect(cx-2, sy+5+bob, 4, e.h-6);

  // Pinta branca
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath(); ctx.arc(cx, sy+3+bob, 1.2, 0, Math.PI*2); ctx.fill();

  // Olho único vermelho
  ctx.fillStyle = '#f87171';
  ctx.fillRect(cx-1, sy+3+bob, 2, 2);
}
