const TICK_URL = "/roulette-tick.mp3";
const STOP_URL = "/roulette-stop.mp3";
const POOL_SIZE = 6;

function preloadAudio(audio: HTMLAudioElement) {
  return new Promise<void>((resolve) => {
    if (audio.readyState >= 2) {
      resolve();
      return;
    }
    const done = () => resolve();
    audio.addEventListener("canplaythrough", done, { once: true });
    audio.addEventListener("error", done, { once: true });
    audio.load();
  });
}

/**
 * Short one-shot ticks + stop confirm for the raffle wheel.
 * Uses HTMLAudioElement (reliable after a user gesture on mobile).
 */
class WheelSound {
  private pool: HTMLAudioElement[] = [];
  private stopAudio: HTMLAudioElement | null = null;
  private cursor = 0;
  private unlocked = false;
  private lastTickAtMs = 0;
  private loadPromise: Promise<void> | null = null;

  private ensureElements() {
    if (typeof Audio === "undefined") return;
    if (this.pool.length === 0) {
      for (let i = 0; i < POOL_SIZE; i += 1) {
        const audio = new Audio(TICK_URL);
        audio.preload = "auto";
        audio.volume = 0.85;
        this.pool.push(audio);
      }
    }
    if (!this.stopAudio) {
      this.stopAudio = new Audio(STOP_URL);
      this.stopAudio.preload = "auto";
      this.stopAudio.volume = 0.9;
    }
  }

  async unlock() {
    this.ensureElements();
    if (this.pool.length === 0) return;

    try {
      if (!this.loadPromise) {
        const jobs = this.pool.map((audio) => preloadAudio(audio));
        if (this.stopAudio) {
          jobs.push(preloadAudio(this.stopAudio));
        }
        this.loadPromise = Promise.all(jobs).then(() => undefined);
      }
      await this.loadPromise;

      // Prime autoplay policy inside the user-gesture call stack when possible.
      const primer = this.pool[0];
      const prevVolume = primer.volume;
      primer.volume = 0;
      try {
        primer.currentTime = 0;
        await primer.play();
        primer.pause();
        primer.currentTime = 0;
        this.unlocked = true;
      } catch {
        this.unlocked = false;
      } finally {
        primer.volume = prevVolume;
      }
    } catch {
      this.unlocked = false;
    }
  }

  playTick(minGapMs = 40) {
    this.ensureElements();
    if (this.pool.length === 0) return;

    const now = performance.now();
    if (now - this.lastTickAtMs < minGapMs) return;
    this.lastTickAtMs = now;

    const audio = this.pool[this.cursor % this.pool.length];
    this.cursor += 1;
    try {
      audio.currentTime = 0;
      const playResult = audio.play();
      if (playResult !== undefined) {
        void playResult
          .then(() => {
            this.unlocked = true;
          })
          .catch(() => {
            // Ignore AbortError from overlapping restarts.
          });
      }
    } catch {
      // no-op
    }
  }

  playStop() {
    this.ensureElements();
    if (!this.stopAudio) return;
    try {
      this.stopAudio.currentTime = 0;
      const playResult = this.stopAudio.play();
      if (playResult !== undefined) {
        void playResult.catch(() => {
          // no-op
        });
      }
    } catch {
      // no-op
    }
  }

  get isUnlocked() {
    return this.unlocked;
  }
}

export const wheelSound = new WheelSound();
