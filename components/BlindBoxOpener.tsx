
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Scissors, Gift, PackageOpen, Box } from 'lucide-react';
import { Character, CollectionTheme } from '../types';

interface BlindBoxOpenerProps {
  character: Character;
  theme: CollectionTheme | null;
  onComplete: () => void;
}

type OpenState = 'box-sealed' | 'box-tearing' | 'finished';

const BlindBoxOpener: React.FC<BlindBoxOpenerProps> = ({ character, theme, onComplete }) => {
  const [step, setStep] = useState<OpenState>('box-sealed');
  const [isDragging, setIsDragging] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (step !== 'box-sealed') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || step !== 'box-sealed') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (dragStartRef.current) {
      const dx = clientX - dragStartRef.current.x;
      const progress = Math.min(Math.max(Math.abs(dx) / 250, 0), 1);
      setTearProgress(progress);

      if (progress >= 0.95) {
        setIsDragging(false);
        setStep('box-tearing');
        setTimeout(() => {
          setStep('finished');
          setTimeout(onComplete, 4000);
        }, 1200);
      }
    }
  };

  const handleEnd = () => {
    setIsDragging(false);
    if (tearProgress < 0.95) {
      setTearProgress(0);
    }
  };

  // Bag handlers removed

  return (
    <div
      className="fixed inset-0 z-[100] bg-stone-950 flex flex-col items-center justify-center p-8 overflow-hidden select-none"
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <div className="relative w-80 h-96 flex items-center justify-center">

        {/* Step 1 & 2: The Generated Box Art */}
        {(step === 'box-sealed' || step === 'box-tearing') && (
          <div
            className={`relative w-72 h-80 transition-all duration-1000 ${step === 'box-tearing' ? 'scale-125 opacity-0 blur-xl' : 'scale-100'}`}
            onMouseDown={handleStart}
            onTouchStart={handleStart}
          >
            <div className="absolute inset-0 bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] overflow-hidden border-4 border-white/20">
              {theme?.boxImageUrl ? (
                <img src={theme.boxImageUrl} alt="Packaging" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center gap-4">
                  <Box className="w-16 h-16 text-stone-700 animate-pulse" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600">Themed Blind Box</p>
                </div>
              )}
              {/* Reflection Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
            </div>

            {/* Tear Line Indicator */}
            {step === 'box-sealed' && (
              <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-[120%] h-0.5 border-b-2 border-dashed border-white/30 relative">
                  <div
                    className="absolute top-1/2 left-0 h-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all rounded-full"
                    style={{ width: `${tearProgress * 100}%`, transform: 'translateY(-50%)' }}
                  ></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 bg-white p-3 rounded-full shadow-2xl transition-transform"
                    style={{ left: `calc(${tearProgress * 100}% - 25px)`, transform: `translateY(-50%) rotate(${tearProgress * 360}deg)` }}
                  >
                    <Scissors className="w-5 h-5 text-stone-900" />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Bag Stage Removed */}

        {/* Step 4: The Masterpiece Reveal */}
        {step === 'finished' && (
          <div className="relative w-80 h-80 animate-in zoom-in-50 duration-1000 ease-out">
            <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-30 blur-[100px] animate-pulse"></div>
            <div className="relative w-full h-full rounded-[4rem] overflow-hidden border-8 border-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)]">
              <img
                src={character.imageUrl}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="absolute -top-10 -right-10 bg-emerald-400 text-stone-900 p-7 rounded-[2.5rem] shadow-2xl animate-bounce border-4 border-white">
              <Sparkles className="w-12 h-12 fill-white" />
            </div>

            <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 text-center w-80 space-y-3">
              <h2 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">{character.name}</h2>
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-2xl px-6 py-2 rounded-full border border-white/30">
                <div className={`w-2 h-2 rounded-full ${character.rarity === 'Legendary' ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {character.rarity} Found
                </span>
              </div>
            </div>
          </div>
        )}

      </div>

      <div className="mt-32 max-w-xs text-center">
        <p className="text-stone-500 font-black uppercase tracking-[0.2em] text-[10px] animate-pulse">
          {step === 'box-sealed' && "Slash to open the shipment..."}
          {step === 'finished' && "A new gem added to your studio!"}
        </p>
      </div>
    </div>
  );
};

export default BlindBoxOpener;
