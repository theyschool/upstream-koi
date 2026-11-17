// Procedural sound for the river: no audio files, everything is synthesised
// with WebAudio when the player first interacts. A soft pad hums underneath,
// pearls pluck, a hit thuds, a dash whooshes and a finished reach chimes.

const PLUCK_NOTES = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

/** A slow pentatonic melody over the pad: a note wanders up and down. */
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let padStarted = false;
  let melodyStep = 2;
  let melodyTimer = null;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function startPad() {
    if (padStarted || !ensure()) return;
    padStarted = true;
    const now = context.currentTime;
    for (const [freq, vol] of [[110, 0.05], [164.81, 0.035], [220, 0.025]]) {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      lfo.frequency.value = 0.07 + freq / 4000;
      lfoGain.gain.value = vol * 0.5;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(master);
      osc.start(now);
      lfo.start(now);
    }
  }

  function startMelody() {
    if (melodyTimer !== null) return;
    const playNext = () => {
      melodyStep = Math.max(0, Math.min(MELODY.length - 1,
        melodyStep + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      if (Math.random() < 0.7) {
        tone(MELODY[melodyStep], 1.4, 'sine', 0.045);
        if (Math.random() < 0.25) tone(MELODY[melodyStep] * 2, 0.9, 'sine', 0.02);
      }
      melodyTimer = setTimeout(playNext, 850);
    };
    melodyTimer = setTimeout(playNext, 1200);
  }

  return {
    /** Call on the first gesture; unlocks the context and starts the pad. */
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume();
      startPad();
      startMelody();
    },
    pluck(combo) {
      const note = PLUCK_NOTES[Math.min(combo, PLUCK_NOTES.length - 1)];
      tone(note, 0.35, 'triangle', 0.22);
      tone(note * 2, 0.2, 'sine', 0.08);
    },
    golden() {
      tone(1046.5, 0.5, 'triangle', 0.2);
      tone(1318.5, 0.6, 'triangle', 0.16);
    },
    lotus() {
      tone(392, 0.4, 'sine', 0.18);
      tone(587.33, 0.5, 'sine', 0.14);
    },
    thud() {
      tone(140, 0.3, 'sine', 0.4, 55);
    },
    dash() {
      tone(320, 0.25, 'sawtooth', 0.07, 720);
    },
    near() {
      tone(1567.98, 0.12, 'sine', 0.1);
    },
    chime() {
      for (const [i, freq] of [523.25, 659.25, 783.99, 1046.5].entries()) {
        setTimeout(() => tone(freq, 0.7, 'triangle', 0.16), i * 110);
      }
    },
    toggleMuted() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
