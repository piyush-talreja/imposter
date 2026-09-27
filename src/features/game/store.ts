import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { WORDS } from '@/features/words/words';

import {
  DEFAULT_SETTINGS,
  newRound,
  scoreRound,
  type Player,
  type Round,
  type RoundScore,
  type Settings,
} from './engine';

/** Remember this many recent words so a session doesn't repeat itself. */
const USED_WORD_MEMORY = 80;

type GameState = {
  players: Player[];
  settings: Settings;
  scores: Record<string, number>;
  imposterHistory: Record<string, number>;
  usedWords: string[];
  roundsPlayed: number;
  round: Round | null;
  lastRoundScore: RoundScore | null;

  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  startRound: () => void;
  castVote: (voterId: string, suspectId: string) => void;
  setGuess: (imposterId: string, guessed: boolean) => void;
  finishRound: () => void;
  endGame: () => void;
};

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      players: [],
      settings: DEFAULT_SETTINGS,
      scores: {},
      imposterHistory: {},
      usedWords: [],
      roundsPlayed: 0,
      round: null,
      lastRoundScore: null,

      addPlayer: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((s) => ({ players: [...s.players, { id: newId(), name: trimmed }] }));
      },

      removePlayer: (id) =>
        set((s) => {
          const { [id]: _score, ...scores } = s.scores;
          const { [id]: _history, ...imposterHistory } = s.imposterHistory;
          return { players: s.players.filter((p) => p.id !== id), scores, imposterHistory };
        }),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      startRound: () => {
        const { players, settings, usedWords, imposterHistory } = get();
        const round = newRound({ players, settings, words: WORDS, usedWords, imposterHistory });
        set({ round, lastRoundScore: null });
      },

      castVote: (voterId, suspectId) =>
        set((s) =>
          s.round ? { round: { ...s.round, votes: { ...s.round.votes, [voterId]: suspectId } } } : {},
        ),

      setGuess: (imposterId, guessed) =>
        set((s) =>
          s.round ? { round: { ...s.round, guesses: { ...s.round.guesses, [imposterId]: guessed } } } : {},
        ),

      finishRound: () => {
        const { round, players, settings, scores, imposterHistory, usedWords, roundsPlayed } = get();
        if (!round) return;
        const roundScore = scoreRound(round, players);
        const nextScores = { ...scores };
        if (settings.scoring) {
          for (const [id, { points }] of Object.entries(roundScore)) {
            nextScores[id] = (nextScores[id] ?? 0) + points;
          }
        }
        const nextHistory = { ...imposterHistory };
        for (const id of round.imposterIds) nextHistory[id] = (nextHistory[id] ?? 0) + 1;
        set({
          scores: nextScores,
          imposterHistory: nextHistory,
          usedWords: [round.word, ...usedWords].slice(0, USED_WORD_MEMORY),
          roundsPlayed: roundsPlayed + 1,
          lastRoundScore: roundScore,
        });
      },

      endGame: () =>
        set({ round: null, scores: {}, imposterHistory: {}, roundsPlayed: 0, lastRoundScore: null }),
    }),
    {
      name: 'imposter-game',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

export const playerName = (players: Player[], id: string) =>
  players.find((p) => p.id === id)?.name ?? 'Someone';
