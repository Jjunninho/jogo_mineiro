// cave.js  –  Verme escavador + gerador de caverna procedural + chunks infinitos
// Depende de: config.js, noise.js

class CaveWorm {
  constructor(startX, startY, noiseGenerator) {
    this.x          = startX;
    this.y          = startY;
    this.angle      = 0;
    this.speed      = 1.0;
    this.turnRate   = 0.35;
    this.baseRadius = 5.5;
    this.life       = 1200;
    this.noiseGen   = noiseGenerator;
    this.tDir = random() * 1000; // AGORA
    this.tRad = random() * 1000; // AGORA
    this.radius     = this.baseRadius;
  }

  // minX/maxX = limites do chunk; verme nao escava para tras
  update(minX, maxX, rows) {
    const noiseVal = this.noiseGen.get(this.tDir * 0.05);
    this.angle += (noiseVal - 0.5) * this.turnRate;
    if (Math.abs(this.angle) > Math.PI / 2.2) this.angle *= 0.85;
    
    // --- NOVO: BARREIRA DE SEGURANÇA FORTE ---
    const margin = 25; // Impede que cheguem a 25 blocos de distância do teto/chão
    if (this.y < margin) {
      this.angle += 0.3; // Força curva rápida para baixo
      this.y = margin;   // Prende a posição para não vazar
    }
    if (this.y > rows - margin) {
      this.angle -= 0.3; // Força curva rápida para cima
      this.y = rows - margin; // Prende a posição
    }
    
    if (this.x < minX + 4) this.angle = Math.abs(this.angle) * 0.3;
    
    this.x += Math.cos(this.angle) * this.speed;
    this.y += Math.sin(this.angle) * this.speed;
    this.radius = this.baseRadius + (this.noiseGen.get(this.tRad * 0.03) - 0.5) * 4;
    this.tDir++;
    this.tRad++;
    this.life--;
  }
}

class CaveGenerator {
  constructor(cols, rows) {
    this.cols     = cols;
    this.rows     = rows;
    this.grid     = [];
    this.noiseGen = new Simple1DNoise();
  }

