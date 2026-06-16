import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const maleModules = import.meta.glob('@/assets/avatars/male/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;
const femaleModules = import.meta.glob('@/assets/avatars/female/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export type Gender = 'male' | 'female';
export type Avatar = { name: string; url: string; gender: Gender };

const toAvatars = (mods: Record<string, string>, gender: Gender): Avatar[] =>
  Object.entries(mods)
    .map(([path, url]) => {
      const file = path.split('/').pop() || '';
      const name = file.replace(/\.[^.]+$/, '');
      return { name, url, gender };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const maleAvatars = toAvatars(maleModules, 'male');
export const femaleAvatars = toAvatars(femaleModules, 'female');
export const allAvatars = [...maleAvatars, ...femaleAvatars];

// Progression images live in per-character folders:
//   src/assets/avatars/<gender>/<Name>/<bits>.<ext>   e.g. male/Albatros/01001.png
// where <bits> is the 5-char dice-tracking string. Keyed as "gender/name/bits".
const progressionModules = import.meta.glob(
  '@/assets/avatars/*/*/*.{png,jpg,jpeg,webp,gif}',
  { eager: true, query: '?url', import: 'default' }
) as Record<string, string>;

const progressionMap: Record<string, string> = {};
for (const [path, url] of Object.entries(progressionModules)) {
  const parts = path.split('/');
  const file = parts.pop() || '';
  const name = parts.pop() || '';
  const gender = parts.pop() || '';
  const bits = file.replace(/\.[^.]+$/, '');
  progressionMap[`${gender}/${name}/${bits}`] = url;
}

// Returns the progression image URL for a character at the given bit-string,
// or null if no such file exists (caller should then leave the avatar unchanged).
export const progressionImageFor = (
  gender: Gender,
  name: string,
  bits: string
): string | null => progressionMap[`${gender}/${name}/${bits}`] ?? null;

// Item images live in the same per-character folder, named either "<n>.<ext>"
// or "<n>-<Name>.<ext>" (e.g. male/Albatros/3-Bell.png), where <n> is the dice
// face 1-5 and the optional <Name> is shown on the item preview. Keyed
// "gender/name/n". The 5-char progression bit-strings (e.g. 01001) don't match
// the single-digit pattern, so they're naturally excluded here.
export type Item = { url: string; name: string | null };

const itemMap: Record<string, Item> = {};
for (const [path, url] of Object.entries(progressionModules)) {
  const parts = path.split('/');
  const file = parts.pop() || '';
  const charName = parts.pop() || '';
  const gender = parts.pop() || '';
  const stem = file.replace(/\.[^.]+$/, '');
  const m = stem.match(/^([1-5])(?:-(.+))?$/);
  if (!m) continue;
  itemMap[`${gender}/${charName}/${m[1]}`] = { url, name: m[2] ?? null };
}

// Returns the item image + optional display name for a character's dice face
// (1-5), or null if no such file exists.
export const itemFor = (
  gender: Gender,
  name: string,
  num: number
): Item | null => itemMap[`${gender}/${name}/${num}`] ?? null;

// The board (token + side flanks) shows the progression image starting at the
// initial "00000" bit-string (e.g. male/Albatros/00000.png). If that image is
// missing, fall back to the flat portrait (male/Albatros.png). The players
// component and the picker keep the flat portrait itself.
export const INITIAL_BITS = '00000';

export const boardAvatarUrl = (av: Avatar): string =>
  progressionImageFor(av.gender, av.name, INITIAL_BITS) ?? av.url;

export const defaultAvatarFor = (player: 1 | 2): Avatar => {
  const fallback = player === 1 ? maleAvatars[0] : femaleAvatars[0];
  return fallback ?? allAvatars[0];
};

interface AvatarPickerProps {
  player: 1 | 2;
  onSelect: (avatar: Avatar) => void;
  onClose: () => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({ player, onSelect, onClose }) => {
  const Section = ({ title, avatars }: { title: string; avatars: Avatar[] }) => (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {avatars.map((a) => (
          <button
            key={a.url}
            onClick={() => {
              onSelect(a);
              onClose();
            }}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all hover:scale-105',
              player === 1
                ? 'border-player-1/30 hover:border-player-1 hover:bg-player-1/10'
                : 'border-player-2/30 hover:border-player-2 hover:bg-player-2/10'
            )}
          >
            <img src={a.url} alt={a.name} className="w-16 h-16 object-contain" />
            <span className="text-xs font-medium truncate w-full text-center">{a.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choose an avatar for Player {player}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2">
          {maleAvatars.length > 0 && <Section title="Male" avatars={maleAvatars} />}
          {femaleAvatars.length > 0 && <Section title="Female" avatars={femaleAvatars} />}
        </div>
      </DialogContent>
    </Dialog>
  );
};
