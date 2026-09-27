import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { WORDS } from '@/features/words/words';
import { setSoundEnabled } from '@/lib/sound';

import {
  DEFAULT_SETTINGS,
  eliminate,
  newGame,
  nextRound,
  resolveGuess,
  scoreGame,
  totalPoints,
  type Game,
  type Player,
  type ScoreLine,
  type Settings,
} from './engine';

/** Remember this many recent words so a session doesn't repeat itself. */
const USED_WORD_MEMORY = 80;

type GameState = {
  players: Player[];
  settings: Settings;
  scores: Record<string, number>;
  /** Times each player has been an infiltrator, for fair rotation. */
  history: Record<string, number>;
  usedWords: string[];
  game: Game | null;
  /** Everyone has seen their card for the current game. */
  dealt: boolean;
  /** Points awarded by the most recently finished game (null until it's tallied). */
  lastPoints: Record<string, ScoreLine[]> | null;
  /** In-app mute for sound effects. */
  sound: boolean;

  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startGame: () => void;
  markDealt: () => void;
  eliminatePlayer: (id: string) => void;
  guess: (text: string, overrideCorrect?: boolean) => void;
  continueRound: () => void;
  resetScores: () => void;
  setSound: (on: boolean) => void;
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      /** Once a game is over (bonus round included), bank its points exactly once. */
      const settle = (game: Game) => {
        if (!game.over) return set({ game });
        const { scores, settings, history, usedWords } = get();
        const points = scoreGame(game);
        const nextScores = { ...scores };
        if (settings.scoring)
          for (const [id, lines] of Object.entries(points))
            nextScores[id] = (nextScores[id] ?? 0) + totalPoints(lines);
        const nextHistory = { ...history };
        for (const [id, role] of Object.entries(game.roles)) {
          if (role !== 'villager') nextHistory[id] = (nextHistory[id] ?? 0) + 1;
        }
        set({
          game,
          scores: nextScores,
          history: nextHistory,
          usedWords: [game.word, ...usedWords].slice(0, USED_WORD_MEMORY),
          lastPoints: points,
        });
      };

      return {
        players: [],
        settings: DEFAULT_SETTINGS,
        scores: {},
        history: {},
        usedWords: [],
        game: null,
        dealt: false,
        lastPoints: null,
        sound: true,

        addPlayer: (name) => {
          const trimmed = name.trim();
          if (!trimmed) return;
          set((s) => ({ players: [...s.players, { id: newId(), name: trimmed }] }));
        },

        removePlayer: (id) =>
          set((s) => {
            const { [id]: _score, ...scores } = s.scores;
            const { [id]: _history, ...history } = s.history;
            return { players: s.players.filter((p) => p.id !== id), scores, history };
          }),

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

        startGame: () => {
          const { players, settings, usedWords, history } = get();
          set({
            game: newGame({ players, settings, words: WORDS, usedWords, history }),
            dealt: false,
            lastPoints: null,
          });
        },

        markDealt: () => set({ dealt: true }),

        eliminatePlayer: (id) => {
          const { game } = get();
          if (game) settle(eliminate(game, id));
        },

        guess: (text, overrideCorrect) => {
          const { game } = get();
          if (game) settle(resolveGuess(game, text, overrideCorrect));
        },

        continueRound: () => {
          const { game } = get();
          if (game) set({ game: nextRound(game) });
        },

        resetScores: () => set({ scores: {}, history: {}, lastPoints: null }),

        setSound: (on) => {
          setSoundEnabled(on);
          set({ sound: on });
        },
      };
    },
    {
      name: 'imposter-game',
      // v4: two-stage scoring (team win, still-in bonus); games gained `survivors`.
      version: 4,
      migrate: (persisted) => {
        const old = persisted as { players?: Player[] };
        return { players: old.players ?? [], settings: DEFAULT_SETTINGS } as Partial<GameState>;
      },
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => setSoundEnabled(state?.sound ?? true),
    },
  ),
);

export const playerName = (players: Player[], id: string) =>
  players.find((p) => p.id === id)?.name ?? 'Someone';
