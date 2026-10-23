// A short original chime; no remote audio, files or third-party sound assets.
let context: AudioContext | undefined;
const active = new Set<OscillatorNode>();
let generation = 0;
export function matchSoundEnabled() {
  try {
    return localStorage.getItem("wtokens_match_sound") !== "off";
  } catch {
    return true;
  }
}
export function saveMatchSound(enabled: boolean) {
  try {
    localStorage.setItem("wtokens_match_sound", enabled ? "on" : "off");
  } catch {
    /* Private browsing can disable storage. */
  }
}
export function primeMatchSound() {
  try {
    context ??= new AudioContext();
    void context.resume().catch(() => {});
  } catch {
    /* The visual acceptance flow works without Web Audio. */
  }
}
export function stopMatchSound() {
  generation++;
  for (const node of active) {
    try {
      node.stop();
    } catch {
      /* Already ended. */
    }
  }
  active.clear();
}
export async function playMatchSound(signal?: AbortSignal): Promise<boolean> {
  try {
    if (!context) return false;
    stopMatchSound();
    const attempt = generation;
    await context.resume();
    if (
      context.state !== "running" ||
      signal?.aborted ||
      generation !== attempt
    )
      return false;
    const start = context.currentTime;
    for (const [index, frequency] of [440, 554.37, 659.25].entries()) {
      const oscillator = context.createOscillator(),
        gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      const at = start + index * 0.14;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.055, at + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.38);
      oscillator.connect(gain);
      gain.connect(context.destination);
      active.add(oscillator);
      oscillator.onended = () => {
        active.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + 0.4);
    }
    return true;
  } catch {
    return false;
  }
}
