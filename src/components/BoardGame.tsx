import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy, ImageIcon } from 'lucide-react';
import { GameBoard } from './GameBoard';
import { ImageStack } from './ImageStack';
import { useToast } from '@/hooks/use-toast';
import { sounds } from '@/lib/sounds';

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
  14: 22,
  18: 26
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
  const [showImageStack, setShowImageStack] = useState<1 | 2 | null>(null);

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

    // Cycle dice faces
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
    setGameState(prev => ({ ...prev, isMoving: true }));
    sounds.move();

    let landedPlayer: 1 | 2 = 1;
    let landedPosition = 0;
    let landedWinner: 1 | 2 | null = null;
    let landedShortcut: number | null = null;

    setGameState(prev => {
      const currentPlayer = prev.currentPlayer;
      const currentPos = currentPlayer === 1 ? prev.player1Position : prev.player2Position;
      const nextStart = currentPlayer === 1 ? prev.player1NextStart : prev.player2NextStart;

      const startPos = nextStart !== null ? nextStart : currentPos;
      const newPosition = Math.min(startPos + steps, BOARD_SIZE);

      let winner: 1 | 2 | null = null;
      if (newPosition >= BOARD_SIZE) winner = currentPlayer;

      landedPlayer = currentPlayer;
      landedPosition = newPosition;
      landedWinner = winner;
      if (!winner && SHORTCUTS[newPosition as keyof typeof SHORTCUTS]) {
        landedShortcut = SHORTCUTS[newPosition as keyof typeof SHORTCUTS];
      }

      return {
        ...prev,
        [currentPlayer === 1 ? 'player1Position' : 'player2Position']: newPosition,
        [currentPlayer === 1 ? 'player1NextStart' : 'player2NextStart']: landedShortcut,
        gameWinner: winner,
      };
    });

    setTimeout(() => {
      setGameState(prev => ({ ...prev, isMoving: false }));

      if (landedWinner) {
        sounds.win();
        return;
      }

      if (landedPosition > 0) {
        revealGIF(landedPosition, landedPlayer);

        if (landedShortcut !== null) {
          sounds.shortcut();
          toast({
            title: 'Shortcut Found!',
            description: `Player ${landedPlayer} will start their next turn from cell ${landedShortcut}!`,
          });
        }
      }
    }, 850);
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
      setShowGIFModal(true);
      sounds.reveal();
      return newState;
    });
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
    if (!showGIFModal && gameState.diceValue && !gameState.isMoving && !gameState.gameWinner) {
      const timer = setTimeout(() => {
        nextTurn();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [showGIFModal, gameState.diceValue, gameState.isMoving, gameState.gameWinner]);

  const DiceIcon = DICE_ICONS[diceFace - 1];

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
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex gap-4 flex-wrap">
              <Badge variant={gameState.currentPlayer === 1 ? "default" : "secondary"} className="text-lg px-4 py-2">
                Player 1 — Current Cell: <span className="ml-2 font-bold">{gameState.player1Position}</span>
              </Badge>
              <Badge variant={gameState.currentPlayer === 2 ? "default" : "secondary"} className="text-lg px-4 py-2">
                Player 2 — Current Cell: <span className="ml-2 font-bold">{gameState.player2Position}</span>
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { sounds.click(); setShowImageStack(1); }}
                className="flex items-center gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                P1 Stack ({gameState.player1Stack.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { sounds.click(); setShowImageStack(2); }}
                className="flex items-center gap-2"
              >
                <ImageIcon className="h-4 w-4" />
                P2 Stack ({gameState.player2Stack.length})
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mb-6">
          <GameBoard
            gameState={gameState}
            shortcuts={SHORTCUTS}
          />
        </Card>

        <Card className="p-6">
          <div className="flex flex-col items-center gap-4">
            {!gameState.gameWinner ? (
              <>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">
                    Player {gameState.currentPlayer}'s Turn
                  </h3>
                  {gameState.diceValue && (
                    <p className="text-muted-foreground">
                      Rolled: {gameState.diceValue}
                    </p>
                  )}
                </div>

                <Button
                  onClick={rollDice}
                  disabled={gameState.isRolling || gameState.isMoving || !!gameState.diceValue}
                  className="text-lg px-8 py-4"
                >
                  <Dice6 className="mr-2 h-6 w-6" />
                  {gameState.isRolling ? 'Rolling...' : gameState.isMoving ? 'Moving...' : 'Roll Dice'}
                </Button>
              </>
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
        <DialogContent className="max-w-md flex flex-col items-center justify-center gap-6 py-10">
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

      {/* GIF Reveal Modal */}
      <Dialog open={showGIFModal} onOpenChange={setShowGIFModal}>
        <DialogContent className="max-w-2xl w-[70vw] h-[70vh] p-0">
          <div className="flex items-center justify-center h-full">
            <img
              src={currentGIF}
              alt="Revealed GIF"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
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
