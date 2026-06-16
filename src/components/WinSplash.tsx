import React, { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WinSplashProps {
  winner: 1 | 2;
  winnerName: string;
  onGetReward: () => void;
}

const FLOWERS = ['🌸', '🌼', '🌺', '🌷', '🌹', '💐', '🏵️', '✨'];
const FLOWER_COUNT = 36;

export const WinSplash: React.FC<WinSplashProps> = ({ winner, winnerName, onGetReward }) => {
  // Randomized once per mount so each celebration looks a little different.
  const flowers = useMemo(
    () =>
      Array.from({ length: FLOWER_COUNT }, (_, i) => ({
        id: i,
        emoji: FLOWERS[Math.floor(Math.random() * FLOWERS.length)],
        left: Math.random() * 100,
        size: 1.5 + Math.random() * 2.5,
        duration: 5 + Math.random() * 5,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      {/* Flying flowers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {flowers.map((f) => (
          <span
            key={f.id}
            className="absolute top-0 animate-flower-fall select-none"
            style={{
              left: `${f.left}%`,
              fontSize: `${f.size}rem`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
            }}
            aria-hidden="true"
          >
            {f.emoji}
          </span>
        ))}
      </div>

      {/* Winner card */}
      <div
        className={cn(
          'relative z-10 mx-4 flex flex-col items-center gap-4 rounded-2xl border-4 bg-card/95 px-10 py-8 text-center shadow-2xl animate-win-pop',
          winner === 1 ? 'border-player-1' : 'border-player-2'
        )}
      >
        <Trophy className="h-20 w-20 text-yellow-500 animate-char-bounce" />
        <h2 className="text-4xl font-bold">{winnerName} Wins! 🎉</h2>
        <p className="text-muted-foreground">Congratulations on reaching the finish line!</p>
        <Button onClick={onGetReward} className="mt-2 text-lg px-8 py-4">
          Get Reward
        </Button>
      </div>
    </div>
  );
};
