import React, { useLayoutEffect, useRef, useState } from 'react';
import { Crown, Flag, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState } from './BoardGame';
import playerMale from '@/assets/player-male.png';
import playerFemale from '@/assets/player-female.png';

interface GameBoardProps {
  gameState: GameState;
  shortcuts: { [key: number]: number };
}

type TokenStyle = {
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
};

type ArrowPath = {
  from: number;
  to: number;
  d: string;
};

// Layout: 9 columns x 4 rows = 36 slots. 32 playing cells + START + FINISH + 2 spacers.
// Entries: number = play cell, 'START' | 'FINISH' = special, null = empty spacer.
type Slot = number | 'START' | 'FINISH' | null;
const LAYOUT: Slot[][] = [
  ['START', 1, 2, 3, 4, 5, 6, 7, 8],
  [null, 9, 10, 11, 12, 13, 14, 15, 16],
  [17, 18, 19, 20, 21, 22, 23, 24, null],
  [25, 26, 27, 28, 29, 30, 31, 32, 'FINISH'],
];

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, shortcuts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [p1Style, setP1Style] = useState<TokenStyle | null>(null);
  const [p2Style, setP2Style] = useState<TokenStyle | null>(null);
  const [arrows, setArrows] = useState<ArrowPath[]>([]);
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 });

  const getZoneClass = (cellNumber: number) => {
    if (cellNumber <= 10) return 'bg-gradient-zone-1';
    if (cellNumber <= 21) return 'bg-gradient-zone-2';
    return 'bg-gradient-zone-3';
  };

  const hasShortcut = (cellNumber: number) => shortcuts[cellNumber] !== undefined;

  const slotKey = (pos: number, winner: boolean) => {
    if (winner) return 'FINISH';
    if (pos <= 0) return 'START';
    return String(pos);
  };

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

  const computeStyle = (
    pos: number,
    winner: boolean,
    sideOffset: number // -1 left, 0 center, 1 right
  ): TokenStyle | null => {
    const key = slotKey(pos, winner);
    const c = cellRect(key);
    if (!c) return null;
    const offset = sideOffset * (c.w * 0.22);
    return {
      left: c.left + offset,
      top: c.top,
      width: c.w,
      height: c.h,
      opacity: 1,
    };
  };

  useLayoutEffect(() => {
    const update = () => {
      const p1Pos = gameState.player1Position;
      const p2Pos = gameState.player2Position;
      const p1Win = gameState.gameWinner === 1;
      const p2Win = gameState.gameWinner === 2;
      const p1Key = slotKey(p1Pos, p1Win);
      const p2Key = slotKey(p2Pos, p2Win);
      const sameSlot = p1Key === p2Key;

      setP1Style(computeStyle(p1Pos, p1Win, sameSlot ? -1 : 0));
      setP2Style(computeStyle(p2Pos, p2Win, sameSlot ? 1 : 0));

      const cont = containerRef.current;
      if (cont) {
        setSvgSize({ w: cont.clientWidth, h: cont.clientHeight });
      }

      const newArrows: ArrowPath[] = [];
      Object.entries(shortcuts).forEach(([fromStr, to]) => {
        const from = Number(fromStr);
        const a = cellRect(String(from));
        const b = cellRect(String(to));
        if (!a || !b) return;
        // Start near top edge of source, end at top-left corner of destination
        const startX = a.x;
        const startY = a.top + 4;
        const endX = b.left + 4;
        const endY = b.top + 4;
        const midX = (startX + endX) / 2;
        const lift = Math.max(40, Math.abs(endX - startX) * 0.25);
        const minY = Math.min(startY, endY);
        const ctrlY = minY - lift;
        const d = `M ${startX} ${startY} Q ${midX} ${ctrlY} ${endX} ${endY}`;
        newArrows.push({ from, to, d });
      });
      setArrows(newArrows);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [
    gameState.player1Position,
    gameState.player2Position,
    gameState.gameWinner,
    shortcuts,
  ]);

  const renderCell = (slot: Slot) => {
    if (slot === null) {
      return <div className="aspect-square" />;
    }

    if (slot === 'START' || slot === 'FINISH') {
      const isStart = slot === 'START';
      return (
        <div
          ref={(el) => (cellRefs.current[slot] = el)}
          className={cn(
            'relative aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-center p-2 transition-all duration-300',
            isStart
              ? 'bg-emerald-600/80 border-emerald-300'
              : 'bg-amber-500/80 border-amber-300 ring-2 ring-yellow-300/70'
          )}
        >
          {isStart ? (
            <Play className="h-6 w-6 text-white mb-1" fill="currentColor" />
          ) : (
            <Flag className="h-6 w-6 text-white mb-1" fill="currentColor" />
          )}
          <div className="text-[10px] font-bold text-white tracking-wider">
            {slot}
          </div>
        </div>
      );
    }

    const cellNumber = slot;
    const isShortcut = hasShortcut(cellNumber);
    const isCurrentP1 =
      gameState.currentPlayer === 1 && gameState.player1Position === cellNumber;
    const isCurrentP2 =
      gameState.currentPlayer === 2 && gameState.player2Position === cellNumber;
    const isCurrent = isCurrentP1 || isCurrentP2;

    return (
      <div
        ref={(el) => (cellRefs.current[String(cellNumber)] = el)}
        className={cn(
          'relative aspect-square rounded-lg border-2 border-border flex flex-col items-center justify-center text-center p-2 transition-all duration-300',
          getZoneClass(cellNumber),
          isShortcut && 'ring-2 ring-yellow-300/60',
          isCurrent && 'ring-4 ring-yellow-300 animate-glow-pulse scale-105 z-10'
        )}
      >
        <div className="text-sm font-bold text-white mb-1">{cellNumber}</div>
      </div>
    );
  };

  const renderToken = (
    player: 1 | 2,
    style: TokenStyle | null,
    img: string
  ) => {
    if (!style) return null;
    const isCurrent =
      gameState.currentPlayer === player && !gameState.isMoving && !gameState.gameWinner;
    return (
      <div
        className="pointer-events-none absolute"
        style={{
          left: style.left,
          top: style.top,
          width: style.width,
          height: style.height,
          opacity: style.opacity,
          transition:
            'left 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
          zIndex: 20,
        }}
      >
        <div className="relative w-full h-full flex items-end justify-center">
          {isCurrent && (
            <Crown
              className="absolute -top-1 left-1/2 -translate-x-1/2 h-5 w-5 text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] animate-fade-scale"
              fill="currentColor"
              strokeWidth={1.5}
            />
          )}
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
      {/* Player Legend */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <img src={playerMale} alt="Player 1" className="w-8 h-8 object-contain" />
          <span className="text-sm text-muted-foreground">Player 1</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={playerFemale} alt="Player 2" className="w-8 h-8 object-contain" />
          <span className="text-sm text-muted-foreground">Player 2</span>
        </div>
      </div>

      {/* Game Board */}
      <div ref={containerRef} className="relative space-y-2">
        {LAYOUT.map((row, ri) => (
          <div key={ri} className="grid grid-cols-9 gap-2">
            {row.map((slot, ci) => (
              <React.Fragment key={ci}>{renderCell(slot)}</React.Fragment>
            ))}
          </div>
        ))}

        {/* Shortcut arrows overlay */}
        {svgSize.w > 0 && (
          <svg
            className="pointer-events-none absolute inset-0"
            width={svgSize.w}
            height={svgSize.h}
            style={{ zIndex: 15 }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L6,3 L0,6 z" fill="hsl(48 100% 60%)" />
              </marker>
            </defs>
            {arrows.map((a, i) => (
              <path
                key={i}
                d={a.d}
                stroke="hsl(48 100% 60%)"
                strokeWidth={4}
                strokeLinecap="round"
                strokeDasharray="8 6"
                fill="none"
                opacity={0.85}
                markerEnd="url(#arrowhead)"
              />
            ))}
          </svg>
        )}

        {renderToken(1, p1Style, playerMale)}
        {renderToken(2, p2Style, playerFemale)}
      </div>
    </div>
  );
};
