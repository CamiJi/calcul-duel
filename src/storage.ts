import type { GameConfig } from './types';

const CONFIG_KEY = 'calcul-duel:config:v1';
const RECORDS_KEY = 'calcul-duel:records:v1';

export interface Records {
  winsPapa: number;
  winsChampion: number;
  draws: number;
  bestChampionScore: number;
  bestStreakChampion: number;
}

export const defaultConfig: GameConfig = {
  papaName: 'Papa',
  championName: 'Champion',
  tables: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  exercisesPerRound: 10,
  papaTimeSec: 15,
  multiplier: 3,
  bonusRapide: true,
  bonusSerie: true,
  malusErreur: false,
  voiceEnabled: true,
  soundEnabled: true,
};

export const emptyRecords: Records = {
  winsPapa: 0,
  winsChampion: 0,
  draws: 0,
  bestChampionScore: 0,
  bestStreakChampion: 0,
};

export function loadConfig(): GameConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...defaultConfig };
    const saved = JSON.parse(raw) as Partial<GameConfig>;
    const config = { ...defaultConfig, ...saved };
    if (!Array.isArray(config.tables) || config.tables.length === 0) {
      config.tables = [...defaultConfig.tables];
    }
    return config;
  } catch {
    return { ...defaultConfig };
  }
}

export function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch {
    /* stockage indisponible : on joue sans préférences persistées */
  }
}

export function loadRecords(): Records {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (!raw) return { ...emptyRecords };
    return { ...emptyRecords, ...(JSON.parse(raw) as Partial<Records>) };
  } catch {
    return { ...emptyRecords };
  }
}

export function saveRecords(records: Records): void {
  try {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch {
    /* idem */
  }
}
