let utterance: SpeechSynthesisUtterance | null = null;

export function speak(text: string): void {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return;
  }

  window.speechSynthesis.cancel();

  utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) ||
                       voices.find(v => v.lang.startsWith('en'));
  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSpeaking(): boolean {
  if (!('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
}

export function formatDirectionForSpeech(instruction: string): string {
  return instruction
    .replace(/onto/gi, 'onto')
    .replace(/Continue/gi, 'Continue')
    .replace(/Turn left/gi, 'Turn left')
    .replace(/Turn right/gi, 'Turn right')
    .replace(/Slight left/gi, 'Bear left')
    .replace(/Slight right/gi, 'Bear right')
    .replace(/km/g, 'kilometers')
    .replace(/m/g, 'meters')
    .trim();
}

export function speakDirection(step: { maneuver: { type?: string; modifier?: string; instruction?: string; name?: string }; distance?: number }): void {
  let text = '';

  if (step.maneuver.instruction) {
    text = formatDirectionForSpeech(step.maneuver.instruction);
  } else {
    const type = step.maneuver.type || '';
    const modifier = step.maneuver.modifier || '';
    const name = step.maneuver.name || '';
    text = `${type} ${modifier}`.trim();
    if (name) text += ` onto ${name}`;
  }

  if (step.distance && step.distance > 0) {
    const distText = step.distance >= 1000
      ? `${(step.distance / 1000).toFixed(1)} kilometers`
      : `${Math.round(step.distance)} meters`;
    text += `. Then go ${distText}.`;
  }

  speak(text);
}
