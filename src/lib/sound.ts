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
let configured = false;
const players: Partial<Record<Sound, AudioPlayer>> = {};

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

export function play(sound: Sound) {
  if (!enabled) return;
  try {
    if (!configured) {
      configured = true;
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    const player = (players[sound] ??= createAudioPlayer(SOURCES[sound]));
    player.seekTo(0).catch(() => {});
    player.play();
  } catch {
    // Sound is a nice-to-have; never let it break the game.
  }
}
