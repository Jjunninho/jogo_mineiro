// ============================================================
//  player.js  –  Dados, física e colisão do jogador
//  Depende de: config.js
// ============================================================

const player = {
  x: 80, y: 30,
  w: 18,  h: 26,
  vx: 0,  vy: 0,
  speed: 0.52, maxSpeed: 3.2, jumpStrength: 8.5,
  onGround: false, facing: 1,
  swingTimer: 0,
  canDoubleJump: false,
  jumpKeyHeld: false,
  inShip: false,      // <-- Nave ligada/desligada
  shipCooldown: 0     // <-- Cooldown do botão
};

// ─── COLISÃO ────────────────────────────────────────────────

function isSolidCell(tx, ty) {
  if (tx < 0 || tx >= generatedCols || ty < 0 || ty >= WORLD_ROWS) return true;
  return grid[tx][ty] === 1;
}
function isSolidAtPixel(px, py) {
  return isSolidCell(Math.floor(px / TILE_SIZE), Math.floor(py / TILE_SIZE));
}
function rectHitsSolid(x, y, w, h) {
  return (
    isSolidAtPixel(x,         y)     ||
    isSolidAtPixel(x + w,     y)     ||
    isSolidAtPixel(x,         y + h) ||
    isSolidAtPixel(x + w,     y + h) ||
    isSolidAtPixel(x + w*0.5, y)     ||
    isSolidAtPixel(x + w*0.5, y + h)
  );
}

// ─── SPAWN ──────────────────────────────────────────────────

function placePlayerAtSpawn() {
  const spawnX = 10 * TILE_SIZE;
  const midY   = Math.floor(WORLD_ROWS * 0.5) * TILE_SIZE;
  for (let y = midY - 100; y < WORLD_H - 60; y += 2) {
    if (!rectHitsSolid(spawnX, y, player.w, player.h) &&
         rectHitsSolid(spawnX, y + 2, player.w, player.h)) {
      player.x = spawnX; player.y = y - 4;
      player.vx = 0;     player.vy = 0;
      return;
    }
  }
  player.x = spawnX; player.y = midY;
  player.vx = 0;     player.vy = 0;
}

// ─── TIMERS ─────────────────────────────────────────────────

function updateTimers() {
  if (playerStats.toolCooldown > 0) playerStats.toolCooldown--;
  if (playerStats.gasBuffTimer  > 0) playerStats.gasBuffTimer--;
  if (playerStats.torchTimer    > 0) playerStats.torchTimer--;
  if (playerStats.rocketTimer   > 0) playerStats.rocketTimer--;
}

// ─── UPDATE PRINCIPAL ───────────────────────────────────────

// ─── UPDATE PRINCIPAL ───────────────────────────────────────

