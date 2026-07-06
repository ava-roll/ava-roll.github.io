import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Flag, ArrowUp, Dice6 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GameState } from './BoardGame';
import { InfoBubble, INFO_TEXT } from './InfoBubbles';

// Total duration of the dice-face cross-out animation (two 0.28s strokes,
// the second delayed by 0.28s) plus a small buffer. BoardGame waits this long
// before resuming the move so the animation is never cut off.
export const CROSS_ANIM_MS = 700;

interface GameBoardProps {
  gameState: GameState;
  shortcuts: { [key: number]: number };
  // Current help-bubble step (0 = none, 2 = start button, 3 = Items); driven by the info button.
  infoStep?: number;
  onReplayReward: (cellNumber: number, player: 1 | 2) => void;
  onStartClick?: () => void;
  started?: boolean;
  rollDisabled?: boolean;
  currentPlayerName?: string;
  player1Image: string;
  player2Image: string;
  player1Name?: string;
  player2Name?: string;
  onAvatarPreview?: (player: 1 | 2) => void;
  onItemPreview?: (player: 1 | 2, faceIndex: number, url: string, name: string | null) => void;
  // 5 dice-face items per player (index 0 = face "1"); url is null where missing.
  player1Faces?: Array<{ url: string | null; name: string | null }>;
  player2Faces?: Array<{ url: string | null; name: string | null }>;
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

export const GameBoard: React.FC<GameBoardProps> = ({ gameState, shortcuts, infoStep, onReplayReward, onStartClick, started, rollDisabled, currentPlayerName, player1Image, player2Image, player1Name, player2Name, onAvatarPreview, onItemPreview, player1Faces, player2Faces }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Record<string, HTMLElement | null>>({});
  const [p1Style, setP1Style] = useState<TokenStyle | null>(null);
  const [p2Style, setP2Style] = useState<TokenStyle | null>(null);

  // Bump a counter when a side avatar image changes so its <img> remounts and
  // replays the swap animation. Starts at 0 (no animation on first mount).
  const sideImgRef = useRef<{ 1: string; 2: string }>({ 1: player1Image, 2: player2Image });
  const [sideAnim, setSideAnim] = useState<{ 1: number; 2: number }>({ 1: 0, 2: 0 });
  useEffect(() => {
    if (sideImgRef.current[1] !== player1Image) {
      sideImgRef.current[1] = player1Image;
      setSideAnim((p) => ({ ...p, 1: p[1] + 1 }));
    }
    if (sideImgRef.current[2] !== player2Image) {
      sideImgRef.current[2] = player2Image;
      setSideAnim((p) => ({ ...p, 2: p[2] + 1 }));
    }
  }, [player1Image, player2Image]);

  // Detect dice faces that flipped 0 -> 1 this turn and play the cross-draw
  // animation on them. The set clears after the animation so the cross becomes
  // a static "disabled" mark.
  const prevTrackRef = useRef<{ 1: number[]; 2: number[] }>({
    1: [...gameState.diceTrack[1]],
    2: [...gameState.diceTrack[2]],
  });
  const [crossAnim, setCrossAnim] = useState<{ 1: number[]; 2: number[] }>({ 1: [], 2: [] });
  useEffect(() => {
    ([1, 2] as const).forEach((pl) => {
      const prev = prevTrackRef.current[pl];
      const cur = gameState.diceTrack[pl];
      const newly = cur.reduce<number[]>((acc, v, i) => {
        if (v === 1 && prev[i] !== 1) acc.push(i);
        return acc;
      }, []);
      prevTrackRef.current[pl] = [...cur];
      if (newly.length) {
        setCrossAnim((s) => ({ ...s, [pl]: newly }));
        setTimeout(() => setCrossAnim((s) => ({ ...s, [pl]: [] })), CROSS_ANIM_MS);
      }
    });
  }, [gameState.diceTrack]);

  const getZoneClass = (cellNumber: number) => {
    if (cellNumber <= 10) return 'bg-gradient-zone-1';
    if (cellNumber <= 18) return 'bg-gradient-zone-2';
    if (cellNumber === 32) return 'bg-gradient-zone-4';
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
          'relative aspect-square rounded-md flex flex-col items-center justify-center text-center p-0.5 sm:p-1 md:p-2 transition-all duration-300',
          getZoneClass(cellNumber),
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

        <div className="text-[10px] sm:text-xs md:text-sm font-bold text-white mb-0.5 md:mb-1 flex items-center gap-1">
          {isFinish && <Flag className="h-2.5 w-2.5 md:h-3.5 md:w-3.5" fill="currentColor" />}
        </div>

        <div className="text-[10px] sm:text-xs md:text-sm font-bold text-white mb-0.5 md:mb-1 flex items-center gap-1">
          {cellNumber}
        </div>

        {isShortcut && (
          <div
            className="absolute top-0.5 right-0.5 md:top-1 md:right-1 flex items-center gap-0.5 rounded md:rounded-md bg-yellow-400/95 px-0.5 py-0 md:px-1 md:py-0.5 text-[7px] sm:text-[9px] md:text-[10px] font-bold text-slate-900 shadow md:shadow-md ring-1 ring-yellow-600/40"
            title={`Ladder to cell ${shortcuts[cellNumber]}`}
          >

            <ArrowUp className="h-2 w-2 md:h-3 md:w-3" strokeWidth={3} />
            {shortcuts[cellNumber]}
          </div>
        )}

        {p1Activated && (
          <button
            onClick={(e) => { e.stopPropagation(); onReplayReward(cellNumber, 1); }}
            className="absolute bottom-0.5 md:bottom-1 left-1/4 -translate-x-1/2 w-2.5 h-2.5 md:w-4 md:h-4 rounded-full bg-player-1 ring-1 ring-white/70 hover:scale-125 transition-transform z-20"
            aria-label={`Replay Player 1 reward at cell ${cellNumber}`}
            title="Player 1 reward"
          />
        )}
        {p2Activated && (
          <button
            onClick={(e) => { e.stopPropagation(); onReplayReward(cellNumber, 2); }}
            className="absolute bottom-0.5 md:bottom-1 left-3/4 -translate-x-1/2 w-2.5 h-2.5 md:w-4 md:h-4 rounded-full bg-player-2 ring-1 ring-white/70 hover:scale-125 transition-transform z-20"
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
            onClick={(e) => { e.stopPropagation(); onAvatarPreview?.(player); }}
            className={cn(
              'w-[75%] h-[75%] object-contain drop-shadow-lg pointer-events-auto cursor-pointer hover:scale-105 transition-transform',
              player === 1
                ? 'drop-shadow-[0_4px_6px_hsl(var(--player-1)/0.6)]'
                : 'drop-shadow-[0_4px_6px_hsl(var(--player-2)/0.6)]'
            )}
          />
        </div>
      </div>
    );
  };

  const renderSideAvatarButton = (player: 1 | 2) => {
    const img = player === 1 ? player1Image : player2Image;
    const name = (player === 1 ? player1Name : player2Name) ?? `Player ${player}`;
    const anim = sideAnim[player];

    return (
      <button
        type="button"
        onClick={() => onAvatarPreview?.(player)}
        aria-label={`Preview ${name}`}
        title={name}
        className="flex h-20 w-20 sm:h-32 sm:w-32 md:h-56 md:w-48 items-end justify-center cursor-pointer transition-transform hover:scale-105"
        style={{ perspective: '600px' }}
      >
        <img
          key={anim}
          src={img}
          alt={name}
          className={cn(
            'h-full w-full object-contain object-bottom select-none',
            anim > 0 && 'animate-avatar-swap'
          )}

        />
      </button>
    );
  };

  const renderSideItems = (player: 1 | 2, mobile = false) => {
    const faces = (player === 1 ? player1Faces : player2Faces) ?? [];
    const track = gameState.diceTrack[player];
    const animating = crossAnim[player];
    const hasFaces = faces.some(f => f.url);

    if (!hasFaces) return null;

    const items = faces
      .map((f, i) => ({ url: f.url, name: f.name, i }))
      .filter((it): it is { url: string; name: string | null; i: number } => Boolean(it.url));

    return (
      <div className={cn(
        'flex flex-col items-center gap-1 md:gap-1.5 w-full md:flex-none',
        mobile ? 'max-w-[calc(50%_-_0.25rem)]' : 'flex-1'
      )}>
        <span className="relative text-[10px] sm:text-xs md:text-sm font-semibold tracking-wide text-muted-foreground">
          Items
          <InfoBubble show={infoStep === 3} text={INFO_TEXT.items} />
        </span>
        <div className="grid grid-cols-5 md:grid-cols-2 gap-1 md:gap-2 w-full md:w-auto">

          {items.map((it, idx) => {
            const crossed = track[it.i] === 1;
            const isAnimating = animating.includes(it.i);
            // Center a lone trailing item when the count is odd.
            const lonely = idx === items.length - 1 && items.length % 2 === 1;
            return (
              <div
                key={it.i}
                className={cn('flex flex-col items-center gap-0.5', lonely && 'md:col-span-2')}
              >
                <button
                  type="button"
                  onClick={() => onItemPreview?.(player, it.i, it.url, it.name)}
                  aria-label={`Preview item ${it.i + 1}${it.name ? ` - ${it.name}` : ''}`}
                  className="relative w-full sm:w-12 md:w-16 aspect-square cursor-pointer transition-transform hover:scale-110"
                >

                  <img
                    src={it.url}
                    alt={`Item ${it.i + 1}`}
                    className={cn(
                      'w-full h-full object-contain rounded-full ring-1 ring-border transition-opacity duration-300 select-none',
                      crossed ? 'opacity-40' : 'opacity-100'
                    )}
                  />
                  {crossed && (
                    <svg
                      viewBox="0 0 100 100"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      aria-hidden="true"
                    >
                      <line
                        x1="20" y1="20" x2="80" y2="80"
                        stroke="rgb(239 68 68)" strokeWidth="12" strokeLinecap="round"
                        className={cn(isAnimating && 'cross-stroke')}
                      />
                      <line
                        x1="80" y1="20" x2="20" y2="80"
                        stroke="rgb(239 68 68)" strokeWidth="12" strokeLinecap="round"
                        className={cn(isAnimating && 'cross-stroke cross-stroke-2')}
                      />
                    </svg>
                  )}
                </button>
                <span className="text-[8px] sm:text-[10px] md:text-xs font-medium text-muted-foreground text-center leading-tight truncate max-w-full">
                  {it.i + 1}{it.name ? ` - ${it.name}` : ''}
                </span>

              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSideAvatar = (player: 1 | 2) => {
    return (
      <div className="flex shrink-0 flex-col items-center gap-3 w-48">
        {renderSideAvatarButton(player)}
        {renderSideItems(player)}
      </div>
    );
  };

  return (
    <div className="p-1 sm:p-2 md:p-3">
      <div className="flex flex-col md:flex-row md:items-center md:justify-center gap-2 md:gap-5 lg:gap-8">
        <div className="flex md:hidden flex-col gap-1.5">
          <div className="grid grid-cols-2 items-end justify-items-center gap-2">
            {renderSideAvatarButton(1)}
            {renderSideAvatarButton(2)}
          </div>
          <div className="flex justify-center items-start gap-2">
            {renderSideItems(1, true)}
            {renderSideItems(2, true)}
          </div>
        </div>
        <div className="hidden md:contents">
          <div className="md:order-1 flex-1 md:flex-none flex justify-start md:justify-center">
            {renderSideAvatar(1)}
          </div>
          <div className="md:order-3 flex-1 md:flex-none flex justify-end md:justify-center">
            {renderSideAvatar(2)}
          </div>
        </div>
        <div ref={containerRef} className="relative w-full md:flex-1 min-w-0 md:order-2">

        {/* Start gate (pre-board home) */}
        <div className="mb-2 md:mb-3 flex justify-center">
          <div className="relative">
            <InfoBubble show={infoStep === 2} text={INFO_TEXT.dice} />
          <button
            type="button"
            ref={(el) => (cellRefs.current['START'] = el)}
            onClick={() => onStartClick?.()}
            disabled={rollDisabled}
            aria-label={started ? 'Roll dice' : 'Start'}
            title={started ? 'Roll dice' : 'Start'}
            className={cn(
              'relative h-16 w-32 sm:h-20 sm:w-40 md:h-24 md:w-44 rounded-lg border-2 border-dashed border-emerald-400/60 bg-emerald-500/10 flex items-center justify-center transition-all',
              rollDisabled
                ? 'opacity-40 cursor-not-allowed'
                : 'cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-400 active:scale-95'
            )}
          >
            <div className="flex flex-col items-center gap-0.5 md:gap-1 text-[10px] md:text-xs font-semibold text-emerald-400">
              {currentPlayerName && (
                <span className="max-w-[7rem] md:max-w-[8rem] truncate">{currentPlayerName}</span>
              )}
              <Dice6 className="h-4 w-4 md:h-6 md:w-6" />
              <span>{started ? 'ROLL DICE' : 'START'}</span>
            </div>
          </button>
          </div>
        </div>

        <div className="space-y-1 sm:space-y-2 md:space-y-3">
          {LAYOUT.map((row, ri) => (
            <div key={ri} className="grid grid-cols-8 gap-1 sm:gap-2 md:gap-3">
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
    </div>
  );
};

