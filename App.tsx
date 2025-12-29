import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  LayoutGrid,
  Coins,
  PlusCircle,
  Sparkles,
  Wand2,
  Video,
  ChevronLeft,
  Settings,
  AlertCircle,
  Mic,
  ShoppingBag,
  ArrowRight,
  Shuffle,
  RefreshCw,
  Box,
  Palette,
  Hammer,
  CheckCircle2,
  Loader2,
  XCircle,
  AlertTriangle,
  Factory,
  Cpu,
  Store // Add Store icon
} from 'lucide-react';
import { AppState, AppView, Character, CollectionTheme, User } from './types';
import {
  generateThemeSet,
  generateCharacterImage,
  generateBoxArt,
  editCharacterImage,
  animateCharacter,
  requestApiKey,
  checkApiKey
} from './services/geminiService';
import LiveDesignLab from './components/LiveDesignLab';
import BlindBoxOpener from './components/BlindBoxOpener';
import CharacterShelf from './components/CharacterShelf';
import { auth } from './services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login';
import { GoogleGenAI } from "@google/genai";
import { get, set } from 'idb-keyval';
import {
  createOrUpdateUserProfile,
  getUserProfile,
  saveTheme,
  saveCharacter,
  getUserThemes,
  addToCollection,
  getUserCollection,
  updateUserCoins,
  getPublicThemes,
  purchaseBlindBox,
  getThemeCharacters
} from './services/firestoreService';

