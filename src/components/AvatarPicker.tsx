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

export type Avatar = { name: string; url: string };

const toAvatars = (mods: Record<string, string>): Avatar[] =>
  Object.entries(mods)
    .map(([path, url]) => {
      const file = path.split('/').pop() || '';
      const name = file.replace(/\.[^.]+$/, '');
      return { name, url };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

export const maleAvatars = toAvatars(maleModules);
export const femaleAvatars = toAvatars(femaleModules);
export const allAvatars = [...maleAvatars, ...femaleAvatars];

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
