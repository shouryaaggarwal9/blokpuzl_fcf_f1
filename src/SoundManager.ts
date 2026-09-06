export class SoundManager {
  private ctx: AudioContext | null = null;
  public isMuted = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Trigger mobile vibration safely
  public vibrate(pattern: number | number[]) {
    if ("vibrate" in navigator && !this.isMuted) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Fallback for browsers with strict vibration permissions
      }
    }
  }

  // 1. Soft pop when grabbing a piece
  public playPickup() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(260, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      420,
      this.ctx.currentTime + 0.05,
    );

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
    this.vibrate(12);
  }

  // 2. Thud when placing a block
  public playDrop() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
    this.vibrate(20);
  }

  // 3. Ascending chord for line clears
  public playLineClear(comboCount = 1) {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const baseNotes = [330, 392, 493, 587, 659, 784]; // E4, G4, B4, D5, E5, G5
    const chordLen = Math.min(baseNotes.length, comboCount + 2);

    for (let i = 0; i < chordLen; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(
        baseNotes[i],
        this.ctx.currentTime + i * 0.04,
      );

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        this.ctx.currentTime + i * 0.04 + 0.25,
      );

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + i * 0.04);
      osc.stop(this.ctx.currentTime + i * 0.04 + 0.25);
    }

    this.vibrate([30, 40, 50]);
  }

  // 4. Low-frequency explosion for the 3x3 Bomb
  public playBombExplosion() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(28, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.35);
    this.vibrate([60, 30, 80]);
  }

  // 5. Spring click for Undo / Swap
  public playClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      260,
      this.ctx.currentTime + 0.04,
    );

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
    this.vibrate(10);
  }
}

export const sounds = new SoundManager();
