import React, { useLayoutEffect, useRef, useState } from 'react';
import { Crown } from 'lucide-react';
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

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, shortcuts }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  const cellCenter = (pos: number) => {
    const cont = containerRef.current;
    if (!cont) return null;
    const el = cellRefs.current[pos - 1];
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
    };
  };

  const computeStyle = (pos: number): TokenStyle | null => {
    const cont = containerRef.current;
    if (!cont) return null;
    if (pos < 1) {
      const c = cellCenter(1);
      if (!c) return null;
      return { left: c.left, top: c.top, width: c.w, height: c.h, opacity: 0 };
    }
    const c = cellCenter(pos);
    if (!c) return null;
    return { left: c.left, top: c.top, width: c.w, height: c.h, opacity: 1 };
  };

  useLayoutEffect(() => {
    const update = () => {
      setP1Style(computeStyle(gameState.player1Position));
      setP2Style(computeStyle(gameState.player2Position));

      const cont = containerRef.current;
      if (cont) {
        setSvgSize({ w: cont.clientWidth, h: cont.clientHeight });
      }

      const newArrows: ArrowPath[] = [];
      Object.entries(shortcuts).forEach(([fromStr, to]) => {
        const from = Number(fromStr);
        const a = cellCenter(from);
        const b = cellCenter(to);
        if (!a || !b) return;
        // Curve control point: arch upward above the cells
        const midX = (a.x + b.x) / 2;
        const lift = Math.max(40, Math.abs(b.x - a.x) * 0.25);
        const minY = Math.min(a.y, b.y);
        const ctrlY = minY - lift;
        const d = `M ${a.x} ${a.y} Q ${midX} ${ctrlY} ${b.x} ${b.y}`;
        newArrows.push({ from, to, d });
      });
      setArrows(newArrows);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [gameState.player1Position, gameState.player2Position, shortcuts]);

  const renderCell = (cellNumber: number) => {
    const isShortcut = hasShortcut(cellNumber);
    const isCurrentP1 =
      gameState.currentPlayer === 1 && gameState.player1Position === cellNumber;
    const isCurrentP2 =
      gameState.currentPlayer === 2 && gameState.player2Position === cellNumber;
    const isCurrent = isCurrentP1 || isCurrentP2;

    return (
      <div
        key={cellNumber}
        ref={(el) => (cellRefs.current[cellNumber - 1] = el)}
        className={cn(
          'relative aspect-square rounded-lg border-2 border-border flex flex-col items-center justify-center text-center p-2 transition-all duration-300',
          getZoneClass(cellNumber),
          isShortcut && 'ring-2 ring-yellow-300/60',
          isCurrent && 'ring-4 ring-yellow-300 animate-glow-pulse scale-105 z-10'
        )}
      >
        <div className="text-sm font-bold text-white mb-1">{cellNumber}</div>

        {cellNumber === 32 && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-300">
            🏁 FINISH
          </div>
        )}
      </div>
    );
  };

  const rows = [];
  for (let row = 0; row < 4; row++) {
    const cells = [];
    for (let col = 0; col < 8; col++) {
      const cellNumber = row * 8 + col + 1;
      if (cellNumber <= 32) cells.push(renderCell(cellNumber));
    }
    rows.push(
      <div key={row} className="grid grid-cols-8 gap-2">
        {cells}
      </div>
    );
  }

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
              'w-[85%] h-[85%] object-contain drop-shadow-lg',
              player === 1
                ? '-translate-x-1 drop-shadow-[0_4px_6px_hsl(var(--player-1)/0.6)]'
                : 'translate-x-1 drop-shadow-[0_4px_6px_hsl(var(--player-2)/0.6)]'
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
        {rows}

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
