# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Board Game Adventure" (repo: Ava-Roll) — a single-page, two-player dice board game. Players roll, move along a 32-cell snake board, hit shortcuts, and reveal per-cell media rewards. Scaffolded by [Lovable](https://lovable.dev/projects/8d9dfc2f-380f-4868-b836-7d03ac468784); changes pushed here also sync back to Lovable. There is no backend, router has a single real route, and there are no tests.

## Commands

```sh
npm i                 # install (npm is canonical despite bun.lockb being present)
npm run dev           # Vite dev server on http://localhost:8080
npm run build         # production build to dist/
npm run build:dev     # build in development mode (keeps lovable-tagger)
npm run lint          # eslint over the repo
npm run deploy        # predeploy builds + copies index.html->404.html, then gh-pages -b gh-pages
```

Deploys to GitHub Pages. The `404.html` copy is what makes client-side routing work on Pages (SPA fallback). `BrowserRouter` uses `basename={import.meta.env.BASE_URL}`, driven by `base` in `vite.config.ts` — if the Pages path changes, update `base` there.

## Architecture

Stack: Vite + React 18 + TypeScript + shadcn-ui (Radix) + Tailwind. `@/` aliases `src/`. TS is loose (`strict: false`, `noImplicitAny: false`); eslint disables `no-unused-vars`.

`src/components/ui/*` is the stock shadcn component library — generally don't edit it. The actual app is four components:

- **`BoardGame.tsx`** — the single source of truth. Holds the entire `GameState` (see the exported interface) plus all UI/modal state in one component, and owns every game action: `rollDice` → `confirmDice` → `movePlayer` → `revealGIF` → `nextTurn`. All other components are presentational and receive callbacks/props from here.
- **`GameBoard.tsx`** — renders the board grid and absolutely-positioned player tokens. Token positions are computed from real DOM cell rects via refs + `useLayoutEffect` (not CSS grid math), so tokens animate smoothly between cells. The `LAYOUT` constant defines the snake order (rows alternate direction so consecutive cells are physically adjacent).
- **`AvatarPicker.tsx`** — avatar selection modal; also exports the avatar/progression resolution helpers (`defaultAvatarFor`, `progressionImageFor`).
- **`ImageStack.tsx`** — the per-player collected-rewards gallery.

### Asset conventions (important)

Content is wired up by `import.meta.glob` over the filesystem — **dropping a correctly-named file into a folder makes it appear in-game; no code change needed.** The naming is load-bearing:

- **Cell rewards:** `src/assets/gifs/player{1,2}/cell{N}/*` (images or video — `mp4/webm/mov`). A cell with multiple files picks one at random on reveal. Fallback per player: `src/assets/gifs/player{1,2}/default.*`.
- **Avatars:** `src/assets/avatars/{male,female}/<Name>.png` — filename (minus extension) becomes the display name.
- **Avatar progression:** `src/assets/avatars/<gender>/<Name>/<bits>.png`, where `<bits>` is the 5-char dice-tracking string (e.g. `01001`). When a player's tracked dice state changes, the avatar swaps to the matching file if one exists, otherwise stays unchanged.

### Game mechanics worth knowing

- `BOARD_SIZE = 32`. `SHORTCUTS` (in `BoardGame.tsx`) maps a landed cell to the cell the player *starts their next turn from* (stored as `playerNNextStart`, applied via a shrink/teleport/grow animation in `movePlayer`).
- **Dice tracking / items:** each player has a 5-element `diceTrack` (faces 1–5). Faces are only recorded from a player's **2nd roll** onward (`rollCount >= 2`). Rolling a 6 fills the whole array at once. This drives both the items count and avatar progression.
- **Animation timing is coupled:** `CROSS_ANIM_MS` is exported from `GameBoard.tsx` and `BoardGame.tsx` waits exactly that long (blocking input via `isAnimatingCross`) before resuming a move, so the dice-face cross-out animation is never cut off. Keep these in sync if you change the animation.
- Sound is synthesized at runtime via the Web Audio API in `src/lib/sounds.ts` (no audio asset files).
- Player colors are CSS variables `--player-1` / `--player-2` (in `src/index.css`), exposed to Tailwind as `player-1` / `player-2`.
