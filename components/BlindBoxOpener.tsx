
import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Scissors, Gift, PackageOpen, Box } from 'lucide-react';
import { Character, CollectionTheme } from '../types';

interface BlindBoxOpenerProps {
  character: Character;
  theme: CollectionTheme | null;
  themeCharacters: Character[];
  userCollection: Character[];
  onComplete: () => void;
}

type OpenState = 'box-sealed' | 'box-tearing' | 'finished';

const BlindBoxOpener: React.FC<BlindBoxOpenerProps> = ({ character, theme, themeCharacters, userCollection, onComplete }) => {
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
      className="fixed inset-0 z-[100] bg-stone-950 flex items-center justify-center p-8 lg:p-12 overflow-hidden select-none"
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* Immersive Background Stage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15)_0%,transparent_50%)] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-stone-900 to-transparent opacity-50"></div>
      </div>

      <div className="relative w-full max-w-7xl h-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20 z-10">

        {/* Left: Opening Experience */}
        <div className="flex-1 flex flex-col items-center justify-center relative perspective-[2000px]">
          {/* Step 1 & 2: The Generated Box Art (Bigger & 3D) */}
          {(step === 'box-sealed' || step === 'box-tearing') && (
            <div
              className={`relative w-[350px] md:w-[450px] aspect-[4/5] transition-all duration-1000 cursor-grab active:cursor-grabbing ${step === 'box-tearing' ? 'scale-[2] opacity-0 blur-2xl' : 'scale-100 md:scale-110'
                }`}
              style={{
                transform: `rotateY(${(tearProgress - 0.5) * 20}deg) rotateX(${isDragging ? 10 : 0}deg)`,
                transformStyle: 'preserve-3d'
              }}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
            >
              <div className="absolute inset-0 bg-white rounded-[4rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.9)] overflow-hidden border-[6px] border-white/30 transform-gpu">
                {theme?.boxImageUrl ? (
                  <img src={theme.boxImageUrl} alt="Packaging" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-stone-900 flex flex-col items-center justify-center gap-6">
                    <Box className="w-24 h-24 text-stone-700 animate-bounce" />
                    <p className="text-xs font-black uppercase tracking-[0.5em] text-stone-500">Premium Series</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.2)] pointer-events-none"></div>
              </div>

              {step === 'box-sealed' && (
                <div className="absolute top-1/2 left-0 w-full -translate-y-1/2 flex items-center justify-center z-50 pointer-events-none">
                  <div className="w-[110%] h-1 bg-white/10 relative overflow-visible">
                    <div
                      className="absolute top-1/2 left-0 h-2 bg-gradient-to-r from-emerald-400 to-white shadow-[0_0_30px_rgba(52,211,153,0.8)] transition-all rounded-full"
                      style={{ width: `${tearProgress * 100}%`, transform: 'translateY(-50%)' }}
                    ></div>
                    <div
                      className="absolute top-1/2 -translate-y-1/2 bg-white p-5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-transform border-4 border-emerald-400/20"
                      style={{
                        left: `calc(${tearProgress * 100}% - 35px)`,
                        transform: `translateY(-50%) scale(${isDragging ? 1.2 : 1}) rotate(${tearProgress * 720}deg)`
                      }}
                    >
                      <Scissors className="w-8 h-8 text-stone-900" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: The Masterpiece Reveal (Bigger & Epic) */}
          {step === 'finished' && (
            <div className="relative w-[350px] md:w-[450px] aspect-square animate-in zoom-in-50 duration-1000 ease-out flex flex-col items-center">
              <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-40 blur-[120px] animate-pulse scale-150"></div>
              <div className="absolute inset-0 bg-white rounded-full opacity-10 blur-[60px] animate-ping"></div>
              <div className="relative w-full h-full rounded-[4rem] md:rounded-[5rem] overflow-hidden border-[12px] border-white shadow-[0_80px_160px_-30px_rgba(0,0,0,0.7)] z-10 bg-white">
                <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
              <div className="absolute -top-12 -right-12 bg-white text-emerald-600 p-6 md:p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-bounce border-4 border-stone-50 z-20">
                <Sparkles className="w-10 h-10 md:w-14 md:h-14 fill-emerald-50" />
              </div>
              <div className="absolute -bottom-40 md:-bottom-48 left-1/2 -translate-x-1/2 text-center w-[300px] md:w-[500px] space-y-6 z-20">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.5em] text-emerald-400">{character.rarity} find unlocked</span>
                  <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)] leading-none italic">{character.name}</h2>
                </div>
                <div className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-3xl px-10 py-4 rounded-full border border-white/20 shadow-2xl">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${character.rarity === 'Legendary' ? 'bg-rose-400 shadow-[0_0_15px_rgba(251,113,133,0.8)]' :
                    character.rarity === 'Rare' ? 'bg-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.8)]' :
                      'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]'
                    }`}></div>
                  <span className="text-xs font-black uppercase tracking-widest text-white">{character.rarity} EDITION</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Collection Progress */}
        <div className="w-full lg:w-[400px] shrink-0 bg-white/5 backdrop-blur-3xl rounded-[3.5rem] p-8 md:p-10 border border-white/10 shadow-2xl flex flex-col gap-8">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500 block">Series Collection</span>
            <h3 className="text-3xl font-black text-white tracking-tighter">{theme?.name || 'Unknown Series'}</h3>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {themeCharacters.map((char, i) => {
              const isCollected = userCollection.some(c => c.name === char.name && c.themeId === theme?.id);
              return (
                <div key={i} className="space-y-3 group">
                  <div className={`aspect-square rounded-[2rem] border transition-all duration-500 overflow-hidden relative flex items-center justify-center p-3 ${isCollected ? 'bg-white border-white/20 shadow-xl' : 'bg-white/5 border-white/5 grayscale opacity-30 group-hover:opacity-50'
                    }`}>
                    {char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                    ) : (
                      <PackageOpen className="w-8 h-8 text-white/10" />
                    )}
                    {!isCollected && <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"></div>}
                  </div>
                  <div className="text-center px-1">
                    <p className={`text-[10px] font-black tracking-tight truncate mb-0.5 ${isCollected ? 'text-white' : 'text-stone-600'}`}>
                      {char.name}
                    </p>
                    <p className={`text-[7px] font-black uppercase tracking-widest ${char.rarity === 'Legendary' ? 'text-rose-500' :
                      char.rarity === 'Rare' ? 'text-amber-500' :
                        'text-emerald-500'
                      }`}>{char.rarity}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Progess</span>
              <span className="text-xl font-black text-white">
                {themeCharacters.filter(tc => userCollection.some(uc => uc.name === tc.name && uc.themeId === theme?.id)).length} / {themeCharacters.length}
              </span>
            </div>
          </div>
        </div>

      </div>

      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 max-w-xs text-center z-50">
        <p className="text-stone-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">
          {step === 'box-sealed' && "Slash horizontally to open"}
          {step === 'finished' && "New character identified"}
        </p>
      </div>
    </div>
  );
};

export default BlindBoxOpener;
