import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, ImageIcon, Pencil, Check, ArrowUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GameBoard, CROSS_ANIM_MS } from './GameBoard';
import { ImageStack } from './ImageStack';
import { useToast } from '@/hooks/use-toast';
import { sounds } from '@/lib/sounds';
import { isVideo } from '@/lib/media';
import { cn } from '@/lib/utils';
import { AvatarPicker, defaultAvatarFor, progressionImageFor, itemFor, boardAvatarUrl, type Avatar } from './AvatarPicker';
import { WinSplash } from './WinSplash';
import { DisclaimerScreen, DISCLAIMER_STORAGE_KEY } from './DisclaimerScreen';

// Auto-load media per cell from src/assets/gifs/player{1,2}/cell{N}/*
// Plus a default fallback per player at src/assets/gifs/player{1,2}/default.*
// Drop a new file into a cell folder and it shows up automatically.
const MEDIA_EXT = '{jpg,jpeg,png,gif,webp,mp4,webm,mov}';

const player1CellModules = import.meta.glob(
  '@/assets/gifs/player1/cell*/*.{jpg,jpeg,png,gif,webp,mp4,webm,mov}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;
const player2CellModules = import.meta.glob(
  '@/assets/gifs/player2/cell*/*.{jpg,jpeg,png,gif,webp,mp4,webm,mov}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;
const player1DefaultModules = import.meta.glob(
  '@/assets/gifs/player1/default.{jpg,jpeg,png,gif,webp,mp4,webm,mov}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;
const player2DefaultModules = import.meta.glob(
  '@/assets/gifs/player2/default.{jpg,jpeg,png,gif,webp,mp4,webm,mov}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;

const groupByCell = (modules: Record<string, string>): Record<number, string[]> => {
  const out: Record<number, string[]> = {};
  for (const [path, url] of Object.entries(modules)) {
    const m = path.match(/\/cell(\d+)\//i);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    (out[n] ||= []).push(url);
  }
  return out;
};

// A cell can have per-extra-step variant folders: cell{N}-0 .. cell{N}-5, where
// the suffix is how many steps the dice roll overshot that cell by. (Used for the
// last/finish cell, but works for any cell number.) These don't match the plain
// /cellN/ regex above, so we group them separately, keyed by cell then by extra.
const groupByCellVariant = (modules: Record<string, string>): Record<number, Record<number, string[]>> => {
  const out: Record<number, Record<number, string[]>> = {};
  for (const [path, url] of Object.entries(modules)) {
    const m = path.match(/\/cell(\d+)-(\d+)\//i);
    if (!m) continue;
    const cell = parseInt(m[1], 10);
    const extra = parseInt(m[2], 10);
    ((out[cell] ||= {})[extra] ||= []).push(url);
  }
  return out;
};

const player1CellMap = groupByCell(player1CellModules);
const player2CellMap = groupByCell(player2CellModules);
const player1CellVariantMap = groupByCellVariant(player1CellModules);
const player2CellVariantMap = groupByCellVariant(player2CellModules);
const player1Default = Object.values(player1DefaultModules)[0] ?? '';
const player2Default = Object.values(player2DefaultModules)[0] ?? '';

// Game data structure
const BOARD_SIZE = 32;
const SHORTCUTS = {
  5: 10,
  10: 16,
  16: 21,
  21: 25,
  25: 28,
  28: 16
};

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

// Time Constants
const ROLL_DURATION_MS = 800;
const REVEAL_GIF_DELAY = 500;
const STEP_MS = 250;
const PAUSE_MS = 600;

const getMediaForCell = (player: 1 | 2, cellNumber: number): string[] => {
  const map = player === 1 ? player1CellMap : player2CellMap;
  const fallback = player === 1 ? player1Default : player2Default;
  const files = map[cellNumber];
  if (files && files.length > 0) return files;
  return fallback ? [fallback] : [];
};

// Reward media for landing on a cell, picked from its cell{N}-{extra} variant
// folder for the number of extra steps the roll overshot by (0-5). Falls back to
// the plain cell{N} folder (and then the per-player default) when that variant
// folder is empty/missing.
const getMediaForCellVariant = (player: 1 | 2, cellNumber: number, extraSteps: number): string[] => {
  const variantMap = player === 1 ? player1CellVariantMap : player2CellVariantMap;
  const files = variantMap[cellNumber]?.[extraSteps];
  if (files && files.length > 0) return files;
  return getMediaForCell(player, cellNumber);
};

export interface GameState {
  currentPlayer: 1 | 2;
  player1Position: number;
  player2Position: number;
  player1NextStart: number | null;
  player2NextStart: number | null;
  diceValue: number | null;
  isRolling: boolean;
  isMoving: boolean;
  gameWinner: 1 | 2 | null;
  // `label` overrides the displayed cell name (used for finish-cell variants,
  // e.g. "32-2"); plain cells leave it undefined and fall back to cellNumber.
  player1Stack: Array<{ gif: string; cellNumber: number; label?: string }>;
  player2Stack: Array<{ gif: string; cellNumber: number; label?: string }>;
  revealedGIFs: { [key: string]: string };
  tokenScale: { 1: number; 2: number };
  // Per-player dice-tracking: 5-element array (faces 1-5), index (n-1) flips to
  // 1 when n is rolled (from each player's 2nd draw). Rolling a 6 fills all to 1.
  diceTrack: { 1: number[]; 2: number[] };
  rollCount: { 1: number; 2: number };
  // True while the dice-face cross-out animation plays; blocks rolling/moving.
  isAnimatingCross: boolean;
}

export const BoardGame: React.FC = () => {
  const { toast } = useToast();

  // Disclaimer shown on first open only; acceptance is cached in localStorage
  // so returning visitors skip it.
  const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISCLAIMER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const acceptDisclaimer = () => {
    sounds.click();
    try {
      localStorage.setItem(DISCLAIMER_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage failures (e.g. private mode); the game still opens.
    }
    setDisclaimerAccepted(true);
  };

  const [gameState, setGameState] = useState<GameState>({
    currentPlayer: 1,
    player1Position: 0,
    player2Position: 0,
    player1NextStart: null,
    player2NextStart: null,
    diceValue: null,
    isRolling: false,
    isMoving: false,
    gameWinner: null,
    player1Stack: [],
    player2Stack: [],
    revealedGIFs: {},
    tokenScale: { 1: 1, 2: 1 },
    diceTrack: { 1: [0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0] },
    rollCount: { 1: 0, 2: 0 },
    isAnimatingCross: false
  });

  const defaultP1 = defaultAvatarFor(1);
  const defaultP2 = defaultAvatarFor(2);
  // `avatars` holds the chosen avatar's flat portrait (male/female folder) and
  // never changes with progression — it drives the players component and picker.
  const [avatars, setAvatars] = useState<{ 1: Avatar; 2: Avatar }>({ 1: defaultP1, 2: defaultP2 });
  // `boardAvatars` is the progression image shown only on the board: the moving
  // token and the flanking side avatars. Starts at "00000" and advances as
  // items are collected.
  const [boardAvatars, setBoardAvatars] = useState<{ 1: string; 2: string }>({ 1: boardAvatarUrl(defaultP1), 2: boardAvatarUrl(defaultP2) });
  const [pickingAvatar, setPickingAvatar] = useState<1 | 2 | null>(null);

  const [showGIFModal, setShowGIFModal] = useState(false);
  const [currentGIF, setCurrentGIF] = useState<string>('');
  const [revealInfo, setRevealInfo] = useState<{ player: 1 | 2; cell: number | null; label?: string; isItem?: boolean } | null>(null);
  const [showImageStack, setShowImageStack] = useState<1 | 2 | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [playerNames, setPlayerNames] = useState<{ 1: string; 2: string }>({ 1: defaultP1.name, 2: defaultP2.name });
  const [editingPlayer, setEditingPlayer] = useState<1 | 2 | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  // When items are collected this roll, we queue their previews and hold the
  // dice value here; the move runs only once every collected-item preview has
  // been dismissed.
  const [pendingMoveSteps, setPendingMoveSteps] = useState<number | null>(null);
  const [itemQueue, setItemQueue] = useState<Array<{ player: 1 | 2; faceIndex: number; url: string; name: string | null }>>([]);

  // Win splash is dismissed once the winner taps "Get Reward"; the board (and
  // its reward-collection stacks) then stays available for revisiting.
  const [splashDismissed, setSplashDismissed] = useState(false);

  // Dice modal state
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [diceSettled, setDiceSettled] = useState(false);
  const [pendingDice, setPendingDice] = useState<number | null>(null);

  

  const rollDice = () => {
    if (gameState.isRolling || gameState.isMoving || gameState.gameWinner || gameState.isAnimatingCross) return;

    sounds.diceRoll();
    setGameState(prev => ({ ...prev, isRolling: true }));
    setDiceSettled(false);
    setPendingDice(null);
    setShowDiceModal(true);

    const interval = setInterval(() => {
      setDiceFace(Math.floor(Math.random() * 6) + 1);
    }, 90);

    setTimeout(() => {
      clearInterval(interval);
      const finalValue = Math.floor(Math.random() * 6) + 1;
      setDiceFace(finalValue);
      setPendingDice(finalValue);
      setDiceSettled(true);
      setGameState(prev => ({ ...prev, isRolling: false }));
    }, ROLL_DURATION_MS);
  };

  const confirmDice = () => {
    if (!diceSettled || pendingDice === null) return;
    sounds.click();
    const value = pendingDice;
    const player = gameState.currentPlayer;
    setShowDiceModal(false);

    // Dice tracking (5 faces, 1-5): only record from each player's 2nd draw
    // onward. Rolling a 6 fills the whole array. crossAdded = a face flipped
    // 0 -> 1 this draw.
    const newCount = gameState.rollCount[player] + 1;
    const prevTrack = gameState.diceTrack[player];
    let track = prevTrack;
    let crossAdded = false;
    if (newCount >= 2) {
      if (value === 6) {
        if (prevTrack.some(v => v !== 1)) {
          track = [1, 1, 1, 1, 1];
          crossAdded = true;
        }
      } else if (prevTrack[value - 1] !== 1) {
        track = prevTrack.slice();
        track[value - 1] = 1;
        crossAdded = true;
      }
    }

    setGameState(prev => ({
      ...prev,
      diceValue: value,
      rollCount: { ...prev.rollCount, [player]: newCount },
      diceTrack: { ...prev.diceTrack, [player]: track },
      isAnimatingCross: crossAdded || prev.isAnimatingCross,
    }));

    // Avatar progression: look for <gender>/<name>/<bits>.<ext>; if it exists,
    // swap the BOARD avatar (token + side flanks) only. The players component
    // and picker keep the initial image. If not found, leave it unchanged.
    if (newCount >= 2) {
      const av = avatars[player];
      const url = progressionImageFor(av.gender, av.name, track.join(''));
      if (url && url !== boardAvatars[player]) {
        setBoardAvatars(prev => ({ ...prev, [player]: url }));
      }
    }

    // Rolling a 6 (after the first draw) completes every item at once.
    if (value === 6 && crossAdded) {
      sounds.shortcut();
      toast({
        title: '🎉 Congratulations!',
        description: `${playerNames[player]} rolled a 6 and collected all items!`,
      });
    }

    // Items newly collected this roll (a face flipped 0 -> 1) that actually
    // have an item image in the avatar folder. Items are optional: faces with
    // no image are skipped so we never show an empty preview.
    const av = avatars[player];
    const collectedItems = track
      .map((v, i) => (v === 1 && prevTrack[i] !== 1 ? i : -1))
      .filter(i => i >= 0)
      .map(i => {
        const item = itemFor(av.gender, i + 1);
        return item ? { player, faceIndex: i, url: item.url, name: item.name } : null;
      })
      .filter((it): it is { player: 1 | 2; faceIndex: number; url: string; name: string | null } => !!it);

    // After the cross animation, preview each collected item; the move runs
    // only once every preview is dismissed. With no previewable item we move
    // straight away, preserving the original flow.
    const proceed = () => {
      if (collectedItems.length > 0) {
        setPendingMoveSteps(value);
        const [first, ...rest] = collectedItems;
        setItemQueue(rest);
        showItemCollected(first.player, first.faceIndex, first.url, first.name);
      } else {
        movePlayer(value);
      }
    };

    // When a face is newly crossed, block the UI until the cross animation
    // finishes, then proceed. Block the auto-advance effect while previews show.
    if (crossAdded) {
      if (collectedItems.length > 0) setReplayMode(true);
      setTimeout(() => {
        setGameState(prev => ({ ...prev, isAnimatingCross: false }));
        proceed();
      }, CROSS_ANIM_MS);
    } else {
      movePlayer(value);
    }
  };

  // Show the "item collected" preview (player-colored circle) for a face.
  const showItemCollected = (player: 1 | 2, faceIndex: number, url: string, name: string | null) => {
    setCurrentGIF(url);
    const label = `Item Nr ${faceIndex + 1}${name ? ` - ${name}` : ''} was collected`;
    setRevealInfo({ player, cell: null, label, isItem: true });
    setReplayMode(true);
    setShowGIFModal(true);
    sounds.reveal();
  };

  const movePlayer = (steps: number) => {
    const currentPlayer = gameState.currentPlayer;
    const posField = currentPlayer === 1 ? 'player1Position' : 'player2Position';
    const nextField = currentPlayer === 1 ? 'player1NextStart' : 'player2NextStart';
    const currentPos = gameState[posField];
    const nextStart = gameState[nextField];

    setGameState(prev => ({ ...prev, isMoving: true, [nextField]: null }));
    sounds.move();

    const finish = (landed: number, extraSteps: number) => {
      const winner: 1 | 2 | null = landed >= BOARD_SIZE ? currentPlayer : null;
      const shortcut = !winner ? (SHORTCUTS[landed as keyof typeof SHORTCUTS] ?? null) : null;
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          isMoving: false,
          gameWinner: winner,
          [nextField]: shortcut,
        }));
      }, PAUSE_MS);


      if (winner) {
        sounds.win();
        // Reveal the finish reward from the cell32-{extraSteps} folder and add it
        // to the stack, but defer the modal: the WinSplash's "Get Reward" replays it.
        revealGIF(landed, currentPlayer, { extraSteps, deferModal: true });
        return;
      }
      revealGIF(landed, currentPlayer);
      if (shortcut !== null) {
        sounds.shortcut();
        toast({
          title: 'Shortcut Found!',
          description: `Player ${currentPlayer} will start their next turn from cell ${shortcut}!`,
        });
      }
    };

    const startStepping = (from: number, count: number) => {
      const targetPos = Math.min(from + count, BOARD_SIZE);
      // How many steps the roll overshot the finish cell by (0 when it doesn't reach).
      const extraSteps = Math.max(0, from + count - BOARD_SIZE);
      const totalSteps = targetPos - from;
      if (totalSteps <= 0) { finish(from, extraSteps); return; }
      let step = 0;
      const tick = () => {
        step++;
        const newPos = from + step;
        setGameState(prev => ({ ...prev, [posField]: newPos }));
        if (step < totalSteps) { setTimeout(tick, STEP_MS); return; }
        finish(newPos, extraSteps);
      };
      setTimeout(tick, STEP_MS);
    };

    if (nextStart !== null) {
      // Teleport: shrink at current cell, move to destination, grow back, then step (steps - 1) more
      setGameState(prev => ({
        ...prev,
        tokenScale: { ...prev.tokenScale, [currentPlayer]: 0 },
      }));
      setTimeout(() => {
        setGameState(prev => ({ ...prev, [posField]: nextStart }));
        // Allow position to apply at scale 0, then grow back
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            tokenScale: { ...prev.tokenScale, [currentPlayer]: 1 },
          }));
          setTimeout(() => startStepping(nextStart, steps - 1), 500);
        }, 60);
      }, 450);
    } else {
      startStepping(currentPos, steps);
    }
  };

  const revealGIF = (
    cellNumber: number,
    player: 1 | 2,
    opts: { extraSteps?: number; deferModal?: boolean } = {}
  ) => {
    const { extraSteps, deferModal = false } = opts;
    // When extraSteps is provided (landing on the finish cell), pull the reward
    // from the per-extra-step folder and tag it "{cell}-{extra}" so the stack
    // reads correctly after the game.
    const useVariant = extraSteps != null;
    const finishLabel = useVariant ? `${cellNumber}-${extraSteps}` : undefined;
    const key = `${player}_${cellNumber}`;
    setGameState(prev => {
      let gifUrl = prev.revealedGIFs[key];
      if (!gifUrl) {
        const gifs = useVariant
          ? getMediaForCellVariant(player, cellNumber, extraSteps)
          : getMediaForCell(player, cellNumber);
        if (gifs.length === 0) return prev;
        const randomIndex = Math.floor(Math.random() * gifs.length);
        gifUrl = gifs[randomIndex];
      }
      const stack = player === 1 ? prev.player1Stack : prev.player2Stack;
      const alreadyInStack = stack.some(item => item.cellNumber === cellNumber);
      let newStack = stack;
      if (!alreadyInStack) {
        newStack = [...stack, { gif: gifUrl, cellNumber, label: finishLabel }];
      }
      const newState = {
        ...prev,
        revealedGIFs: { ...prev.revealedGIFs, [key]: gifUrl },
        [player === 1 ? 'player1Stack' : 'player2Stack']: newStack
      };
      setCurrentGIF(gifUrl);
      // Deferred reveals (the win flow) leave the modal closed and rely on the
      // WinSplash to replay; replayMode keeps the auto-advance effect from firing.
      setReplayMode(deferModal);
      setRevealInfo({ player, cell: cellNumber, label: finishLabel ? `${playerNames[player]} • Cell ${finishLabel}` : undefined });
      if (!deferModal) {
        setTimeout(() => {
          setShowGIFModal(true);
          sounds.reveal();
        }, REVEAL_GIF_DELAY);
      }
      return newState;
    });
  };

  const previewAvatar = (player: 1 | 2) => {
    sounds.click();
    setCurrentGIF(boardAvatars[player]);
    setRevealInfo({ player, cell: null });
    setReplayMode(true);
    setShowGIFModal(true);
  };

  const previewItem = (player: 1 | 2, faceIndex: number, url: string, name: string | null) => {
    sounds.click();
    setCurrentGIF(url);
    const label = `${avatars[player].name}'s item Nr ${faceIndex + 1}${name ? ` - ${name}` : ''}`;
    setRevealInfo({ player, cell: null, label, isItem: true });
    setReplayMode(true);
    setShowGIFModal(true);
  };

  const replayReward = (cellNumber: number, player: 1 | 2) => {
    const key = `${player}_${cellNumber}`;
    const url = gameState.revealedGIFs[key];
    if (!url) return;
    sounds.click();
    const stack = player === 1 ? gameState.player1Stack : gameState.player2Stack;
    const item = stack.find(i => i.cellNumber === cellNumber);
    setCurrentGIF(url);
    setRevealInfo({ player, cell: cellNumber, label: item?.label ? `${playerNames[player]} • Cell ${item.label}` : undefined });
    setReplayMode(true);
    setShowGIFModal(true);
  };

  // Win splash "Get Reward": dismiss the splash and replay the winner's most
  // recently collected reward, leaving the game state untouched so the player
  // can still open the stacks to revisit their whole collection.
  const handleGetReward = () => {
    sounds.click();
    setSplashDismissed(true);
    const winner = gameState.gameWinner;
    if (!winner) return;
    const stack = winner === 1 ? gameState.player1Stack : gameState.player2Stack;
    const last = stack[stack.length - 1];
    if (!last) return;
    setCurrentGIF(last.gif);
    setRevealInfo({ player: winner, cell: last.cellNumber, label: last.label ? `${playerNames[winner]} • Cell ${last.label}` : undefined });
    setReplayMode(true);
    setShowGIFModal(true);
  };

  // Closing the reveal modal. During the collected-item flow this advances to
  // the next queued item, or runs the held move once the queue is empty.
  const handleRewardClose = () => {
    if (pendingMoveSteps !== null) {
      if (itemQueue.length > 0) {
        const [next, ...rest] = itemQueue;
        setItemQueue(rest);
        showItemCollected(next.player, next.faceIndex, next.url, next.name);
        return;
      }
      const steps = pendingMoveSteps;
      setPendingMoveSteps(null);
      setShowGIFModal(false);
      movePlayer(steps);
      return;
    }
    setShowGIFModal(false);
  };

  const nextTurn = () => {
    if (gameState.gameWinner) return;
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
      diceValue: null
    }));
  };

  const resetGame = () => {
    setGameState({
      currentPlayer: 1,
      player1Position: 0,
      player2Position: 0,
      player1NextStart: null,
      player2NextStart: null,
      diceValue: null,
      isRolling: false,
      isMoving: false,
      gameWinner: null,
      player1Stack: [],
      player2Stack: [],
      revealedGIFs: {},
      tokenScale: { 1: 1, 2: 1 },
      diceTrack: { 1: [0, 0, 0, 0, 0], 2: [0, 0, 0, 0, 0] },
      rollCount: { 1: 0, 2: 0 },
      isAnimatingCross: false
    });
    setShowGIFModal(false);
    setShowImageStack(null);
    setPendingMoveSteps(null);
    setItemQueue([]);
    // Progression resets too; board avatars return to their initial "00000".
    setBoardAvatars({ 1: boardAvatarUrl(avatars[1]), 2: boardAvatarUrl(avatars[2]) });
    setSplashDismissed(false);
  };

  useEffect(() => {
    if (
      !showGIFModal &&
      !replayMode &&
      gameState.diceValue &&
      !gameState.isMoving &&
      !gameState.gameWinner
    ) {
      nextTurn();
    }
  }, [showGIFModal, gameState.diceValue, gameState.isMoving, gameState.gameWinner]);

  const DiceIcon = DICE_ICONS[diceFace - 1];

  const PlayerPanel = ({ player }: { player: 1 | 2 }) => {
    const isCurrent = gameState.currentPlayer === player;
    const pos = player === 1 ? gameState.player1Position : gameState.player2Position;
    const stack = player === 1 ? gameState.player1Stack : gameState.player2Stack;
    const img = avatars[player].url;
    const isEditing = editingPlayer === player;
    const saveName = () => {
      const v = nameDraft.trim();
      setPlayerNames(prev => ({ ...prev, [player]: v || `Player ${player}` }));
      setEditingPlayer(null);
    };
    return (
      <div
        className={cn(
          'flex items-center gap-3 rounded-lg border-2 p-3 transition-all flex-1 min-w-[240px]',
          isCurrent
            ? player === 1
              ? 'border-player-1 bg-player-1/10 ring-2 ring-player-1/40'
              : 'border-player-2 bg-player-2/10 ring-2 ring-player-2/40'
            : 'border-border bg-card'
        )}
      >
        <button
          onClick={() => { sounds.click(); setPickingAvatar(player); }}
          className="shrink-0 rounded-full overflow-hidden hover:ring-2 hover:ring-primary/40 transition"
          aria-label="Change avatar"
        >
          <img src={img} alt={`Player ${player}`} className="w-12 h-12 object-contain" />
        </button>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingPlayer(null); }}
                className="h-7 text-sm"
                maxLength={20}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveName}>
                <Check className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <div className="font-semibold text-sm truncate">{playerNames[player]}{isCurrent && ' • ROLL'}</div>
              <button
                onClick={() => { setNameDraft(playerNames[player]); setEditingPlayer(player); }}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Edit name"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            Cell <span className="font-bold text-foreground">{pos}</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { sounds.click(); setShowImageStack(player); }}
          className="flex items-center gap-1"
        >
          <ImageIcon className="h-4 w-4" />
          Stack ({stack.length})
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-2 sm:p-3">
      <div className="max-w-[1700px] mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Board Game Adventure
          </h1>
          <p className="text-muted-foreground">
            Roll the dice, collect GIFs, and race to the finish!
          </p>
        </div>

        <Card className="mb-6 p-4">
          <div className="flex gap-3 flex-wrap">
            <PlayerPanel player={1} />
            <PlayerPanel player={2} />
          </div>
        </Card>

        <Card className="mb-6">
          <GameBoard
            gameState={gameState}
            shortcuts={SHORTCUTS}
            onReplayReward={replayReward}
            onStartClick={rollDice}
            started={gameState.player1Position > 0 || gameState.player2Position > 0}
            rollDisabled={
              gameState.isRolling ||
              gameState.isMoving ||
              gameState.isAnimatingCross ||
              !!gameState.gameWinner ||
              showDiceModal ||
              showGIFModal
            }
            currentPlayerName={playerNames[gameState.currentPlayer]}
            player1Image={boardAvatars[1]}
            player2Image={boardAvatars[2]}
            player1Name={playerNames[1]}
            player2Name={playerNames[2]}
            onAvatarPreview={previewAvatar}
            onItemPreview={previewItem}
            player1Faces={[1, 2, 3, 4, 5].map(n => { const it = itemFor(avatars[1].gender, n); return { url: it?.url ?? null, name: it?.name ?? null }; })}
            player2Faces={[1, 2, 3, 4, 5].map(n => { const it = itemFor(avatars[2].gender, n); return { url: it?.url ?? null, name: it?.name ?? null }; })}
          />
        </Card>

        {gameState.gameWinner && (
          <Card className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="text-center">
                <div className="mb-4">
                  <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-2" />
                  <h2 className="text-3xl font-bold">
                    {playerNames[gameState.gameWinner]} Wins!
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Open a stack to revisit your rewards, or start a new game.
                  </p>
                </div>
                <Button onClick={() => { sounds.click(); resetGame(); }} className="text-lg px-8 py-4">
                  Play Again
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {gameState.gameWinner && !splashDismissed && (
        <WinSplash
          winner={gameState.gameWinner}
          winnerName={playerNames[gameState.gameWinner]}
          onGetReward={handleGetReward}
        />
      )}

      {/* Dice Roll Modal */}
      <Dialog open={showDiceModal} onOpenChange={(open) => { if (!open && diceSettled) confirmDice(); }}>
        <DialogContent hideCloseButton className="max-w-md flex flex-col items-center justify-center gap-6 py-10">
          <h2 className="text-2xl font-bold">
            {diceSettled ? `${playerNames[gameState.currentPlayer]} rolled ${pendingDice}!` : 'Rolling...'}
          </h2>
          <button
            onClick={confirmDice}
            disabled={!diceSettled}
            className={`p-8 rounded-2xl bg-white text-slate-900 shadow-2xl transition-transform ${
              diceSettled ? 'hover:scale-110 cursor-pointer animate-fade-scale' : 'animate-dice-roll cursor-default'
            }`}
            aria-label="Confirm dice roll"
          >
            <DiceIcon className="h-32 w-32" strokeWidth={1.5} />
          </button>
          <p className="text-muted-foreground text-sm">
            {diceSettled ? 'Click the dice to move your character' : 'The dice is rolling...'}
          </p>
        </DialogContent>
      </Dialog>

      {/* Reward Reveal Modal */}
      <Dialog open={showGIFModal} onOpenChange={(open) => { if (!open) handleRewardClose(); }}>
        <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-2">
          <div
            className="relative h-full flex items-center justify-center"
            onClick={handleRewardClose}
          >
            {revealInfo && (
              <div
                className={cn(
                  'absolute top-2 left-2 z-10 px-3 py-1 rounded text-xs font-semibold text-white',
                  revealInfo.player === 1 ? 'bg-player-1' : 'bg-player-2'
                )}
              >
                {revealInfo.label ?? `${playerNames[revealInfo.player]}${revealInfo.cell !== null ? ` • Cell ${revealInfo.cell}` : ''}`}
              </div>
            )}
            <div className="text-center">
              {revealInfo?.isItem ? (
                <div
                  className={cn(
                    'rounded-full overflow-hidden border-4 w-[min(64vw,64vh)] h-[min(64vw,64vh)] mx-auto',
                    revealInfo.player === 1 ? 'border-player-1' : 'border-player-2'
                  )}
                >
                  {isVideo(currentGIF) ? (
                    <video
                      src={currentGIF}
                      autoPlay
                      loop
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={currentGIF}
                      alt="Item preview"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ) : isVideo(currentGIF) ? (
                <video
                  src={currentGIF}
                  autoPlay
                  loop
                  playsInline
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              ) : (
                <img
                  src={currentGIF}
                  alt="Revealed reward"
                  className="max-w-full max-h-[80vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showImageStack && (
        <ImageStack
          player={showImageStack}
          stack={showImageStack === 1 ? gameState.player1Stack : gameState.player2Stack}
          onClose={() => setShowImageStack(null)}
        />
      )}

      {pickingAvatar && (
        <AvatarPicker
          player={pickingAvatar}
          onSelect={(a) => {
            setAvatars(prev => ({ ...prev, [pickingAvatar]: a }));
            setBoardAvatars(prev => ({ ...prev, [pickingAvatar]: boardAvatarUrl(a) }));
            setPlayerNames(prev => ({ ...prev, [pickingAvatar]: a.name }));
          }}
          onClose={() => setPickingAvatar(null)}
        />
      )}

      {/* Block interaction while a dice-face cross-out animation is playing */}
      {gameState.isAnimatingCross && (
        <div className="fixed inset-0 z-50 cursor-wait" aria-hidden="true" />
      )}

      {/* First-open disclaimer; acceptance is cached so it shows only once */}
      {!disclaimerAccepted && <DisclaimerScreen onAccept={acceptDisclaimer} />}
    </div>
  );
};
