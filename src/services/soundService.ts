// Web Audio API based polished sound synthesizer for zero-dependency, ultra-crisp audio

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('AudioContext initialization ignored:', e);
    return null;
  }
}

/**
 * Polished, subtle Apple-style signal chime
 * Played when a new Aviator multiplier analysis signal is calculated.
 */
export function playSignalSound(enabled: boolean = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Primary resonant tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // Jump to A5

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.22, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    // Harmonic bell shimmer
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1318.5, now + 0.04); // E6

    gain2.gain.setValueAtTime(0, now + 0.04);
    gain2.gain.linearRampToValueAtTime(0.12, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    // Soft master filter to prevent any harsh clicks
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);

    osc1.connect(gain1);
    gain1.connect(filter);
    osc2.connect(gain2);
    gain2.connect(filter);
    filter.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.46);
    osc2.start(now + 0.04);
    osc2.stop(now + 0.4);
  } catch (err) {
    console.warn('Could not play signal sound:', err);
  }
}

/**
 * Uplifting harmonic chime for SportyBet verification success
 */
export function playSuccessSound(enabled: boolean = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const startTime = now + i * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    });
  } catch (err) {
    console.warn('Could not play success sound:', err);
  }
}

/**
 * Subtle low double-tap for verification rejection
 */
export function playFailSound(enabled: boolean = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    [0, 0.12].forEach((offset) => {
      const startTime = now + offset;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, startTime);
      osc.frequency.exponentialRampToValueAtTime(140, startTime + 0.09);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.15);
    });
  } catch (err) {
    console.warn('Could not play fail sound:', err);
  }
}

/**
 * Haptic feedback trigger
 */
export function triggerVibrate(enabled: boolean = true, pattern: number | number[] = 40): void {
  if (!enabled) return;
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignored if vibration permission is restricted
    }
  }
}

/**
 * Real-life phone browser notification when a signal drops
 * Sent directly to the real user's phone notification center
 */
export async function triggerSystemNotification(
  title: string,
  body: string,
  enabled: boolean = true
): Promise<void> {
  if (!enabled || typeof window === 'undefined' || !('Notification' in window)) return;
  try {
    if (Notification.permission === 'granted') {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico'
          });
          return;
        } catch (swErr) {
          // fallback to regular notification
        }
      }

      new Notification(title, {
        body,
        icon: '/favicon.ico'
      });
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    }
  } catch (e) {
    console.warn('Phone notification error:', e);
  }
}