function updatePlayer(canvas) {
  if (gameState !== 'playing') return;

  updateTimers();
  if (playerStats.iframes > 0) playerStats.iframes--;

  const curDist = Math.floor(player.x / TILE_SIZE);
  if (curDist > playerStats.distRecord) playerStats.distRecord = curDist;

  const speedMult = (hasPowerup('speed') || playerStats.gasBuffTimer > 0) ? 1.6 : 1;
  const jumpMult  =  hasPowerup('jump')  ? 1.5 : 1;

  const left   = keys['ArrowLeft']  || keys['a'] || keys['A'];
  const right  = keys['ArrowRight'] || keys['d'] || keys['D'];
  const jump   = keys['ArrowUp']    || keys['w'] || keys['W'] || keys[' '];
  const attack = keys['z'] || keys['Z'] || keys['x'] || keys['X'];

  // ----------------------------------------------------
  // NOVO: CONTROLE DA NAVE (Tecla N)
  // ----------------------------------------------------
  if (keys['n'] || keys['N']) {
    if (player.shipCooldown <= 0) {
      player.inShip = !player.inShip;
      player.shipCooldown = 30; // Cooldown do botão
      sfx.powerup();
      if (player.inShip) {
        player.w = 20; player.h = 14; // A nave é pequenininha!
        player.vy = 0; // Cancela a gravidade instantaneamente
        for(let i=0; i<15; i++) addParticle({x: player.x+10, y: player.y+7, vx: (Math.random()-0.5)*4, vy: (Math.random()-0.5)*4, life: 30, color: '#00e5ff'});
      } else {
        player.w = 18; player.h = 26; // Volta ao tamanho de humano
        _clearAroundPlayer(); // Limpa os blocos pra não bugar preso na parede
      }
    }
  }
  if (player.shipCooldown > 0) player.shipCooldown--;

// ==========================================
  // LÓGICA DA NAVE VOADORA (VÔO LIVRE ZERO-G)
  // ==========================================
  if (player.inShip) {
    const up   = keys['ArrowUp']   || keys['w'] || keys['W'];
    const down = keys['ArrowDown'] || keys['s'] || keys['S'];

    // Movimento flutuante (Gravidade Zero)
    if (left)  { player.vx -= player.speed * 0.6; player.facing = -1; }
    if (right) { player.vx += player.speed * 0.6; player.facing =  1; }
    if (up)    { player.vy -= player.speed * 0.6; }
    if (down)  { player.vy += player.speed * 0.6; }

    // Atrito espacial (faz a nave deslizar e parar suavemente)
    if (!left && !right) player.vx *= 0.88;
    if (!up && !down)    player.vy *= 0.88;

    // Limite de velocidade (a nave voa rápido!)
    player.vx = Math.max(-player.maxSpeed * 1.8, Math.min(player.maxSpeed * 1.8, player.vx));
    player.vy = Math.max(-player.maxSpeed * 1.8, Math.min(player.maxSpeed * 1.8, player.vy));

    // Colisão Horizontal da Nave
    const nextX = player.x + player.vx;
    if (!rectHitsSolid(nextX, player.y, player.w, player.h)) {
      player.x = nextX;
    } else {
      player.vx = 0; // Se bater de lado, para
    }

    // Colisão Vertical da Nave (Não cai, só bate no teto/chão)
    const nextY = player.y + player.vy;
    if (!rectHitsSolid(player.x, nextY, player.w, player.h)) {
      player.y = nextY;
    } else {
      player.vy = 0; // Se bater no teto ou chão, para
    }

    // LASER ILIMITADO DA NAVE (Sem custo, abre o caminho!)
    if (attack && player.swingTimer <= 0) {
      player.swingTimer = 8; // Atira super rápido
      sfx.hurt(); triggerShake(2, 4);
      const dir = player.facing;
      
      const gx = Math.floor((player.x + player.w/2) / TILE_SIZE);
      const gy = Math.floor((player.y + player.h/2) / TILE_SIZE);
      
      for (let i = 1; i <= 20; i++) {
        const tx = gx + i * dir;
        if (tx <= 0 || tx >= generatedCols) continue;
        
        let hitSolid = false;
        // Derrete os 3 blocos da frente na altura exata da nave
        for (let dy = -1; dy <= 1; dy++) {
          const ty = gy + dy;
          if (ty > 0 && ty < WORLD_ROWS && grid[tx][ty] === 1) {
            grid[tx][ty] = 0;
            updateMinimapPixel(tx, ty, false);
            hitSolid = true;
          }
        }
        if (hitSolid) {
          addParticle({ x: tx * TILE_SIZE, y: gy * TILE_SIZE + (Math.random()-0.5)*8, vx: -dir * 2, vy: (Math.random()-0.5)*2, life: 15, color: '#ff2255', size: 3 });
        }
        // Feixe visual do laser vermelho
        if (i % 3 === 0) {
           addParticle({ x: tx * TILE_SIZE, y: gy * TILE_SIZE, vx: dir * 8, vy: 0, life: 8, color: '#ffaaaa', size: 1.5, gravity: false });
        }
      }
    }
    if (player.swingTimer > 0) player.swingTimer--;

    // Câmera segue a nave e aborta o resto da física humana
    cameraX = Math.max(0, Math.min(player.x - canvas.width * 0.5, generatedCols * TILE_SIZE - canvas.width));
    cameraY = Math.max(0, Math.min(player.y - canvas.height * 0.5, WORLD_H - canvas.height));
    return; // <-- ISSO É CRUCIAL: Sai da função aqui pra não aplicar gravidade!
  }

  // ==========================================
  // LÓGICA HUMANA NORMAL (Continua aqui embaixo)
  // ==========================================

  // Horizontal normal
  if (left)  { player.vx -= player.speed; player.facing = -1; }
  if (right) { player.vx += player.speed; player.facing =  1; }
  if (!left && !right) player.vx *= 0.82;
  player.vx = Math.max(-player.maxSpeed * speedMult, Math.min(player.maxSpeed * speedMult, player.vx));

  // Pulo + pulo duplo
  if (player.onGround) player.canDoubleJump = true;
  if (jump) {
    if (player.onGround) {
      player.vy = -player.jumpStrength * jumpMult;
      player.onGround = false; player.jumpKeyHeld = true; sfx.jump();
    } else if (player.canDoubleJump && !player.jumpKeyHeld) {
      player.vy = -player.jumpStrength * jumpMult * 0.9;
      player.canDoubleJump = false; player.jumpKeyHeld = true; sfx.jump();
      for (let i = 0; i < 6; i++) addParticle({ x: player.x+player.w/2, y: player.y+player.h, vx: (Math.random()-0.5)*3, vy: Math.random()*2, life: 15, color: '#cccccc', size: 2 });
    }
  } else { player.jumpKeyHeld = false; }

  // Ataque com picareta
  if (attack && player.swingTimer <= 0) {
    player.swingTimer = 18; playerAttack();
    spawnSwingParticles(player.x + (player.facing === 1 ? player.w+8 : -8), player.y + player.h*0.4, player.facing);
  }
  if (player.swingTimer > 0) player.swingTimer--;

  // Som de passos
  if (player.onGround && Math.abs(player.vx) > 0.1 && Date.now() % 300 < 20) sfx.step();

  // Foguete
  if (playerStats.rocketTimer > 0) {
    player.vy = Math.max(player.vy - 0.55, -9);
    if (Math.random() < 0.7) addParticle({ x: player.x+player.w/2 + (Math.random()-0.5)*6, y: player.y+player.h, vx: (Math.random()-0.5)*2, vy: 2+Math.random()*3, life: 12+Math.random()*10, color: Math.random() < 0.5 ? '#ff8c00' : '#ffdd00', size: 2+Math.random()*3, gravity: false });
  }

  // Gravidade
  player.vy += 0.42; player.vy = Math.min(player.vy, 10);

  // Movimento horizontal com AUTO-STEP
  const nextX = player.x + player.vx;
  if (!rectHitsSolid(nextX, player.y, player.w, player.h)) {
    player.x = nextX;
  } else {
    let stepped = false;
    if (player.onGround) {
      const maxStep = TILE_SIZE + 2; 
      for (let s = 1; s <= maxStep; s++) {
        if (!rectHitsSolid(nextX, player.y - s, player.w, player.h)) {
          player.x = nextX; player.y -= s; stepped = true; break;
        }
      }
    }
    if (!stepped) {
      const step = Math.sign(player.vx);
      while (step !== 0 && !rectHitsSolid(player.x + step, player.y, player.w, player.h)) player.x += step;
      player.vx = 0;
    }
  }

  // Movimento vertical
  const nextY = player.y + player.vy;
  if (!rectHitsSolid(player.x, nextY, player.w, player.h)) {
    player.y = nextY; player.onGround = false;
  } else {
    const step = Math.sign(player.vy);
    while (step !== 0 && !rectHitsSolid(player.x, player.y + step, player.w, player.h)) player.y += step;
    if (player.vy > 0) player.onGround = true;
    player.vy = 0;
  }

  // Câmera
  cameraX = Math.max(0, Math.min(player.x - canvas.width * 0.5, generatedCols * TILE_SIZE - canvas.width));
  cameraY = Math.max(0, Math.min(player.y - canvas.height * 0.5, WORLD_H - canvas.height));
}

  // Gravidade
  player.vy += 0.42;
  player.vy  = Math.min(player.vy, 10);

