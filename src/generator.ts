import type { Exercise } from './types';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Génère une pile d'exercices tirés au sort parmi les tables choisies,
 * facteur 1 à 10. Évite autant que possible la même multiplication
 * deux fois de suite pour garder du rythme.
 */
export function generatePile(tables: number[], count: number): Exercise[] {
  const pile: Exercise[] = [];
  let prevKey = '';

  for (let i = 0; i < count; i++) {
    let ex: Exercise;
    let key: string;
    let guard = 0;
    do {
      ex = { a: pick(tables), b: 1 + Math.floor(Math.random() * 10) };
      key = `${ex.a}×${ex.b}`;
      guard++;
    } while (key === prevKey && guard < 20);

    pile.push(ex);
    prevKey = key;
  }

  return pile;
}
