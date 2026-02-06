
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sparkles, Scissors, Gift, PackageOpen, Box, ArrowRight, Coins, HelpCircle } from 'lucide-react';
import { Character, CollectionTheme } from '../types';

interface BlindBoxOpenerProps {
  character: Character;
  theme: CollectionTheme | null;
  themeCharacters: Character[];
  userCollection: Character[];
  onComplete: () => void;
  onNext?: () => void;
  onBuyMore?: () => void;
  hasNext?: boolean;
  currentCoins?: number;
}

type OpenState = 'box-sealed' | 'box-tearing' | 'finished';

const BlindBoxOpener: React.FC<BlindBoxOpenerProps> = ({ character, theme, themeCharacters, userCollection, onComplete, onNext, onBuyMore, hasNext, currentCoins }) => {
  const [step, setStep] = useState<OpenState>('box-sealed');
  const [isDragging, setIsDragging] = useState(false);
  const [tearProgress, setTearProgress] = useState(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const ripSoundRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRipSound = useRef(false);

  // Initialize ripping sound
  useEffect(() => {
    // Local paper tear sound
    ripSoundRef.current = new Audio('/src/components/greatnessdon-tearing-paper-193827.mp3');
    ripSoundRef.current.volume = 0.7;
    ripSoundRef.current.play();
    ripSoundRef.current.load();
    console.log('[BlindBoxOpener] Rip sound initialized');
    return () => {
      if (ripSoundRef.current) {
        ripSoundRef.current.pause();
        ripSoundRef.current = null;
      }
    };
  }, []);

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (step !== 'box-sealed') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY };
    setIsDragging(true);
    hasPlayedRipSound.current = false;
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || step !== 'box-sealed') return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    if (dragStartRef.current) {
      const dx = clientX - dragStartRef.current.x;
      const progress = Math.min(Math.max(Math.abs(dx) / 250, 0), 1);
      setTearProgress(progress);

      // Play ripping sound when tear starts (first 2 seconds only)
      if (progress > 0.1 && !hasPlayedRipSound.current && ripSoundRef.current) {
        console.log('[BlindBoxOpener] Playing rip sound');
        ripSoundRef.current.currentTime = 0;
        ripSoundRef.current.play()
          .then(() => {
            // Stop after 2 seconds
            setTimeout(() => {
              if (ripSoundRef.current) {
                ripSoundRef.current.pause();
              }
            }, 2000);
          })
          .catch(err => console.warn('[BlindBoxOpener] Sound play failed:', err));
        hasPlayedRipSound.current = true;
      }

      if (progress >= 0.95) {
        setIsDragging(false);
        setStep('box-tearing');
        setTimeout(() => {
          setStep('finished');
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-8 lg:pt-16 p-4 overflow-hidden select-none"
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      {/* Animated Purple Gradient Background */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-purple-900 via-pink-600 to-blue-500 opacity-90"></div>
      <div className="absolute inset-0 -z-20 bg-gradient-to-tl from-cyan-400 via-purple-500 to-pink-500 opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
      <div className="absolute inset-0 -z-20 backdrop-blur-3xl bg-black/10"></div>

      {/* Top Right Coins */}
      {currentCoins !== undefined && (
        <div className="absolute top-8 right-8 z-[100] bg-stone-900 border border-stone-800 px-6 py-3 rounded-full flex items-center gap-3 shadow-xl">
          <Coins className="w-5 h-5 text-yellow-300" />
          <span className="font-black text-white text-lg tracking-tight">{currentCoins}</span>
        </div>
      )}

      {/* Immersive Background Stage */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_50%)] animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent opacity-50"></div>
      </div>

      <div className="relative w-full max-w-6xl h-full flex flex-col lg:flex-row items-start lg:items-center gap-8 lg:gap-16 z-10">

        {/* Left: Opening Experience */}
        <div className="flex-1 flex flex-col items-center justify-center relative perspective-[2000px]">
          {/* Step 1 & 2: The Generated Box Art (Bigger & 3D) */}
          {(step === 'box-sealed' || step === 'box-tearing') && (
            <div
              className={`relative w-[280px] md:w-[340px] aspect-[4/5] transition-all duration-1000 cursor-grab active:cursor-grabbing ${step === 'box-tearing' ? 'scale-[2] opacity-0 blur-2xl' : 'scale-100'
                }`}
              style={{
                transform: `rotateY(${(tearProgress - 0.5) * 20}deg) rotateX(${isDragging ? 10 : 0}deg)`,
                transformStyle: 'preserve-3d'
              }}
              onMouseDown={handleStart}
              onTouchStart={handleStart}
            >
              <div className="absolute inset-0 bg-white/10 backdrop-blur-xl rounded-[4rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.5)] overflow-hidden border-[6px] border-white/20 transform-gpu">
                {theme?.boxImageUrl ? (
                  <img src={theme.boxImageUrl} alt="Packaging" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-white/5 flex flex-col items-center justify-center gap-6">
                    <Box className="w-24 h-24 text-white/20 animate-bounce" />
                    <p className="text-xs font-black uppercase tracking-[0.5em] text-white/40">Premium Series</p>
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
                      className="absolute top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-md p-5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-transform border-4 border-emerald-400/30"
                      style={{
                        left: `calc(${tearProgress * 100}% - 35px)`,
                        transform: `translateY(-50%) scale(${isDragging ? 1.2 : 1}) rotate(${tearProgress * 720}deg)`
                      }}
                    >
                      <Scissors className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}



          {/* Step 4: The Masterpiece Reveal (Fixed Layout) */}
          {step === 'finished' && (
            <div className="relative w-[280px] md:w-[340px] flex flex-col items-center animate-in zoom-in-50 duration-1000 ease-out">

              {/* Character Card */}
              <div className="relative w-full aspect-square mb-6">
                <div className="absolute inset-0 bg-emerald-500 rounded-full opacity-40 blur-[100px] animate-pulse scale-125"></div>
                <div className="relative w-full h-full rounded-[3rem] overflow-hidden border-[8px] border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] z-10 bg-stone-900">
                  <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover animate-in fade-in duration-1000" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                </div>
                <div className="absolute -top-6 -right-6 bg-white/20 backdrop-blur-xl text-emerald-300 p-4 rounded-[2rem] shadow-xl animate-bounce border-2 border-white/30 z-20">
                  <Sparkles className="w-8 h-8 fill-emerald-100" />
                </div>
              </div>

              {/* Text Content (Flows naturally below image, no absolute overlap) */}
              <div className="text-center w-[300px] space-y-4 z-20">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-300 drop-shadow-md">{character.rarity} find unlocked</span>
                  <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-md leading-none italic">{character.name}</h2>
                </div>
                <div className="inline-flex items-center gap-3 bg-stone-900 px-8 py-3 rounded-full border border-stone-800 shadow-xl">
                  <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${character.rarity === 'Legendary' ? 'bg-rose-400' : character.rarity === 'Rare' ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">{character.rarity} EDITION</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Collection Progress (Compact) */}
        <div className="w-full lg:w-[320px] shrink-0 bg-stone-900 rounded-[2.5rem] p-6 md:p-8 border border-stone-800 shadow-2xl flex flex-col gap-6">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 block">Series Collection</span>
            <h3 className="text-2xl font-black text-white tracking-tighter drop-shadow-md">{theme?.name || 'Unknown Series'}</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {useMemo(() => {
              const rarityOrder: Record<string, number> = { 'Common': 1, 'Rare': 2, 'Legendary': 3 };
              return [...themeCharacters].sort((a, b) => (rarityOrder[a.rarity] || 99) - (rarityOrder[b.rarity] || 99));
            }, [themeCharacters]).map((char, i) => {
              // Check if collected in user collection OR if it's the one we just revealed
              const isCollected = userCollection.some(c => c.name === char.name && c.themeId === theme?.id) ||
                (char.name === character.name && step === 'finished');
              const isMystery = char.rarity === 'Legendary' && !isCollected;

              return (
                <div key={i} className="space-y-1.5 group">
                  <div className={`aspect-square rounded-[1.5rem] border transition-all duration-500 overflow-hidden relative flex items-center justify-center p-2 ${isCollected ? 'bg-white/20 backdrop-blur-md border-white/30 shadow-xl' : 'bg-white/5 border-white/5 opacity-50'
                    }`}>
                    {isMystery ? (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-500/50 via-purple-500/50 to-pink-500/50 rounded-[1.5rem] flex items-center justify-center relative overflow-hidden backdrop-blur-sm">
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubeico.png')] opacity-20"></div>
                        <HelpCircle className="w-8 h-8 text-white animate-pulse" />
                      </div>
                    ) : char.imageUrl ? (
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover rounded-[1.5rem]" />
                    ) : (
                      <PackageOpen className="w-8 h-8 text-white/10" />
                    )}
                  </div>
                  <div className="text-center px-1">
                    <p className={`text-[10px] font-black tracking-tight truncate mb-0.5 ${isCollected ? 'text-white' : isMystery ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-pink-300' : 'text-white/40'}`}>
                      {isMystery ? '???' : char.name}
                    </p>
                    <p className={`text-[7px] font-black uppercase tracking-widest ${char.rarity === 'Legendary' ? 'text-rose-400' :
                      char.rarity === 'Rare' ? 'text-amber-400' :
                        'text-emerald-400'
                      }`}>{char.rarity}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex justify-between items-center bg-white/5 px-6 py-4 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Progess</span>
              <span className="text-xl font-black text-white">
                {themeCharacters.filter(tc =>
                  userCollection.some(uc => uc.name === tc.name && uc.themeId === theme?.id) ||
                  (tc.name === character.name && step === 'finished')
                ).length} / {themeCharacters.length}
              </span>
            </div>
          </div>
        </div>

      </div>



      {/* Action Buttons for Finished State */}
      {step === 'finished' && (
        <div className="absolute bottom-10 z-[60] flex gap-4 animate-in slide-in-from-bottom-10 fade-in duration-700 delay-500">
          {!hasNext && (
            <button
              onClick={onComplete}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all backdrop-blur-md"
            >
              Collect & Exit
            </button>
          )}
          {hasNext ? (
            <button
              onClick={onNext}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-[0_0_30px_rgba(16,185,129,0.5)] transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Open Next Box <ArrowRight className="w-4 h-4" />
            </button>
          ) : onBuyMore ? (
            <button
              onClick={onBuyMore}
              className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white border border-white/30 px-8 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all shadow-lg transform hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              Buy Another <Sparkles className="w-4 h-4 text-emerald-400" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default BlindBoxOpener;
