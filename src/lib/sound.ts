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
const players: Partial<Record<Sound, AudioPlayer>> = {};

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
    for (const sound of Object.keys(SOURCES) as Sound[]) players[sound] = createAudioPlayer(SOURCES[sound]);
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}

export function play(sound: Sound) {
  if (!enabled) return;
  try {
    preloadSounds();
    const player = players[sound];
    if (!player) return;
    // Only rewind when it has played before; a seek before the first play adds delay.
    if (player.currentTime > 0) player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Ignore: sound must never break the game.
  }
}
