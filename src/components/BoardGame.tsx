import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, ImageIcon, Pencil, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { GameBoard } from './GameBoard';
import { ImageStack } from './ImageStack';
import { useToast } from '@/hooks/use-toast';
import { sounds } from '@/lib/sounds';
import { isVideo } from '@/lib/media';
import { cn } from '@/lib/utils';
import playerMale from '@/assets/player-male.png';
import playerFemale from '@/assets/player-female.png';

// Import sample GIFs
import celebration1 from '@/assets/gifs/player1/celebration1.jpg';
import adventure1 from '@/assets/gifs/player1/adventure1.jpg';
import treasure1 from '@/assets/gifs/player1/treasure1.jpg';
import dragon1 from '@/assets/gifs/player1/dragon1.jpg';
import magic1 from '@/assets/gifs/player2/magic1.jpg';
import space1 from '@/assets/gifs/player2/space1.jpg';
import ocean1 from '@/assets/gifs/player2/ocean1.jpg';
import forest1 from '@/assets/gifs/player2/forest1.jpg';

// Game data structure
const BOARD_SIZE = 32;
const SHORTCUTS = {
  5: 10,
  8: 15,
  14: 21,
  18: 25
};

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];

const createSampleGIFs = () => {
  const player1GIFs = [celebration1, adventure1, treasure1, dragon1];
  const player2GIFs = [magic1, space1, ocean1, forest1];
  const cellData = [];
  for (let i = 1; i <= BOARD_SIZE; i++) {
    cellData.push({
      cellNumber: i,
      player1GIFs: [...player1GIFs],
      player2GIFs: [...player2GIFs]
    });
  }
  return cellData;
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
  player1Stack: Array<{ gif: string; cellNumber: number }>;
  player2Stack: Array<{ gif: string; cellNumber: number }>;
  revealedGIFs: { [key: string]: string };
}