  _carveRange(tg, cx, cy, radius, minX, maxX, rows) {
    const rSq = radius * radius;
    const x0  = Math.max(minX, Math.floor(cx - radius));
    const x1  = Math.min(maxX - 1, Math.ceil(cx + radius));
    const y0  = Math.max(0, Math.floor(cy - radius));
    const y1  = Math.min(rows - 1, Math.ceil(cy + radius));
    for (let x = x0; x <= x1; x++) {
      if (!tg[x]) continue;
      for (let y = y0; y <= y1; y++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= rSq) tg[x][y] = 0;
      }
    }
  }

  _carveShaft(tg, cx, w, topY, botY, cols, rows) {
    const half = Math.floor(w / 2);
    for (let x = Math.max(0, cx - half); x <= Math.min(cols - 1, cx + half); x++)
      for (let y = Math.max(0, topY); y <= Math.min(rows - 1, botY); y++)
        tg[x][y] = 0;
  }

  // --- geracao inicial -------------------------------------------

  carveCircle(cx, cy, r) {
    this._carveRange(this.grid, cx, cy, r, 0, this.cols, this.rows);
  }

  initGrid() {
    this.grid = Array.from({ length: this.cols }, () => new Array(this.rows).fill(1));
  }

  runWorms() {
    // Agora começa sempre do MEIO exato do mundo gigante
    const midY  = Math.floor(this.rows * 0.5); 
    const worms = [
      new CaveWorm(8, midY,      this.noiseGen),
      new CaveWorm(8, midY - 15, this.noiseGen),
      new CaveWorm(8, midY + 15, this.noiseGen),
    ];
    worms[1].baseRadius = 3.5;
    worms[2].baseRadius = 3.5;
    let alive = true;
    while (alive) {
      alive = false;
      for (const w of worms) {
        if (w.life > 0 && w.x < this.cols - 2) {
          w.update(0, this.cols, this.rows);
          this._carveRange(this.grid, w.x, w.y, w.radius, 0, this.cols, this.rows);
          alive = true;
        }
      }
    }
  }

  applyCellularAutomata(iterations) {
    for (let it = 0; it < iterations; it++) {
      const next = Array.from({ length: this.cols }, () => new Array(this.rows).fill(1));
      for (let x = 0; x < this.cols; x++) {
        for (let y = 0; y < this.rows; y++) {
          let sol = 0;
          for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nx = x + i, ny = y + j;
            if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) sol++;
            else if (this.grid[nx][ny] === 1) sol++;
          }
          next[x][y] = this.grid[x][y] === 1 ? (sol >= 4 ? 1 : 0) : (sol >= 5 ? 1 : 0);
        }
      }
      this.grid = next;
    }
  }

  ensurePlayableArea() {
    const midY = Math.floor(this.rows * 0.5);
    // Cria o salão inicial seguro no meio
    this._carveShaft(this.grid, 10, 8, midY - 15, midY + 15, this.cols, this.rows);
    this.carveCircle(10, midY, 12);
    for (let x = 0; x < 24; x++)
      for (let y = midY - 15; y < midY + 15; y++)
        if (random() < 0.2) this.grid[x][y] = 0; // AGORA
  }

  generate() {
    this.initGrid();
    this.runWorms();
    this.applyCellularAutomata(5);
    this.ensurePlayableArea();
    return this.grid;
  }

  // --- geracao de chunk (expansao infinita) ----------------------

  generateChunk(targetGrid, startCol, chunkW, rows) {
    const endCol = startCol + chunkW;

    for (let x = startCol; x < endCol; x++)
      targetGrid[x] = new Array(rows).fill(1);

    const openYs = [];
    if (startCol > 0 && targetGrid[startCol - 1])
      for (let y = 0; y < rows; y++)
        if (targetGrid[startCol - 1][y] === 0) openYs.push(y);

    const passages = this._clusterPassages(openYs, rows);

    for (const py of passages)
      for (let dx = 0; dx < 12; dx++)
        this._carveRange(targetGrid, startCol + dx, py, 4.5, startCol, endCol, rows);

    const ng    = new Simple1DNoise();
    const worms = passages.map(py => {
      const w = new CaveWorm(startCol + 10, py, ng);
      w.life = 1400;
      return w;
    });
    
    if (passages.length > 0) {
      const midPy = passages[Math.floor(passages.length / 2)];
      const extra  = new CaveWorm(startCol + 10, midPy + 14, ng);
      extra.baseRadius = 3.5; extra.life = 1200;
      worms.push(extra);
    }

    let alive = true;
    while (alive) {
      alive = false;
      for (const w of worms) {
        if (w.life > 0 && w.x < endCol - 2) {
          w.update(startCol, endCol, rows);
          this._carveRange(targetGrid, w.x, w.y, w.radius, startCol, endCol, rows);
          alive = true;
        }
      }
    }

    this._applyCaChunk(targetGrid, startCol, endCol, rows, 3);

    for (const py of passages)
      for (let dx = 0; dx < 8; dx++)
        this._carveRange(targetGrid, startCol + dx, py, 3.5, startCol, endCol, rows);
  }

  _clusterPassages(openYs, rows) {
    if (!openYs.length) return [Math.floor(rows * 0.5)]; // Retorna o meio se não achar passagem
    const clusters = [];
    let start = openYs[0], prev = openYs[0];
    for (let i = 1; i < openYs.length; i++) {
      if (openYs[i] - prev > 4) { clusters.push(Math.floor((start + prev) / 2)); start = openYs[i]; }
      prev = openYs[i];
    }
    clusters.push(Math.floor((start + prev) / 2));
    if (clusters.length > 3) {
      const step = clusters.length / 3;
      return [0, 1, 2].map(i => clusters[Math.floor(i * step)]);
    }
    return clusters;
  }

  _applyCaChunk(tg, startCol, endCol, rows, iterations) {
    for (let it = 0; it < iterations; it++) {
      const snap = [];
      for (let x = startCol; x < endCol; x++) snap[x] = tg[x].slice();
      for (let x = startCol + 4; x < endCol; x++) {
        for (let y = 0; y < rows; y++) {
          let sol = 0;
          for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nx = x + i, ny = y + j;
            if (ny < 0 || ny >= rows || nx >= endCol) { sol++; continue; }
            const val = nx >= startCol ? snap[nx][ny] : (tg[nx] ? tg[nx][ny] : 1);
            if (val === undefined || val === 1) sol++;
          }
          tg[x][y] = snap[x][y] === 1 ? (sol >= 4 ? 1 : 0) : (sol >= 5 ? 1 : 0);
        }
      }
    }
  }

  // --- GERADOR DA CIDADE/GALERIA GIGANTE ---

  generateCityChunk(targetGrid, startCol, chunkW, rows) {
    const endCol = startCol + chunkW;

    // 1. Preenche o chunk inteiro com rocha sólida
    for (let x = startCol; x < endCol; x++) {
      targetGrid[x] = new Array(rows).fill(1);
    }

    // 2. Encontra os túneis que vieram do chunk anterior
    const openYs = [];
    if (startCol > 0 && targetGrid[startCol - 1]) {
      for (let y = 0; y < rows; y++)
        if (targetGrid[startCol - 1][y] === 0) openYs.push(y);
    }
    const passages = this._clusterPassages(openYs, rows);

    // 3. Define as dimensões do Grande Salão
    const cityCx = startCol + Math.floor(chunkW / 2);
    // Varia o centro verticalmente para não ficar sempre no meio exato
    const cityCy = Math.floor(rows * 0.5) + (Math.floor(random() * 40) - 20); 
    const galleryRadiusX = Math.floor(chunkW * 0.40); // 80% do chunk será vazio
    const galleryRadiusY = 70 + Math.floor(random() * 20); // Altura massiva

    // 4. Escavação elíptica orgânica
    for (let x = startCol + 5; x < endCol - 5; x++) {
      for (let y = 10; y < rows - 10; y++) {
        const dx = (x - cityCx) / galleryRadiusX;
        const dy = (y - cityCy) / galleryRadiusY;
        // Adiciona um noise nas bordas para mesclar com a caverna
        const n = this.noiseGen.get(x * 0.1) * 0.15;
        if (dx * dx + dy * dy < 1.0 - n) {
          targetGrid[x][y] = 0;
        }
      }
    }

    // 5. Conecta os túneis de entrada até o salão principal
    for (const py of passages) {
      for (let dx = 0; dx < chunkW * 0.3; dx++) {
        this._carveRange(targetGrid, startCol + dx, py, 4.5, startCol, endCol, rows);
      }
    }

    // 6. Roda os Autômatos Celulares AGORA para suavizar apenas as paredes naturais
    this._applyCaChunk(targetGrid, startCol, endCol, rows, 4);

    // 7. Constrói a Cidade (estruturas geométricas perfeitas)
    this._buildCityStructures(targetGrid, cityCx, cityCy, galleryRadiusX, galleryRadiusY, rows);

    // 8. Força túneis de saída no lado direito para o próximo chunk pegar
    const exitYs = [cityCy - 20, cityCy, cityCy + 20];
    for (const ey of exitYs) {
      for (let dx = chunkW - Math.floor(chunkW * 0.3); dx < chunkW; dx++) {
        this._carveRange(targetGrid, startCol + dx, ey, 4.0, startCol, endCol, rows);
      }
    }
  }

  _buildCityStructures(targetGrid, cx, cy, rx, ry, rows) {
    // Cria plataformas flutuantes artificiais
    const numPlatforms = 5 + Math.floor(random() * 5);
    for (let i = 0; i < numPlatforms; i++) {
      const pw = 15 + Math.floor(random() * 25);
      const ph = 2 + Math.floor(random() * 3);
      const px = cx - rx + 20 + Math.floor(random() * (rx * 2 - pw - 40));
      const py = cy - ry + 30 + Math.floor(random() * (ry * 2 - 60));

      for (let x = px; x < px + pw; x++) {
        for (let y = py; y < py + ph; y++) {
          // MODIFICADO: Usa '2' para representar os Tijolos/Cristais das Ruínas
          if (targetGrid[x] && y > 0 && y < rows) targetGrid[x][y] = 2;
        }
      }

      // 50% de chance de ter um pilar sustentando a plataforma até o chão
      if (random() > 0.5) {
        const pilarW = 4 + Math.floor(random() * 2);
        const pilarX = px + Math.floor(pw / 2) - Math.floor(pilarW / 2);
        for (let x = pilarX; x < pilarX + pilarW; x++) {
          for (let y = py + ph; y < cy + ry; y++) { 
            // Só constrói o pilar no ar, para quando bater no chão
            if (targetGrid[x] && targetGrid[x][y] === 0) targetGrid[x][y] = 2;
          }
        }
      }
    }

    // O "Monolito Central" (Templo/Core da cidade)
    const coreW = 16;
    for (let x = cx - coreW / 2; x < cx + coreW / 2; x++) {
      for (let y = cy - ry + 15; y < cy + ry - 15; y++) {
        if (targetGrid[x]) targetGrid[x][y] = 2;
      }
    }
    // Vaza uma "porta" gigante no meio do monolito para o jogador passar
    for (let x = cx - coreW / 2 - 2; x < cx + coreW / 2 + 2; x++) {
      for (let y = cy - 6; y < cy + 12; y++) {
        if (targetGrid[x]) targetGrid[x][y] = 0;
      }
    }
  }

}