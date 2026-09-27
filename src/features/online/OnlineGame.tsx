import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Character, LOOK_FOR_ROLE } from '@/components/Character';
import { Body, Button, Card, Confetti, Label, Pop, RoleMark, Screen, Sticker } from '@/components/ui';
import { totalPoints, type Card as CardData, type Role } from '@/features/game/engine';
import { type PublicView } from '@/features/game/online';
import { SecretCard } from '@/features/game/SecretCard';
import { play } from '@/lib/sound';
import { OUTLINE, ROLE_META, SHADOW, TOUCH, colors, fonts, radius, size, space } from '@/theme/tokens';

import { friendlyError } from './errors';
import { fetchMyCard, gameAction, leaveRoom, type GameAction } from './rooms';
import { type Room, type RoomPlayer } from './types';
import { type Connection } from './useRoom';

const LEAVE = {
  title: 'Leave the game?',
  message: 'You can rejoin with the room code while the room is open.',
  confirmLabel: 'Leave',
};
const NEUTRAL = '#7A6EB8';

type Props = {
  roomId: string;
  me: string;
  room: Room;
  players: RoomPlayer[];
  game: PublicView;
  /** Everyone who has been in the room, so players who left keep their names. */
  names?: Record<string, string>;
  connection?: Connection;
};

