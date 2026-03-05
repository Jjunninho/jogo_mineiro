// ============================================================
//  audio.js  –  Sintetizador procedural de áudio (Web Audio API)
// ============================================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

const sfx = {
  droneOsc: null,

  init() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
  },

  _play(type, freq0, freq1, dur, vol = 0.07, curve = 'exponentialRampToValueAtTime') {
    this.init();
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq0, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq1, audioCtx.currentTime + dur);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  },

  jump()     { this._play('square',   150, 400, 0.15, 0.05); },
  step()     { this._play('triangle', 80,  10,  0.05, 0.04); },
  hurt()     { this._play('sawtooth', 200, 50,  0.22, 0.10); },
  enemyHit() { this._play('square',   600, 180, 0.10, 0.04); },

  death() {
    this.init();
    // Tom descendente longo
    [400, 300, 200, 120].forEach((f, i) => {
      const t = audioCtx.currentTime + i * 0.18;
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.18);
      gain.gain.setValueAtTime(0.10, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  },

  collect(oreId) {
    this.init();
    const freqs = { coal: 320, iron: 460, gold: 620, diamond: 920 };
    const f = freqs[oreId] || 400;
    this._play('sine', f, f * 1.6, 0.18, 0.08);
  },

  powerup() {
    this.init();
    // Arpejo ascendente festivo
    [350, 450, 570, 720, 900].forEach((f, i) => {
      const t = audioCtx.currentTime + i * 0.07;
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t);
      gain.gain.setValueAtTime(0.07, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    });
  },

  swing() { this._play('triangle', 180, 80, 0.08, 0.04); },

  startCaveDrone() {
    this.init();
    if (this.droneOsc) return;
    this.droneOsc = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    this.droneOsc.type = 'sine';
    this.droneOsc.frequency.setValueAtTime(55, audioCtx.currentTime);
    droneGain.gain.setValueAtTime(0.03, audioCtx.currentTime);
    this.droneOsc.connect(droneGain);
    droneGain.connect(audioCtx.destination);
    this.droneOsc.start();
  },
};
