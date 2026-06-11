import React, { useLayoutEffect, useRef, useState } from 'react';
import { Flag, ArrowUp, Dice6 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState } from './BoardGame';

interface GameBoardProps {
  gameState: GameState;
  shortcuts: { [key: number]: number };
  onReplayReward: (cellNumber: number, player: 1 | 2) => void;
  onStartClick?: () => void;
  started?: boolean;
  currentPlayerName?: string;
  player1Image: string;
  player2Image: string;
}

type TokenStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
};


// 8 columns x 4 rows = 32 playing cells. Snake layout so consecutive cells
// are physically adjacent (8 -> 9, 16 -> 17, 24 -> 25).
const LAYOUT: number[][] = [
  [1, 2, 3, 4, 5, 6, 7, 8],
  [16, 15, 14, 13, 12, 11, 10, 9],
  [17, 18, 19, 20, 21, 22, 23, 24],
  [32, 31, 30, 29, 28, 27, 26, 25],
];

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, shortcuts, onReplayReward, onStartClick, started, currentPlayerName, player1Image, player2Image }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLElement | null>>({});
  const [p1Style, setP1Style] = useState<TokenStyle | null>(null);
  const [p2Style, setP2Style] = useState<TokenStyle | null>(null);

  const getZoneClass = (cellNumber: number) => {
    if (cellNumber <= 10) return 'bg-gradient-zone-1';
    if (cellNumber <= 21) return 'bg-gradient-zone-2';
    return 'bg-gradient-zone-3';
  };

  const hasShortcut = (cellNumber: number) => shortcuts[cellNumber] !== undefined;

  const slotKey = (pos: number) => (pos <= 0 ? 'START' : String(pos));

  const cellRect = (key: string) => {
    const cont = containerRef.current;
    if (!cont) return null;
    const el = cellRefs.current[key];
    if (!el) return null;
    const cRect = cont.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left - cRect.left + r.width / 2,
      y: r.top - cRect.top + r.height / 2,
      w: r.width,
      h: r.height,
      left: r.left - cRect.left,
      top: r.top - cRect.top,
      right: r.left - cRect.left + r.width,
      bottom: r.top - cRect.top + r.height,
    };
  };

  const computeStyle = (pos: number, sideOffset: number): TokenStyle | null => {
    const key = slotKey(pos);
    const c = cellRect(key);
    if (!c) return null;
    // On the START gate, flank the tokens to the left/right sides of the box
    // so the START label in the middle stays visible and tappable.
    if (key === 'START') {
      const size = c.h * 0.95;
      const gap = size * 0.15;
      const left = sideOffset < 0 ? c.left - size - gap : c.right + gap;
      return {
        left,
        top: c.top + (c.h - size) / 2,
        width: size,
        height: size,
        opacity: 1,
      };
    }
    const offset = sideOffset * (c.w * 0.22);
    const pad = c.w * 0.08;
    return {
      left: c.left + offset + pad,
      top: c.top + pad,
      width: c.w - pad * 2,
      height: c.h - pad * 2,
      opacity: 1,
    };
  };

  useLayoutEffect(() => {
    const update = () => {
      const p1Pos = gameState.player1Position;
      const p2Pos = gameState.player2Position;
      const p1Key = slotKey(p1Pos);
      const p2Key = slotKey(p2Pos);
      const sameSlot = p1Key === p2Key;
      const atStartP1 = p1Key === 'START';
      const atStartP2 = p2Key === 'START';

      // On the START gate, players always keep their fixed sides (P1 left, P2 right),
      // so removing one doesn't recenter the other.
      const p1Offset = atStartP1 ? -1 : sameSlot ? -1 : 0;
      const p2Offset = atStartP2 ? 1 : sameSlot ? 1 : 0;

      setP1Style(computeStyle(p1Pos, p1Offset));
      setP2Style(computeStyle(p2Pos, p2Offset));

    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [
    gameState.player1Position,
    gameState.player2Position,
    gameState.gameWinner,
    gameState.currentPlayer,
    shortcuts,
  ]);

  const renderCell = (cellNumber: number) => {
    const isShortcut = hasShortcut(cellNumber);
    const isFinish = cellNumber === 32;
    const isCurrentP1 =
      gameState.currentPlayer === 1 && gameState.player1Position === cellNumber;
    const isCurrentP2 =
      gameState.currentPlayer === 2 && gameState.player2Position === cellNumber;
    const isCurrent = isCurrentP1 || isCurrentP2;

    // Arrow only between rolls (not while rolling or moving). Snake layout means
    // rows 1 & 3 travel left->right (arrow on left), rows 2 & 4 right->left (arrow on right).
    const row = LAYOUT.findIndex((r) => r.includes(cellNumber));
    const arrowOnRight = row === 1 || row === 3;
    const showArrow = isCurrent && !gameState.isMoving;

    const p1Activated = gameState.revealedGIFs[`1_${cellNumber}`] !== undefined;
    const p2Activated = gameState.revealedGIFs[`2_${cellNumber}`] !== undefined;

    return (
      <div
        ref={(el) => (cellRefs.current[String(cellNumber)] = el)}
        className={cn(
          'relative aspect-square rounded-lg border-2 border-border flex flex-col items-center justify-center text-center p-2 transition-all duration-300',
          getZoneClass(cellNumber),
          isShortcut && 'ring-2 ring-yellow-300/60',
          isFinish && 'ring-2 ring-amber-300',
          isCurrentP1 && 'border-player-1 ring-4 ring-player-1 shadow-[0_0_20px_hsl(var(--player-1)/0.7)] z-10',
          isCurrentP2 && 'border-player-2 ring-4 ring-player-2 shadow-[0_0_20px_hsl(var(--player-2)/0.7)] z-10'
        )}
      >
        {showArrow && (
          <div
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-0 w-0 z-20',
              'border-y-[18px] border-y-transparent',
              arrowOnRight
                ? cn('right-0 border-r-[14px]', isCurrentP1 ? 'border-r-player-1' : 'border-r-player-2')
                : cn('left-0 border-l-[14px]', isCurrentP1 ? 'border-l-player-1' : 'border-l-player-2')
            )}
            aria-hidden="true"
          />
        )}

        <div className="text-sm font-bold text-white mb-1 flex items-center gap-1">
          {isFinish && <Flag className="h-3.5 w-3.5" fill="currentColor" />}
          {cellNumber}
        </div>

        {isShortcut && (
          <div
            className="absolute top-1 right-1 flex items-center gap-0.5 rounded-md bg-yellow-400/95 px-1 py-0.5 text-[10px] font-bold text-slate-900 shadow-md ring-1 ring-yellow-600/40"
            title={`Ladder to cell ${shortcuts[cellNumber]}`}
          >
            <ArrowUp className="h-3 w-3" strokeWidth={3} />
            {shortcuts[cellNumber]}
          </div>
        )}

        {p1Activated && (
          <button
            onClick={(e) => { e.stopPropagation(); onReplayReward(cellNumber, 1); }}
            className="absolute bottom-1 left-1/4 -translate-x-1/2 w-4 h-4 rounded-full bg-player-1 ring-1 ring-white/70 hover:scale-125 transition-transform z-20"
            aria-label={`Replay Player 1 reward at cell ${cellNumber}`}
            title="Player 1 reward"
          />
        )}
        {p2Activated && (
          <button
            onClick={(e) => { e.stopPropagation(); onReplayReward(cellNumber, 2); }}
            className="absolute bottom-1 left-3/4 -translate-x-1/2 w-4 h-4 rounded-full bg-player-2 ring-1 ring-white/70 hover:scale-125 transition-transform z-20"
            aria-label={`Replay Player 2 reward at cell ${cellNumber}`}
            title="Player 2 reward"
          />
        )}
      </div>
    );
  };

  const renderToken = (
    player: 1 | 2,
    style: TokenStyle | null,
    img: string
  ) => {
    if (!style) return null;
    const teleScale = gameState.tokenScale?.[player] ?? 1;
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: style.left,
          top: style.top,
          width: style.width,
          height: style.height,
          opacity: style.opacity * teleScale,
          transform: `scale(${teleScale})`,
          transformOrigin: 'center center',
          transition:
            'left 0.28s ease-in-out, top 0.28s ease-in-out, width 0.28s ease, height 0.28s ease, opacity 0.4s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 30,
        }}
      >
        <div className="relative w-full h-full flex items-end justify-center">
          <img
            src={img}
            alt={`Player ${player}`}
            width={128}
            height={128}
            className={cn(
              'w-[75%] h-[75%] object-contain drop-shadow-lg',
              player === 1
                ? 'drop-shadow-[0_4px_6px_hsl(var(--player-1)/0.6)]'
                : 'drop-shadow-[0_4px_6px_hsl(var(--player-2)/0.6)]'
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6">
      <div ref={containerRef} className="relative">
        {/* Start gate (pre-board home) */}
        <div className="mb-3 flex justify-center">
          <button
            type="button"
            ref={(el) => (cellRefs.current['START'] = el)}
            onClick={() => onStartClick?.()}
            aria-label={started ? 'Roll dice' : 'Start'}
            title={started ? 'Roll dice' : 'Start'}
            className="relative h-24 w-44 rounded-lg border-2 border-dashed border-emerald-400/60 bg-emerald-500/10 flex items-center justify-center cursor-pointer transition-all hover:bg-emerald-500/20 hover:border-emerald-400 active:scale-95"
          >
            <div className="flex flex-col items-center gap-1 text-xs font-semibold text-emerald-400">
              {currentPlayerName && (
                <span className="max-w-[8rem] truncate">{currentPlayerName}</span>
              )}
              <Dice6 className="h-6 w-6" />
              <span>{started ? 'ROLL DICE' : 'START'}</span>
            </div>
          </button>
        </div>

        <div className="space-y-2">
          {LAYOUT.map((row, ri) => (
            <div key={ri} className="grid grid-cols-8 gap-2">
              {row.map((slot, ci) => (
                <React.Fragment key={ci}>{renderCell(slot)}</React.Fragment>
              ))}
            </div>
          ))}
        </div>


        {renderToken(1, p1Style, player1Image)}
        {renderToken(2, p2Style, player2Image)}
      </div>
    </div>
  );
};