/** Every online phase, for every seat: your turn or not, host or not, in or out. */
export function OnlineGame({
  roomId,
  me,
  room,
  players,
  game,
  names: allNames = {},
  connection = 'online',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const names = useMemo(
    () => ({ ...allNames, ...Object.fromEntries(players.map((p) => [p.user_id, p.name])) }),
    [players, allNames],
  );
  const name = (id: string | null | undefined) => (id ? (names[id] ?? 'Someone') : 'Someone');
  const isHost = room.host_id === me;
  const out = game.eliminated.some((e) => e.id === me);
  const inGame = game.order.includes(me);
  const aliveIds = game.order.filter((id) => !game.eliminated.some((e) => e.id === id));
  const bonus = game.winner === 'villagers' && !game.finished;
  // The reveal that catches the imposter still belongs to the main round.
  const caughtNow =
    game.phase === 'reveal' && game.eliminated.find((e) => e.id === game.result?.out)?.role === 'imposter';
  const bonusRound = bonus && !caughtNow;

  const send = async (a: GameAction) => {
    setBusy(true);
    setError(null);
    try {
      await gameAction(roomId, a);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  };
  const leave = async () => {
    await leaveRoom(roomId).catch(() => {});
    router.dismissTo('/online');
  };

  const footerNote = (text: string) => (
    <View style={styles.center}>
      <Label>{text}</Label>
    </View>
  );
  const errorLine = error ? <Text style={styles.error}>{error}</Text> : null;
  const screen = (content: React.ReactNode, footer?: React.ReactNode, title?: string) => (
    <Screen
      kicker={
        game.phase === 'deal'
          ? 'DEALING'
          : game.over
            ? 'GAME OVER'
            : `${bonusRound ? 'BONUS ROUND' : 'ROUND'} ${game.round}`
      }
      title={title}
      backLabel="Leave"
      onBack={leave}
      confirmBack={LEAVE}
      footer={
        footer || errorLine ? (
          <>
            {errorLine}
            {footer}
          </>
        ) : undefined
      }
    >
      {connection === 'reconnecting' ? (
        <View style={styles.banner} accessibilityLiveRegion="polite">
          <Text style={styles.bannerText}>Offline. Reconnecting…</Text>
        </View>
      ) : null}
      {content}
    </Screen>
  );

  // Joined mid-game: watch until the next one.
  if (!inGame) {
    return screen(
      <Card style={styles.center}>
        <Character color={NEUTRAL} size={72} />
        <Text style={styles.big}>Game in progress</Text>
        <Body style={styles.muted}>You’ll be dealt into the next game.</Body>
      </Card>,
    );
  }

  // ---------------------------------------------------------------- deal
  if (game.phase === 'deal') {
    return (
      <Deal
        roomId={roomId}
        game={game}
        me={me}
        busy={busy}
        onReady={() => send({ action: 'seen' })}
        screen={screen}
      />
    );
  }

  const stillIn = (
    <View style={styles.statusRow}>
      <StillIn game={game} name={name} />
      {!out ? <PeekWord key={room.current_game ?? ''} roomId={roomId} /> : null}
    </View>
  );
  const timer = <Timer roomId={roomId} game={game} />;
  const outBanner = out ? (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>You’re out. Watch the rest!</Text>
    </View>
  ) : null;

  // ---------------------------------------------------------------- clues
  if (game.phase === 'clues') {
    const mine = game.speaker === me;
    return screen(
      <>
        {outBanner}
        {stillIn}
        {timer}
        <Pop key={`${game.round}-${game.speaker}`}>
          <Card color={mine ? colors.pink : colors.surface} style={styles.center}>
            <Label color={mine ? colors.white : colors.textSoft}>
              {mine ? 'Your turn' : 'Giving a clue'}
            </Label>
            <Text style={[styles.big, mine && { color: colors.white }]} numberOfLines={1}>
              {mine ? 'One word' : name(game.speaker)}
            </Text>
            {mine && game.mode === 'spoken' ? (
              <Body style={[styles.center, { color: colors.white }]}>
                Say your clue out loud, then tap Done.
              </Body>
            ) : null}
          </Card>
        </Pop>
        {mine && game.mode === 'typed' ? (
          <ClueInput busy={busy} onSend={(text) => send({ action: 'clue', text })} />
        ) : null}
        <ClueBoard game={game} name={name} />
      </>,
      <>
        {mine && game.mode === 'spoken' ? (
          <Button label="Done" onPress={() => send({ action: 'clue', text: '' })} disabled={busy} />
        ) : null}
        {isHost && !mine ? (
          <Button
            label={`Skip ${name(game.speaker)}`}
            variant="ghost"
            onPress={() => send({ action: 'skip' })}
            disabled={busy}
          />
        ) : null}
      </>,
      'Clues',
    );
  }

  // ---------------------------------------------------------------- discuss
  if (game.phase === 'discuss') {
    return screen(
      <>
        {outBanner}
        {stillIn}
        <Body style={styles.muted}>
          {out ? 'Watch them argue it out.' : 'Tap a clue that seems off. Everyone sees the count.'}
        </Body>
        <ClueBoard
          game={game}
          name={name}
          canSuspect={!out}
          me={me}
          onSuspect={(clueBy) => send({ action: 'suspect', clueBy })}
        />
      </>,
      isHost ? (
        <Button label="Start the vote" onPress={() => send({ action: 'open-vote' })} disabled={busy} />
      ) : (
        footerNote('The host opens the vote')
      ),
      bonus ? 'Find the Undercover' : 'Discuss',
    );
  }

  // ---------------------------------------------------------------- vote
  if (game.phase === 'vote') {
    return (
      <Vote
        game={game}
        me={me}
        out={out}
        aliveIds={aliveIds}
        name={name}
        busy={busy}
        onVote={(target) => send({ action: 'vote', target })}
        screen={screen}
        banner={outBanner}
        header={
          <>
            {stillIn}
            {timer}
          </>
        }
      />
    );
  }

  // ---------------------------------------------------------------- guess
  if (game.phase === 'guess') {
    const mine = game.pendingGuess === me;
    return (
      <Guess
        mine={mine}
        guesser={name(game.pendingGuess)}
        busy={busy}
        onGuess={(text) => send({ action: 'guess', text })}
        screen={screen}
      />
    );
  }

  // ---------------------------------------------------------------- reveal
  if (game.phase === 'reveal') {
    const r = game.result;
    const role = r?.out ? game.eliminated.find((e) => e.id === r.out)?.role : undefined;
    const imposterJustCaught = role === 'imposter' && game.winner === 'villagers' && !game.finished;
    const nextLabel = game.finished
      ? 'See results'
      : imposterJustCaught
        ? 'Start bonus round'
        : `Round ${game.round + 1}`;
    return screen(
      <>
        <Pop>
          <Card style={styles.center}>
            {r && !r.out ? (
              <>
                <Text style={styles.big}>It’s a tie</Text>
                <Body style={styles.muted}>Nobody is out. Another round of clues.</Body>
              </>
            ) : (
              <>
                <Text style={styles.big}>{name(r?.out)}</Text>
                {role ? (
                  <>
                    <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={80} />
                    <View style={styles.stickerSlot}>
                      <Confetti delay={500} />
                      <Sticker
                        text={ROLE_META[role].label}
                        color={ROLE_META[role].color}
                        angle={-6}
                        delay={400}
                        fontSize={36}
                      />
                    </View>
                  </>
                ) : null}
                {game.lastGuess ? (
                  <View style={styles.row}>
                    <Body style={styles.muted}>Guessed “{game.lastGuess.text}”</Body>
                    <View
                      style={[styles.verdict, game.lastGuess.correct && { backgroundColor: colors.pink }]}
                    >
                      <Text style={styles.verdictText}>{game.lastGuess.correct ? 'Correct' : 'Wrong'}</Text>
                    </View>
                  </View>
                ) : role === 'villager' ? (
                  <Body style={styles.muted}>Innocent.</Body>
                ) : null}
              </>
            )}
          </Card>
        </Pop>
        {imposterJustCaught ? (
          <Card style={styles.bonus}>
            <RoleMark role="undercover" size={32} />
            <View style={styles.fill}>
              <Text style={styles.bonusTitle}>An Undercover is still in</Text>
              <Body style={styles.muted}>Catch them for bonus points.</Body>
            </View>
          </Card>
        ) : null}
      </>,
      isHost ? (
        <Button label={nextLabel} onPress={() => send({ action: 'continue' })} disabled={busy} />
      ) : (
        footerNote('Waiting for the host')
      ),
    );
  }

  // ---------------------------------------------------------------- over
  return (
    <Over
      game={game}
      room={room}
      players={players}
      isHost={isHost}
      busy={busy}
      onLobby={() => send({ action: 'back-to-lobby' })}
      screen={screen}
    />
  );
}

// ================================================================ pieces

type ScreenFn = (content: React.ReactNode, footer?: React.ReactNode, title?: string) => React.ReactElement;

function StillIn({ game, name }: { game: PublicView; name: (id: string) => string }) {
  const outCount = (role: Role) => game.eliminated.filter((e) => e.role === role).length;
  const items = [
    { role: 'imposter' as const, n: game.roleCounts.imposter - outCount('imposter') },
    { role: 'undercover' as const, n: game.roleCounts.undercover - outCount('undercover') },
  ].filter((i) => i.n > 0);
  if (!items.length && !game.left.length) return null;
  return (
    <View style={styles.stillIn}>
      <Label>Still in</Label>
      {items.map((i) => (
        <View key={i.role} style={styles.chip}>
          <RoleMark role={i.role} size={14} />
          <Text style={styles.chipText}>
            {i.n} {ROLE_META[i.role].label}
            {i.n > 1 ? 's' : ''}
          </Text>
        </View>
      ))}
      {game.left.length ? <Label>Left: {game.left.map(name).join(', ')}</Label> : null}
    </View>
  );
}

/**
 * Countdown for a timed clue turn or vote. When it hits zero this phone asks the
 * server to move on (every phone does; the server's clock decides, and the first
 * request wins). Server time in the view corrects for a phone's clock being off.
 */
function Timer({ roomId, game }: { roomId: string; game: PublicView }) {
  const [offset] = useState(() => (game.serverTime ? game.serverTime - Date.now() : 0));
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!game.deadline) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [game.deadline]);

  const left = game.deadline ? Math.ceil((game.deadline - (now + offset)) / 1000) : null;
  useEffect(() => {
    if (left === null || left > 0) return;
    // Retry every couple of seconds until the phase moves on.
    gameAction(roomId, { action: 'tick' }).catch(() => {});
  }, [roomId, left === null ? null : Math.floor(Math.min(left, 0) / 2)]); // eslint-disable-line react-hooks/exhaustive-deps

  if (left === null) return null;
  const secs = Math.max(0, left);
  return (
    <View
      style={[styles.timer, secs <= 5 && styles.timerLow]}
      accessibilityRole="timer"
      accessibilityLabel={`${secs} seconds left`}
    >
      <Text style={styles.timerText}>
        {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
      </Text>
    </View>
  );
}

/** Forgot your word? Hold to peek, let go to hide. Fetched privately, once per game (keyed by game). */
function PeekWord({ roomId }: { roomId: string }) {
  const [card, setCard] = useState<CardData | null>(null);
  const [showing, setShowing] = useState(false);
  useEffect(() => {
    fetchMyCard(roomId)
      .then(setCard)
      .catch(() => {});
  }, [roomId]);
  if (!card) return null;
  const word = card.kind === 'word' ? card.word : 'Imposter';
  return (
    <Pressable
      onPressIn={() => setShowing(true)}
      onPressOut={() => setShowing(false)}
      onLongPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel={showing ? `Your word: ${word}` : 'Hold to see your word'}
      style={[styles.peek, showing && styles.peekOn]}
    >
      <Text style={styles.peekText} selectable={false}>
        {showing ? word : 'Hold: your word'}
      </Text>
    </Pressable>
  );
}

function Deal({
  roomId,
  game,
  me,
  busy,
  onReady,
  screen,
}: {
  roomId: string;
  game: PublicView;
  me: string;
  busy: boolean;
  onReady: () => void;
  screen: ScreenFn;
}) {
  const [card, setCard] = useState<CardData | null>(null);
  const [looked, setLooked] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ready = game.seen.includes(me);

  useEffect(() => {
    fetchMyCard(roomId)
      .then(setCard)
      .catch((e) => setLoadError(friendlyError(e)));
  }, [roomId]);

  const progress = (
    <View style={styles.dots} accessibilityLabel={`${game.seen.length} of ${game.order.length} ready`}>
      {game.order.map((id) => (
        <View key={id} style={[styles.dot, game.seen.includes(id) && styles.dotDone]} />
      ))}
    </View>
  );

  if (ready) {
    return screen(
      <Card style={styles.center}>
        <Character color={NEUTRAL} size={72} />
        <Text style={styles.big}>Ready</Text>
        <Body style={styles.muted}>
          Waiting for everyone to see their card · {game.seen.length} of {game.order.length}
        </Body>
        {progress}
      </Card>,
    );
  }

  return screen(
    <>
      {progress}
      {card ? (
        <SecretCard card={card} onSeen={() => setLooked(true)} />
      ) : (
        <Card style={styles.center}>
          <Body style={styles.muted}>{loadError ?? 'Getting your card…'}</Body>
        </Card>
      )}
      <View style={styles.center}>
        <Label>Only you can see this. Hold the card to peek.</Label>
      </View>
    </>,
    <Button label="I’ve seen it" onPress={onReady} disabled={!looked || busy} />,
    'Your card',
  );
}

function ClueInput({ busy, onSend }: { busy: boolean; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim()) return;
    onSend(text.trim());
  };
  return (
    <View style={styles.inputRow}>
      <TextInput
        value={text}
        onChangeText={(t) => setText(t.replace(/\s/g, ''))}
        onSubmitEditing={submit}
        placeholder="Your clue"
        placeholderTextColor={colors.textSoft}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={24}
        returnKeyType="send"
        accessibilityLabel="Your clue, one word"
        style={styles.input}
      />
      <Button label="Send" onPress={submit} disabled={busy || !text.trim()} style={styles.sendButton} />
    </View>
  );
}

