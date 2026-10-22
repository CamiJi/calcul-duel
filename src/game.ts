import type { GameConfig } from './types';
import { generatePile } from './generator';
import { Countdown } from './timer';
import { sfx } from './sounds';
import { speak, stopSpeaking } from './voice';
import { loadRecords, saveRecords } from './storage';
import { launchConfetti } from './confetti';
import { qs, showScreen, formatSec, replayAnimation } from './ui';

export type PlayerId = 'papa' | 'champion';
type Mark = 'correct' | 'wrong';

interface PlayerState {
  id: PlayerId;
  name: string;
  pile: { a: number; b: number }[];
  index: number;
  timer: Countdown;
  budgetMs: number;
  /** Temps réellement utilisé à chaque exercice (indexé comme la pile). */
  timeUsedMs: number[];
  finished: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  marks: (Mark | null)[];
  revealed: boolean[];
}

export interface DuelCallbacks {
  /** Le joueur demande une revanche avec la même configuration. */
  onRematch: () => void;
  /** Retour à l'écran de réglages. */
  onExit: () => void;
}

const CONFETTI_COLORS = ['#38bdf8', '#fbbf24', '#34d399', '#f472b6', '#a78bfa', '#f87171'];
const PLAYER_IDS: PlayerId[] = ['papa', 'champion'];

/** Garde-fou contre les doubles-taps qui enchaîneraient les exercices à vide. */
const MIN_TAP_MS = 400;

export class Duel {
  private config: GameConfig;
  private callbacks: DuelCallbacks;
  private players: Record<PlayerId, PlayerState>;
  private phase: 'idle' | 'countdown' | 'round' | 'verify' | 'results' = 'idle';
  private verifyIndex = 0;
  private rafId = 0;
  private lastWholeSec: Record<PlayerId, number> = { papa: -1, champion: -1 };
  private countdownTimers: number[] = [];

  constructor(config: GameConfig, callbacks: DuelCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
    this.players = {
      papa: this.makeState('papa', config.papaName, config.papaTimeSec * 1000),
      champion: this.makeState(
        'champion',
        config.championName,
        config.papaTimeSec * 1000 * config.multiplier,
      ),
    };
  }

  private makeState(id: PlayerId, name: string, budgetMs: number): PlayerState {
    const n = this.config.exercisesPerRound;
    return {
      id,
      name,
      pile: generatePile(this.config.tables, n),
      index: 0,
      timer: new Countdown(),
      budgetMs,
      timeUsedMs: [],
      finished: false,
      score: 0,
      streak: 0,
      bestStreak: 0,
      marks: Array.from({ length: n }, () => null),
      revealed: Array.from({ length: n }, () => false),
    };
  }

  // ─────────────────────────── Démarrage ───────────────────────────

  start(): void {
    this.phase = 'countdown';
    showScreen('countdown');
    const valueEl = qs<HTMLDivElement>('countdown-value');
    const steps = ['3', '2', '1', 'GO !'];
    let i = 0;

    const step = () => {
      if (this.phase !== 'countdown') return;
      valueEl.textContent = steps[i];
      replayAnimation(valueEl, 'animate-pop');
      sfx.count();
      i++;
      if (i < steps.length) {
        this.countdownTimers.push(window.setTimeout(step, 900));
      } else {
        this.countdownTimers.push(window.setTimeout(() => this.beginRound(), 900));
      }
    };
    step();
  }

  private beginRound(): void {
    this.phase = 'round';
    showScreen('round');
    for (const id of PLAYER_IDS) {
      const p = this.players[id];
      qs(`#name-${id}`).textContent = p.name;
      qs(`#budget-${id}`).textContent = `⏱ ${Math.round(p.budgetMs / 1000)} s / ex`;
      this.lastWholeSec[id] = -1;
      this.renderArena(p);
      p.timer.start(p.budgetMs);
    }
    sfx.start();
    this.loop();
  }

  // ─────────────────────────── Manche ───────────────────────────

