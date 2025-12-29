
import React, { useState } from 'react';
import { Coins, Sparkles } from 'lucide-react';

interface CoinClickerProps {
  onEarn: (amount: number) => void;
}

const CoinClicker: React.FC<CoinClickerProps> = ({ onEarn }) => {
  const [clicks, setClicks] = useState(0);
  const [activeEffects, setActiveEffects] = useState<{ id: number; x: number; y: number }[]>([]);

  const handleClick = (e: React.MouseEvent) => {
    setClicks(prev => prev + 1);
    onEarn(1);
    
    const id = Date.now();
    setActiveEffects(prev => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => {
      setActiveEffects(prev => prev.filter(eff => eff.id !== id));
    }, 1000);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border-4 border-yellow-400 max-w-md mx-auto relative overflow-hidden">
      <h2 className="text-2xl font-bold text-yellow-600 mb-4 flex items-center gap-2">
        <Coins className="w-8 h-8" /> Coin Generator
      </h2>
      <p className="text-gray-600 mb-8 text-center">Click the magical coin to earn currency for blind boxes!</p>
      
      <button 
        onClick={handleClick}
        className="relative group focus:outline-none transition-transform active:scale-95"
      >
        <div className="absolute inset-0 bg-yellow-400 rounded-full blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
        <div className="w-48 h-48 bg-gradient-to-tr from-yellow-500 to-yellow-300 rounded-full flex items-center justify-center shadow-2xl border-8 border-yellow-200">
          <Coins className="w-24 h-24 text-white drop-shadow-lg" />
        </div>
      </button>

      <div className="mt-8 text-center">
        <span className="text-4xl font-black text-yellow-500">{clicks}</span>
        <p className="text-sm font-medium text-yellow-700 uppercase tracking-widest">Coins Generated</p>
      </div>

      {activeEffects.map(eff => (
        <div 
          key={eff.id}
          className="fixed pointer-events-none animate-bounce text-yellow-500 font-bold text-xl"
          style={{ left: eff.x, top: eff.y - 20 }}
        >
          +1 <Sparkles className="inline w-4 h-4" />
        </div>
      ))}
    </div>
  );
};

export default CoinClicker;