// Movimento horizontal com colisão
  const nextX = player.x + player.vx;
  if (!rectHitsSolid(nextX, player.y, player.w, player.h)) {
    player.x = nextX;
  } else {
    // --- LÓGICA DE AUTO-STEP (Subir degraus automaticamente) ---
    let stepped = false;
    
    // Só tenta subir o degrau se o personagem estiver no chão
    if (player.onGround) {
      const maxStep = TILE_SIZE + 2; // Altura máxima que consegue subir (1 bloco + folga)
      for (let s = 1; s <= maxStep; s++) {
        // Checa se movendo 's' pixels para cima o caminho fica livre
        if (!rectHitsSolid(nextX, player.y - s, player.w, player.h)) {
          player.x = nextX;
          player.y -= s; // Sobe o personagem suavemente
          stepped = true;
          break;
        }
      }
    }
    
    // Se não conseguiu subir (é uma parede alta de verdade), colide normalmente
    if (!stepped) {
      const step = Math.sign(player.vx);
      while (step !== 0 && !rectHitsSolid(player.x + step, player.y, player.w, player.h))
        player.x += step;
      player.vx = 0;
    }
  }

  // Movimento vertical com colisão
  const nextY = player.y + player.vy;
  if (!rectHitsSolid(player.x, nextY, player.w, player.h)) {
    player.y = nextY;
    player.onGround = false;
  } else {
    const step = Math.sign(player.vy);
    while (step !== 0 && !rectHitsSolid(player.x, player.y + step, player.w, player.h))
      player.y += step;
    if (player.vy > 0) player.onGround = true;
    player.vy = 0;
  }

  // Câmera segue jogador
  cameraX = Math.max(0, Math.min(
    player.x - canvas.width  * 0.5,
    generatedCols * TILE_SIZE - canvas.width
  ));
  cameraY = Math.max(0, Math.min(
    player.y - canvas.height * 0.5,
    WORLD_H - canvas.height
  ));


