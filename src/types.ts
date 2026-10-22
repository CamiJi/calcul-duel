export interface GameConfig {
  papaName: string;
  championName: string;
  tables: number[];
  exercisesPerRound: number;
  /** Temps (secondes) accordé au papa par exercice — c'est la référence. */
  papaTimeSec: number;
  /** Avantage du champion : son chrono = papaTimeSec × multiplier. */
  multiplier: number;
  bonusRapide: boolean;
  bonusSerie: boolean;
  malusErreur: boolean;
  voiceEnabled: boolean;
  soundEnabled: boolean;
}

export interface Exercise {
  a: number;
  b: number;
}
