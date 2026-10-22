import './style.css';
import { Duel, recordsHtml } from './game';
import type { PlayerId } from './game';
import { qs, showScreen } from './ui';
import { loadConfig, saveConfig, loadRecords } from './storage';
import { sfx } from './sounds';
import type { GameConfig } from './types';

const ALL_TABLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PLAYER_IDS: PlayerId[] = ['papa', 'champion'];

let current: Duel | null = null;

function buildChips(): void {
  const container = qs('tables-chips');
  container.innerHTML = '';
  for (const t of ALL_TABLES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.table = String(t);
    btn.textContent = String(t);
    btn.className = 'chip chip-off';
    btn.setAttribute('aria-pressed', 'false');
    btn.addEventListener('click', () => {
      const on = btn.getAttribute('aria-pressed') === 'true';
      btn.setAttribute('aria-pressed', on ? 'false' : 'true');
      btn.classList.toggle('chip-on', !on);
      btn.classList.toggle('chip-off', on);
      commit();
    });
    container.appendChild(btn);
  }
}

function applyForm(config: GameConfig): void {
  qs<HTMLInputElement>('in-papa-name').value = config.papaName;
  qs<HTMLInputElement>('in-champion-name').value = config.championName;
  qs<HTMLSelectElement>('in-count').value = String(config.exercisesPerRound);
  qs<HTMLSelectElement>('in-time').value = String(config.papaTimeSec);
  qs<HTMLSelectElement>('in-multiplier').value = String(config.multiplier);
  qs<HTMLInputElement>('opt-bonus-rapide').checked = config.bonusRapide;
  qs<HTMLInputElement>('opt-bonus-serie').checked = config.bonusSerie;
  qs<HTMLInputElement>('opt-malus').checked = config.malusErreur;
  qs<HTMLInputElement>('opt-voice').checked = config.voiceEnabled;
  qs<HTMLInputElement>('opt-sound').checked = config.soundEnabled;

  for (const btn of document.querySelectorAll<HTMLButtonElement>('#tables-chips button')) {
    const on = config.tables.includes(Number(btn.dataset.table));
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.classList.toggle('chip-on', on);
    btn.classList.toggle('chip-off', !on);
  }
}

function readForm(): GameConfig {
  const tables = [...document.querySelectorAll<HTMLButtonElement>('#tables-chips button')]
    .filter((b) => b.getAttribute('aria-pressed') === 'true')
    .map((b) => Number(b.dataset.table));

  return {
    papaName: qs<HTMLInputElement>('in-papa-name').value.trim() || 'Papa',
    championName: qs<HTMLInputElement>('in-champion-name').value.trim() || 'Champion',
    tables,
    exercisesPerRound: Number(qs<HTMLSelectElement>('in-count').value),
    papaTimeSec: Number(qs<HTMLSelectElement>('in-time').value),
    multiplier: Number(qs<HTMLSelectElement>('in-multiplier').value),
    bonusRapide: qs<HTMLInputElement>('opt-bonus-rapide').checked,
    bonusSerie: qs<HTMLInputElement>('opt-bonus-serie').checked,
    malusErreur: qs<HTMLInputElement>('opt-malus').checked,
    voiceEnabled: qs<HTMLInputElement>('opt-voice').checked,
    soundEnabled: qs<HTMLInputElement>('opt-sound').checked,
  };
}

function refreshSetupUi(config: GameConfig): void {
  const championBudget = Math.round(config.papaTimeSec * config.multiplier);
  qs('#handicap-preview').textContent =
    `${config.papaName} : ${config.papaTimeSec} s — ${config.championName} : ${championBudget} s par exercice`;

  const empty = config.tables.length === 0;
  qs('#tables-hint').classList.toggle('hidden', !empty);
  qs<HTMLButtonElement>('btn-start').disabled = empty;

  qs('#records-setup').innerHTML = recordsHtml(loadRecords(), config);
  sfx.enabled = config.soundEnabled;
}

function commit(): void {
  const config = readForm();
  saveConfig(config);
  refreshSetupUi(config);
}

function launch(config: GameConfig): void {
  current = new Duel(config, {
    onRematch: () => launch(config),
    onExit: backToSetup,
  });
  current.bindVisibilityWatcher();
  current.start();
}

function startMatch(): void {
  const config = readForm();
  if (config.tables.length === 0) return;
  saveConfig(config);
  sfx.unlock();
  sfx.enabled = config.soundEnabled;
  launch(config);
}

function backToSetup(): void {
  current = null;
  showScreen('setup');
  refreshSetupUi(readForm());
}

function wire(): void {
  for (const id of PLAYER_IDS) {
    qs(`#done-${id}`).addEventListener('click', () => current?.handleDone(id));
    qs(`#v-reveal-${id}`).addEventListener('click', () => current?.reveal(id));
    qs(`#v-correct-${id}`).addEventListener('click', () => current?.mark(id, 'correct'));
    qs(`#v-wrong-${id}`).addEventListener('click', () => current?.mark(id, 'wrong'));
  }

  qs('#btn-start').addEventListener('click', startMatch);
  qs('#btn-pause-round').addEventListener('click', () => current?.pause());
  qs('#btn-resume').addEventListener('click', () => current?.resume());
  qs('#btn-verify-next').addEventListener('click', () => current?.nextVerify());
  qs('#btn-rematch').addEventListener('click', () => current?.requestRematch());
  qs('#btn-setup-end').addEventListener('click', () => current?.requestExit());

  qs('#tables-all').addEventListener('click', () => {
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#tables-chips button')) {
      btn.setAttribute('aria-pressed', 'true');
      btn.classList.add('chip-on');
      btn.classList.remove('chip-off');
    }
    commit();
  });
  qs('#tables-none').addEventListener('click', () => {
    for (const btn of document.querySelectorAll<HTMLButtonElement>('#tables-chips button')) {
      btn.setAttribute('aria-pressed', 'false');
      btn.classList.remove('chip-on');
      btn.classList.add('chip-off');
    }
    commit();
  });

  for (const id of ['in-count', 'in-time', 'in-multiplier']) {
    qs(id).addEventListener('change', commit);
  }
  for (const id of ['in-papa-name', 'in-champion-name']) {
    qs(id).addEventListener('input', commit);
  }
  for (const id of ['opt-bonus-rapide', 'opt-bonus-serie', 'opt-malus', 'opt-voice', 'opt-sound']) {
    qs(id).addEventListener('change', commit);
  }
}

function init(): void {
  buildChips();
  applyForm(loadConfig());
  wire();
  refreshSetupUi(readForm());
}

init();