// ─── FERRAMENTAS ────────────────────────────────────────────

function useTool(id) {
  if (gameState !== 'playing') return;
  if (playerStats.toolCooldown > 0) {
    addFloatingText(player.x + player.w/2, player.y - 14, 'COOLDOWN...', '#888', 10);
    return;
  }
  const oc = playerStats.oresCollected;

  switch (id) {

    case 1: // PICARETA — 1 Fe, quebra 3 blocos à frente + 1 acima/abaixo
      if (oc.iron < 1) { _toolNotEnough(); return; }
      oc.iron -= 1;
      _usePickaxe(3);
      _usePickaxeV();
      playerStats.toolCooldown = 12;
      break;

    case 2: // DINAMITE — 3 Fe + 1 Au, explosão r=5
      if (oc.iron < 3 || oc.gold < 1) { _toolNotEnough(); return; }
      oc.iron -= 3; oc.gold -= 1;
      _useDynamite(player.x + player.w/2, player.y + player.h/2, 5);
      addFloatingText(player.x + player.w/2, player.y - 20, 'KABOOM!', '#ff4400', 18);
      playerStats.toolCooldown = 38;
      break;

    case 3: // GÁS EXTRATOR — 6 Fe, velocidade +60% por 6s
      if (oc.iron < 6) { _toolNotEnough(); return; }
      oc.iron -= 6;
      playerStats.gasBuffTimer = 360;
      addFloatingText(player.x + player.w/2, player.y - 14, '⚡ GÁS!', '#00ffcc', 13);
      sfx.powerup();
      playerStats.toolCooldown = 30;
      break;

    case 4: // TOCHA — 3 Ca, luz por 5s
      if (oc.coal < 3) { _toolNotEnough(); return; }
      oc.coal -= 3;
      playerStats.torchTimer = 300;
      for (let i = 0; i < 22; i++)
        addParticle({
          x: player.x + player.w/2, y: player.y + player.h/2,
          vx: (Math.random()-0.5)*4.5, vy: (Math.random()-0.5)*4 - 1.5,
          life: 40+Math.random()*25,
          color: i%2===0 ? '#ffaa20' : '#ffdd80',
          size: 2+Math.random()*2.5, gravity: false,
        });
      addFloatingText(player.x + player.w/2, player.y - 14, '🔦 LUZ!', '#ffaa20', 12);
      sfx.powerup();
      playerStats.toolCooldown = 20;
      break;

    case 5: // KIT MÉDICO — 4 Fe + 1 Au, +50 HP
      if (oc.iron < 4 || oc.gold < 1) { _toolNotEnough(); return; }
      if (playerStats.hp >= playerStats.maxHp) {
        addFloatingText(player.x + player.w/2, player.y - 14, 'HP CHEIO!', '#888', 11);
        return;
      }
      oc.iron -= 4; oc.gold -= 1;
      {
        const heal = Math.min(50, playerStats.maxHp - playerStats.hp);
        playerStats.hp += heal;
        addFloatingText(player.x + player.w/2, player.y - 14, '+'+heal+' HP', '#4caf50', 14);
        spawnPowerupParticles(player.x + player.w/2, player.y + player.h/2, '#4caf50');
      }
      sfx.powerup();
      playerStats.toolCooldown = 20;
      break;

    case 6: // GRANADA — 3 Au, explosão direcional r=4 + recuo
      if (oc.gold < 3) { _toolNotEnough(); return; }
      oc.gold -= 3;
      {
        const gx = Math.floor((player.x + player.w/2 + player.facing * 64) / TILE_SIZE);
        const gy = Math.floor((player.y + player.h/2) / TILE_SIZE);
        _useDynamite(gx * TILE_SIZE, gy * TILE_SIZE, 4);
        addFloatingText(player.x + player.w/2, player.y - 14, '💥 BOOM!', '#ff6600', 15);
        player.vx = -player.facing * 4.5;
        player.vy = -2.8;
      }
      playerStats.toolCooldown = 55;
      break;

case 7: // FOGUETE — 2 Au + 3 Ca, voa 3s + desempaca
      if (oc.gold < 2 || oc.coal < 3) { _toolNotEnough(); return; }
      oc.gold -= 2; oc.coal -= 3;
      playerStats.rocketTimer  = 180;
      player.vy                = -10;
      player.onGround          = false;
      player.canDoubleJump     = true;
      _clearAroundPlayer();
      addFloatingText(player.x + player.w/2, player.y - 18, '🚀 FOGUETE!', '#ff8c00', 15);
      sfx.powerup();
      playerStats.toolCooldown = 35;
      break;

case 8: // TELEPORTE PARA GALERIA — 5 Diamantes + 5 Ouros
      if (oc.diamond < 5 || oc.gold < 5) { _toolNotEnough(); return; }
      
      const targetX = _findNextGalleryX();
      if (targetX) {
        oc.diamond -= 5; oc.gold -= 5;
        
        // Efeito visual antes de sumir
        spawnPowerupParticles(player.x, player.y, '#00e5ff');
        
        // Teleporta para o centro da galeria (cityCy aproximado)
        player.x = targetX * TILE_SIZE;
        player.y = (WORLD_ROWS / 2) * TILE_SIZE; 
        player.vx = 0; player.vy = 0;
        
        // Efeito visual na chegada
        triggerShake(15, 20);
        sfx.powerup(); 
        addFloatingText(player.x, player.y - 20, "TELEPORTE CONCLUÍDO", "#00e5ff", 16);
        playerStats.toolCooldown = 100;
      } else {
        addFloatingText(player.x, player.y - 14, "NENHUMA GALERIA PRÓXIMA!", "#ff4444", 11);
      }
      break;

    case 9: // LASER MINERADOR — 3 Di + 5 Fe
      if (oc.diamond < 3 || oc.iron < 5) { _toolNotEnough(); return; }
      oc.diamond -= 3; oc.iron -= 5;
      
      const dir = player.facing;
      const gx = Math.floor((player.x + player.w/2) / TILE_SIZE);
      const gy = Math.floor((player.y + player.h/2) / TILE_SIZE);
      const length = 40; // 40 blocos de alcance!
      
      triggerShake(25, 30); // Tela treme muito
      sfx.hurt(); // Som de impacto
      
      for (let i = 1; i <= length; i++) {
        const tx = gx + i * dir;
        if (tx <= 0 || tx >= generatedCols) continue;
        
        // Abre 4 blocos de altura (-2 até +1)
        for (let dy = -2; dy <= 1; dy++) {
          const ty = gy + dy;
          if (ty > 0 && ty < WORLD_ROWS && grid[tx][ty] === 1) {
            grid[tx][ty] = 0;
            updateMinimapPixel(tx, ty, false);
          }
        }
        
        // Efeito visual do raio laser
        if (i % 2 === 0) {
          addParticle({
            x: tx * TILE_SIZE, y: (gy - 0.5) * TILE_SIZE,
            vx: dir * 3 + (Math.random() - 0.5) * 2, 
            vy: (Math.random() - 0.5) * 2,
            life: 20 + Math.random() * 20,
            color: Math.random() < 0.5 ? '#00e5ff' : '#ffffff', 
            size: 3 + Math.random() * 3,
            gravity: false
          });
        }
      }
      
      addFloatingText(player.x + player.w/2, player.y - 20, "LASER DISPARADO!", "#00e5ff", 16);
      playerStats.toolCooldown = 80; 
      break;

  } // ← fecha o switch
}   // ← fecha a função useTool

