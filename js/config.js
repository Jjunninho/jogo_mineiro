// ============================================================
//  config.js  –  Constantes e estado global compartilhado
// ============================================================

const TILE_SIZE      = 8;
const DEPTH_PX       = 5;
const WORLD_ROWS     = 400;
const WORLD_H        = WORLD_ROWS * TILE_SIZE;
const INITIAL_COLS   = 220;
const CHUNK_SIZE     = 200;
const EXPAND_TRIGGER = 100;

let grid          = [];
let generatedCols = 0;
let cameraX       = 0;
let cameraY       = 0;
let minimapCanvas = null;
const keys        = {};

// --- SEED DETERMINÍSTICA ---
let seedStr = "VORTEX";
let seedNum = 0;

function setSeed(str) {
  seedStr = str.toUpperCase();
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = h << 13 | h >>> 19;
  }
  seedNum = h >>> 0;
}

function random() {
  let t = seedNum += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// --- ESTADO DE JOGO ---
let gameState = 'playing';

// --- ESTATÍSTICAS DO JOGADOR ---
const playerStats = {
  hp: 100, maxHp: 100,
  score: 0, bestScore: 0,
  iframes: 0,
  shield: 0,
  activePowerups: [],
  oresCollected: { coal: 0, iron: 0, gold: 0, diamond: 0 },
  enemiesKilled: 0,
  distRecord: 0,
  toolMenuOpen: false,
  gasBuffTimer: 0,
  torchTimer:   0,
  toolCooldown: 0,
  rocketTimer:  0,
  teleportReady: true, // Novo campo para controle
};

function resetPlayerStats() {
  const best = playerStats.bestScore;
  Object.assign(playerStats, {
    hp: 100, maxHp: 100,
    score: 0, bestScore: best,
    iframes: 0, shield: 0,
    activePowerups: [],
    oresCollected: { coal: 0, iron: 0, gold: 0, diamond: 0 },
    enemiesKilled: 0, distRecord: 0,
    toolMenuOpen: false,
    gasBuffTimer: 0, torchTimer: 0, toolCooldown: 0, rocketTimer: 0,
  });
}

function hasPowerup(type) {
  return playerStats.activePowerups.some(p => p.type === type && p.endTime > Date.now());
}

function cleanupPowerups() {
  playerStats.activePowerups = playerStats.activePowerups.filter(p => p.endTime > Date.now());
}

// --- CÂMERA SHAKE ---
let _shakeT = 0, _shakeM = 0;
let shakeOffX = 0, shakeOffY = 0;

function triggerShake(mag, frames = 8) {
  _shakeM = Math.max(_shakeM, mag);
  _shakeT = Math.max(_shakeT, frames);
}

function updateShake() {
  if (_shakeT > 0) {
    shakeOffX = (Math.random()-0.5) * _shakeM * 2;
    shakeOffY = (Math.random()-0.5) * _shakeM * 2;
    _shakeT--;
    if (_shakeT === 0) { shakeOffX = 0; shakeOffY = 0; _shakeM = 0; }
  }
}

// ─── GERADOR DE NOMES DE BIOMA ───────────────────────────────

const biomeWords = {
  terreno: {
    masculino: [
      "Abismo","Precipício","Buraco","Barranco","Fosso",
      "Túnel","Poço","Sumidouro","Desfiladeiro","Labirinto","Subsolo"
    ],
    feminino: [
      "Ribanceira","Vala","Fenda","Grota","Caverna",
      "Gruta","Galeria","Fissura","Ravina","Depressão",
      "Escarpa","Cratera","Brecha","Cova"
    ]
  },
  atmosfera: {
    masculino: [
      "Sombrio","Profundo","Escuro","Úmido","Encharcado",
      "Lodoso","Rochoso","Cristalino","Brilhante","Nebuloso",
      "Silencioso","Ecoante","Frio","Gélido","Quente",
      "Vulcânico","Antigo","Perdido","Oculto","Denso",
      "Morto","Esquecido","Instável","Corrompido","Abissal",
      "Tenebroso","Musgoso","Poeirento","Mineral","Luminoso"
    ],
    feminino: [
      "Sombria","Profunda","Escura","Úmida","Encharcada",
      "Lodosa","Rochosa","Cristalina","Brilhante","Nebulosa",
      "Silenciosa","Ecoante","Fria","Gélida","Quente",
      "Vulcânica","Antiga","Perdida","Oculta","Densa",
      "Morta","Esquecida","Instável","Corrompida","Abissal",
      "Tenebrosa","Musgosa","Poeirenta","Mineral","Luminosa"
    ]
  }
};

function gerarNomeBiomaDeterm(index) {
  const h1 = Math.imul(index + 1, 2246822519) >>> 0;
  const h2 = Math.imul(index + 1, 3266489917) >>> 0;
  const h3 = Math.imul(index + 7, 668265263)  >>> 0;
  const genero   = (h1 % 2) === 0 ? 'masculino' : 'feminino';
  const terrenos = biomeWords.terreno[genero];
  const atmos    = biomeWords.atmosfera[genero];
  return `${terrenos[h2 % terrenos.length]} ${atmos[h3 % atmos.length]}`;
}

// ─── SISTEMA DE BIOMAS ──────────────────────────────────────

const ZONE_SIZE = 600;

const BASE_BIOMES = [
  { id:'cave',    name:'CAVERNA',    nameColor:'#c87030', pattern:'none',    enemies:['bat','slime','spider'], topDecor:'none',     voxelGlow:'none' },
  { id:'crystal', name:'✦ CRISTAIS', nameColor:'#a855f7', pattern:'crystal', enemies:['bat','golem','spider'], topDecor:'crystals', voxelGlow:'none' },
  { id:'basalt',  name:'▲ BASALTO',  nameColor:'#ef4444', pattern:'ember',   enemies:['lavabat','slime','spider'], topDecor:'embers',   voxelGlow:'none' },
  { id:'water',   name:'≋ ABISMO',   nameColor:'#38bdf8', pattern:'flow',    enemies:['piranha'], topDecor:'none',     voxelGlow:'pulse_blocks' },
  { id:'fungi',   name:'🍄 FUNGOS',  nameColor:'#4ade80', pattern:'matrix',  enemies:['fungus','spore'], topDecor:'shrooms',  voxelGlow:'pulse_blocks' },
];

const BASE_COLORS = {
  cave:    { top:'#5a3a28', mid:'#40281a', lit:'#7a5038', depB:'#1a100a', depR:'#2a1a10', depL:'#20140c' },
  crystal: { top:'#4a2a6a', mid:'#301a4a', lit:'#6a3a9a', depB:'#10051a', depR:'#1a0a2a', depL:'#150820' },
  basalt:  { top:'#4a1515', mid:'#300a0a', lit:'#6a1f1f', depB:'#150000', depR:'#200505', depL:'#1a0202' },
  water:   { top:'#154a4a', mid:'#0a3030', lit:'#1f6a6a', depB:'#001515', depR:'#052020', depL:'#021a1a' },
  fungi:   { top:'#284a15', mid:'#1a300a', lit:'#386a1f', depB:'#051500', depR:'#0a2005', depL:'#081a02' }
};

const generatedBiomesCache = [];

// ─── PADRÕES PROCEDURAIS EXPANDIDOS ─────────────────────────
// Cada nome aqui é um estilo visual implementado em drawVoidTile
const PATTERN_TYPES = [
  'none',         // sem decoração
  'matrix',       // quadradinhos dispersos (fungos)
  'crosshatch',   // grades finas
  'dots',         // pontinhos (cristais originais)
  'lines',        // linhas horizontais
  'sparkle',      // estrelinhas pulsantes
  'veins',        // veios diagonais (rachaduras)
  'stalactite',   // estalactites/estalagmites contextuais
  'crystal',      // diamantes brilhantes
  'ember',        // brasas tremeluzentes (basalto)
  'flow',         // ondas fluidas (água)
  'hex',          // favo de mel
  'runes',        // glifos/runas gravadas
];

const ENEMY_ROSTER = ['bat','slime','spider','golem','lavabat','piranha','fungus','spore','wisp','beetle'];

function hslToHex(h, s, l) {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function generateProceduralBiome(index) {
  const pseudoRandom = () => {
    let t = seedNum + (index * 1337);
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };

  const r   = pseudoRandom();
  const hue = Math.floor(r * 360);

  const colors = {
    top:  hslToHex(hue, 60, 25),
    mid:  hslToHex(hue, 50, 15),
    lit:  hslToHex(hue, 70, 40),
    depB: hslToHex(hue, 40, 8),
    depR: hslToHex(hue, 45, 12),
    depL: hslToHex(hue, 40, 10),
  };

  // Gera o nome, padrão visual e os inimigos do bioma novo
  const nome = gerarNomeBiomaDeterm(index);
  
  const availablePatterns = PATTERN_TYPES.filter(p => p !== 'none');
  const pattern = availablePatterns[Math.floor(pseudoRandom() * availablePatterns.length)];

  // Sorteia as decorações dos Voxels (blocos sólidos)
  const topDecors  = ['none', 'none', 'crystals', 'embers', 'shrooms'];
  const topDecor   = topDecors[Math.floor(pseudoRandom() * topDecors.length)];
  const voxelGlows = ['none', 'none', 'pulse_blocks'];
  const voxelGlow  = voxelGlows[Math.floor(pseudoRandom() * voxelGlows.length)];

  const numEnemies = Math.floor(pseudoRandom() * 3) + 1;
  const enemies = [];
  for (let i = 0; i < numEnemies; i++) {
    enemies.push(ENEMY_ROSTER[Math.floor(pseudoRandom() * ENEMY_ROSTER.length)]);
  }

  return {
    def: {
      id: `proc_${index}`,
      name: nome,
      nameColor: colors.lit,
      pattern: pattern,
      enemies: [...new Set(enemies)],
      topDecor: topDecor,     
      voxelGlow: voxelGlow    
    },
    colors: colors
  };
}

function getBiomeAt(tileX) {
  const idx = Math.floor(tileX / ZONE_SIZE);
  if (idx < BASE_BIOMES.length) return BASE_BIOMES[idx];
  if (!generatedBiomesCache[idx])
    generatedBiomesCache[idx] = generateProceduralBiome(idx);
  return generatedBiomesCache[idx].def;
}

function getBiomeColors(tileX) {
  const BLEND     = 60;
  const posInZone = tileX % ZONE_SIZE;
  const idx       = Math.floor(tileX / ZONE_SIZE);
  const nxtIdx    = idx + 1;

  const curColors = idx < BASE_BIOMES.length
    ? BASE_COLORS[BASE_BIOMES[idx].id]
    : generatedBiomesCache[idx].colors;

  const distToNext = ZONE_SIZE - posInZone;
  if (distToNext > BLEND) return curColors;

  const nxtColors = nxtIdx < BASE_BIOMES.length
    ? BASE_COLORS[BASE_BIOMES[nxtIdx].id]
    : (generatedBiomesCache[nxtIdx] || generateProceduralBiome(nxtIdx)).colors;

  return _blendColors(curColors, nxtColors, 1 - distToNext / BLEND);
}

function _blendHex(a, b, t) {
  const ra=parseInt(a.slice(1,3),16), ga=parseInt(a.slice(3,5),16), ba=parseInt(a.slice(5,7),16);
  const rb=parseInt(b.slice(1,3),16), gb=parseInt(b.slice(3,5),16), bb=parseInt(b.slice(5,7),16);
  const r=Math.round(ra+(rb-ra)*t), g=Math.round(ga+(gb-ga)*t), bl=Math.round(ba+(bb-ba)*t);
  return '#'+r.toString(16).padStart(2,'0')+g.toString(16).padStart(2,'0')+bl.toString(16).padStart(2,'0');
}

function _blendColors(a, b, t) {
  const o = {};
  for (const k of Object.keys(a)) o[k] = _blendHex(a[k], b[k], t);
  return o;
}

// Notificação de bioma
let _biomeNotif  = null;
let _lastBiomeId = 'cave';

function checkBiomeChange() {
  if (gameState !== 'playing') return;
  const cur = getBiomeAt(Math.floor(player.x / TILE_SIZE));
  if (cur.id !== _lastBiomeId) {
    _lastBiomeId = cur.id;
    _biomeNotif  = { name: cur.name, color: cur.nameColor, life: 220 };
  }
  if (_biomeNotif && _biomeNotif.life > 0) _biomeNotif.life--;
}