export const BoardGame: React.FC = () => {
  const { toast } = useToast();
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
    revealedGIFs: {}
  });

  const [showGIFModal, setShowGIFModal] = useState(false);
  const [currentGIF, setCurrentGIF] = useState<string>('');
  const [revealInfo, setRevealInfo] = useState<{ player: 1 | 2; cell: number } | null>(null);
  const [showImageStack, setShowImageStack] = useState<1 | 2 | null>(null);
  const [replayMode, setReplayMode] = useState(false);
  const [playerNames, setPlayerNames] = useState<{ 1: string; 2: string }>({ 1: 'Player 1', 2: 'Player 2' });
  const [editingPlayer, setEditingPlayer] = useState<1 | 2 | null>(null);
  const [nameDraft, setNameDraft] = useState('');

  // Dice modal state
  const [showDiceModal, setShowDiceModal] = useState(false);
  const [diceFace, setDiceFace] = useState(1);
  const [diceSettled, setDiceSettled] = useState(false);
  const [pendingDice, setPendingDice] = useState<number | null>(null);

  const cellData = createSampleGIFs();

  const rollDice = () => {
    if (gameState.isRolling || gameState.isMoving || gameState.gameWinner) return;

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
    }, 1200);
  };

  const confirmDice = () => {
    if (!diceSettled || pendingDice === null) return;
    sounds.click();
    const value = pendingDice;
    setShowDiceModal(false);
    setGameState(prev => ({ ...prev, diceValue: value }));
    movePlayer(value);
  };

  const movePlayer = (steps: number) => {
    const currentPlayer = gameState.currentPlayer;
    const posField = currentPlayer === 1 ? 'player1Position' : 'player2Position';
    const nextField = currentPlayer === 1 ? 'player1NextStart' : 'player2NextStart';
    const currentPos = gameState[posField];
    const nextStart = gameState[nextField];

    const startFrom = nextStart !== null ? nextStart - 1 : currentPos;
    const targetPos = Math.min(startFrom + steps, BOARD_SIZE);
    const totalSteps = targetPos - startFrom;

    setGameState(prev => ({
      ...prev,
      isMoving: true,
      [posField]: startFrom,
      [nextField]: null,
    }));
    sounds.move();

    const STEP_MS = 300;
    let step = 0;

    const tick = () => {
      step++;
      const newPos = startFrom + step;
      setGameState(prev => ({ ...prev, [posField]: newPos }));

      if (step < totalSteps) {
        setTimeout(tick, STEP_MS);
        return;
      }

      // Final step landed
      const winner: 1 | 2 | null = newPos >= BOARD_SIZE ? currentPlayer : null;
      const shortcut = !winner ? (SHORTCUTS[newPos as keyof typeof SHORTCUTS] ?? null) : null;

      setGameState(prev => ({
        ...prev,
        isMoving: false,
        gameWinner: winner,
        [nextField]: shortcut,
      }));

      if (winner) {
        sounds.win();
        return;
      }

      revealGIF(newPos, currentPlayer);
      if (shortcut !== null) {
        sounds.shortcut();
        toast({
          title: 'Shortcut Found!',
          description: `Player ${currentPlayer} will start their next turn from cell ${shortcut}!`,
        });
      }
    };

    setTimeout(tick, STEP_MS);
  };

  const revealGIF = (cellNumber: number, player: 1 | 2) => {
    const key = `${player}_${cellNumber}`;
    setGameState(prev => {
      let gifUrl = prev.revealedGIFs[key];
      if (!gifUrl) {
        const cell = cellData[cellNumber - 1];
        const gifs = player === 1 ? cell.player1GIFs : cell.player2GIFs;
        const randomIndex = Math.floor(Math.random() * gifs.length);
        gifUrl = gifs[randomIndex];
      }
      const stack = player === 1 ? prev.player1Stack : prev.player2Stack;
      const alreadyInStack = stack.some(item => item.cellNumber === cellNumber);
      let newStack = stack;
      if (!alreadyInStack) {
        newStack = [...stack, { gif: gifUrl, cellNumber }];
      }
      const newState = {
        ...prev,
        revealedGIFs: { ...prev.revealedGIFs, [key]: gifUrl },
        [player === 1 ? 'player1Stack' : 'player2Stack']: newStack
      };
      setCurrentGIF(gifUrl);
      setReplayMode(false);
      setShowGIFModal(true);
      sounds.reveal();
      return newState;
    });
  };

  const replayReward = (cellNumber: number, player: 1 | 2) => {
    const key = `${player}_${cellNumber}`;
    const url = gameState.revealedGIFs[key];
    if (!url) return;
    sounds.click();
    setCurrentGIF(url);
    setReplayMode(true);
    setShowGIFModal(true);
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
      revealedGIFs: {}
    });
    setShowGIFModal(false);
    setShowImageStack(null);
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
    const img = player === 1 ? playerMale : playerFemale;
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
        <img src={img} alt={`Player ${player}`} className="w-12 h-12 object-contain" />
        <div className="flex-1">
          <div className="font-semibold text-sm">Player {player}{isCurrent && ' • turn'}</div>
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
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
          />
        </Card>

        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            {!gameState.gameWinner ? (
              <Button
                onClick={rollDice}
                disabled={gameState.isRolling || gameState.isMoving || !!gameState.diceValue}
                className="text-lg px-8 py-4"
              >
                <Dice6 className="mr-2 h-6 w-6" />
                {gameState.isRolling ? 'Rolling...' : gameState.isMoving ? 'Moving...' : 'Roll Dice'}
              </Button>
            ) : (
              <div className="text-center">
                <div className="mb-4">
                  <Trophy className="h-16 w-16 mx-auto text-yellow-500 mb-2" />
                  <h2 className="text-3xl font-bold">
                    Player {gameState.gameWinner} Wins!
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    Congratulations on reaching the finish line!
                  </p>
                </div>
                <Button onClick={() => { sounds.click(); resetGame(); }} className="text-lg px-8 py-4">
                  Play Again
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Dice Roll Modal */}
      <Dialog open={showDiceModal} onOpenChange={(open) => { if (!open && diceSettled) confirmDice(); }}>
        <DialogContent hideCloseButton className="max-w-md flex flex-col items-center justify-center gap-6 py-10">
          <h2 className="text-2xl font-bold">
            {diceSettled ? `You rolled ${pendingDice}!` : 'Rolling...'}
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
      <Dialog open={showGIFModal} onOpenChange={setShowGIFModal}>
        <DialogContent hideCloseButton className="max-w-2xl w-[70vw] h-[70vh] p-0">
          <div
            className="flex items-center justify-center h-full cursor-pointer"
            onClick={() => setShowGIFModal(false)}
          >
            {isVideo(currentGIF) ? (
              <video
                src={currentGIF}
                autoPlay
                loop
                muted
                playsInline
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : (
              <img
                src={currentGIF}
                alt="Revealed reward"
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            )}
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
    </div>
  );
};
