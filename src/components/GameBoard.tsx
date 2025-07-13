import React from 'react';
import { cn } from '@/lib/utils';
import { GameState } from './BoardGame';

interface GameBoardProps {
  gameState: GameState;
  shortcuts: { [key: number]: number };
}

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, shortcuts }) => {
  const getZoneClass = (cellNumber: number) => {
    if (cellNumber <= 10) return 'bg-gradient-zone-1';
    if (cellNumber <= 21) return 'bg-gradient-zone-2';
    return 'bg-gradient-zone-3';
  };

  const getZoneLabel = (cellNumber: number) => {
    if (cellNumber <= 10) return 'Zone 1';
    if (cellNumber <= 21) return 'Zone 2';
    return 'Zone 3';
  };

  const isPlayerOnCell = (cellNumber: number, player: 1 | 2) => {
    return (player === 1 ? gameState.player1Position : gameState.player2Position) === cellNumber;
  };

  const hasShortcut = (cellNumber: number) => {
    return shortcuts[cellNumber] !== undefined;
  };

  const renderCell = (cellNumber: number) => {
    const player1Here = isPlayerOnCell(cellNumber, 1);
    const player2Here = isPlayerOnCell(cellNumber, 2);
    const isShortcut = hasShortcut(cellNumber);
    
    return (
      <div
        key={cellNumber}
        className={cn(
          'relative aspect-square rounded-lg border-2 border-border flex flex-col items-center justify-center text-center p-2 transition-all duration-300',
          getZoneClass(cellNumber),
          (player1Here || player2Here) && 'ring-4 ring-primary animate-glow-pulse'
        )}
      >
        {/* Cell Number */}
        <div className="text-sm font-bold text-white mb-1">
          {cellNumber}
        </div>
        
        {/* Shortcut Indicator */}
        {isShortcut && (
          <div className="text-xs text-yellow-300 font-semibold mb-1">
            ↗ {shortcuts[cellNumber]}
          </div>
        )}
        
        {/* Player Tokens */}
        <div className="flex gap-1 flex-wrap justify-center">
          {player1Here && (
            <div className={cn(
              'w-4 h-4 rounded-full bg-player-1 border-2 border-white shadow-md',
              gameState.isMoving && gameState.currentPlayer === 1 && 'animate-token-hop'
            )} />
          )}
          {player2Here && (
            <div className={cn(
              'w-4 h-4 rounded-full bg-player-2 border-2 border-white shadow-md',
              gameState.isMoving && gameState.currentPlayer === 2 && 'animate-token-hop'
            )} />
          )}
        </div>
        
        {/* Finish Line */}
        {cellNumber === 32 && (
          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs font-bold text-yellow-300">
            🏁 FINISH
          </div>
        )}
      </div>
    );
  };

  // Create rows of 8 cells each (4 rows total)
  const rows = [];
  for (let row = 0; row < 4; row++) {
    const cells = [];
    for (let col = 0; col < 8; col++) {
      const cellNumber = row * 8 + col + 1;
      if (cellNumber <= 32) {
        cells.push(renderCell(cellNumber));
      }
    }
    rows.push(
      <div key={row} className="grid grid-cols-8 gap-2">
        {cells}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Zone Legend */}
      <div className="flex justify-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-zone-1"></div>
          <span className="text-sm text-muted-foreground">Zone 1 (1-10)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-zone-2"></div>
          <span className="text-sm text-muted-foreground">Zone 2 (11-21)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-zone-3"></div>
          <span className="text-sm text-muted-foreground">Zone 3 (22-32)</span>
        </div>
      </div>

      {/* Player Legend */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-player-1 border-2 border-white"></div>
          <span className="text-sm text-muted-foreground">Player 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-player-2 border-2 border-white"></div>
          <span className="text-sm text-muted-foreground">Player 2</span>
        </div>
      </div>

      {/* Game Board */}
      <div className="space-y-2">
        {rows}
      </div>

      {/* Shortcut Information */}
      <div className="mt-6 p-4 bg-muted rounded-lg">
        <h4 className="text-sm font-semibold mb-2">Shortcuts (↗):</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Cell 5 → 10</div>
          <div>Cell 8 → 15</div>
          <div>Cell 14 → 22</div>
          <div>Cell 18 → 26</div>
        </div>
      </div>
    </div>
  );
};