/** The clues so far, newest round first. In discussion, tap a clue to mark it suspicious. */
function ClueBoard({
  game,
  name,
  canSuspect = false,
  me,
  onSuspect,
}: {
  game: PublicView;
  name: (id: string) => string;
  canSuspect?: boolean;
  me?: string;
  onSuspect?: (clueBy: string | null) => void;
}) {
  // The server only publishes counts; remember our own pick locally for highlighting.
  const [picked, setPicked] = useState<string | null>(null);
  const rounds = [...new Set(game.clues.map((c) => c.round))].sort((a, b) => b - a);
  if (!game.clues.length) return null;

  return (
    <Card badge="Clues">
      {rounds.map((round) => (
        <View key={round} style={styles.clueRound}>
          {rounds.length > 1 ? <Label>Round {round}</Label> : null}
          {game.clues
            .filter((c) => c.round === round)
            .map((c) => {
              const current = round === game.round;
              const count = current ? (game.suspicion[c.by] ?? 0) : 0;
              const tappable = canSuspect && current && c.by !== me && !!onSuspect;
              const mine = picked === c.by && current;
              return (
                <Pressable
                  key={`${round}-${c.by}`}
                  disabled={!tappable}
                  onPress={() => {
                    const next = mine ? null : c.by;
                    setPicked(next);
                    onSuspect?.(next);
                  }}
                  accessibilityRole={tappable ? 'button' : 'text'}
                  accessibilityLabel={`${name(c.by)}: ${c.text ?? 'spoken'}${count ? `, ${count} suspicious` : ''}`}
                  accessibilityState={tappable ? { selected: mine } : undefined}
                  style={[styles.clue, mine && styles.clueMine, !current && styles.cluePast]}
                >
                  <Text style={styles.clueName} numberOfLines={1}>
                    {name(c.by)}
                  </Text>
                  <Text style={[styles.clueText, !c.text && styles.muted]} numberOfLines={1}>
                    {c.text ?? (game.mode === 'spoken' ? 'said it out loud' : 'skipped')}
                  </Text>
                  {count ? (
                    <View style={styles.sus}>
                      <Text style={styles.susText}>{count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
        </View>
      ))}
    </Card>
  );
}

function Vote({
  game,
  me,
  out,
  aliveIds,
  name,
  busy,
  onVote,
  screen,
  banner,
  header,
}: {
  game: PublicView;
  me: string;
  out: boolean;
  aliveIds: string[];
  name: (id: string) => string;
  busy: boolean;
  onVote: (target: string) => void;
  screen: ScreenFn;
  banner: React.ReactNode;
  header?: React.ReactNode;
}) {
  const [choice, setChoice] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);
  const voted = game.voted.includes(me);
  const tally = `${game.voted.length} of ${aliveIds.length} voted`;

  if (out || (voted && !changing)) {
    return screen(
      <>
        {banner}
        {header}
        <Card style={styles.center}>
          <Character color={NEUTRAL} size={72} />
          <Text style={styles.big}>{out ? 'Voting' : 'Vote in'}</Text>
          <Body style={styles.muted}>{tally}. The result appears when everyone has voted.</Body>
        </Card>
      </>,
      voted && !out ? (
        <Button label="Change my vote" variant="ghost" onPress={() => setChanging(true)} />
      ) : undefined,
      'Vote',
    );
  }

  return screen(
    <>
      {header}
      <Label>{tally} · your vote is secret</Label>
      <View style={styles.grid}>
        {aliveIds
          .filter((id) => id !== me)
          .map((id, i) => {
            const selected = choice === id;
            return (
              <Pop key={id} delay={i * 40} style={styles.cell}>
                <Pressable
                  onPress={() => setChoice(selected ? null : id)}
                  accessibilityRole="radio"
                  accessibilityLabel={name(id)}
                  accessibilityState={{ selected }}
                  style={styles.cellInner}
                >
                  <View style={styles.tileShadow} />
                  <View style={[styles.tile, { backgroundColor: selected ? colors.pink : colors.raised }]}>
                    <Character color={selected ? colors.surface : NEUTRAL} initial={name(id)} size={52} />
                    <Text style={[styles.tileName, selected && { color: colors.white }]} numberOfLines={2}>
                      {name(id)}
                    </Text>
                  </View>
                </Pressable>
              </Pop>
            );
          })}
      </View>
    </>,
    <Button
      label={choice ? 'Vote' : 'Pick one'}
      onPress={() => {
        if (!choice) return;
        onVote(choice);
        setChanging(false);
      }}
      disabled={!choice || busy}
    />,
    'Who’s faking it?',
  );
}

function Guess({
  mine,
  guesser,
  busy,
  onGuess,
  screen,
}: {
  mine: boolean;
  guesser: string;
  busy: boolean;
  onGuess: (text: string) => void;
  screen: ScreenFn;
}) {
  const [text, setText] = useState('');
  return screen(
    <>
      <Pop>
        <Card style={styles.center}>
          <Character color={colors.pink} look="mask" size={80} />
          <Text style={styles.big}>{mine ? 'You were caught!' : `${guesser} was the Imposter`}</Text>
          <Body style={styles.muted}>
            {mine ? 'Guess the word to steal the win.' : `${guesser} gets one guess at the word…`}
          </Body>
        </Card>
      </Pop>
      {mine ? (
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => text.trim() && onGuess(text)}
          placeholder="The word is…"
          placeholderTextColor={colors.textSoft}
          autoFocus
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="Your guess"
          style={styles.input}
        />
      ) : null}
    </>,
    mine ? <Button label="Guess" onPress={() => onGuess(text)} disabled={busy || !text.trim()} /> : undefined,
    'Last chance',
  );
}

function Over({
  game,
  room,
  players,
  isHost,
  busy,
  onLobby,
  screen,
}: {
  game: PublicView;
  room: Room;
  players: RoomPlayer[];
  isHost: boolean;
  busy: boolean;
  onLobby: () => void;
  screen: ScreenFn;
}) {
  useEffect(() => {
    const id = setTimeout(() => play('win'), 250);
    return () => clearTimeout(id);
  }, []);
  const reveal = game.reveal;
  const imposterWon = game.winner === 'imposters';
  // Villagers can also win because the imposter walked out; say so.
  const imposterLeft = !imposterWon && game.left.some((id) => reveal?.roles[id] === 'imposter');
  const headline = imposterWon
    ? {
        text: game.lastGuess?.correct ? 'Imposter guessed it' : 'Imposter wins',
        color: colors.pink,
        role: 'imposter' as Role,
      }
    : {
        text: imposterLeft ? 'The Imposter left' : 'Imposter caught',
        color: colors.cyan,
        role: 'villager' as Role,
      };
  const ranked = [...players]
    .filter((p) => reveal?.roles[p.user_id])
    .sort((a, b) => (room.scores[b.user_id] ?? 0) - (room.scores[a.user_id] ?? 0));

  return screen(
    <>
      <View style={styles.center}>
        <Confetti delay={350} count={24} />
        <Character color={headline.color} look={LOOK_FOR_ROLE[headline.role]} size={64} />
        <Sticker text={headline.text} color={headline.color} angle={-4} delay={200} fontSize={32} />
      </View>
      {reveal ? (
        <Card>
          <View style={styles.words}>
            <View style={[styles.wordBox, { backgroundColor: colors.cyan }]}>
              <Label color={colors.outline}>Villagers</Label>
              <Text style={styles.word}>{reveal.word}</Text>
            </View>
            {game.roleCounts.undercover ? (
              <View style={[styles.wordBox, { backgroundColor: colors.amber }]}>
                <Label color={colors.outline}>Undercover</Label>
                <Text style={styles.word}>{reveal.cousin}</Text>
              </View>
            ) : null}
          </View>
        </Card>
      ) : null}
      <Card badge="Room scores">
        {ranked.map((p, i) => {
          const role = reveal!.roles[p.user_id];
          const gained = totalPoints(reveal!.points[p.user_id]);
          return (
            <View key={p.user_id} style={[styles.scoreRow, i === 0 && styles.leader]}>
              <Text style={styles.rank}>{i + 1}</Text>
              <Character color={ROLE_META[role].color} look={LOOK_FOR_ROLE[role]} size={28} />
              <Text style={styles.scoreName} numberOfLines={2}>
                {p.name}
              </Text>
              {gained ? <Text style={styles.gained}>+{gained}</Text> : null}
              <Text style={styles.total}>{room.scores[p.user_id] ?? 0}</Text>
            </View>
          );
        })}
      </Card>
    </>,
    isHost ? (
      <Button label="Back to lobby" onPress={onLobby} disabled={busy} />
    ) : (
      <View style={styles.center}>
        <Label>The host starts the next game</Label>
      </View>
    ),
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  big: { color: colors.text, fontFamily: fonts.display, fontSize: size.title + 2, textAlign: 'center' },
  muted: { color: colors.textSoft, textAlign: 'center' },
  error: { color: colors.pink, fontFamily: fonts.bodyBold, fontSize: size.small + 1, textAlign: 'center' },
  banner: {
    backgroundColor: colors.raised,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'center',
  },
  bannerText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small },
  stillIn: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, flex: 1 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
  timer: {
    alignSelf: 'center',
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    paddingVertical: space.xs,
    borderWidth: 2,
    borderColor: colors.outline,
  },
  timerLow: { backgroundColor: colors.pink },
  timerText: { color: colors.text, fontFamily: fonts.display, fontSize: size.lead + 2 },
  peek: {
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.raised,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  peekOn: { backgroundColor: colors.raised, borderColor: colors.pink },
  peekText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm + 2,
    paddingVertical: 4,
  },
  chipText: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.small - 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.raised },
  dotDone: { backgroundColor: colors.pink },
  inputRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: TOUCH + 10,
    borderRadius: radius.md,
    backgroundColor: colors.raised,
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    color: colors.text,
    fontFamily: fonts.bodyBold,
    fontSize: size.lead,
    paddingHorizontal: space.md,
  },
  sendButton: { flexShrink: 0 },
  clueRound: { gap: space.xs },
  clue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: TOUCH,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
  },
  clueMine: { backgroundColor: colors.raised, borderWidth: 2, borderColor: colors.pink },
  cluePast: { opacity: 0.55 },
  clueName: { width: 96, color: colors.textSoft, fontFamily: fonts.bodyBold, fontSize: size.small },
  clueText: { flex: 1, color: colors.text, fontFamily: fonts.display, fontSize: size.lead + 2 },
  sus: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  susText: { color: colors.white, fontFamily: fonts.display, fontSize: size.body },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '46%', flexGrow: 1 },
  cellInner: { marginRight: SHADOW, marginBottom: SHADOW },
  tileShadow: {
    ...StyleSheet.absoluteFill,
    top: SHADOW,
    left: SHADOW,
    right: -SHADOW,
    bottom: -SHADOW,
    backgroundColor: colors.outline,
    borderRadius: radius.lg,
  },
  tile: {
    borderWidth: OUTLINE,
    borderColor: colors.outline,
    borderRadius: radius.lg,
    padding: space.md,
    alignItems: 'center',
    gap: space.sm,
    minHeight: TOUCH * 3,
    justifyContent: 'center',
  },
  tileName: { color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body, textAlign: 'center' },
  stickerSlot: { minHeight: 84, justifyContent: 'center', alignSelf: 'stretch' },
  verdict: {
    backgroundColor: colors.raised,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 4,
  },
  verdictText: {
    color: colors.white,
    fontFamily: fonts.display,
    fontSize: size.body + 1,
    textTransform: 'uppercase',
  },
  bonus: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bonusTitle: { color: colors.amber, fontFamily: fonts.display, fontSize: size.lead + 2 },
  words: { flexDirection: 'row', gap: space.sm },
  wordBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 2.5,
    borderColor: colors.outline,
    borderRadius: radius.md,
    padding: space.sm,
  },
  word: { color: colors.outline, fontFamily: fonts.display, fontSize: size.title - 4, textAlign: 'center' },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  leader: { backgroundColor: colors.raised, borderRadius: radius.sm },
  rank: {
    width: 20,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: size.lead,
    color: colors.textSoft,
  },
  scoreName: { flex: 1, color: colors.text, fontFamily: fonts.bodyBold, fontSize: size.body + 1 },
  gained: { color: colors.pink, fontFamily: fonts.display, fontSize: size.lead },
  total: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: size.title - 2,
    minWidth: 36,
    textAlign: 'right',
  },
});
