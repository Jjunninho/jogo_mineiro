// ============================================================
//  noise.js  –  Gerador de ruído suave 1D (interpolação cúbica)
// ============================================================

class Simple1DNoise {
  constructor() {
    this.MAX_VERTICES = 256;
    this.r = Array.from({ length: this.MAX_VERTICES }, () => random()); // AGORA
  }

  get(x) {
    const xi  = Math.floor(x);
    const xf  = x - xi;
    const rx0 = this.r[xi % this.MAX_VERTICES];
    const rx1 = this.r[(xi + 1) % this.MAX_VERTICES];
    const f   = xf * xf * (3.0 - 2.0 * xf);   // smoothstep
    return rx0 * (1.0 - f) + rx1 * f;
  }
}