// ─── HELPERS DE FERRAMENTAS ─────────────────────────────────

// Função auxiliar para encontrar a próxima galeria no grid
function _findNextGalleryX() {
  // Procura no grid à frente do jogador por blocos do tipo '2' (Cidade)
  const startGx = Math.floor(player.x / TILE_SIZE);
  for (let x = startGx; x < generatedCols; x++) {
    for (let y = 0; y < WORLD_ROWS; y++) {
      if (grid[x][y] === 2) return x + 50; // Retorna um ponto dentro da cidade
    }
  }
  return null;
}

function _toolNotEnough() {
  addFloatingText(player.x + player.w/2, player.y - 14, 'SEM RECURSOS!', '#ff4444', 11);
}

// Quebra N blocos horizontais à frente
function _usePickaxe(blocks) {
  const dir = player.facing;
  const gx  = Math.floor((player.x + player.w/2) / TILE_SIZE);
  const gy  = Math.floor((player.y + player.h/2) / TILE_SIZE);
  let hit = false;
  for (let i = 1; i <= blocks; i++) {
    const tx = gx + i * dir;
    if (isSolidCell(tx, gy) && tx > 0 && tx < generatedCols) {
      grid[tx][gy] = 0;
      updateMinimapPixel(tx, gy, false);
      spawnOreParticles(tx*TILE_SIZE+TILE_SIZE/2, gy*TILE_SIZE+TILE_SIZE/2, { color:'#888', pts:0 });
      hit = true;
    }
  }
  if (hit) { sfx.step(); triggerShake(4, 6); }
}

