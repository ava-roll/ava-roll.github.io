import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVideo } from '@/lib/media';

interface ImageStackProps {
  player: 1 | 2;
  stack: Array<{ gif: string; cellNumber: number }>;
  onClose: () => void;
}

export const ImageStack: React.FC<ImageStackProps> = ({ player, stack, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<{ gif: string; cellNumber: number } | null>(null);

  return (
    <>
      {/* Main Stack Dialog */}
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl">
              Player {player}'s Collection ({stack.length} images)
            </DialogTitle>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            {stack.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">🎲</div>
                <p>No images collected yet!</p>
                <p className="text-sm mt-2">Start playing to collect GIFs from the board.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stack.map((item, index) => (
                  <div
                    key={index}
                    className={cn(
                      'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200',
                      'hover:scale-105 hover:shadow-lg',
                      player === 1 ? 'border-player-1/30 hover:border-player-1' : 'border-player-2/30 hover:border-player-2'
                    )}
                    onClick={() => setSelectedImage(item)}
                  >
                    {isVideo(item.gif) ? (
                      <video
                        src={item.gif}
                        muted
                        loop
                        playsInline
                        autoPlay
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <img
                        src={item.gif}
                        alt={`Cell ${item.cellNumber}`}
                        className="w-full aspect-square object-cover"
                      />
                    )}
                    
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 flex items-center justify-center">
                      <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                    
                    {/* Cell Number Badge */}
                    <div className={cn(
                      'absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold text-white',
                      player === 1 ? 'bg-player-1' : 'bg-player-2'
                    )}>
                      Cell {item.cellNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Large Image View Dialog */}
      {selectedImage && (
        <Dialog open={true} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-2">
            <div className="relative h-full flex items-center justify-center">
              <Button
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2 z-10"
                onClick={() => setSelectedImage(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              
              <div className="text-center">
                {isVideo(selectedImage.gif) ? (
                  <video
                    src={selectedImage.gif}
                    autoPlay
                    loop
                    playsInline
                    controls
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={selectedImage.gif}
                    alt={`Cell ${selectedImage.cellNumber}`}
                    className="max-w-full max-h-[80vh] object-contain rounded-lg"
                  />
                )}
                <div className="mt-4">
                  <div className={cn(
                    'inline-block px-4 py-2 rounded text-sm font-semibold text-white',
                    player === 1 ? 'bg-player-1' : 'bg-player-2'
                  )}>
                    Collected from Cell {selectedImage.cellNumber}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};