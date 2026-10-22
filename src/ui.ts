const SCREENS = ['setup', 'countdown', 'round', 'verify', 'results'] as const;
export type ScreenName = (typeof SCREENS)[number];

/** Recherche par id, avec ou sans le préfixe '#'. */
export function qs<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id.replace(/^#/, ''));
  if (!el) throw new Error(`Élément manquant dans le DOM : #${id}`);
  return el as T;
}

export function showScreen(name: ScreenName): void {
  for (const s of SCREENS) {
    qs(`#screen-${s}`).hidden = s !== name;
  }
}

export function formatSec(ms: number): string {
  return (ms / 1000).toFixed(1).replace('.', ',');
}

/** Relance une animation CSS en réappliquant la classe après reflow. */
export function replayAnimation(el: HTMLElement, className: string): void {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}