const PRESET_THEMES = [
  "Retro Arcade Bots",
  "Cyberpunk Street Cats",
  "Victorian Ghost Poodles",
  "Tropical Tiki Fruits",
  "Crystal Cave Dragons",
  "Nebula Cloud Whale",
  "Steampunk Clock Birds",
  "Marshmallow Sky Slimes"
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AppState>({
    coins: 250,
    collection: [],
    currentTheme: null,
    activeCharacter: null,
    user: null,
    generatedThemes: [],
    themeHistory: [],
    publicThemes: []
  });

  const [view, setView] = useState<AppView>('login');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [unboxingChar, setUnboxingChar] = useState<Character | null>(null);
  const [unboxingTheme, setUnboxingTheme] = useState<CollectionTheme | null>(null);

  // Production states
  const [activeStep, setActiveStep] = useState(0); // 0-5 for characters
  const [isProducing, setIsProducing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Collector',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi'
        };
        setUser(newUser);

        try {
          // Create or update user profile in Firestore
          await createOrUpdateUserProfile(newUser);

          // Load user data from Firestore
          const profile = await getUserProfile(newUser.id);
          const themes = await getUserThemes(newUser.id);
          const collection = await getUserCollection(newUser.id);
          const publicThemes = await getPublicThemes();

          setState(prev => ({
            ...prev,
            user: newUser,
            coins: profile?.coins || 250,
            themeHistory: themes,
            currentTheme: themes[0] || null,
            collection: collection,
            publicThemes: publicThemes
          }));

          setView('lobby');
        } catch (error) {
          console.error('Error loading user data from Firestore:', error);
          // Fallback to IndexedDB if Firestore fails
          const savedState = await get(`yumi_state_${newUser.id}`);
          if (savedState) {
            setState(savedState);
          } else {
            setState(prev => ({ ...prev, user: newUser }));
          }
          setView('lobby');
        }
      } else {
        setUser(null);
        setView('login');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && state.user?.id === user.id) {
      // Async save to IndexedDB
      set(`yumi_state_${user.id}`, state).catch(err => {
        console.error("Failed to save state to IDB:", err);
      });
    }
  }, [state, user]);

  useEffect(() => {
    checkApiKey().then(hasKey => setApiKeySelected(hasKey));
  }, []);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      setView('login');
    });
  };

  const addCoins = (amount: number, themeName?: string) => {
    console.log(`[App] Adding ${amount} coins. Theme: ${themeName}`);
    setState(prev => {
      const newCoins = prev.coins + amount;
      const newThemes = themeName && !prev.generatedThemes?.includes(themeName)
        ? [themeName, ...(prev.generatedThemes || [])]
        : (prev.generatedThemes || []);

      return { ...prev, coins: newCoins, generatedThemes: newThemes };
    });
  };

  // Fix: Added handleSuggestTheme to resolve missing name error
  const handleSuggestTheme = () => {
    const randomTheme = PRESET_THEMES[Math.floor(Math.random() * PRESET_THEMES.length)];
    setThemeInput(randomTheme);
  };

  const handleApiKeyPrompt = async () => {
    await requestApiKey();
    setApiKeySelected(true);
  };

  const handleError = async (error: any) => {
    const errorStr = String(error);
    console.error("Caught Error:", error);
    console.error("Error Stack:", error.stack);

    if (errorStr.toLowerCase().includes('403') || errorStr.toLowerCase().includes('permission') || errorStr.toLowerCase().includes('not found')) {
      setGlobalError("Paid API Key required. Access your billing account at ai.google.dev/gemini-api/docs/billing");
      setApiKeySelected(false);
    } else if (errorStr.toLowerCase().includes('429')) {
      setGlobalError("Generator Heat: Rate limit reached. Taking a short break...");
    } else {
      setGlobalError(`Production Error: ${errorStr.substring(0, 80)}...`);
    }
  };

  // Theme Creation Pipeline
  const handleCreateTheme = async () => {
    if (!themeInput.trim()) return;
    if (!user) {
      setGlobalError('You must be logged in to create themes');
      return;
    }
    setLoading(true);
    setLoadingMsg('Writing series DNA...');
    setGlobalError(null);
    setActiveStep(0);

    try {
      const theme = await generateThemeSet(themeInput);
      setLoadingMsg('Rendering visual packaging...');
      const boxArt = await generateBoxArt(user.id, theme.id, theme.name, theme.visualStyle);

      const finalTheme = { ...theme, boxImageUrl: boxArt };

      // Save theme to Firestore
      await saveTheme(user.id, finalTheme, true); // isPublic = true for marketplace

      setState(prev => ({
        ...prev,
        currentTheme: finalTheme,
        publicThemes: [
          {
            ...finalTheme,
            creatorId: user.id,
            creatorName: user.name,
            createdBy: user.id,
            characterCount: finalTheme.characterDefinitions?.length || 0,
            isPublic: true,
            blindBoxPrice: 100,
            totalPurchases: 0
          },
          ...prev.publicThemes
        ]
      }));

      // Move to mandatory manufacturing view
      setView('manufacturing');
      setLoading(false);
      startSequentialProduction(finalTheme);
    } catch (error) {
      setLoading(false);
      await handleError(error);
    }
  };

  const startSequentialProduction = async (theme: CollectionTheme) => {
    if (isProducing) return;
    if (!user) {
      setGlobalError('You must be logged in to produce characters');
      return;
    }
    setIsProducing(true);
    setGlobalError(null);

    const defs = theme.characterDefinitions;

    for (let i = 0; i < defs.length; i++) {
      // Skip if already done
      if (theme.characterDefinitions[i].imageUrl) {
        setActiveStep(i + 1);
        continue;
      }

      setActiveStep(i);

      try {
        console.log(`[Production Debug] Starting step ${i} for character:`, defs[i].name);
        const url = await generateCharacterImage(user.id, theme.id, defs[i], theme.name, theme.visualStyle, '1K');
        console.log(`[Production Debug] Finished step ${i} for character:`, defs[i].name);

        // Save character to Firestore
        const characterWithImage = { ...defs[i], imageUrl: url };
        await saveCharacter(user.id, theme.id, characterWithImage);

        // Update Local State
        setState(prev => {
          if (!prev.currentTheme) return prev;
          const updatedDefs = [...prev.currentTheme.characterDefinitions];
          updatedDefs[i] = { ...updatedDefs[i], imageUrl: url };
          return {
            ...prev,
            currentTheme: { ...prev.currentTheme, characterDefinitions: updatedDefs }
          };
        });

        // Small cool down between heavy image requests
        await new Promise(r => setTimeout(r, 4000));
      } catch (err) {
        handleError(err);
        setIsProducing(false);
        return; // Halt production on error
      }
    }

    setIsProducing(false);
    setActiveStep(6);

    // Reload theme from Firestore to ensure we have all characters
    if (user) {
      try {
        const themes = await getUserThemes(user.id);
        const updatedTheme = themes.find(t => t.id === theme.id);
        if (updatedTheme) {
          console.log('[Production Complete] Reloaded theme from Firestore with', updatedTheme.characterDefinitions?.length, 'characters');
          setState(prev => ({
            ...prev,
            currentTheme: updatedTheme,
            themeHistory: themes
          }));
        }
      } catch (error) {
        console.error('[Production Complete] Error reloading theme:', error);
      }
    }

    // Save completed theme to history if not already there
    setState(prev => {
      const history = prev.themeHistory || [];
      const exists = history.find(t => t.id === theme.id);
      if (!exists) {
        return { ...prev, themeHistory: [theme, ...history] };
      }
      // Update existing if changed (e.g. chars revealed)
      return {
        ...prev,
        themeHistory: history.map(t => t.id === theme.id ? theme : t)
      };
    });
  };

  const resumeProduction = () => {
    if (state.currentTheme) {
      startSequentialProduction(state.currentTheme);
    }
  };

  const handleOpenBox = async (targetTheme: CollectionTheme = state.currentTheme!) => {
    if (!targetTheme || state.coins < 100) return;

    console.log('[handleOpenBox] Theme:', targetTheme.name);

    // If characters are missing (common for marketplace themes from other users), fetch them
    let themeToUse = { ...targetTheme };
    if (!themeToUse.characterDefinitions || themeToUse.characterDefinitions.length === 0) {
      setLoading(true);
      setLoadingMsg('Fetching character blueprints...');
      try {
        const creatorId = (targetTheme as any).createdBy || (targetTheme as any).creatorId;
        if (!creatorId) {
          throw new Error('Creator ID not found for this theme');
        }
        const chars = await getThemeCharacters(creatorId, targetTheme.id);
        themeToUse.characterDefinitions = chars;
        console.log('[handleOpenBox] Fetched characters:', chars.length);
      } catch (error) {
        setLoading(false);
        handleError(error);
        return;
      }
    }

    // Ensure theme has character definitions
    if (!themeToUse.characterDefinitions || themeToUse.characterDefinitions.length === 0) {
      setGlobalError('This theme has no characters yet. Please wait for production to complete.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadingMsg('Unboxing your surprise...');

    try {
      // Weighted Rarity Logic
      const rand = Math.random();
      let selectedRarity: 'Common' | 'Rare' | 'Legendary' = 'Common';
      if (rand > 0.90) selectedRarity = 'Legendary'; // 10%
      else if (rand > 0.60) selectedRarity = 'Rare'; // 30%

      // Filter definitions by rarity
      const defs = themeToUse.characterDefinitions;
      const rarityGroup = defs.filter(d => d.rarity === selectedRarity);
      // Fallback if no characters of that rarity exist (shouldn't happen with correct gen, but safety first)
      const finalGroup = rarityGroup.length > 0 ? rarityGroup : defs;

      const randomIndex = Math.floor(Math.random() * finalGroup.length);
      const def = finalGroup[randomIndex];

      // Upgrade to 1K if not already (safeguard) or higher res if requested
      let finalImageUrl = def.imageUrl!;

      // If image is missing (e.g. from history without generated images?), generate it.
      if (!finalImageUrl) {
        if (!user) {
          throw new Error('You must be logged in to generate character images');
        }
        finalImageUrl = await generateCharacterImage(user.id, themeToUse.id, def, themeToUse.name, themeToUse.visualStyle, imageSize);
      }

      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name: def.name,
        description: def.description,
        rarity: def.rarity,
        imageUrl: finalImageUrl,
        theme: themeToUse.name,
        themeId: themeToUse.id,
        themeCreatorId: (themeToUse as any).createdBy || (themeToUse as any).creatorId,
        obtainedAt: Date.now(),
        count: 1
      };

      setUnboxingChar(newChar);
      setUnboxingTheme(themeToUse);
      setView('opening');
    } catch (error) {
      await handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const onUnboxingComplete = async () => {
    const themeToUse = unboxingTheme || state.currentTheme;
    if (!unboxingChar || !user || !themeToUse) return;

    try {
      const creatorId = (themeToUse as any).createdBy || (themeToUse as any).creatorId || user.id;
      const creatorName = (themeToUse as any).creatorName || user.name;

      // Add to Firestore collection
      await addToCollection(
        user.id,
        unboxingChar,
        themeToUse.id,
        creatorId,
        creatorName
      );

      // Deduct coins in Firestore
      await updateUserCoins(user.id, -100);

      // Update local state
      setState(prev => {
        const existingIndex = prev.collection.findIndex(c => c.name === unboxingChar.name && c.theme === unboxingChar.theme);
        let newCollection = [...prev.collection];

        if (existingIndex >= 0) {
          // Stack duplicate
          const existing = newCollection[existingIndex];
          newCollection[existingIndex] = {
            ...existing,
            count: (existing.count || 1) + 1,
            obtainedAt: Date.now() // bubble to top?
          };
        } else {
          newCollection = [unboxingChar, ...newCollection];
        }

        return {
          ...prev,
          coins: prev.coins - 100,
          collection: newCollection,
          activeCharacter: unboxingChar
        };
      });

      setUnboxingChar(null);
      setView('collection'); // Go back to shelf to see the new addition
    } catch (error) {
      console.error('Error saving to collection:', error);
      handleError(error);
    }
  };


  const renderLoading = () => (
    <div className="fixed inset-0 bg-stone-50/95 backdrop-blur-xl z-[60] flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-24 h-24 border-2 border-stone-200 rounded-full animate-ping opacity-25"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-stone-100 border-t-stone-900 rounded-full animate-spin"></div>
        </div>
      </div>
      <p className="mt-12 text-lg font-black tracking-tight text-stone-900 animate-pulse text-center max-w-xs px-4">
        {loadingMsg || 'Creating magic...'}
      </p>
    </div>
  );

  const renderGlobalError = () => {
    if (!globalError) return null;
    return (
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] w-full max-w-lg px-6 animate-in slide-in-from-bottom-10">
        <div className="bg-rose-600 text-white rounded-3xl p-6 shadow-2xl flex items-start gap-4 border-2 border-rose-500/50">
          <AlertTriangle className="w-8 h-8 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-black text-xs uppercase tracking-widest mb-1">Production Alert</h4>
            <p className="text-sm font-medium leading-relaxed opacity-90">{globalError}</p>
          </div>
          <button onClick={() => setGlobalError(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  };

  if (view === 'login') {
    return <Login />;
  }

  if (view === 'opening' && unboxingChar && unboxingTheme) {
    return <BlindBoxOpener character={unboxingChar} theme={unboxingTheme} onComplete={onUnboxingComplete} />;
  }

  return (
    <div className="min-h-screen pb-32 bg-[#faf9f6] text-stone-900">
      {loading && renderLoading()}
      {renderGlobalError()}

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-stone-100 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('lobby')}>
          <div className="bg-stone-900 p-1.5 rounded-xl text-white"><ShoppingBag className="w-5 h-5" /></div>
          <h1 className="text-2xl font-black tracking-tighter">yumi.</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-stone-50 px-5 py-2.5 rounded-full flex items-center gap-2 border border-stone-100 shadow-inner">
            <Coins className="w-4 h-4 text-emerald-500" />
            <span className="font-black text-stone-900 text-sm">{state.coins}</span>
          </div>
          {user && (
            <img src={user.picture} alt={user.name} onClick={handleLogout} className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform" />
          )}
          <button onClick={handleApiKeyPrompt} className={`p-2.5 rounded-full transition-all ${apiKeySelected ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {view === 'lobby' && (
          <div className="space-y-20">
            <section className="bg-stone-900 rounded-[3.5rem] p-20 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-6 block">Production Lab</span>
                <h2 className="text-7xl font-black mb-8 tracking-tighter leading-[0.9]">Create your universe.</h2>
                <p className="text-stone-400 text-xl mb-12 leading-relaxed font-light">Input a theme, and watch as we generate a full mystery series including packaging and unique characters.</p>
                <div className="flex flex-wrap gap-5">
                  <button onClick={() => setView('theme-select')} className="bg-white text-stone-900 px-12 py-6 rounded-[2rem] font-black text-lg hover:bg-stone-100 transition-all shadow-2xl flex items-center gap-3 active:scale-95">
                    <PlusCircle className="w-6 h-6" /> New Series
                  </button>
                  <button onClick={() => setView('mini-game')} className="bg-emerald-400 text-emerald-950 px-12 py-6 rounded-[2rem] font-black text-lg hover:bg-emerald-300 transition-all shadow-2xl flex items-center gap-3 active:scale-95">
                    <Mic className="w-6 h-6" /> Pitch Ideas
                  </button>
                </div>
              </div>
            </section>

            {state.currentTheme && (
              <section className="bg-white rounded-[4rem] p-14 shadow-xl border border-stone-50">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                  <div className="lg:col-span-1">
                    <div className="sticky top-32 space-y-8">
                      <div className="aspect-square bg-stone-50 rounded-[3rem] overflow-hidden border-4 border-white shadow-2xl">
                        <img src={state.currentTheme.boxImageUrl} alt="Series Box" className="w-full h-full object-cover" />
                      </div>
                      <div className="bg-stone-50/50 p-8 rounded-[2.5rem] border border-stone-100">
                        <div className="flex items-center gap-2 mb-3 text-stone-400">
                          <Palette className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Visual Style</span>
                        </div>
                        <p className="text-stone-600 font-medium italic text-sm leading-relaxed">{state.currentTheme.visualStyle}</p>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-2 space-y-12">
                    <div>
                      <span className="bg-rose-50 text-rose-500 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Collection Ready</span>
                      <h3 className="text-5xl font-black tracking-tighter mb-4">{state.currentTheme.name}</h3>
                      <p className="text-stone-400 text-xl font-light leading-relaxed mb-10">{state.currentTheme.description}</p>

                      <div className="flex items-center gap-4 bg-stone-50 p-3 rounded-[2.5rem] border border-stone-100 w-fit">
                        <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} className="bg-white border border-stone-100 rounded-full px-6 py-4 font-black text-xs text-stone-900 outline-none shadow-sm">
                          <option value="1K">Standard 1K</option>
                          <option value="2K">High-Res 2K</option>
                          <option value="4K">Ultra-Res 4K</option>
                        </select>
                        <button
                          onClick={handleOpenBox}
                          disabled={state.coins < 100}
                          className={`px-10 py-4 rounded-[1.5rem] font-black text-xs tracking-[0.2em] uppercase transition-all shadow-xl flex items-center gap-2 ${state.coins >= 100 ? 'bg-stone-900 text-white hover:scale-105' : 'bg-stone-100 text-stone-300 cursor-not-allowed'}`}
                        >
                          Buy Blind Box (100) <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 pt-8">
                      {state.currentTheme.characterDefinitions.map((char, i) => {
                        const owned = state.collection.find(c => c.name === char.name && c.theme === state.currentTheme?.name);
                        return (
                          <div key={i} className="group relative">
                            <div className={`aspect-square bg-stone-50 rounded-[2.5rem] overflow-hidden mb-5 border-4 transition-all duration-500 ${owned ? 'border-emerald-400 shadow-xl' : 'border-white shadow-md'}`}>
                              {owned ? (
                                <img src={owned.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                              ) : (
                                <>
                                  <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover opacity-20 grayscale blur-sm" />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Box className="w-8 h-8 text-stone-200" />
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="px-2">
                              <h4 className={`font-black text-sm truncate mb-1 ${owned ? 'text-stone-900' : 'text-stone-900/40'}`}>{owned ? char.name : '???'}</h4>
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black uppercase tracking-widest text-stone-300">{char.rarity}</span>
                                {owned && owned.count && owned.count > 1 && (
                                  <span className="bg-stone-900 text-white text-[9px] font-black px-2 py-0.5 rounded-full">x{owned.count}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}

        {view === 'manufacturing' && state.currentTheme && (
          <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in duration-1000">
            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-stone-100 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-stone-50">
                <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${(activeStep / 6) * 100}%` }}></div>
              </div>

              <div className="inline-block bg-stone-50 p-6 rounded-[2.5rem] mb-10 shadow-inner">
                <Factory className="w-12 h-12 text-stone-900" />
              </div>

              <h2 className="text-5xl font-black tracking-tighter mb-4">Production Suite.</h2>
              <p className="text-stone-400 max-w-lg mx-auto text-lg font-light mb-12">
                Sculpting the collection DNA and rendering characters one by one to ensure stylistic fidelity.
              </p>

              <div className="grid grid-cols-3 md:grid-cols-6 gap-6 mb-16">
                {state.currentTheme.characterDefinitions.map((char, i) => (
                  <div key={i} className="relative aspect-square">
                    <div className={`w-full h-full rounded-3xl overflow-hidden border-2 transition-all duration-700 ${i === activeStep && isProducing ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.3)]' : char.imageUrl ? 'border-stone-100' : 'border-stone-50'}`}>
                      {char.imageUrl ? (
                        <img src={char.imageUrl} className="w-full h-full object-cover animate-in fade-in zoom-in grayscale brightness-75 contrast-125" alt="Built" />
                      ) : (
                        <div className="w-full h-full bg-stone-50 flex items-center justify-center">
                          {i === activeStep && isProducing ? (
                            <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                          ) : (
                            <Cpu className="w-6 h-6 text-stone-200" />
                          )}
                        </div>
                      )}
                    </div>
                    {char.imageUrl && <div className="absolute -top-2 -right-2 bg-emerald-400 text-white rounded-full p-1 shadow-lg animate-in pop-in"><CheckCircle2 className="w-4 h-4" /></div>}
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-6">
                {activeStep === 6 ? (
                  <button onClick={() => setView('lobby')} className="bg-stone-900 text-white px-12 py-6 rounded-[2rem] font-black text-xl tracking-widest uppercase hover:bg-stone-800 transition-all shadow-2xl animate-bounce">
                    Enter Studio Lobby
                  </button>
                ) : globalError ? (
                  <button onClick={resumeProduction} className="bg-rose-500 text-white px-10 py-5 rounded-[1.5rem] font-black text-sm tracking-widest uppercase hover:bg-rose-600 transition-all shadow-xl flex items-center gap-3">
                    <RefreshCw className="w-5 h-5" /> Retry Sculpt {activeStep + 1}/6
                  </button>
                ) : (
                  <div className="flex items-center gap-3 text-emerald-500 font-black uppercase tracking-[0.2em] text-xs">
                    <Hammer className="w-5 h-5 animate-bounce" />
                    Sculpting Character {activeStep + 1} of 6...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'theme-select' && (
          <div className="max-w-3xl mx-auto space-y-12 animate-in slide-in-from-bottom-12 duration-700">
            <button onClick={() => setView('lobby')} className="flex items-center gap-2 text-stone-400 font-black hover:text-stone-900 transition-colors">
              <ChevronLeft className="w-5 h-5" /> Back to Lobby
            </button>
            <div className="bg-white rounded-[4rem] p-16 shadow-2xl border border-stone-50">
              <div className="flex items-center justify-between mb-10">
                <div className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter">Define the theme</h2>
                  <p className="text-stone-400 font-light">The studio will generate characters and packaging based on your vision.</p>
                </div>
                <button onClick={handleSuggestTheme} className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.5rem] hover:bg-emerald-100 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-sm">
                  <Shuffle className="w-5 h-5" /> Surprise Me
                </button>
              </div>
              <div className="space-y-12">
                {state.generatedThemes && state.generatedThemes.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 ml-2">Your Concepts</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {state.generatedThemes.map((theme) => (
                        <button key={theme} onClick={() => setThemeInput(theme)} className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-left transition-all border-2 border-emerald-100 bg-emerald-50/50 text-emerald-900 hover:bg-emerald-100 ${themeInput === theme ? 'ring-4 ring-emerald-200' : ''}`}>
                          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-3 h-3 text-emerald-500" /> {theme}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 ml-2">Curated Presets</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {PRESET_THEMES.map(preset => (
                      <button key={preset} onClick={() => setThemeInput(preset)} className={`px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest text-left transition-all border-2 ${themeInput === preset ? 'bg-stone-900 text-white border-stone-900 shadow-xl scale-105' : 'bg-stone-50 text-stone-400 border-stone-50 hover:border-stone-200'}`}>
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <input type="text" value={themeInput} onChange={(e) => setThemeInput(e.target.value)} placeholder="e.g. Haunted Patisserie" className="w-full bg-stone-50 border-2 border-stone-100 rounded-[2.5rem] px-10 py-7 text-xl font-bold outline-none focus:border-stone-900 focus:ring-8 ring-stone-900/5 transition-all" />
                </div>
                <button onClick={handleCreateTheme} disabled={!themeInput.trim()} className="w-full bg-stone-900 text-white py-8 rounded-[2.5rem] font-black text-xl tracking-[0.2em] uppercase hover:bg-stone-800 transition-all flex items-center justify-center gap-4 shadow-2xl disabled:opacity-30 disabled:grayscale">
                  <Wand2 className="w-7 h-7" /> Launch Series
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'mini-game' && <LiveDesignLab onEarn={addCoins} />}

        {view === 'marketplace' && (
          <div className="space-y-16 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-4">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 block">World Market</span>
              <h2 className="text-6xl font-black tracking-tighter">Community Collections</h2>
              <p className="text-stone-400 font-light max-w-md mx-auto">Browse and unbox from universes created by the community.</p>
            </div>

            {(!state.publicThemes || state.publicThemes.length === 0) ? (
              <div className="text-center py-20 bg-white rounded-[3rem] border border-stone-100 shadow-sm">
                <p className="text-stone-400 font-medium">No community collections found yet. Be the first to create one!</p>
                <button onClick={() => setView('theme-select')} className="mt-6 bg-stone-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-stone-800">Create New</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {state.publicThemes.map((theme) => (
                  <div key={theme.id} className="bg-white rounded-[3.5rem] p-8 shadow-xl border border-stone-50 hover:scale-[1.02] transition-transform duration-500 flex flex-col items-center text-center">
                    <div className="w-full aspect-square bg-stone-50 rounded-[2.5rem] overflow-hidden mb-8 flex items-center justify-center p-8">
                      <img
                        src={theme.boxImageUrl}
                        alt={theme.name}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="space-y-2 mb-8">
                      <h3 className="text-3xl font-black tracking-tight leading-none">{theme.name}</h3>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">By {theme.creatorName}</p>
                    </div>

                    <div className="flex gap-3 w-full mt-auto">
                      <button
                        onClick={() => {
                          const fullTheme = state.themeHistory.find(t => t.id === theme.id) || theme;
                          setState(p => ({ ...p, currentTheme: fullTheme }));
                          setView('lobby');
                        }}
                        className="flex-1 bg-stone-100 hover:bg-stone-200 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors text-stone-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleOpenBox(theme)}
                        disabled={state.coins < 100}
                        className="flex-1 bg-emerald-400 hover:bg-emerald-300 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-colors text-emerald-950 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Buy (100)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'collection' && (
          <div className="space-y-10 py-20 min-h-[10vh] flex flex-col items-center">
            <div className="text-center mb-4">
              <h2 className="text-6xl font-black tracking-tighter">Your Collection.</h2>
            </div>

            {state.collection.length === 0 ? (
              <div className="text-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-stone-100">
                <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <ShoppingBag className="w-10 h-10 text-stone-200" />
                </div>
                <p className="text-stone-400 text-xl font-light max-w-xs mx-auto">Your display is looking a bit lonely. Start unboxing!</p>
              </div>
            ) : (
              <div className="space-y-10 max-w-5xl mx-auto w-full">
                {(() => {
                  // Merge all known themes to find definitions
                  const allKnownThemes = [...state.themeHistory, ...state.publicThemes];

                  // Get unique themes from collection
                  const ownedThemeNames = Array.from(new Set(state.collection.map(c => c.theme)));

                  return ownedThemeNames.map(themeName => {
                    // Find the definition for this theme
                    let themeDef = allKnownThemes.find(t => t.name === themeName);

                    // Fallback: If we can't find the theme definition, create a minimal one from the context
                    if (!themeDef) {
                      const sampleChar = state.collection.find(c => c.theme === themeName);
                      if (sampleChar) {
                        themeDef = {
                          id: sampleChar.themeId || 'unknown',
                          name: themeName,
                          description: 'Imported Collection',
                          characterDefinitions: [],
                          visualStyle: 'Modern',
                          rarity: 'Common',
                          createdAt: Date.now(),
                          createdBy: sampleChar.themeCreatorId || 'unknown',
                          creatorName: 'Unknown Creator',
                          isPublic: true
                        };
                      }
                    }

                    if (!themeDef) return null;

                    const ownedInTheme = state.collection.filter(c => c.theme === themeName);

                    // Ensure the themeDef has characterDefinitions if it's missing them
                    // This ensures all characters user owns are displayed even if the original definition is unreachable
                    const mergedThemeDef = {
                      ...themeDef,
                      characterDefinitions: themeDef.characterDefinitions?.length > 0
                        ? themeDef.characterDefinitions
                        : Array.from(new Set(ownedInTheme.map(c => c.name))).map(name => {
                          const c = ownedInTheme.find(char => char.name === name)!;
                          return { name: c.name, description: c.description, rarity: c.rarity };
                        })
                    };

                    return (
                      <CharacterShelf
                        key={themeDef.id + themeName}
                        theme={mergedThemeDef}
                        ownedCharacters={ownedInTheme}
                        onCharacterClick={(char) => {
                          setState(p => ({ ...p, activeCharacter: char }));
                          setView('tools');
                        }}
                      />
                    );
                  }).filter(Boolean);
                })()}
              </div>
            )}
          </div>
        )}


        {
          view === 'tools' && state.activeCharacter && (
            <div className="max-w-4xl mx-auto space-y-10 items-start animate-in slide-in-from-bottom-20 duration-1000">
              <button
                onClick={() => setView('collection')}
                className="flex items-center gap-1 text-stone-400 font-black hover:text-stone-900 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" /> Return to Vault
              </button>

              <div className="bg-white rounded-[4.5rem] p-12 shadow-2xl border border-stone-50 flex flex-col items-center text-center">
                <div className="w-full max-w-sm aspect-square rounded-[3.5rem] overflow-hidden bg-stone-50 mb-12 border-4 border-white shadow-xl relative group">
                  <img
                    src={state.activeCharacter.imageUrl}
                    alt={state.activeCharacter.name}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-[3s]"
                  />
                </div>

                <div className="space-y-6">
                  <div>
                    <span className="bg-stone-100 text-stone-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">
                      {state.activeCharacter.theme} Edition
                    </span>
                    <h2 className="text-6xl font-black tracking-tighter mb-2">{state.activeCharacter.name}</h2>
                    <div className="flex items-center justify-center gap-3">
                      <span className="bg-stone-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        {state.activeCharacter.rarity}
                      </span>
                      {state.activeCharacter.count && state.activeCharacter.count > 1 && (
                        <span className="bg-emerald-100 text-emerald-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                          x{state.activeCharacter.count} Duplicate
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-50/80 rounded-[2.5rem] p-10 border border-stone-100 max-w-2xl">
                    <p className="text-stone-500 text-lg leading-relaxed font-light italic">
                      {state.activeCharacter.description || "A unique piece in the collection."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </main >

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-3xl border border-stone-200/40 px-10 py-6 flex items-center gap-14 z-40 rounded-[3.5rem] shadow-2xl transition-all duration-700 hover:scale-105 hover:bg-white">
        <button onClick={() => setView('lobby')} className={`flex flex-col items-center gap-2 transition-all group ${view === 'lobby' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`}>
          <Package className={`w-7 h-7 transition-all ${view === 'lobby' ? 'scale-110 fill-stone-900/5' : 'group-hover:scale-110'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Home</span>
        </button>
        <button onClick={() => setView('mini-game')} className={`flex flex-col items-center gap-2 transition-all group ${view === 'mini-game' ? 'text-emerald-600' : 'text-stone-300 hover:text-emerald-500'}`}>
          <Mic className={`w-7 h-7 transition-all ${view === 'mini-game' ? 'scale-110 fill-emerald-600/5' : 'group-hover:scale-110'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Lab</span>
        </button>
        <button onClick={() => setView('marketplace')} className={`flex flex-col items-center gap-2 transition-all group ${view === 'marketplace' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`}>
          <Store className={`w-7 h-7 transition-all ${view === 'marketplace' ? 'scale-110 fill-stone-900/5' : 'group-hover:scale-110'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Shop</span>
        </button>
        <button onClick={() => setView('collection')} className={`flex flex-col items-center gap-2 transition-all group ${view === 'collection' ? 'text-stone-900' : 'text-stone-300 hover:text-stone-500'}`}>
          <LayoutGrid className={`w-7 h-7 transition-all ${view === 'collection' ? 'scale-110 fill-stone-900/5' : 'group-hover:scale-110'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.2em]">Shelf</span>
        </button>
      </nav>
    </div >
  );
};

export default App;