import React, { useState } from 'react';
import { Sparkles, ShoppingBag, Trophy, ArrowRight, User as UserIcon, Camera, Check } from 'lucide-react';

interface OnboardingProps {
    onComplete: (studioName: string, profilePic: string) => void;
}

const PRESET_AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi1',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi2',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi3',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi4',
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [studioName, setStudioName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);

    const slides = [
        {
            title: "Create your own collections",
            desc: "Input your vision and watch as we generate unique character series with custom packaging.",
            icon: <Sparkles className="w-12 h-12 text-rose-300" />,
            color: "bg-rose-500/20"
        },
        {
            title: "Collect from the community",
            desc: "Explore public collections from other creators and unbox rare figures.",
            icon: <ShoppingBag className="w-12 h-12 text-emerald-300" />,
            color: "bg-emerald-500/20"
        },
        {
            title: "Earn and Level Up",
            desc: "Complete sets, win daily spins, and earn royalties when others buy your designs.",
            icon: <Trophy className="w-12 h-12 text-amber-300" />,
            color: "bg-amber-500/20"
        },
        {
            title: "Setup your Studio",
            desc: "Choose your studio name and profile picture to get started.",
            icon: <UserIcon className="w-12 h-12 text-blue-300" />,
            color: "bg-blue-500/20"
        }
    ];

    const next = () => {
        if (step < 3) setStep(step + 1);
        else if (studioName.trim()) onComplete(studioName, selectedAvatar);
    };

    return (
        <div className="fixed inset-0 z-[100] bg-stone-900 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Animated Purple Gradient Background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-900 via-pink-600 to-blue-500 opacity-90"></div>
            <div className="fixed inset-0 -z-10 bg-gradient-to-tl from-cyan-400 via-purple-500 to-pink-500 opacity-70 animate-pulse" style={{ animationDuration: '8s' }}></div>
            <div className="fixed inset-0 -z-10 backdrop-blur-3xl bg-black/10"></div>

            <div className="max-w-xl w-full text-center space-y-12 animate-in fade-in zoom-in duration-500">
                {step < 3 ? (
                    <div className="space-y-12">
                        <div className={`${slides[step].color} bg-white w-32 h-32 rounded-[3.5rem] flex items-center justify-center mx-auto shadow-2xl`}>
                            {slides[step].icon}
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter text-white drop-shadow-lg">{slides[step].title}</h2>
                            <p className="text-xl text-white/80 font-light leading-relaxed px-8">{slides[step].desc}</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        <div className="space-y-4">
                            <h2 className="text-5xl font-black tracking-tighter text-white">Final Step.</h2>
                            <p className="text-xl text-white/80 font-light">Customise your presence on Yumi.</p>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-white rounded-[3rem] p-10 space-y-8 shadow-2xl">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Studio Name</label>
                                    <input
                                        type="text"
                                        value={studioName}
                                        onChange={(e) => setStudioName(e.target.value)}
                                        placeholder="e.g. Dreamweaver Studio"
                                        className="w-full bg-stone-50 border-2 border-stone-100 rounded-3xl px-8 py-5 text-xl font-bold focus:border-purple-500 outline-none transition-all shadow-inner text-stone-900 placeholder:text-stone-300"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">Select Avatar</label>
                                    <div className="flex justify-center gap-4">
                                        {PRESET_AVATARS.map((url, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setSelectedAvatar(url)}
                                                className={`w-16 h-16 rounded-2xl overflow-hidden border-4 transition-all ${selectedAvatar === url ? 'border-purple-500 scale-110 shadow-lg' : 'border-stone-100 opacity-60 hover:opacity-100'}`}
                                            >
                                                <img src={url} alt="preset" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                        <button className="w-16 h-16 rounded-2xl border-4 border-dashed border-stone-200 flex items-center justify-center text-stone-300 hover:text-stone-400 hover:border-stone-300 transition-all">
                                            <Camera className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-col items-center gap-8">
                    <div className="flex gap-2">
                        {slides.map((_, i) => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step === i ? 'w-12 bg-white' : 'w-2 bg-white/30'}`} />
                        ))}
                    </div>
                    <button
                        onClick={next}
                        disabled={step === 3 && !studioName.trim()}
                        className="bg-white text-purple-900 px-16 py-6 rounded-[2.5rem] font-black text-xl hover:bg-purple-100 transition-all shadow-2xl flex items-center gap-3 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        {step === 3 ? 'Get Started' : 'Next'} <ArrowRight className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