  private loop = (): void => {
    if (this.phase !== 'round') return;

    for (const id of PLAYER_IDS) {
      const p = this.players[id];
      if (p.finished || !p.timer.running) continue;

      const remain = p.timer.remainingMs;
      const ratio = p.budgetMs > 0 ? remain / p.budgetMs : 0;
      const fill = qs<HTMLDivElement>(`#bar-${id}`);
      fill.style.width = `${Math.max(0, ratio * 100)}%`;
      fill.classList.toggle('bar-warn', ratio <= 0.5 && ratio > 0.25);
      fill.classList.toggle('bar-late', ratio <= 0.25);

      const whole = Math.ceil(remain / 1000);
      if (whole !== this.lastWholeSec[id]) {
        this.lastWholeSec[id] = whole;
        qs(`#time-${id}`).textContent = `${whole} s`;
        if (whole <= 5 && whole > 0) sfx.tick();
      }

      if (remain <= 0) this.handleTimeout(p);
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private stopLoop(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  private renderArena(p: PlayerState): void {
    const exEl = qs(`#ex-${p.id}`);
    if (p.finished) {
      exEl.textContent = '🎉';
    } else {
      const ex = p.pile[p.index];
      exEl.textContent = `${ex.a} × ${ex.b}`;
      speak(`${ex.a} fois ${ex.b}`, this.config.voiceEnabled);
    }
    qs(`#progress-${p.id}`).textContent = `Exercice ${Math.min(p.index + 1, p.pile.length)} / ${p.pile.length}`;
    qs(`#time-${p.id}`).textContent = `${Math.ceil(p.budgetMs / 1000)} s`;
    qs<HTMLButtonElement>(`#done-${p.id}`).hidden = p.finished;
    qs(`#waiting-${p.id}`).hidden = !p.finished;
  }

  handleDone(id: PlayerId): void {
    const p = this.players[id];
    if (this.phase !== 'round' || p.finished || !p.timer.running) return;
    const used = Math.max(MIN_TAP_MS, p.budgetMs - p.timer.remainingMs);
    p.timer.stop();
    sfx.next();
    this.advance(p, used);
  }

  private handleTimeout(p: PlayerState): void {
    p.timer.stop();
    sfx.timeout();
    const flash = qs(`#flash-${p.id}`);
    flash.hidden = false;
    window.setTimeout(() => {
      flash.hidden = true;
    }, 1200);
    this.advance(p, p.budgetMs);
  }

  private advance(p: PlayerState, usedMs: number): void {
    p.timeUsedMs.push(usedMs);
    p.index++;

    if (p.index >= p.pile.length) {
      p.finished = true;
      this.renderArena(p);
      if (this.players.papa.finished && this.players.champion.finished) this.endRound();
      return;
    }

    this.renderArena(p);
    p.timer.start(p.budgetMs);
    this.lastWholeSec[p.id] = -1;
    const fill = qs<HTMLDivElement>(`#bar-${p.id}`);
    fill.style.width = '100%';
    fill.classList.remove('bar-warn', 'bar-late');
  }

  private endRound(): void {
    this.stopLoop();
    this.phase = 'verify';
    this.verifyIndex = 0;
    showScreen('verify');
    for (const id of PLAYER_IDS) {
      qs(`#v-score-${id}-name`).textContent = this.players[id].name;
    }
    this.renderVerify();
  }

  // ─────────────────────────── Vérification ───────────────────────────

  private renderVerify(): void {
    const n = this.config.exercisesPerRound;
    qs('#verify-title').textContent = `Vérification — Exercice ${this.verifyIndex + 1} / ${n}`;
    for (const id of PLAYER_IDS) this.renderVerifyCard(this.players[id]);
    this.updateVerifyNextButton();
  }

  private renderVerifyCard(p: PlayerState): void {
    const ex = p.pile[this.verifyIndex];
    const mark = p.marks[this.verifyIndex];
    const revealed = p.revealed[this.verifyIndex];

    qs(`#v-name-${p.id}`).textContent = p.name;
    qs(`#v-ex-${p.id}`).textContent = `${ex.a} × ${ex.b}`;

    const usedMs = p.timeUsedMs[this.verifyIndex] ?? p.budgetMs;
    const timedOut = usedMs >= p.budgetMs;
    qs(`#v-meta-${p.id}`).textContent = timedOut
      ? `⏱️ Temps écoulé (budget ${Math.round(p.budgetMs / 1000)} s)`
      : `⏱️ ${formatSec(usedMs)} s sur ${Math.round(p.budgetMs / 1000)} s`;

    qs(`#v-question-${p.id}`).hidden = revealed;
    const answerEl = qs(`#v-answer-${p.id}`);
    answerEl.hidden = !revealed;
    if (revealed) answerEl.textContent = String(ex.a * ex.b);

    qs<HTMLButtonElement>(`#v-reveal-${p.id}`).hidden = revealed || mark !== null;
    qs(`#v-markers-${p.id}`).hidden = !revealed || mark !== null;

    const markedEl = qs(`#v-marked-${p.id}`);
    markedEl.hidden = mark === null;
    if (mark !== null) {
      markedEl.textContent = mark === 'correct' ? '✅ Marqué bonne' : '❌ Marquée fausse';
      markedEl.classList.toggle('text-emerald-300', mark === 'correct');
      markedEl.classList.toggle('text-rose-300', mark === 'wrong');
    }
  }

  reveal(id: PlayerId): void {
    const p = this.players[id];
    if (this.phase !== 'verify' || p.revealed[this.verifyIndex] || p.marks[this.verifyIndex] !== null) return;
    p.revealed[this.verifyIndex] = true;
    sfx.reveal();
    this.renderVerifyCard(p);
  }

  mark(id: PlayerId, verdict: Mark): void {
    const p = this.players[id];
    if (this.phase !== 'verify' || p.marks[this.verifyIndex] !== null || !p.revealed[this.verifyIndex]) return;
    p.marks[this.verifyIndex] = verdict;
    this.applyScore(p, verdict);
    qs(`#v-score-${id}`).textContent = String(p.score);
    this.renderVerifyCard(p);
    this.updateVerifyNextButton();
  }

  private applyScore(p: PlayerState, verdict: Mark): void {
    const i = this.verifyIndex;

    if (verdict === 'correct') {
      p.score++;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      this.popup(p.id, '+1', 'text-emerald-300');
      sfx.correct();

      const withinPapaTime = (p.timeUsedMs[i] ?? Infinity) <= this.players.papa.budgetMs;
      if (this.config.bonusRapide && p.id === 'champion' && withinPapaTime) {
        p.score++;
        this.popup(p.id, '⚡ +1 rapidité !', 'text-amber-300');
        sfx.bonus();
      }
      if (this.config.bonusSerie && p.streak % 3 === 0) {
        p.score++;
        this.popup(p.id, '🔥 +1 série !', 'text-orange-300');
        sfx.bonus();
      }
    } else {
      p.streak = 0;
      if (this.config.malusErreur) {
        p.score = Math.max(0, p.score - 1);
        this.popup(p.id, '−1', 'text-rose-300');
      }
      sfx.wrong();
    }
  }

  private popup(id: PlayerId, text: string, colorClass: string): void {
    const el = qs(`#v-popup-${id}`);
    el.textContent = text;
    el.className = `popup h-8 text-center font-display text-2xl font-bold ${colorClass}`;
    replayAnimation(el, 'popup');
  }

  private updateVerifyNextButton(): void {
    const bothMarked = PLAYER_IDS.every((id) => this.players[id].marks[this.verifyIndex] !== null);
    const btn = qs<HTMLButtonElement>('#btn-verify-next');
    btn.disabled = !bothMarked;
    const last = this.verifyIndex === this.config.exercisesPerRound - 1;
    btn.textContent = bothMarked
      ? last
        ? '🏆 Voir le résultat'
        : 'Exercice suivant ➜'
      : 'Valide les deux réponses pour continuer';
  }

  nextVerify(): void {
    if (this.phase !== 'verify') return;
    const bothMarked = PLAYER_IDS.every((id) => this.players[id].marks[this.verifyIndex] !== null);
    if (!bothMarked) return;

    if (this.verifyIndex >= this.config.exercisesPerRound - 1) {
      this.finish();
      return;
    }
    this.verifyIndex++;
    for (const id of PLAYER_IDS) {
      const popupEl = qs(`#v-popup-${id}`);
      popupEl.textContent = '';
    }
    this.renderVerify();
  }

  // ─────────────────────────── Résultats ───────────────────────────

  private finish(): void {
    this.phase = 'results';
    const { papa, champion } = this.players;

    let banner: string;
    let subtitle: string;
    if (champion.score > papa.score) {
      banner = `🏆 ${champion.name} remporte la manche !`;
      subtitle = pickChampionLine(champion.score);
    } else if (papa.score > champion.score) {
      banner = `🏆 ${papa.name} l'emporte !`;
      subtitle = `Bravo ${champion.name}, c'était serré. On reprend ?`;
    } else {
      banner = '🤝 Égalité parfaite !';
      subtitle = 'Personne ne perd. Du grand niveau des deux côtés !';
    }

    qs('#result-banner').textContent = banner;
    qs('#result-subtitle').textContent = subtitle;
    qs('#result-name-papa').textContent = papa.name;
    qs('#result-name-champion').textContent = champion.name;
    qs('#result-score-papa').textContent = String(papa.score);
    qs('#result-score-champion').textContent = String(champion.score);
    qs('#result-stats-papa').textContent = statsLine(papa);
    qs('#result-stats-champion').textContent = statsLine(champion);

    const records = loadRecords();
    if (champion.score > papa.score) records.winsChampion++;
    else if (papa.score > champion.score) records.winsPapa++;
    else records.draws++;
    records.bestChampionScore = Math.max(records.bestChampionScore, champion.score);
    records.bestStreakChampion = Math.max(records.bestStreakChampion, champion.bestStreak);
    saveRecords(records);
    qs('#records-after').innerHTML = recordsHtml(records, this.config);

    showScreen('results');
    sfx.victory();
    launchConfetti(qs<HTMLCanvasElement>('#confetti'), CONFETTI_COLORS);
  }

  // ─────────────────────────── Pause / sortie ───────────────────────────

  pause(): void {
    if (this.phase !== 'round') return;
    this.stopLoop();
    for (const id of PLAYER_IDS) {
      if (!this.players[id].finished) this.players[id].timer.pause();
    }
    qs('#overlay-pause').hidden = false;
  }

  resume(): void {
    qs('#overlay-pause').hidden = true;
    if (this.phase !== 'round') return;
    for (const id of PLAYER_IDS) {
      if (!this.players[id].finished) this.players[id].timer.resume();
    }
    this.loop();
  }

  private onVisibilityChange = (): void => {
    if (document.hidden) this.pause();
  };

  dispose(): void {
    this.phase = 'idle';
    this.stopLoop();
    for (const t of this.countdownTimers) window.clearTimeout(t);
    this.countdownTimers = [];
    for (const id of PLAYER_IDS) this.players[id].timer.stop();
    stopSpeaking();
    qs('#overlay-pause').hidden = true;
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  requestExit(): void {
    this.dispose();
    this.callbacks.onExit();
  }

  requestRematch(): void {
    this.dispose();
    this.callbacks.onRematch();
  }

  bindVisibilityWatcher(): void {
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }
}

function statsLine(p: PlayerState): string {
  const answered = p.timeUsedMs.length;
  const totalUsed = p.timeUsedMs.reduce((sum, ms) => sum + ms, 0);
  const avgSec = answered > 0 ? (totalUsed / answered / 1000).toFixed(1).replace('.', ',') : '—';
  return `⏱ ${avgSec} s en moyenne · 🔥 meilleure série : ${p.bestStreak}`;
}

function pickChampionLine(score: number): string {
  const lines = [
    'Le calcul mental n\'a plus de secret pour toi !',
    'Quelle vitesse, quel cerveau !',
    'Même Papa n\'a pas su suivre !',
  ];
  return `${lines[Math.floor(Math.random() * lines.length)]} (${score} points)`;
}

export function recordsHtml(
  records: ReturnType<typeof loadRecords>,
  config: GameConfig,
): string {
  return `
    <p class="font-display text-xl font-bold">
      🏆 Manches gagnées — <span class="text-sky-300">${escapeHtml(config.papaName)} : ${records.winsPapa}</span>
      · <span class="text-amber-300">${escapeHtml(config.championName)} : ${records.winsChampion}</span>
      · Égalités : ${records.draws}
    </p>
    <p class="mt-1 text-slate-400">
      Meilleur score du ${escapeHtml(config.championName)} : <strong>${records.bestChampionScore}</strong> pts
      · Plus longue série : <strong>${records.bestStreakChampion}</strong> 🔥
    </p>
  `;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
