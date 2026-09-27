import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

// Short, infrequent effects that support the visuals and are never the only
// feedback. They mix with the user's own music and respect the silent switch
// (Apple HIG), and can be muted in-app.
const SOURCES = {
  reveal: require('@/assets/sounds/reveal.wav'),
  stamp: require('@/assets/sounds/stamp.wav'),
  win: require('@/assets/sounds/win.wav'),
} as const;

export type Sound = keyof typeof SOURCES;

let enabled = true;
let ready = false;
/** A few players per sound, used in turn, so quick repeat presses can overlap. */
const POOL = 3;
const players: Partial<Record<Sound, AudioPlayer[]>> = {};
const next: Partial<Record<Sound, number>> = {};

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

/**
 * Load every sound up front. Creating a player on first use means the first
 * press waits for the file to load, which is audible as lag.
 */
export function preloadSounds() {
  if (ready) return;
  ready = true;
  try {
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    for (const sound of Object.keys(SOURCES) as Sound[]) {
      players[sound] = Array.from({ length: POOL }, () => createAudioPlayer(SOURCES[sound]));
    }
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

export function play(sound: Sound) {
  if (!enabled) return;
  try {
    preloadSounds();
    const pool = players[sound];
    if (!pool) return;
    const i = next[sound] ?? 0;
    next[sound] = (i + 1) % pool.length;
    const player = pool[i];
    // A finished player sits at the end of the clip. Playing before the rewind
    // completes ends immediately (silence on every other press), so wait for it.
    // A fresh player is already at 0 and plays straight away.
    if (player.currentTime > 0) {
      player
        .seekTo(0)
        .then(() => player.play())
        .catch(() => {});
    } else {
      player.play();
    }
  } catch {
    // Ignore: sound must never break the game.
  }
}
