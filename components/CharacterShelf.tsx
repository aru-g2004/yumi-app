import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Character, CollectionTheme } from '../types';

interface CharacterShelfProps {
    theme: CollectionTheme;
    ownedCharacters: Character[];
    onCharacterClick: (character: Character) => void;
}

const CharacterShelf: React.FC<CharacterShelfProps> = ({ theme, ownedCharacters, onCharacterClick }) => {
    // Ensure we always have 6 slots
    const slots = Array(6).fill(null).map((_, i) => {
        const charDef = theme.characterDefinitions?.[i];
        if (!charDef) return null;

        const owned = ownedCharacters.find(c => c.name === charDef.name);
        return { def: charDef, owned };
    });

    return (
        <div className="relative pt-2">
            {/* Centered Theme Title */}
            <div className="text-center">
                <span className="text-[20px] uppercase tracking-[0.1em] text-yellow-300 drop-shadow-md">
                    {theme.name} Edition
                </span>
            </div>

            {/* Shelf Content */}
            <div className="relative z-10 grid grid-cols-6 gap-6 px-10 pt-4 pb-2">
                {slots.map((slot, i) => (
                    <div key={i} className="relative flex flex-col items-center justify-end min-h-[180px]">
                        {slot?.owned ? (
                            <div
                                onClick={() => onCharacterClick(slot.owned!)}
                                className="cursor-pointer transition-all duration-500 hover:scale-110 active:scale-95 group relative flex flex-col items-center transform -translate-y-4"
                            >
                                {/* Character Image Container with Rectangular Rounding */}
                                <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-white rounded-[1.5rem] p-0 border-[1px] border-stone-100 shadow-xl overflow-hidden">
                                    <img
                                        src={slot.owned.imageUrl}
                                        alt={slot.owned.name}
                                        className="w-full h-full object-cover rounded-[1.5rem]"
                                    />

                                    {/* Subtle inner highlight */}
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none"></div>
                                </div>

                                {/* Reflection on the glass */}
                                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-24 h-24 scale-y-[-0.3] opacity-10 pointer-events-none blur-[2px] hidden md:block">
                                    <img
                                        src={slot.owned.imageUrl}
                                        alt=""
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                            </div>
                        ) : (
                            /* Empty Slot Placeholder */
                            <div className="w-24 h-24 bg-stone-50 rounded-[1.0rem] border-[1px] border-dashed border-stone-200 flex items-center justify-center opacity-40 transform -translate-y-4 shadow-inner">
                                <HelpCircle className="w-8 h-8 text-stone-300" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Glass Shelf Surface - LIGHT BLUE TRANSPARENT */}
            <div className="relative h-5 mt-[-12px]">
                {/* The Glass Plate */}
                <div className="absolute inset-x-0 h-full bg-blue-100/30 backdrop-blur-xl border-[1.0px] border-white/60 rounded-sm shadow-[0_12px_40px_-10px_rgba(59,130,246,0.1)]">
                    {/* Top edge highlight */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-white/80"></div>
                    {/* Bottom edge shadow */}
                    <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-blue-900/10"></div>
                    {/* The "Blueish" tint on the edge */}
                    <div className="absolute top-0 right-0 bottom-0 w-[6px] bg-blue-400/20"></div>
                    <div className="absolute top-0 left-0 bottom-0 w-[6px] bg-blue-300/10"></div>

                    {/* Internal glass texture/sheen */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 translate-x-[-50%] group-hover:translate-x-[150%] transition-transform duration-1000"></div>
                </div>
            </div>

            {/* Brackets - High quality metal look */}
            <div className="flex justify-between px-24 relative z-0">
                <div className="w-4 h-10 bg-gradient-to-b from-stone-400 via-stone-200 to-stone-400 rounded-b-xl shadow-lg border-x border-white/20 transform -translate-y-2"></div>
                <div className="w-4 h-10 bg-gradient-to-b from-stone-400 via-stone-200 to-stone-400 rounded-b-xl shadow-lg border-x border-white/20 transform -translate-y-2"></div>
            </div>
        </div>
    );
};

export default CharacterShelf;
