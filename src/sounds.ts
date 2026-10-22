type Osc = OscillatorType;

/**
 * Effets sonores générés en Web Audio — zéro fichier asset.
 * L'AudioContext est créé au premier geste utilisateur (touche Start).
 */
export class Sfx {
  enabled = true;
  private ctx: AudioContext | null = null;

  unlock(): void {
    if (this.ctx === null) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    void this.ctx.resume();
  }

  private tone(freq: number, opts: { dur?: number; type?: Osc; delay?: number; vol?: number; glideTo?: number } = {}): void {
    if (!this.enabled || !this.ctx) return;
    const { dur = 0.12, type = 'square', delay = 0, vol = 0.15, glideTo } = opts;
    const t0 = this.ctx.currentTime + delay;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** Compte à rebours : « 3, 2, 1, GO ! » */
  count(): void {
    this.tone(520, { type: 'sine', dur: 0.1, vol: 0.12 });
  }

  /** Début de manche : double bip. */
  start(): void {
    this.tone(660, { dur: 0.15 });
    this.tone(880, { dur: 0.2, delay: 0.18 });
  }

  /** Tic des 5 dernières secondes. */
  tick(): void {
    this.tone(1200, { dur: 0.05, type: 'sine', vol: 0.08 });
  }

  /** Temps écoulé : glissando descendant. */
  timeout(): void {
    this.tone(440, { dur: 0.5, type: 'sawtooth', glideTo: 110, vol: 0.12 });
  }

  /** Exercice suivant (bouton « J'ai fini »). */
  next(): void {
    this.tone(784, { type: 'sine', dur: 0.1 });
    this.tone(1046, { type: 'sine', dur: 0.12, delay: 0.1 });
  }

  /** Révélation de la bonne réponse. */
  reveal(): void {
    this.tone(980, { dur: 0.08, type: 'sine', vol: 0.1 });
  }

  correct(): void {
    this.tone(784, { type: 'sine', dur: 0.15, vol: 0.14 });
    this.tone(988, { type: 'sine', dur: 0.15, delay: 0.1, vol: 0.14 });
    this.tone(1319, { type: 'sine', dur: 0.25, delay: 0.2, vol: 0.14 });
  }

  wrong(): void {
    this.tone(196, { dur: 0.25, type: 'square', vol: 0.09 });
    this.tone(165, { dur: 0.3, type: 'square', delay: 0.18, vol: 0.09 });
  }

  /** Bonus (rapidité ⚡ / série 🔥). */
  bonus(): void {
    this.tone(1568, { dur: 0.1, type: 'sine', vol: 0.12 });
    this.tone(2093, { dur: 0.18, type: 'sine', delay: 0.09, vol: 0.12 });
  }

  /** Fanfare de fin de manche. */
  victory(): void {
    [523, 659, 784, 1046].forEach((f, i) => {
      this.tone(f, { dur: 0.3, type: 'triangle', delay: i * 0.16, vol: 0.16 });
    });
  }
}

export const sfx = new Sfx();
