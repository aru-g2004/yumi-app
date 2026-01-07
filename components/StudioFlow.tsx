import React, { useState } from 'react';
import {
    Wand2,
    Palette,
    Hammer,
    ChevronLeft,
    ArrowRight,
    Plus,
    ChevronDown,
    Image as ImageIcon,
    Box,
    Sparkles,
    AlertCircle,
    CheckCircle2,
    Trophy
} from 'lucide-react';
import { CollectionTheme, User } from '../types';

interface StudioFlowProps {
    user: User;
    coins: number;
    onStart: (theme: Partial<CollectionTheme>) => void;
    previousThemes: CollectionTheme[];
    onBack: () => void;
}

const StudioFlow: React.FC<StudioFlowProps> = ({ user, coins, onStart, previousThemes, onBack }) => {
    const [view, setView] = useState<'initial' | 'design'>('initial');
    const [formData, setFormData] = useState<Partial<CollectionTheme>>({
        name: '',
        description: '',
        keywords: '',
        colorScheme: [],
        toyFinish: 'pearl',
        variationHint: '',
        inspirationImages: [],
        rareTraits: '',
        legendaryTraits: '',
        characterDefinitions: Array(6).fill(null).map((_, i) => ({
            name: '',
            description: '',
            rarity: i < 3 ? 'Common' : i < 5 ? 'Rare' : 'Legendary'
        }))
    });
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [customColor, setCustomColor] = useState('');
    const [userPalette, setUserPalette] = useState<string[]>([]);

    const handleInitialStart = () => {
        if (coins >= 500) {
            setView('design');
        } else {
            alert('Insufficient coins (500 required)');
        }
    };

    const handleSubmit = () => {
        if (formData.name && formData.keywords) {
            onStart(formData);
        }
    };

    if (view === 'initial') {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in zoom-in duration-700">
                <button onClick={onBack} className="flex items-center gap-2 text-stone-400 font-black hover:text-stone-900 mb-12 transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Back to Lobby
                </button>

                <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-stone-50 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full -mr-32 -mt-32 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-50 rounded-full -ml-32 -mb-32 opacity-50" />

                    <div className="relative z-10 space-y-12">
                        <div className="space-y-4">
                            <span className="text-[20px] font-black uppercase tracking-[0.4em] text-rose-500 block">{user.studioName || 'Your'} Studio</span>
                            <h2 className="text-6xl font-black tracking-tighter">Ready to Build?</h2>
                            <p className="text-xl text-stone-400 font-light max-w-lg mx-auto leading-relaxed">
                                Create your blind box collection with <span className="text-stone-900 font-black">500 coins</span>.
                                You are creating a series of 6 characters: 3 common, 2 rare, and 1 legendary.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                            <div className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-100">
                                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">3x Common</p>
                                <p className="text-[10px] text-stone-300 font-medium">Standard drop</p>
                            </div>
                            <div className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-100">
                                <Sparkles className="w-6 h-6 text-rose-400 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">2x Rare</p>
                                <p className="text-[10px] text-stone-300 font-medium">Hard to get</p>
                            </div>
                            <div className="bg-stone-50 p-6 rounded-[2.5rem] border border-stone-100">
                                <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-3" />
                                <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-1">1x Legendary</p>
                                <p className="text-[10px] text-stone-300 font-medium">Very elusive</p>
                            </div>
                        </div>

                        <button
                            onClick={handleInitialStart}
                            className="bg-stone-900 text-white px-16 py-8 rounded-[2.5rem] font-black text-2xl tracking-widest uppercase hover:bg-stone-800 transition-all shadow-2xl flex items-center justify-center gap-4 mx-auto"
                        >
                            <Box className="w-8 h-8" /> Start Collection
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto py-12 px-6 animate-in slide-in-from-bottom-12 duration-700">
            <div className="flex items-center justify-between mb-12">
                <button onClick={() => setView('initial')} className="flex items-center gap-2 text-stone-400 font-black hover:text-stone-900 transition-colors">
                    <ChevronLeft className="w-5 h-5" /> Cancel Creation
                </button>
                <div className="flex items-center gap-3 px-6 py-3 bg-stone-100 rounded-full border border-stone-200">
                    <Palette className="w-4 h-4 text-stone-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Design Phase</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Info */}
                    <div className="bg-white rounded-[3.5rem] p-12 shadow-2xl border border-stone-50 space-y-10">
                        <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-stone-400 block ml-2">Series Title</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Icecream Kitties"
                                className="w-full bg-stone-50 border-2 border-stone-100 rounded-[2.5rem] px-10 py-7 text-2xl font-black outline-none focus:border-stone-900 focus:ring-8 ring-stone-900/5 transition-all shadow-inner"
                            />
                        </div>

                        <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-stone-400 block ml-2">Keywords & Description</label>
                            <textarea
                                value={formData.keywords}
                                onChange={e => setFormData({ ...formData, keywords: e.target.value })}
                                placeholder="Describe your vision (e.g. pastel colors, cat holding icecream, whimsical, cute chibi proportions). The more descriptive the better!"
                                className="w-full h-48 bg-stone-50 border-2 border-stone-100 rounded-[2.5rem] px-10 py-7 text-lg font-bold outline-none focus:border-stone-900 focus:ring-8 ring-stone-900/5 transition-all shadow-inner resize-none"
                            />
                        </div>

                        <div className="space-y-6">
                            <div className="flex justify-between items-end px-2">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-widest text-stone-400 block">Color Scheme</label>
                                    <p className="text-[10px] text-stone-400 font-medium">Select up to 8 colors for your collection</p>
                                </div>
                                <div className="flex items-center gap-2 bg-stone-100 px-4 py-2 rounded-full border border-stone-200">
                                    <div className="flex gap-1">
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`w-2 h-2 rounded-full transition-colors ${i < (formData.colorScheme?.length || 0) ? 'bg-stone-900' : 'bg-stone-300'}`}
                                            />
                                        ))}
                                    </div>
                                    <span className="text-[9px] font-black text-stone-900">{(formData.colorScheme?.length || 0)}/8</span>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-4 px-2">
                                {Array.from(new Set([
                                    '#FFB7B2', '#B2FFB2', '#B2CEFF', '#FDFD96',
                                    '#E2B2FF', '#FFD1DC', '#C1E1C1', '#AEC6CF',
                                    ...userPalette, // Include user-added colors
                                    ...(formData.colorScheme || []) // Ensure selected colors are always visible
                                ])).map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFormData(prev => {
                                            const colors = prev.colorScheme || [];
                                            if (colors.includes(c)) {
                                                return { ...prev, colorScheme: colors.filter(x => x !== c) };
                                            }
                                            if (colors.length < 8) {
                                                return { ...prev, colorScheme: [...colors, c] };
                                            }
                                            return prev;
                                        })}
                                        className={`w-14 h-14 rounded-2xl shadow-inner transition-all transform relative group ${formData.colorScheme?.includes(c) ? 'ring-4 ring-stone-900 scale-110' : 'hover:scale-105'}`}
                                        style={{ backgroundColor: c }}
                                    >
                                        {formData.colorScheme?.includes(c) && (
                                            <div className="absolute -top-2 -right-2 bg-stone-900 text-white p-1 rounded-full shadow-lg">
                                                <CheckCircle2 className="w-3 h-3" />
                                            </div>
                                        )}
                                    </button>
                                ))}

                                <div className="flex items-center gap-3">
                                    <div className="relative group">
                                        <input
                                            type="color"
                                            value={customColor || '#000000'}
                                            onChange={e => setCustomColor(e.target.value)}
                                            className="w-14 h-14 rounded-2xl cursor-pointer border-2 border-stone-100 p-1 bg-white hover:border-stone-900 transition-all opacity-0 absolute inset-0 z-20"
                                        />
                                        <div
                                            className={`w-14 h-14 rounded-2xl border-2 shadow-sm flex items-center justify-center transition-all bg-white relative overflow-hidden ${customColor ? 'border-stone-900 ring-4 ring-stone-900/5' : 'border-stone-100 text-stone-400 group-hover:border-stone-900'}`}
                                        >
                                            {customColor ? (
                                                <div className="absolute inset-0" style={{ backgroundColor: customColor }} />
                                            ) : (
                                                <Palette className="w-6 h-6 text-stone-300 group-hover:text-stone-900 transition-colors" />
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (customColor && (formData.colorScheme?.length || 0) < 8) {
                                                // Add to userPalette if not already present
                                                if (!userPalette.includes(customColor)) {
                                                    setUserPalette(prev => [...prev, customColor]);
                                                }
                                                // Add to formData.colorScheme if not already present and space is available
                                                if (!formData.colorScheme?.includes(customColor)) {
                                                    setFormData(prev => ({ ...prev, colorScheme: [...(prev.colorScheme || []), customColor] }));
                                                }
                                                setCustomColor('');
                                            }
                                        }}
                                        disabled={!customColor || (formData.colorScheme?.length || 0) >= 8}
                                        className="bg-white text-stone-400 p-4 rounded-2xl border-2 border-stone-100 hover:bg-stone-50 active:bg-stone-100 transition-all shadow-sm disabled:opacity-20 flex items-center justify-center group"
                                        title="Add & Select color"
                                    >
                                        <Plus className="w-5 h-5 transition-transform group-hover:scale-110 group-active:scale-90 text-stone-400" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Toggle */}
                    <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-stone-50 overflow-hidden">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-stone-50 rounded-2xl group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors">
                                    <Wand2 className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-black text-xl">Advanced Options</h4>
                                    <p className="text-xs text-stone-400 font-medium tracking-tight">Fine-tune your series with optional characteristics</p>
                                </div>
                            </div>
                            <ChevronDown className={`w-6 h-6 text-stone-300 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>

                        {showAdvanced && (
                            <div className="pt-12 space-y-10 animate-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-2">Toy Finish</label>
                                        <input
                                            type="text"
                                            value={formData.toyFinish}
                                            onChange={e => setFormData({ ...formData, toyFinish: e.target.value })}
                                            placeholder="e.g. pearl, clear, metallic"
                                            className="w-full bg-stone-50 border-2 border-stone-100 rounded-[1.5rem] px-6 py-4 text-xs font-bold outline-none focus:border-stone-900 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Character Variation Hint</label>
                                        <textarea
                                            value={formData.variationHint}
                                            onChange={e => setFormData({ ...formData, variationHint: e.target.value })}
                                            placeholder="How do they vary? (e.g. mood, color, accessories)"
                                            className="w-full h-36 bg-stone-50 border-2 border-stone-100 rounded-3xl px-6 py-4 text-xs font-bold outline-none focus:border-stone-900"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 block ml-2">Character Breakdown (Optional)</label>
                                        <p className="text-[9px] text-stone-400 font-medium ml-2">This is where you can name the characters in your series. If left empty, it will be auto-generated.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {formData.characterDefinitions?.map((char, i) => (
                                            <div key={i} className="bg-stone-50 rounded-2xl p-4 border border-stone-100 flex gap-4 items-center">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${char.rarity === 'Legendary' ? 'bg-amber-100 text-amber-500' : char.rarity === 'Rare' ? 'bg-rose-100 text-rose-500' : 'bg-white text-stone-400'}`}>
                                                    <span className="font-black text-[9px]">{i + 1}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1">
                                                    <input
                                                        placeholder="Char Name"
                                                        value={char.name}
                                                        onChange={e => {
                                                            const newChars = [...formData.characterDefinitions!];
                                                            newChars[i] = { ...newChars[i], name: e.target.value };
                                                            setFormData({ ...formData, characterDefinitions: newChars });
                                                        }}
                                                        className="bg-white border border-stone-100 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-stone-900"
                                                    />
                                                    <input
                                                        placeholder="Char Trait"
                                                        value={char.description}
                                                        onChange={e => {
                                                            const newChars = [...formData.characterDefinitions!];
                                                            newChars[i] = { ...newChars[i], description: e.target.value };
                                                            setFormData({ ...formData, characterDefinitions: newChars });
                                                        }}
                                                        className="bg-white border border-stone-100 rounded-xl px-4 py-2 font-bold text-xs outline-none focus:border-stone-900"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 text-rose-500">Rare Characteristics</label>
                                        <input
                                            value={formData.rareTraits}
                                            onChange={e => setFormData({ ...formData, rareTraits: e.target.value })}
                                            placeholder="e.g. sparkly, translucent wings"
                                            className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 text-xs font-bold"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 text-amber-500">Legendary Characteristics</label>
                                        <input
                                            value={formData.legendaryTraits}
                                            onChange={e => setFormData({ ...formData, legendaryTraits: e.target.value })}
                                            placeholder="e.g. gold plated, glowing heart"
                                            className="w-full bg-stone-50 border-2 border-stone-100 rounded-2xl px-6 py-4 text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-32 space-y-8">
                        {/* Selector for Previous Series */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-stone-50">
                            <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4 block">Load previous design</label>
                            <div className="relative group">
                                <select
                                    className="w-full bg-stone-50 border-2 border-stone-100 rounded-[1.5rem] px-6 py-4 font-bold text-xs appearance-none outline-none focus:border-stone-900 pr-12"
                                    onChange={(e) => {
                                        if (e.target.value === "") {
                                            setFormData({
                                                name: '',
                                                description: '',
                                                keywords: '',
                                                colorScheme: [],
                                                toyFinish: 'pearl',
                                                variationHint: '',
                                                inspirationImages: [],
                                                rareTraits: '',
                                                legendaryTraits: '',
                                                characterDefinitions: Array(6).fill(null).map((_, i) => ({
                                                    name: '',
                                                    description: '',
                                                    rarity: i < 3 ? 'Common' : i < 5 ? 'Rare' : 'Legendary'
                                                }))
                                            });
                                            return;
                                        }
                                        const theme = previousThemes.find(t => t.id === e.target.value);
                                        if (theme) setFormData(theme);
                                    }}
                                >
                                    <option value="">Start New Series</option>
                                    {previousThemes.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
                            </div>
                        </div>

                        {/* Summary / Preview Widget */}
                        <div className="bg-stone-900 rounded-[3rem] p-10 text-white shadow-2xl space-y-8 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />

                            <h4 className="text-2xl font-black tracking-tighter">Collection Summary</h4>
                            <div className="space-y-6">
                                <div className="flex justify-between items-center py-4 border-b border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Creation Cost</span>
                                    <span className="font-black text-rose-400">500 Coins</span>
                                </div>
                                <div className="flex justify-between items-center py-4 border-b border-white/10">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Characters</span>
                                    <span className="font-black">6 Designs</span>
                                </div>
                                <div className="space-y-3 pt-4">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Status Checklist</span>
                                    <div className="grid grid-cols-1 gap-3">
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.name ? 'bg-emerald-400' : 'bg-white/10'}`}>
                                                {formData.name && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={formData.name ? 'text-white' : 'text-stone-500'}>Series Title</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs">
                                            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${formData.keywords ? 'bg-emerald-400' : 'bg-white/10'}`}>
                                                {formData.keywords && <CheckCircle2 className="w-3 h-3 text-white" />}
                                            </div>
                                            <span className={formData.keywords ? 'text-white' : 'text-stone-500'}>Vision & Keywords</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={!formData.name || !formData.keywords}
                                className="w-full bg-emerald-400 text-stone-900 py-6 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-emerald-300 transition-all shadow-xl disabled:opacity-20 disabled:grayscale mt-4 flex items-center justify-center gap-3"
                            >
                                <Hammer className="w-5 h-5" /> Launch Production
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudioFlow;
