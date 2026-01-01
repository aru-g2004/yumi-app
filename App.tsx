
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
  Store,
  Trophy
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
import Onboarding from './components/Onboarding';
import StudioFlow from './components/StudioFlow';
import SpinWheel from './components/SpinWheel';
import { auth, db } from './services/firebase';
import { onSnapshot, doc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login';
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
  getThemeCharacters,
  updateLastSpin
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
  const [notification, setNotification] = useState<string | null>(null);

  // Real-time coin listener for notifications
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, 'users', user.id, 'profile', 'data');
    let firstLoad = true;
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const newCoins = data.coins || 0;
        if (!firstLoad) {
          setState(prev => {
            if (newCoins > prev.coins) {
              const earned = newCoins - prev.coins;
              setNotification(`You earned ${earned} coins!`);
              setTimeout(() => setNotification(null), 5000);
            }
            return { ...prev, coins: newCoins };
          });
        }
        firstLoad = false;
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Collector',
          email: firebaseUser.email || '',
          picture: firebaseUser.photoURL || 'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi'
        };

        try {
          // Fetch existing profile first to avoid redundant updates
          let profile = await getUserProfile(newUser.id);

          if (!profile) {
            // New user: Create profile
            await createOrUpdateUserProfile(newUser);
            profile = await getUserProfile(newUser.id);
          } else {
            // Returning user: Sync basic info only if changed
            if (profile.name !== newUser.name || profile.picture !== newUser.picture) {
              await createOrUpdateUserProfile(newUser);
            }
          }

          const themes = await getUserThemes(newUser.id);
          const collection = await getUserCollection(newUser.id);
          const publicThemes = await getPublicThemes();

          const fullUser = { ...newUser, ...profile };
          setUser(fullUser);

          setState(prev => ({
            ...prev,
            user: fullUser,
            coins: profile?.coins || 500,
            themeHistory: themes,
            currentTheme: themes[0] || null,
            collection: collection,
            publicThemes: publicThemes
          }));

          if (profile?.hasOnboarded) {
            setView('marketplace');
          } else {
            setView('onboarding');
          }
        } catch (error) {
          console.error('Error loading user data from Firestore:', error);
          setView('marketplace');
        } finally {
          setLoading(false);
        }
      } else {
        setUser(null);
        setView('login');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user && state.user?.id === user.id) {
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

    if (errorStr.toLowerCase().includes('403') || errorStr.toLowerCase().includes('permission') || errorStr.toLowerCase().includes('not found')) {
      setGlobalError("Paid API Key required. Access your billing account at ai.google.dev/gemini-api/docs/billing");
      setApiKeySelected(false);
    } else if (errorStr.toLowerCase().includes('429')) {
      setGlobalError("Generator Heat: Rate limit reached. Taking a short break...");
    } else {
      setGlobalError(`Production Error: ${errorStr.substring(0, 80)}...`);
    }
  };

  const handleOnboardingComplete = async (studioName: string, picture: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const updatedUser = { ...user, studioName, picture, hasOnboarded: true };
      await createOrUpdateUserProfile(updatedUser);
      setUser(updatedUser);
      setState(prev => ({ ...prev, user: updatedUser }));
      setView('marketplace');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const [showSpin, setShowSpin] = useState(false);

  const handleCreateTheme = async (advancedData: Partial<CollectionTheme>) => {
    if (!user) return;
    setLoading(true);
    setLoadingMsg('Initiating series creation...');

    try {
      await updateUserCoins(user.id, -500);
      setState(prev => ({ ...prev, coins: prev.coins - 500 }));

      setLoadingMsg('Writing series DNA...');
      const theme = await generateThemeSet(advancedData.name || 'Untitled', advancedData);
      setLoadingMsg('Rendering visual packaging...');
      const boxArt = await generateBoxArt(user.id, theme.id, theme.name, theme.visualStyle);

      const finalTheme = { ...theme, ...advancedData, boxImageUrl: boxArt };
      await saveTheme(user.id, finalTheme, true);

      setState(prev => ({
        ...prev,
        currentTheme: finalTheme,
        publicThemes: [{
          ...finalTheme,
          creatorId: user.id,
          creatorName: user.studioName || user.name,
          characterCount: 6,
          isPublic: true,
          blindBoxPrice: 100,
          totalPurchases: 0
        }, ...prev.publicThemes]
      }));

      setView('manufacturing');
      startSequentialProduction(finalTheme);
    } catch (error) {
      await handleError(error);
    } finally {
      setLoading(false);
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
      if (theme.characterDefinitions[i].imageUrl) {
        setActiveStep(i + 1);
        continue;
      }

      setActiveStep(i);

      try {
        const url = await generateCharacterImage(user.id, theme.id, defs[i], theme.name, theme.visualStyle, '1K');
        const characterWithImage = { ...defs[i], imageUrl: url };
        await saveCharacter(user.id, theme.id, characterWithImage);

        setState(prev => {
          if (!prev.currentTheme) return prev;
          const updatedDefs = [...prev.currentTheme.characterDefinitions];
          updatedDefs[i] = { ...updatedDefs[i], imageUrl: url };
          return {
            ...prev,
            currentTheme: { ...prev.currentTheme, characterDefinitions: updatedDefs }
          };
        });

        await new Promise(r => setTimeout(r, 4000));
      } catch (err) {
        handleError(err);
        setIsProducing(false);
        return;
      }
    }

    setIsProducing(false);
    setActiveStep(6);

    if (user) {
      try {
        const themes = await getUserThemes(user.id);
        const updatedTheme = themes.find(t => t.id === theme.id);
        if (updatedTheme) {
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
  };

  const resumeProduction = () => {
    if (state.currentTheme) {
      startSequentialProduction(state.currentTheme);
    }
  };

  const handleOpenBox = async (targetTheme: CollectionTheme = state.currentTheme!) => {
    if (!targetTheme || state.coins < 100) return;
    if (!user) {
      setGlobalError('You must be logged in to unbox characters');
      return;
    }

    setLoading(true);
    setLoadingMsg('Unboxing your surprise...');

    try {
      const creatorId = (targetTheme as any).createdBy || (targetTheme as any).creatorId;
      if (!creatorId) throw new Error('Creator ID not found for this theme');

      // 1. Transaction & Selection (Deducts from buyer, adds to seller)
      // Update local coins immediately for responsive UI and to prevent notification sync race
      setState(prev => ({ ...prev, coins: prev.coins - 100 }));

      const def = await purchaseBlindBox(user.id, targetTheme.id, creatorId, 100);

      const themeToUse = { ...targetTheme };

      // 2. Visual handling
      let finalImageUrl = def.imageUrl;
      if (!finalImageUrl) {
        setLoadingMsg('Rendering character image...');
        finalImageUrl = await generateCharacterImage(user.id, themeToUse.id, def, themeToUse.name, themeToUse.visualStyle, imageSize);
      }

      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name: def.name,
        description: def.description || '',
        rarity: def.rarity,
        imageUrl: finalImageUrl,
        theme: themeToUse.name,
        themeId: themeToUse.id,
        themeCreatorId: creatorId,
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

  const handleEdit = async () => {
    if (!state.activeCharacter || !editPrompt) return;
    setLoading(true);
    setLoadingMsg('Refining 3D model...');
    try {
      const newImageUrl = await editCharacterImage(state.activeCharacter.imageUrl, editPrompt);
      const updated = { ...state.activeCharacter, imageUrl: newImageUrl };
      setState(prev => ({
        ...prev,
        activeCharacter: updated,
        collection: prev.collection.map(c => c.id === updated.id ? updated : c)
      }));
      setEditPrompt('');
    } catch (error) {
      await handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimate = async (aspect: '16:9' | '9:16') => {
    if (!state.activeCharacter) return;
    setLoading(true);
    setLoadingMsg('Animating 3D physics...');
    try {
      const videoUrl = await animateCharacter(state.activeCharacter.imageUrl, '', aspect);
      const updated = { ...state.activeCharacter, videoUrl };
      setState(prev => ({
        ...prev,
        activeCharacter: updated,
        collection: prev.collection.map(c => c.id === updated.id ? updated : c)
      }));
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

      await addToCollection(user.id, unboxingChar, themeToUse.id, creatorId, creatorName);

      setState(prev => {
        const existingIndex = prev.collection.findIndex(c => c.name === unboxingChar.name && c.theme === unboxingChar.theme);
        let newCollection = [...prev.collection];

        if (existingIndex >= 0) {
          const existing = newCollection[existingIndex];
          newCollection[existingIndex] = {
            ...existing,
            count: (existing.count || 1) + 1,
            obtainedAt: Date.now()
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
      setView('collection');
    } catch (error) {
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

  if (view === 'login') return <Login />;

  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  if (view === 'opening' && unboxingChar && unboxingTheme) {
    return <BlindBoxOpener character={unboxingChar} theme={unboxingTheme} onComplete={onUnboxingComplete} />;
  }

  return (
    <div className="min-h-screen pb-32 bg-[#faf9f6] text-stone-900">
      {loading && renderLoading()}
      {renderGlobalError()}

      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 border border-white/10">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="font-black text-xs uppercase tracking-widest">{notification}</span>
        </div>
      )}
      {showSpin && <SpinWheel
        onWin={(amount) => {
          addCoins(amount);
          setShowSpin(false);
          if (user) {
            updateLastSpin(user.id);
            // Update local state to reflect the spin
            const now = Date.now();
            setUser(prev => prev ? { ...prev, lastSpin: now } : null);
          }
        }}
        onClose={() => setShowSpin(false)}
      />}

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-stone-100 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('marketplace')}>
          <div className="bg-stone-900 p-1.5 rounded-xl text-white"><ShoppingBag className="w-5 h-5" /></div>
          <h1 className="text-2xl font-black tracking-tighter">yumi.</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-stone-50 px-5 py-2.5 rounded-full flex items-center gap-3 border border-stone-100 shadow-inner">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-stone-400 leading-none">Studio</span>
              <span className="font-black text-stone-900 text-sm leading-none">{user?.studioName || 'Guest'}</span>
            </div>
            <div className="w-px h-4 bg-stone-200" />
            <div className="flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-emerald-500" />
              <span className="font-black text-stone-900 text-sm">{state.coins}</span>
            </div>
          </div>
          <button
            onClick={() => {
              const lastSpin = user?.lastSpin;
              const lastSpinDate = lastSpin ? new Date(lastSpin).toDateString() : '';
              const today = new Date().toDateString();

              if (lastSpinDate !== today) {
                setShowSpin(true);
              } else {
                alert('Come back to spin again tomorrow!');
              }
            }}
            className="p-2.5 bg-amber-50 rounded-full text-amber-600 hover:bg-amber-100 transition-all border border-amber-100"
          >
            <Trophy className="w-5 h-5" />
          </button>
          {user && (
            <img src={user.picture} alt={user.name} onClick={handleLogout} className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform" />
          )}
          <button onClick={handleApiKeyPrompt} className={`p-2.5 rounded-full transition-all ${apiKeySelected ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400 hover:bg-stone-200'}`}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        {(view === 'marketplace' || view === 'lobby') && (
          <div className="space-y-16">
            <section className="bg-stone-900 rounded-[3.5rem] p-20 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none"></div>
              <div className="relative z-10 max-w-2xl">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-6 block">Production Lab</span>
                <h2 className="text-7xl font-black mb-8 tracking-tighter leading-[0.9]">Create your universe.</h2>
                <p className="text-stone-400 text-xl mb-12 leading-relaxed font-light">Input a theme, and watch as we generate a full mystery series including packaging and unique characters.</p>
                <div className="flex flex-wrap gap-5">
                  <button onClick={() => setView('studio-initial')} className="bg-white text-stone-900 px-12 py-6 rounded-[2rem] font-black text-lg hover:bg-stone-100 transition-all shadow-2xl flex items-center gap-3 active:scale-95">
                    <PlusCircle className="w-6 h-6" /> Create Collection
                  </button>
                </div>
              </div>
            </section>

            <div className="space-y-16 animate-in fade-in zoom-in duration-700">
              <div className="text-center space-y-4">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 block">World Market</span>
                <h2 className="text-6xl font-black tracking-tighter">Community Collections</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {state.publicThemes.map((theme) => (
                  <div key={theme.id} className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-stone-50 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center text-center">
                    <div className="w-full aspect-square bg-stone-50 rounded-[2rem] overflow-hidden mb-5 flex items-center justify-center">
                      <img src={theme.boxImageUrl} className="w-full h-full object-contain" alt={theme.name} />
                    </div>
                    <h3 className="text-xl font-black mb-1">{theme.name}</h3>
                    <p className="text-[9px] font-black uppercase text-emerald-500 mb-6">By {theme.creatorName}</p>
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setState(p => ({ ...p, currentTheme: theme })); setView('marketplace'); }} className="flex-1 bg-stone-100 py-3.5 rounded-xl font-black text-[9px] uppercase">View</button>
                      <button onClick={() => handleOpenBox(theme)} className="flex-1 bg-emerald-400 py-3.5 rounded-xl font-black text-[9px] uppercase">Buy (100)</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {(view === 'studio-initial' || view === 'studio-design') && user && (
          <StudioFlow
            user={user}
            coins={state.coins}
            onStart={handleCreateTheme}
            previousThemes={state.themeHistory}
            onBack={() => setView('marketplace')}
          />
        )}

        {view === 'collection' && (
          <div className="space-y-10 py-10 min-h-[10vh] flex flex-col items-center w-full">
            <h2 className="text-6xl font-black tracking-tighter mb-10">Your Collection.</h2>
            {state.collection.length === 0 ? (
              <div className="text-center py-40 bg-white rounded-[4rem] border-2 border-dashed border-stone-100 w-full">
                <p className="text-stone-400 text-xl font-light">Your shelf is empty. Start unboxing!</p>
              </div>
            ) : (
              <div className="space-y-10 w-full max-w-5xl">
                {(() => {
                  const allKnownThemes = [...state.themeHistory, ...state.publicThemes];
                  const uniqueThemes = Array.from(new Set(state.collection.map(c => c.theme)));
                  return uniqueThemes.map(tName => {
                    let themeDef = allKnownThemes.find(t => t.name === tName);
                    const ownedInTheme = state.collection.filter(c => c.theme === tName);
                    if (!themeDef && ownedInTheme.length > 0) {
                      themeDef = {
                        id: ownedInTheme[0].themeId || 'unknown',
                        name: tName,
                        description: 'Collection Item',
                        characterDefinitions: [],
                        visualStyle: 'Modern'
                      } as any;
                    }
                    if (!themeDef) return null;
                    const mergedDef = {
                      ...themeDef,
                      characterDefinitions: themeDef.characterDefinitions?.length > 0 ? themeDef.characterDefinitions :
                        Array.from(new Set(ownedInTheme.map(c => c.name))).map(n => {
                          const c = ownedInTheme.find(x => x.name === n)!;
                          return { name: n, description: c.description, rarity: c.rarity };
                        })
                    };
                    return <CharacterShelf key={tName} theme={mergedDef} ownedCharacters={ownedInTheme} onCharacterClick={c => { setState(p => ({ ...p, activeCharacter: c })); setView('tools'); }} />;
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {view === 'tools' && state.activeCharacter && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start animate-in slide-in-from-bottom-12 duration-700">
            <div className="space-y-8">
              <button onClick={() => setView('collection')} className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-900">
                <ChevronLeft className="w-5 h-5" /> Back to Shelf
              </button>
              <div className="bg-white rounded-[4rem] p-10 shadow-2xl border border-stone-50 overflow-hidden relative group">
                <div className="aspect-square rounded-[3rem] overflow-hidden bg-stone-50 mb-10 shadow-inner border border-stone-100">
                  {state.activeCharacter.videoUrl ? (
                    <video src={state.activeCharacter.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <img src={state.activeCharacter.imageUrl} alt={state.activeCharacter.name} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-4xl font-black tracking-tight">{state.activeCharacter.name}</h2>
                  <span className="bg-stone-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{state.activeCharacter.rarity}</span>
                </div>
                <p className="text-stone-500 text-lg leading-relaxed font-light p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100">{state.activeCharacter.description}</p>
              </div>
            </div>

            <div className="space-y-10 lg:pt-16">
              <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-stone-50">
                <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-400" /> Cinematic Reveal
                </h3>
                <div className="grid grid-cols-2 gap-5">
                  <button onClick={() => handleAnimate('16:9')} className="bg-stone-50 hover:bg-stone-100 p-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] border border-stone-100">Landscape</button>
                  <button onClick={() => handleAnimate('9:16')} className="bg-stone-50 hover:bg-stone-100 p-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] border border-stone-100">Portrait</button>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-3xl border border-stone-200/40 px-10 py-6 flex items-center gap-14 z-40 rounded-[3.5rem] shadow-2xl transition-all duration-700 hover:scale-105">
        <button onClick={() => setView('marketplace')} className={`flex flex-col items-center gap-2 transition-all ${view === 'marketplace' ? 'text-stone-900' : 'text-stone-300'}`}>
          <Store className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase">Shop</span>
        </button>
        <button onClick={() => setView('studio-initial')} className={`flex flex-col items-center gap-2 transition-all ${view.startsWith('studio') ? 'text-emerald-600' : 'text-stone-300'}`}>
          <Wand2 className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase">Studio</span>
        </button>
        <button onClick={() => setView('collection')} className={`flex flex-col items-center gap-2 transition-all ${view === 'collection' ? 'text-stone-900' : 'text-stone-300'}`}>
          <LayoutGrid className="w-7 h-7" />
          <span className="text-[9px] font-black uppercase">Shelf</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
