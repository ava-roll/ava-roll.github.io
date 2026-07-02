## Goal
Make the game look and play well on mobile (portrait) while keeping the current desktop layout. Enforce square cells everywhere, and on small screens move the two side avatar/items panels above the board so the screen reads vertically.

## Changes (all in `src/components/GameBoard.tsx`, no logic changes)

### 1. Responsive layout wrapper
Replace the single horizontal flex row with a responsive layout:
- Mobile (`< md`): a vertical stack — top row of the two avatar/items panels side by side, then the board below.
- Desktop (`≥ md`): current layout (Player 1 | Board | Player 2 in a row).

Structure:
```
<div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-8">
  <div className="flex md:contents flex-row justify-between gap-2">
     {renderSideAvatar(1)}   {/* on desktop, md:contents places them in row */}
     {renderSideAvatar(2)}   {/* on mobile, this wrapper keeps them side-by-side on top */}
  </div>
  <div ref={containerRef} className="relative flex-1 min-w-0 order-last md:order-none">
     ...board...
  </div>
</div>
```
Use `md:contents` so on desktop the wrapper disappears and P1 lands left of the board, P2 right (via `order-*` classes on the avatars and board).

### 2. Compact side panels on mobile
`renderSideAvatar` currently uses `w-24 sm:w-36 md:w-48`. On mobile the panel is now on top, so make it horizontal and compact:
- Row layout on mobile (avatar left, items grid right); column layout on desktop as today.
- Smaller avatar on mobile (`w-16`), items grid becomes `grid-cols-5` in a single row to save vertical space.

### 3. Square cells (always)
The grid already uses `aspect-square`, but the board can overflow horizontally on narrow screens, which distorts perceived sizing. Fix:
- Reduce gap on mobile: `grid grid-cols-8 gap-1 sm:gap-2 md:gap-3`.
- Reduce outer padding on mobile: `p-1 sm:p-2 md:p-3` on the root and cell padding `p-1 sm:p-2`.
- Ensure the board container is width-constrained (`w-full min-w-0`) so the 8 columns shrink to fit; `aspect-square` then guarantees squares.
- Shrink in-cell text (`text-[10px] sm:text-sm`) and shortcut badge (`text-[8px] sm:text-[10px]`) so content fits tiny squares.

### 4. Start/Roll button on mobile
Current `h-24 w-44` is too wide for tight mobile space. Make it responsive: `h-16 w-32 sm:h-20 sm:w-40 md:h-24 md:w-44`. Token START-slot flanking math already derives from the button rect so it adapts automatically.

### 5. Token sizes
Tokens compute from cell rects, so squares → square tokens automatically. No changes needed.

## Out of scope
- No changes to game logic, state, or `BoardGame.tsx`.
- No changes to modals/dialogs (they're already responsive via shadcn).
- No preview viewport switching — user can toggle mobile view with the device button above the preview.

## Verification
After implementing, check the preview at mobile width: board fits without horizontal scroll, all 32 cells are visibly square, avatars + items sit in a compact bar above the board, Start/Roll button is tappable, tokens land correctly on cells and on the START gate.