/** Lit un exercice à voix haute (SpeechSynthesis, français). */
export function speak(text: string, enabled: boolean): void {
  if (!enabled || !('speechSynthesis' in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = 'fr-FR';
  utter.rate = 1.05;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}