// Quebra 1 bloco acima e 1 abaixo do primeiro bloco à frente
function _usePickaxeV() {
  const gx = Math.floor((player.x + player.w/2 + player.facing * TILE_SIZE) / TILE_SIZE);
  const gy = Math.floor((player.y + player.h/2) / TILE_SIZE);
  for (const dy of [-1, 1]) {
    const ty = gy + dy;
    if (ty > 0 && ty < WORLD_ROWS && isSolidCell(gx, ty)) {
      grid[gx][ty] = 0;
      updateMinimapPixel(gx, ty, false);
      spawnOreParticles(gx*TILE_SIZE+TILE_SIZE/2, ty*TILE_SIZE+TILE_SIZE/2, { color:'#888', pts:0 });
    }
  }
}

// Limpa blocos ao redor do jogador (anti-stuck do foguete)
function _clearAroundPlayer() {
  const gx = Math.floor((player.x + player.w/2) / TILE_SIZE);
  const gy = Math.floor((player.y + player.h/2) / TILE_SIZE);
  for (let dx = -1; dx <= 1; dx++)
    for (let dy = -2; dy <= 1; dy++) {
      const nx = gx+dx, ny = gy+dy;
      if (nx>0 && nx<generatedCols && ny>0 && ny<WORLD_ROWS && grid[nx][ny]===1) {
        grid[nx][ny] = 0;
        updateMinimapPixel(nx, ny, false);
      }
    }
}

// Explosão circular: quebra tiles + emite partículas
function _useDynamite(worldX, worldY, radius) {
  const gx = Math.floor(worldX / TILE_SIZE);
  const gy = Math.floor(worldY / TILE_SIZE);
  for (let dx = -radius; dx <= radius; dx++)
    for (let dy = -radius; dy <= radius; dy++)
      if (dx*dx + dy*dy <= radius*radius) {
        const nx=gx+dx, ny=gy+dy;
        if (nx>0 && nx<generatedCols && ny>5 && ny<WORLD_ROWS-5)
          if (grid[nx][ny]===1) { grid[nx][ny]=0; updateMinimapPixel(nx,ny,false); }
      }
  for (let i = 0; i < 32; i++) {
    const ang = Math.random()*Math.PI*2;
    const spd = 2 + Math.random()*5;
    addParticle({
      x: worldX, y: worldY,
      vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 2.5,
      life: 35+Math.random()*25,
      color: i%3===0 ? '#ffcc00' : i%3===1 ? '#ff5500' : '#ff2200',
      size: 2.5+Math.random()*4.5,
    });
  }
  sfx.hurt();
  triggerShake(20, 24);
}
