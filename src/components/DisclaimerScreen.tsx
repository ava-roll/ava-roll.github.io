import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// localStorage key marking that the disclaimer was accepted on this device, so
// it is only shown on first open. Bump the suffix if the disclaimer text
// changes and must be re-shown.
export const DISCLAIMER_STORAGE_KEY = 'ava-roll-disclaimer-accepted-v1';

// All disclaimer copy lives here so it can be edited in one place.
export const DISCLAIMER_TEXT = {
  title: 'Disclaimer',
  // Each string is rendered as its own paragraph, in order.
  body: [
    'This game is intended for entertainment purposes only.',
    'By continuing you confirm that you are of an appropriate age and accept the content shown within.',
    'No data is collected or stored on any server — everything runs locally in your browser.',
  ],
  acceptLabel: 'Accept',
  declineLabel: 'Decline',
  // Shown after the user declines.
  declinedTitle: 'Access Declined',
  declinedBody: 'You need to accept the disclaimer to play. You can change your mind below.',
  reconsiderLabel: 'Go Back',
} as const;

interface DisclaimerScreenProps {
  onAccept: () => void;
}

export const DisclaimerScreen: React.FC<DisclaimerScreenProps> = ({ onAccept }) => {
  const [declined, setDeclined] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-4">
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border-2 border-border bg-card/90 px-8 py-10 text-center shadow-2xl">
        {declined ? (
          <>
            <h2 className="text-3xl font-bold text-player-1">{DISCLAIMER_TEXT.declinedTitle}</h2>
            <p className="text-muted-foreground">{DISCLAIMER_TEXT.declinedBody}</p>
            <Button
              onClick={() => setDeclined(false)}
              variant="outline"
              className="mt-2 px-8 py-4 text-lg"
            >
              {DISCLAIMER_TEXT.reconsiderLabel}
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-foreground">{DISCLAIMER_TEXT.title}</h2>
            <div className="flex flex-col gap-3 text-muted-foreground">
              {DISCLAIMER_TEXT.body.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-2 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                onClick={() => setDeclined(true)}
                variant="secondary"
                className="px-8 py-4 text-lg sm:flex-1"
              >
                {DISCLAIMER_TEXT.declineLabel}
              </Button>
              <Button
                onClick={onAccept}
                className={cn(
                  'px-8 py-4 text-lg font-bold sm:flex-1',
                  'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                )}
              >
                {DISCLAIMER_TEXT.acceptLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
