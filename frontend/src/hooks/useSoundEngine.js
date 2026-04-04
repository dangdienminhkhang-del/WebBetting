/**
 * useSoundEngine — Web Audio API sound engine
 * Không cần file mp3, tất cả synthesized.
 */
import { useEffect, useRef } from 'react';

let _ctx = null;
const getCtx = () => {
  if (_ctx) return _ctx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  _ctx = new Ctx();
  return _ctx;
};

const resume = () => {
  const ctx = getCtx();
  if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// ── Primitive: play a tone ────────────────────────────────────────────────
export const playTone = (freq, durationMs, volume = 0.06, type = 'sine', delayMs = 0) => {
  const ctx = resume();
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = 0;
  o.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime + delayMs / 1000;
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(volume, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  o.start(now);
  o.stop(now + durationMs / 1000 + 0.05);
};

// ── Noise burst (for dice rattle) ─────────────────────────────────────────
const playNoise = (durationMs, volume = 0.08, delayMs = 0) => {
  const ctx = resume();
  if (!ctx) return;
  const bufSize = ctx.sampleRate * (durationMs / 1000);
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.5;
  src.connect(filter);
  filter.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime + delayMs / 1000;
  g.gain.setValueAtTime(volume, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  src.start(now);
  src.stop(now + durationMs / 1000 + 0.05);
};

// ═══════════════════════════════════════════════════════════════════════════
// CARO SOUNDS
// ═══════════════════════════════════════════════════════════════════════════
export const caroSounds = {
  place: () => {
    // Tiếng đặt quân: click nhẹ
    playTone(800, 40, 0.07, 'square');
    playTone(400, 60, 0.04, 'triangle', 20);
  },
  win: () => {
    // Fanfare thắng
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 200, 0.08, 'triangle', i * 120));
    playTone(1047, 400, 0.1, 'sine', 480);
  },
  lose: () => {
    // Âm thua buồn
    [400, 350, 280].forEach((f, i) => playTone(f, 250, 0.07, 'sawtooth', i * 150));
  },
  draw: () => {
    playTone(440, 300, 0.06, 'sine');
    playTone(440, 300, 0.06, 'sine', 350);
  },
  opponentMove: () => {
    playTone(300, 50, 0.05, 'triangle');
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// TAIXIU SOUNDS
// ═══════════════════════════════════════════════════════════════════════════
export const taixiuSounds = {
  // Tiếng lắc hộp xúc xắc (rattle)
  shake: () => {
    for (let i = 0; i < 6; i++) {
      playNoise(80, 0.12, i * 100);
      playTone(200 + Math.random() * 100, 60, 0.04, 'square', i * 100 + 20);
    }
  },
  // Tiếng xúc xắc đang lăn
  rolling: () => {
    for (let i = 0; i < 12; i++) {
      playNoise(60, 0.08 - i * 0.005, i * 80);
      playTone(150 + Math.random() * 200, 40, 0.03, 'square', i * 80 + 10);
    }
  },
  // Tiếng chạm đất (thud)
  land: () => {
    // Impact thud
    playTone(80, 150, 0.15, 'sine');
    playNoise(100, 0.2);
    playTone(120, 80, 0.1, 'triangle', 30);
    // Bounce nhỏ
    playTone(60, 80, 0.06, 'sine', 160);
    playNoise(50, 0.08, 160);
  },
  // Kết quả thắng
  win: () => {
    playTone(523, 100, 0.1, 'triangle');
    playTone(659, 100, 0.1, 'triangle', 100);
    playTone(784, 100, 0.1, 'triangle', 200);
    playTone(1047, 300, 0.12, 'sine', 300);
    // Coin sound
    [1200, 1400, 1600].forEach((f, i) => playTone(f, 80, 0.06, 'sine', 600 + i * 60));
  },
  // Kết quả thua
  lose: () => {
    playTone(300, 200, 0.08, 'sawtooth');
    playTone(220, 300, 0.08, 'sawtooth', 200);
    playTone(180, 400, 0.06, 'sine', 400);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// BACKGROUND MUSIC ENGINE
// Mỗi track là một loop procedural dùng Web Audio API
// ═══════════════════════════════════════════════════════════════════════════

class BgMusicPlayer {
  constructor() {
    this.nodes = [];
    this.playing = false;
    this.currentTrack = null;
    this.gainNode = null;
    this.volume = 0.18;
  }

  stop() {
    this.nodes.forEach(n => { try { n.stop(); } catch {} });
    this.nodes = [];
    if (this.gainNode) { try { this.gainNode.disconnect(); } catch {} }
    this.gainNode = null;
    this.playing = false;
    this.currentTrack = null;
  }

  setVolume(v) {
    this.volume = v;
    if (this.gainNode) this.gainNode.gain.value = v;
  }

  play(trackName) {
    if (this.currentTrack === trackName) return;
    this.stop();
    this.currentTrack = trackName;
    this.playing = true;
    const ctx = resume();
    if (!ctx) return;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = this.volume;
    this.gainNode.connect(ctx.destination);

    switch (trackName) {
      case 'landing': this._playLanding(ctx); break;
      case 'home':    this._playHome(ctx);    break;
      case 'caro':    this._playCaro(ctx);    break;
      case 'chess':   this._playChess(ctx);   break;
      case 'taixiu':  this._playTaiXiu(ctx);  break;
      default: break;
    }
  }

  // ── Landing: lo-fi chill, pentatonic melody + pad ──────────────────────
  _playLanding(ctx) {
    // Pentatonic scale: A3 C4 D4 E4 G4 A4
    const melody = [220, 261.6, 293.7, 329.6, 392, 440, 392, 329.6, 293.7, 261.6, 220, 0, 0, 0];
    const pad    = [[110, 138.6, 164.8], [130.8, 164.8, 196], [146.8, 185, 220], [130.8, 155.6, 196]];
    const bpm = 75;
    const beat = 60 / bpm;
    let step = 0, padStep = 0;

    // Melody
    const melodyTick = () => {
      if (!this.playing || this.currentTrack !== 'landing') return;
      const freq = melody[step % melody.length];
      if (freq > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g); g.connect(this.gainNode);
        const now = ctx.currentTime;
        g.gain.linearRampToValueAtTime(0.18, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 1.8);
        o.start(now); o.stop(now + beat * 2);
        this.nodes.push(o);
      }
      step++;
      setTimeout(melodyTick, beat * 1000);
    };

    // Pad chords every 4 beats
    const padTick = () => {
      if (!this.playing || this.currentTrack !== 'landing') return;
      const chord = pad[padStep % pad.length];
      chord.forEach(freq => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g); g.connect(this.gainNode);
        const now = ctx.currentTime;
        g.gain.linearRampToValueAtTime(0.12, now + 0.3);
        g.gain.linearRampToValueAtTime(0.08, now + beat * 3);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 4.2);
        o.start(now); o.stop(now + beat * 4.5);
        this.nodes.push(o);
      });
      padStep++;
      setTimeout(padTick, beat * 4000);
    };

    melodyTick();
    padTick();
  }

  // ── Home: chill lounge, jazz-influenced melody ──────────────────────────
  _playHome(ctx) {
    // Jazz-ish melody: Cmaj7 feel
    const melody = [261.6, 329.6, 392, 440, 392, 349.2, 329.6, 293.7,
                    261.6, 220, 246.9, 261.6, 293.7, 329.6, 0, 0];
    // Bass: walking
    const bass   = [65.4, 73.4, 82.4, 87.3, 98, 87.3, 82.4, 73.4,
                    65.4, 61.7, 65.4, 73.4, 82.4, 87.3, 98, 87.3];
    const bpm = 95;
    const beat = 60 / bpm;
    let step = 0;

    const tick = () => {
      if (!this.playing || this.currentTrack !== 'home') return;
      const now = ctx.currentTime;
      const s = step % melody.length;

      // Melody note
      if (melody[s] > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = melody[s];
        g.gain.value = 0;
        o.connect(g); g.connect(this.gainNode);
        g.gain.linearRampToValueAtTime(0.14, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 1.6);
        o.start(now); o.stop(now + beat * 1.8);
        this.nodes.push(o);
      }

      // Bass note
      const bo = ctx.createOscillator();
      const bg = ctx.createGain();
      bo.type = 'sine';
      bo.frequency.value = bass[s];
      bg.gain.value = 0;
      bo.connect(bg); bg.connect(this.gainNode);
      bg.gain.linearRampToValueAtTime(0.22, now + 0.02);
      bg.gain.exponentialRampToValueAtTime(0.001, now + beat * 0.85);
      bo.start(now); bo.stop(now + beat);
      this.nodes.push(bo);

      // Chord stab every 4 beats
      if (s % 4 === 0) {
        [[261.6, 329.6, 392, 493.9], [246.9, 311.1, 369.9, 493.9]][Math.floor(s/4) % 2]
          .forEach(f => {
            const co = ctx.createOscillator();
            const cg = ctx.createGain();
            co.type = 'sawtooth';
            co.frequency.value = f;
            cg.gain.value = 0;
            co.connect(cg); cg.connect(this.gainNode);
            cg.gain.linearRampToValueAtTime(0.05, now + 0.01);
            cg.gain.exponentialRampToValueAtTime(0.001, now + beat * 1.2);
            co.start(now); co.stop(now + beat * 1.3);
            this.nodes.push(co);
          });
      }

      step++;
      setTimeout(tick, beat * 1000);
    };
    tick();
  }

  // ── Caro: tense, minimalist ─────────────────────────────────────────────
  _playCaro(ctx) {
    const melody = [220, 246.9, 261.6, 246.9, 220, 196, 220, 0];
    const bpm = 90;
    const beat = 60 / bpm;
    let step = 0;

    const tick = () => {
      if (!this.playing || this.currentTrack !== 'caro') return;
      const freq = melody[step % melody.length];
      if (freq > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.value = 0;
        o.connect(g);
        g.connect(this.gainNode);
        const now = ctx.currentTime;
        g.gain.linearRampToValueAtTime(0.12, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 0.7);
        o.start(now);
        o.stop(now + beat);
        this.nodes.push(o);
      }
      step++;
      setTimeout(tick, beat * 1000);
    };
    tick();

    // Drone bass
    const drone = ctx.createOscillator();
    const dg = ctx.createGain();
    drone.type = 'sine';
    drone.frequency.value = 55;
    dg.gain.value = 0.15;
    drone.connect(dg);
    dg.connect(this.gainNode);
    drone.start();
    this.nodes.push(drone);
  }

  // ── Chess: classical, stately ───────────────────────────────────────────
  _playChess(ctx) {
    // Already has move sounds — just a subtle ambient pad
    const notes = [130.8, 164.8, 196, 261.6, 196, 164.8];
    const bpm = 72;
    const beat = 60 / bpm;
    let step = 0;

    const tick = () => {
      if (!this.playing || this.currentTrack !== 'chess') return;
      const freq = notes[step % notes.length];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0;
      o.connect(g);
      g.connect(this.gainNode);
      const now = ctx.currentTime;
      g.gain.linearRampToValueAtTime(0.18, now + 0.1);
      g.gain.linearRampToValueAtTime(0.12, now + beat * 1.5);
      g.gain.exponentialRampToValueAtTime(0.001, now + beat * 2);
      o.start(now);
      o.stop(now + beat * 2 + 0.1);
      this.nodes.push(o);
      step++;
      setTimeout(tick, beat * 2000);
    };
    tick();
  }

  // ── TaiXiu: upbeat, casino energy ──────────────────────────────────────
  _playTaiXiu(ctx) {
    const bpm = 128;
    const beat = 60 / bpm;
    let step = 0;

    // Kick drum pattern: 1 0 0 0 1 0 0 0
    const kick = [1, 0, 0, 0, 1, 0, 0, 0];
    // Hi-hat: every 2 steps
    const hat = [1, 1, 1, 1, 1, 1, 1, 1];
    // Bass line
    const bass = [98, 0, 98, 0, 110, 0, 98, 0];

    const tick = () => {
      if (!this.playing || this.currentTrack !== 'taixiu') return;
      const now = ctx.currentTime;
      const s = step % 8;

      // Kick
      if (kick[s]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(150, now);
        o.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        o.connect(g); g.connect(this.gainNode);
        o.start(now); o.stop(now + 0.25);
        this.nodes.push(o);
      }

      // Hi-hat
      if (hat[s]) {
        const bufSize = Math.floor(ctx.sampleRate * 0.05);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const hg = ctx.createGain();
        const hf = ctx.createBiquadFilter();
        hf.type = 'highpass';
        hf.frequency.value = 8000;
        src.connect(hf); hf.connect(hg); hg.connect(this.gainNode);
        hg.gain.setValueAtTime(0.06, now);
        hg.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        src.start(now); src.stop(now + 0.06);
        this.nodes.push(src);
      }

      // Bass
      if (bass[s]) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = bass[s];
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + beat * 0.9);
        o.connect(g); g.connect(this.gainNode);
        o.start(now); o.stop(now + beat);
        this.nodes.push(o);
      }

      step++;
      setTimeout(tick, beat * 1000);
    };
    tick();
  }
}

// Singleton
export const bgMusic = new BgMusicPlayer();

// ── React hook ────────────────────────────────────────────────────────────

export const useBgMusic = (trackName) => {
  const trackRef = useRef(trackName);
  trackRef.current = trackName;

  useEffect(() => {
    // Chờ user interaction trước khi play (browser policy)
    const startMusic = () => {
      bgMusic.play(trackRef.current);
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
    };

    // Nếu AudioContext đã resume (user đã interact), play ngay
    const ctx = getCtx();
    if (ctx && ctx.state === 'running') {
      bgMusic.play(trackName);
    } else {
      document.addEventListener('click', startMusic, { once: true });
      document.addEventListener('keydown', startMusic, { once: true });
    }

    return () => {
      document.removeEventListener('click', startMusic);
      document.removeEventListener('keydown', startMusic);
      bgMusic.stop();
    };
  }, [trackName]);

  return {
    setVolume: (v) => bgMusic.setVolume(v),
    stop: () => bgMusic.stop(),
  };
};
