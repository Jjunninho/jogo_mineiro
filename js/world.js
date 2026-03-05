// ============================================================
//  world.js  –  Geração, minimap e expansão do mundo
//  Depende de: config.js, cave.js, ores.js, enemies.js
// ============================================================

function _paintMinimapCols(startCol, count) {
  const mctx = minimapCanvas.getContext('2d');
  const img  = mctx.createImageData(count, WORLD_ROWS);
  const data = img.data;
  for (let gy = 0; gy < WORLD_ROWS; gy++) {
    for (let gx = 0; gx < count; gx++) {
      const wx  = startCol + gx;
      const idx = (gy * count + gx) * 4;
      if (grid[wx] && grid[wx][gy] === 1) {
        data[idx]=85; data[idx+1]=37; data[idx+2]=19;
      } else {
        data[idx]=16; data[idx+1]=24; data[idx+2]=39;
      }
      data[idx + 3] = 255;
    }
  }
  mctx.putImageData(img, startCol, 0);
}

function buildMinimapCache() {
  minimapCanvas        = document.createElement('canvas');
  minimapCanvas.width  = generatedCols;
  minimapCanvas.height = WORLD_ROWS;
  _paintMinimapCols(0, generatedCols);
}

function _extendMinimap(startCol, count) {
  const novo  = document.createElement('canvas');
  novo.width  = startCol + count;
  novo.height = WORLD_ROWS;
  novo.getContext('2d').drawImage(minimapCanvas, 0, 0);
  minimapCanvas = novo;
  _paintMinimapCols(startCol, count);
}

// --- NOVO: Atualiza um único pixel no minimapa quando quebramos um bloco ---
function updateMinimapPixel(gx, gy, isSolid) {
  if (!minimapCanvas) return;
  const mctx = minimapCanvas.getContext('2d');
  // Cores originais do seu minimapa: RGB(85,37,19) para parede, RGB(16,24,39) para vazio
  mctx.fillStyle = isSolid ? 'rgb(85,37,19)' : 'rgb(16,24,39)';
  mctx.fillRect(gx, gy, 1, 1);
}

function regenerateWorld(statusEl) {
  setSeed(seedStr);

  // Limpa tudo
  oreList      = [];
  powerupList  = [];
  enemies      = [];

  statusEl.textContent = `Gerando caverna [${seedStr}]...`;
  const gen = new CaveGenerator(INITIAL_COLS, WORLD_ROWS);
  grid = gen.generate();
  generatedCols = INITIAL_COLS;
  buildMinimapCache();
  placePlayerAtSpawn();

  // Popula o mundo inicial
  placeOres(0, INITIAL_COLS);
  placePowerups(0, INITIAL_COLS);
  spawnEnemiesInRange(0, INITIAL_COLS);

  statusEl.textContent = `Caverna [${seedStr}] pronta!`;
}

function maybeExpandWorld() {
  if (gameState !== 'playing') return;
  if (Math.floor(player.x / TILE_SIZE) >= generatedCols - EXPAND_TRIGGER) {
    const startCol = generatedCols;
    const gen      = new CaveGenerator(0, WORLD_ROWS);
    
    // CORREÇÃO: Pegamos a distância total expandida descontando as colunas iniciais.
    // Como expande de 200 em 200, agora vai bater certinho (ex: 1220 - 220 = 1000).
    const distanceExpanded = startCol - INITIAL_COLS;
    
    // Mude o 1000 para 200 se quiser que a cidade apareça logo na PRIMEIRA expansão para testar!
    const isCityTime = distanceExpanded > 0 && distanceExpanded % 1000 === 0;

    if (isCityTime) {
      gen.generateCityChunk(grid, startCol, CHUNK_SIZE, WORLD_ROWS);
    } else {
      gen.generateChunk(grid, startCol, CHUNK_SIZE, WORLD_ROWS);
    }
    
    generatedCols += CHUNK_SIZE;
    _extendMinimap(startCol, CHUNK_SIZE);

    // Popula o novo chunk
    placeOres(startCol, generatedCols);
    placePowerups(startCol, generatedCols);
    spawnEnemiesInRange(startCol, generatedCols);
  }
}