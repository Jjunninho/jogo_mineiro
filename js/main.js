// ============================================================
//  main.js  –  Inicialização, loop principal e eventos
// ============================================================

const canvas    = document.getElementById('gameCanvas');
const ctx       = canvas.getContext('2d');
const statusEl  = document.getElementById('status');
const regenBtn  = document.getElementById('regenBtn');
const diceBtn   = document.getElementById('diceBtn');
const seedInput = document.getElementById('seedInput');
const toolBtn   = document.getElementById('tool-btn');
const toolPanel = document.getElementById('tool-panel');

// --- Integração da Trilha Sonora Procedural ---
window.audioFrame = document.getElementById('audioEngine');
let lastMood = null;

function moodFromBattery(battery) {
  if (battery > 80) return 'happy';
  if (battery > 60) return 'dreamy';
  if (battery > 40) return 'neutral';
  if (battery > 20) return 'tense';
  return 'melancholic';
}

// SUBSTITUIR updateMusicByBattery:
let moodChangeTimer = null;

function updateMusicByBattery(battery) {
  const mood = moodFromBattery(battery);
  if (mood === lastMood) return;

  clearTimeout(moodChangeTimer);
  moodChangeTimer = setTimeout(() => {
    if (mood !== lastMood) {
      lastMood = mood;
      Music.setMood(mood, 1400); // transição suave de 1.4s
    }
  }, 2000);
}

// E na morte, substituir o bloco do postMessage por:
if (lastMood !== 'dead') {
  lastMood = 'dead';
  Music.stop();
}

// --- Menu de Ferramentas -------------------------------------

function toggleToolMenu() {
  playerStats.toolMenuOpen = !playerStats.toolMenuOpen;
  toolPanel.style.display = playerStats.toolMenuOpen ? 'flex' : 'none';
  if (playerStats.toolMenuOpen) { updateToolUI(); canvas.focus(); }
}

// BUG FIX 4: itens do menu não tinham click handler — clicáveis agora
toolPanel.querySelectorAll('.tool-item').forEach(el => {
  el.addEventListener('click', () => {
    const id = parseInt(el.dataset.tool);
    if (id) useTool(id);
    updateToolUI();
  });
});

toolBtn.addEventListener('click', toggleToolMenu);

function updateToolUI() {
  const oc  = playerStats.oresCollected;
  const now = Date.now();

  document.getElementById('res-coal').textContent    = oc.coal;
  document.getElementById('res-iron').textContent    = oc.iron;
  document.getElementById('res-gold').textContent    = oc.gold;
  document.getElementById('res-diamond').textContent = oc.diamond;

  // Custos de cada ferramenta
  const costs = {
    1: () => oc.iron >= 1,
    2: () => oc.iron >= 3 && oc.gold >= 1,
    3: () => oc.iron >= 6,
    4: () => oc.coal >= 3,
    5: () => oc.iron >= 4 && oc.gold >= 1,
    6: () => oc.gold >= 3,
    7: () => oc.gold >= 2 && oc.coal >= 3,
	8: () => oc.diamond >= 5 && oc.gold >= 5, // Teleporte é caro!
	9: () => oc.diamond >= 3 && oc.iron >= 5, // Custo do Laser
  };

  toolPanel.querySelectorAll('.tool-item').forEach(el => {
    const id = parseInt(el.dataset.tool);
    const canUse = costs[id] ? costs[id]() : false;
    const onCD   = playerStats.toolCooldown > 0;
    el.classList.toggle('available', canUse && !onCD);
    el.classList.toggle('disabled',  !canUse || onCD);
  });
}

// --- Loop principal ------------------------------------------

function loop() {
  updateShake();
  cleanupPowerups();
  checkBiomeChange();

  if (playerStats.toolMenuOpen) updateToolUI();

  if (gameState === 'playing') {
    maybeExpandWorld();
    updatePlayer(canvas);
    collectItems();
    updateEnemies();
    updateParticles();
    
    // --- NOVO: Atualiza o mood da música com base no HP (0-100) ---
    updateMusicByBattery(playerStats.hp);
    
  } else if (gameState === 'dead') {
    updateParticles();
    
    // Opcional: Para a música quando morrer
    if (lastMood !== 'dead') {
	    lastMood = 'dead';
        Music.stop(); // Use a API direta que você criou em music.js
    }
  }
  
  drawWorld(ctx, canvas);
  if (gameState === 'playing') drawPlayer(ctx);
  drawMinimap(ctx, canvas);
  drawHUD(ctx);
  if (gameState === 'dead') drawGameOver(ctx);

  requestAnimationFrame(loop);
}
// --- Seed e geração ------------------------------------------

function applySeedAndRegenerate() {
  let val = seedInput.value.trim();
  if (!val) { val = 'VORTEX'; seedInput.value = val; }
  seedStr = val;
  resetPlayerStats();
  gameState = 'playing';
  // Fecha menu se estiver aberto
  toolPanel.style.display = 'none';
  regenerateWorld(statusEl);
  canvas.focus();
}

regenBtn.addEventListener('click', applySeedAndRegenerate);

diceBtn.addEventListener('click', () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  seedInput.value = s;
  applySeedAndRegenerate();
});

// --- Teclado -------------------------------------------------

// --- Teclado -------------------------------------------------

window.addEventListener('keydown', (e) => {
  if (document.activeElement === seedInput) {
    if (e.key === 'Enter') applySeedAndRegenerate();
    return;
  }

  // Inicia a música na primeira tecla pressionada (gesto do usuário)
  if (!Music.getMood()) Music.start(moodFromBattery(playerStats.hp));

  sfx.startCaveDrone();
  keys[e.key] = true;

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
    e.preventDefault();

  if (e.key.toLowerCase() === 'q' || e.key === 'Tab') {
    e.preventDefault();
    toggleToolMenu();
  }

  if (e.key === 'r' || e.key === 'R') applySeedAndRegenerate();

  if (e.key === '1') useTool(1);
  if (e.key === '2') useTool(2);
  if (e.key === '3') useTool(3);
  if (e.key === '4') useTool(4);
  if (e.key === '5') useTool(5);
  if (e.key === '6') useTool(6);
  if (e.key === '7') useTool(7);
  if (e.key === '8') useTool(8);
  if (e.key === '9') useTool(9); // <- Nosso novo Laser!
  
  // MODO DEUS - PULAR BIOMA (Mudei para a tecla 0)
  if (e.key === '0') {
    player.x += 600 * 8; 
    player.y = 200 * 8;
    player.vx = 0; player.vy = 0;
    triggerShake(10, 10);
    addFloatingText(player.x, player.y - 20, "⏩ BIOMA SEGUINTE", "#ffff00", 16);
  }
});

window.addEventListener('keyup', (e) => { keys[e.key] = false; });
// --- Início --------------------------------------------------
applySeedAndRegenerate();
loop();
