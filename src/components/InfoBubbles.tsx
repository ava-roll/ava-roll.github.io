import React from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// All help-bubble copy lives here so it can be edited in one place.
export const INFO_TEXT = {
  toggleLabel: 'Show game info',
  // Shown above the app title.
  game:
    'Board Game Adventure is a two-player race. Take turns rolling the dice to move your character along the 32-cell board. Land on shortcuts to jump ahead, reveal a reward on every cell, and the first to reach the finish wins!',
  // Shown above each player\'s "Items" label.
  items:
    'Collect items by rolling their matching dice number (1–5). Faces only count from your 2nd roll onward. Rolling a 6 instantly collects every remaining item at once. Your avatar evolves as your collection grows.',
  // Shown above the START / ROLL DICE button.
  dice:
    'Tap here to roll. The dice spins, then tap it again to move. You move the number of cells shown, and the matching item is marked as collected. Landing on a shortcut sets where you start next turn.',
} as const;

interface InfoToggleProps {
  active: boolean;
  onClick: () => void;
  className?: string;
}

// The small "i" button that toggles every help bubble on/off.
export const InfoToggle: React.FC<InfoToggleProps> = ({ active, onClick, className }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={INFO_TEXT.toggleLabel}
    aria-pressed={active}
    title={INFO_TEXT.toggleLabel}
    className={cn(
      'inline-flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors',
      active
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-primary/60 text-primary hover:bg-primary/10',
      className
    )}
  >
    <Info className="h-4 w-4" />
  </button>
);

interface InfoBubbleProps {
  show: boolean;
  text: string;
  // Render below the anchored element (arrow points up) instead of above.
  // Use for elements near the top edge of the screen.
  below?: boolean;
  // Tailwind width / positioning overrides for tight spots.
  className?: string;
}

// A speech bubble anchored on top of (or below) its parent. The parent must be
// `position: relative` so the bubble centers over it.
export const InfoBubble: React.FC<InfoBubbleProps> = ({ show, text, below, className }) => {
  if (!show) return null;
  return (
    <div
      className={cn(
        'pointer-events-none absolute left-1/2 z-50 w-64 -translate-x-1/2',
        below ? 'top-full mt-3' : 'bottom-full mb-3',
        className
      )}
      role="tooltip"
    >
      <div className="relative rounded-lg border-2 border-primary bg-popover p-3 text-left text-xs font-medium leading-relaxed text-popover-foreground shadow-xl">
        {text}
        {/* Arrow pointing at the anchored element */}
        <div
          className={cn(
            'absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-popover',
            below
              ? 'bottom-full translate-y-1/2 border-l-2 border-t-2 border-primary'
              : 'top-full -translate-y-1/2 border-b-2 border-r-2 border-primary'
          )}
        />
      </div>
    </div>
  );
};
