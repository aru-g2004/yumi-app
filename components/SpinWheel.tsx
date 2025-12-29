import React, { useState } from 'react';
import { X, Sparkles, Trophy } from 'lucide-react';

interface SpinWheelProps {
    onWin: (amount: number) => void;
    onClose: () => void;
}

const SEGMENTS = [
    { value: 50, color: 'bg-stone-200' },
    { value: 200, color: 'bg-emerald-200' },
    { value: 100, color: 'bg-stone-300' },
    { value: 500, color: 'bg-rose-300' },
    { value: 100, color: 'bg-stone-200' },
    { value: 1000, color: 'bg-amber-300' },
    { value: 50, color: 'bg-stone-300' },
    { value: 300, color: 'bg-emerald-300' },
];

const SpinWheel: React.FC<SpinWheelProps> = ({ onWin, onClose }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [wonAmount, setWonAmount] = useState<number | null>(null);

    const handleSpin = () => {
        if (isSpinning || wonAmount) return;

        setIsSpinning(true);
        // Random rotations (min 5 full spins + random segment)
        // Each segment is 360 / 8 = 45 degrees
        // To land on a specific segment, we need to calculate the angle.
        // For now, let's just spin to a random angle.
        const fullSpins = 360 * 5;
        const randomAngle = Math.floor(Math.random() * 360);
        const totalRotation = fullSpins + randomAngle;

        setRotation(totalRotation);

        setTimeout(() => {
            setIsSpinning(false);
            // Calculate winning segment
            // The wheel rotates clockwise. The pointer is usually at the top (0 degrees).
            // If we rotate X degrees, the segment at the top is determined by (360 - (X % 360)).
            // Let's simplify: normalized rotation = totalRotation % 360.
            // Top position is 0. 
            // If we rotate 45 degrees, the segment at -45 (or 315) is now at the top.
            const normalizedRotation = totalRotation % 360;
            const segmentAngle = 360 / SEGMENTS.length; // 45
            // Index = floor((360 - normalizedRotation + offset) / segmentAngle) % length
            // Let's assume standard positioning where index 0 starts at 0 degrees (top) and goes clockwise?
            // CSS rotate rotates the element. 
            // If index 0 is at the top initially.
            // Rotate 45deg -> index 7 (last one) moves to top? No, index 0 moves to right.
            // Wait, rotate(90deg) moves top to right.
            // So pointer at top reads index:
            // (Total Segments - (Rotation / SegmentAngle)) % Total Segments
            const winningIndex = Math.floor((360 - normalizedRotation + (segmentAngle / 2)) / segmentAngle) % SEGMENTS.length;

            const winningValue = SEGMENTS[winningIndex].value;
            setWonAmount(winningValue);
            setTimeout(() => onWin(winningValue), 500); // Small delay for user to see result
        }, 4000); // Match CSS transition duration
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] p-8 shadow-2xl max-w-md w-full relative border border-white/50">
                <button
                    onClick={onClose}
                    disabled={isSpinning}
                    className="absolute top-6 right-6 p-2 bg-stone-100 rounded-full hover:bg-stone-200 transition-colors disabled:opacity-50"
                >
                    <X className="w-5 h-5 text-stone-500" />
                </button>

                <div className="text-center mb-8">
                    <div className="inline-block bg-amber-100 p-4 rounded-full mb-4">
                        <Trophy className="w-8 h-8 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter">Daily Spin</h2>
                    <p className="text-stone-400 font-medium">Test your luck for bonus credits!</p>
                </div>

                <div className="relative w-64 h-64 mx-auto mb-8">
                    {/* Pointer */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="w-8 h-8 bg-stone-900 rotate-45 transform origin-center border-4 border-white shadow-lg rounded-sm"></div>
                    </div>

                    {/* Wheel */}
                    <div
                        className="w-full h-full rounded-full overflow-hidden border-8 border-bg-stone-50 shadow-inner relative transition-transform cubic-bezier(0.1, 0.7, 1.0, 0.1)"
                        style={{
                            transform: `rotate(${rotation}deg)`,
                            transition: isSpinning ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                        }}
                    >
                        {/* Render Segments using conic-gradient or absolute positioning. 
               Absolute positioning slices is easier for content. 
           */}
                        {SEGMENTS.map((seg, i) => {
                            const angle = 360 / SEGMENTS.length;
                            return (
                                <div
                                    key={i}
                                    className={`absolute top-0 right-0 w-1/2 h-1/2 origin-bottom-left flex items-start justify-end pr-8 pt-4 font-black text-stone-700/60 ${seg.color}`}
                                    style={{
                                        transform: `rotate(${i * angle - (angle / 2)}deg) skewY(-${90 - angle}deg)`,
                                        // We need to un-skew content? This approach is tricky for text.
                                        // Simpler approach: Conic gradient for background, absolute text for values.
                                    }}
                                >
                                </div>
                            );
                        })}

                        {/* Text Overlay - simpler to just place rotated text containers */}
                        {SEGMENTS.map((seg, i) => {
                            const angle = 360 / SEGMENTS.length;
                            const rotation = i * angle;
                            return (
                                <div
                                    key={`text-${i}`}
                                    className="absolute inset-0 flex justify-center pt-4"
                                    style={{ transform: `rotate(${rotation}deg)` }}
                                >
                                    <span className="font-black text-stone-600/80 text-sm">{seg.value}</span>
                                </div>
                            )
                        })}
                    </div>

                    {/* Center Pin */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-md z-10"></div>
                </div>

                <div className="text-center">
                    {wonAmount ? (
                        <div className="animate-in zoom-in duration-300">
                            <p className="text-2xl font-black text-emerald-500 mb-4">You won {wonAmount}!</p>
                            <button onClick={onClose} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg hover:bg-emerald-400 transition-all">
                                Collect
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleSpin}
                            disabled={isSpinning}
                            className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest shadow-lg hover:bg-stone-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSpinning ? <Sparkles className="w-5 h-5 animate-spin" /> : 'Spin Now'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SpinWheel;
