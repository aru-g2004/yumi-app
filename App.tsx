
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
  Loader2,
  Mic,
  LogOut,
  User as UserIcon,
  ShoppingBag,
  Gift,
  ArrowRight
} from 'lucide-react';
import { AppState, AppView, Character, CollectionTheme, User } from './types';
import { 
  generateThemeSet, 
  generateCharacterImage, 
  editCharacterImage, 
  animateCharacter,
  requestApiKey,
  checkApiKey
} from './services/geminiService';
import LiveDesignLab from './components/LiveDesignLab';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<AppState>({
    coins: 200,
    collection: [],
    currentTheme: null,
    activeCharacter: null,
    user: null
  });

  const [view, setView] = useState<AppView>('login');
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [apiKeySelected, setApiKeySelected] = useState(false);

  // Debug: Log origin for user to fix Google OAuth
  useEffect(() => {
    if (view === 'login') {
      console.log(`%c[yumi] To fix origin_mismatch, add this to Google Origins: %c${window.location.origin}`, "color: #e11d48; font-weight: bold;", "color: #2563eb; font-weight: bold; text-decoration: underline;");
    }
  }, [view]);

  useEffect(() => {
    const savedUser = localStorage.getItem('yumi_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      setUser(parsed);
      setView('lobby');
    }
  }, []);

  useEffect(() => {
    if (user) {
      const savedState = localStorage.getItem(`yumi_state_${user.id}`);
      if (savedState) {
        setState(JSON.parse(savedState));
      } else {
        setState({
          coins: 200,
          collection: [],
          currentTheme: null,
          activeCharacter: null,
          user: user
        });
      }
    }
  }, [user]);

  useEffect(() => {
    if (user && state.user?.id === user.id) {
      localStorage.setItem(`yumi_state_${user.id}`, JSON.stringify(state));
    }
  }, [state, user]);

  useEffect(() => {
    const handleCredentialResponse = (response: any) => {
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        const newUser: User = {
          id: payload.sub,
          name: payload.name,
          email: payload.email,
          picture: payload.picture
        };
        setUser(newUser);
        localStorage.setItem('yumi_user', JSON.stringify(newUser));
        setView('lobby');
      } catch (err) {
        console.error("Failed to parse Google ID Token", err);
      }
    };

    if ((window as any).google) {
      (window as any).google.accounts.id.initialize({
        client_id: "632319934246-ojvvdt5j4jfj22ponfbavgg7bghdsehf.apps.googleusercontent.com",
        callback: handleCredentialResponse,
        auto_select: false,
      });

      if (view === 'login') {
        (window as any).google.accounts.id.renderButton(
          document.getElementById("googleBtn"),
          { theme: "outline", size: "large", width: "100%" }
        );
      }
    }
  }, [view]);

  useEffect(() => {
    checkApiKey().then(hasKey => {
      setApiKeySelected(hasKey);
    });
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('yumi_user');
    setView('login');
  };

  const handleGuestMode = () => {
    const guestUser: User = {
      id: 'guest',
      name: 'Collector',
      email: 'guest@yumi.studio',
      picture: 'https://api.dicebear.com/7.x/avataaars/svg?seed=yumi'
    };
    setUser(guestUser);
    setView('lobby');
  };

  const addCoins = (amount: number) => {
    setState(prev => ({ ...prev, coins: prev.coins + amount }));
  };

  const handleApiKeyPrompt = async () => {
    await requestApiKey();
    setApiKeySelected(true); 
  };

  const handleError = async (error: any) => {
    const errorStr = String(error).toLowerCase();
    if (errorStr.includes('403') || errorStr.includes('permission') || errorStr.includes('not found')) {
      alert("This unboxing feature requires a paid API key for 3D generation. Please select a valid key.");
      setApiKeySelected(false);
      await handleApiKeyPrompt();
    } else {
      alert(`Unboxing Error: ${error.message || 'The model encountered an issue. Please try again.'}`);
    }
  };

  const handleCreateTheme = async () => {
    if (!themeInput.trim()) return;
    setLoading(true);
    setLoadingMsg('Curating character concepts...');
    
    try {
      const theme = await generateThemeSet(themeInput);
      setState(prev => ({ ...prev, currentTheme: theme }));
      setView('lobby');
      
      for (let i = 0; i < theme.characterDefinitions.length; i++) {
        const charDef = theme.characterDefinitions[i];
        setLoadingMsg(`Drafting character ${i + 1}/6: ${charDef.name}...`);
        try {
          const previewUrl = await generateCharacterImage(charDef, theme.name, '1K');
          setState(prev => {
            if (!prev.currentTheme) return prev;
            const updatedDefs = [...prev.currentTheme.characterDefinitions];
            updatedDefs[i] = { ...updatedDefs[i], imageUrl: previewUrl };
            return {
              ...prev,
              currentTheme: { ...prev.currentTheme, characterDefinitions: updatedDefs }
            };
          });
        } catch (imgErr) {
          console.error(`Failed to generate preview for ${charDef.name}:`, imgErr);
        }
      }
    } catch (error) {
      await handleError(error);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const handleOpenBox = async () => {
    if (!state.currentTheme || state.coins < 100) return;
    if (!apiKeySelected) {
      const confirmed = await checkApiKey();
      if (!confirmed) await handleApiKeyPrompt();
    }

    setLoading(true);
    setLoadingMsg('Sculpting your mystery collectible... ✨');
    setView('opening');
    
    try {
      const defs = state.currentTheme.characterDefinitions;
      const index = Math.floor(Math.random() * defs.length);
      const def = defs[index];
      
      let imageUrl = def.imageUrl;
      if (!imageUrl || imageSize !== '1K') {
        imageUrl = await generateCharacterImage(def, state.currentTheme.name, imageSize);
      }
      
      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name: def.name,
        description: def.description,
        rarity: def.rarity,
        imageUrl: imageUrl!,
        theme: state.currentTheme.name,
        obtainedAt: Date.now()
      };

      // Slight delay for dramatic effect
      await new Promise(r => setTimeout(r, 2000));

      setState(prev => ({
        ...prev,
        coins: prev.coins - 100,
        collection: [newChar, ...prev.collection],
        activeCharacter: newChar
      }));
      setView('tools');
    } catch (error) {
      setView('lobby');
      await handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!state.activeCharacter || !editPrompt) return;
    setLoading(true);
    setLoadingMsg('Refining 3D model with Gemini...');
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
    if (!apiKeySelected) await handleApiKeyPrompt();

    setLoading(true);
    setLoadingMsg('Animating 3D physics with Veo... 🎬');
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

  const renderLoading = () => (
    <div className="fixed inset-0 bg-stone-50/90 backdrop-blur-md z-[60] flex flex-col items-center justify-center">
      <div className="w-16 h-16 border-4 border-stone-200 border-t-rose-400 rounded-full animate-spin"></div>
      <p className="mt-8 text-lg font-medium text-stone-800 animate-pulse text-center max-w-xs px-4">
        {loadingMsg}
      </p>
    </div>
  );

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center p-6 overflow-hidden relative">
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-rose-100 rounded-full blur-[80px]"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-50 rounded-full blur-[80px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md bg-white/40 backdrop-blur-3xl rounded-[3rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] border border-white/50 text-center space-y-10 animate-in zoom-in-95 duration-700">
          <div className="inline-block bg-stone-900 p-6 rounded-[2rem] text-white">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <div>
            <h1 className="text-5xl font-black tracking-tight text-stone-900 mb-4">yumi.</h1>
            <p className="text-stone-500 font-medium text-lg leading-relaxed">Curate your digital shelf. A chic home for your 3D collectibles.</p>
          </div>
          
          <div className="space-y-4">
            <div id="googleBtn" className="w-full h-12 flex justify-center"></div>
            <button 
              onClick={handleGuestMode}
              className="w-full py-4 rounded-2xl border border-stone-200 text-stone-600 font-bold text-sm hover:bg-white transition-colors flex items-center justify-center gap-2"
            >
              Continue as Guest <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="pt-4">
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-stone-400">Powered by Gemini & Veo</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'opening') {
    return (
      <div className="min-h-screen bg-stone-900 flex flex-col items-center justify-center p-8 z-50">
        <div className="relative w-64 h-64 mb-12 animate-bounce">
          <div className="absolute inset-0 bg-rose-400 rounded-3xl rotate-6 shadow-2xl opacity-80"></div>
          <div className="absolute inset-0 bg-white rounded-3xl flex items-center justify-center shadow-2xl border-4 border-stone-100">
            <Gift className="w-32 h-32 text-rose-400 animate-pulse" />
          </div>
          <div className="absolute -top-4 -right-4 bg-emerald-400 text-white p-3 rounded-full shadow-lg">
            <Sparkles className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-4xl font-black text-white tracking-tighter mb-4 animate-pulse">Sculpting your reveal...</h2>
        <p className="text-stone-400 text-lg font-light">The Curator is finalizing the 3D materials.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 text-stone-900">
      {loading && view !== 'opening' && renderLoading()}

      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-stone-100 px-8 py-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('lobby')}>
          <div className="bg-stone-900 p-1.5 rounded-lg text-white">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">yumi.</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-stone-50 px-4 py-2 rounded-full flex items-center gap-2 border border-stone-100">
            <Coins className="w-4 h-4 text-stone-400" />
            <span className="font-bold text-stone-800 text-sm tracking-tight">{state.coins}</span>
          </div>
          
          <div className="h-6 w-[1px] bg-stone-200 mx-1 hidden sm:block"></div>
          
          {user && (
            <div className="flex items-center gap-3 group relative cursor-pointer">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold truncate max-w-[100px] text-stone-900">{user.name.split(' ')[0]}</p>
                <button onClick={handleLogout} className="text-[10px] font-bold text-stone-400 uppercase tracking-wider hover:text-rose-500 transition-colors">Logout</button>
              </div>
              <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full border border-stone-200 p-0.5" />
            </div>
          )}

          <button 
            onClick={handleApiKeyPrompt}
            className={`p-2 rounded-full transition-colors ${apiKeySelected ? 'text-emerald-600 bg-emerald-50' : 'text-stone-400 hover:bg-stone-100'}`}
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {!apiKeySelected && (
          <div className="mb-10 p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center gap-4 text-rose-800 animate-in slide-in-from-top-4">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Pro features currently locked</p>
              <p className="text-xs opacity-80 mt-1">Select a paid API key to enable 3D sculpting and cinematic animations.</p>
            </div>
            <button onClick={handleApiKeyPrompt} className="text-xs font-black underline uppercase tracking-widest whitespace-nowrap">Fix Now</button>
          </div>
        )}

        {view === 'lobby' && (
          <div className="space-y-16">
            <section className="bg-stone-900 rounded-[3rem] p-16 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-2xl">
                <h2 className="text-6xl font-black mb-6 tracking-tighter leading-none">Curate your shelf.</h2>
                <p className="text-stone-400 text-xl mb-10 leading-relaxed font-light">Welcome back, {user?.name?.split(' ')[0]}. Design your series, earn credits in the lab, and collect hyper-stylized 3D art.</p>
                <div className="flex flex-wrap gap-5">
                  <button 
                    onClick={() => setView('theme-select')}
                    className="bg-white text-stone-900 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-stone-50 transition-all shadow-xl flex items-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" /> Create Series
                  </button>
                  <button 
                    onClick={() => setView('mini-game')}
                    className="bg-emerald-400 text-emerald-950 px-10 py-5 rounded-2xl font-bold text-lg hover:bg-emerald-300 transition-all shadow-xl flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5" /> Earn Credits
                  </button>
                </div>
              </div>
              <div className="absolute top-1/2 right-0 w-1/2 h-full -translate-y-1/2 opacity-10 pointer-events-none flex items-center justify-center">
                 <ShoppingBag className="w-64 h-64 -rotate-12" />
              </div>
            </section>

            {state.currentTheme && (
              <section className="bg-white rounded-[3rem] p-12 shadow-[0_20px_40px_rgba(0,0,0,0.03)] border border-stone-100">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
                  <div>
                    <span className="text-rose-400 text-xs font-black uppercase tracking-[0.2em] mb-3 block">Now Sculpting</span>
                    <h3 className="text-4xl font-black tracking-tight mb-2">{state.currentTheme.name}</h3>
                    <p className="text-stone-400 text-lg font-light leading-relaxed max-w-xl">{state.currentTheme.description}</p>
                  </div>
                  <div className="flex items-center gap-4 bg-stone-50 p-2 rounded-3xl border border-stone-100">
                    <select 
                      value={imageSize}
                      onChange={(e) => setImageSize(e.target.value as any)}
                      className="bg-transparent border-none px-4 py-3 font-bold text-sm text-stone-800 outline-none"
                    >
                      <option value="1K">Standard Res</option>
                      <option value="2K">High Res</option>
                      <option value="4K">Ultra Res</option>
                    </select>
                    <button 
                      onClick={handleOpenBox}
                      disabled={state.coins < 100}
                      className={`px-8 py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all shadow-lg ${state.coins >= 100 ? 'bg-stone-900 text-white hover:bg-stone-800' : 'bg-stone-100 text-stone-300 cursor-not-allowed'}`}
                    >
                      Acquire (100)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
                  {state.currentTheme.characterDefinitions.map((char, i) => (
                    <div key={i} className="group flex flex-col items-center text-center p-2 rounded-3xl transition-all hover:bg-stone-50/50">
                      <div className="w-full aspect-square bg-stone-50 rounded-[2rem] flex items-center justify-center mb-4 relative overflow-hidden border border-stone-100/50">
                        {char.imageUrl ? (
                          <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        ) : (
                          <div className="w-8 h-8 border-2 border-stone-200 border-t-stone-400 rounded-full animate-spin"></div>
                        )}
                      </div>
                      <span className="text-sm font-bold text-stone-900 truncate w-full px-2">{char.name}</span>
                      <span className={`text-[10px] font-black uppercase mt-1.5 px-3 py-1 rounded-full ${
                        char.rarity === 'Legendary' ? 'bg-rose-50 text-rose-500' : 
                        char.rarity === 'Rare' ? 'bg-emerald-50 text-emerald-600' : 'bg-stone-100 text-stone-400'
                      }`}>
                        {char.rarity}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {view === 'theme-select' && (
          <div className="max-w-xl mx-auto space-y-10 animate-in slide-in-from-bottom-8 duration-500">
             <button onClick={() => setView('lobby')} className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-900 transition-colors">
               <ChevronLeft className="w-5 h-5" /> Back
             </button>
             <div className="bg-white rounded-[3rem] p-12 shadow-[0_32px_64px_rgba(0,0,0,0.05)] border border-stone-100">
               <h2 className="text-3xl font-black mb-4 tracking-tight">What's the vibe?</h2>
               <p className="text-stone-400 mb-10 leading-relaxed font-light">Describe your series theme. Keep it chic, keep it comfortable, or go wild. Gemini will handle the art direction.</p>
               <div className="space-y-8">
                 <div>
                   <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 mb-3">Series Concept</label>
                   <input 
                    type="text" 
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    placeholder="e.g. Minimalist Zen Frogs"
                    className="w-full bg-stone-50 border border-stone-100 rounded-[2rem] px-8 py-5 text-lg font-medium outline-none focus:ring-4 ring-rose-50 transition-all"
                   />
                 </div>
                 <button 
                  onClick={handleCreateTheme}
                  className="w-full bg-stone-900 text-white py-6 rounded-[2rem] font-black text-lg tracking-widest uppercase hover:bg-stone-800 shadow-2xl transition-all flex items-center justify-center gap-3"
                 >
                   <Wand2 className="w-6 h-6" /> Begin Sculpting
                 </button>
               </div>
             </div>
          </div>
        )}

        {view === 'mini-game' && (
          <LiveDesignLab onEarn={addCoins} />
        )}

        {view === 'collection' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <h2 className="text-5xl font-black tracking-tighter">Your Shelf.</h2>
            {state.collection.length === 0 ? (
              <div className="text-center py-32 bg-white rounded-[4rem] border border-stone-100 shadow-sm">
                <ShoppingBag className="w-16 h-16 text-stone-100 mx-auto mb-6" />
                <p className="text-stone-400 text-lg font-light">Your shelf is empty. Curate your first series to start.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
                {state.collection.map((char) => (
                  <div 
                    key={char.id}
                    onClick={() => { setState(p => ({...p, activeCharacter: char})); setView('tools'); }}
                    className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer border border-stone-100"
                  >
                    <div className="aspect-square bg-stone-50 overflow-hidden">
                      <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                    </div>
                    <div className="p-6">
                      <h4 className="font-bold text-stone-900 text-sm truncate">{char.name}</h4>
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-1 font-black">{char.theme}</p>
                    </div>
                  </div>
                ))}
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
                   <span className="bg-stone-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {state.activeCharacter.rarity}
                    </span>
                 </div>
                 <p className="text-stone-500 text-lg leading-relaxed font-light p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100">{state.activeCharacter.description}</p>
               </div>
            </div>

            <div className="space-y-10 lg:pt-16">
               <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-stone-50">
                 <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                   <Sparkles className="w-5 h-5 text-rose-400" /> Professional Refinement
                 </h3>
                 <p className="text-stone-400 text-sm mb-8 font-light leading-relaxed">Modify the material, texture, or finish of this collectible. Try "brushed gold" or "frosted glass".</p>
                 <div className="flex gap-3">
                   <input 
                    type="text" 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g. matte ceramic finish"
                    className="flex-1 bg-stone-50 border border-stone-100 rounded-2xl px-6 py-4 text-sm outline-none focus:ring-4 ring-stone-100 transition-all"
                   />
                   <button onClick={handleEdit} className="bg-stone-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-stone-800 transition-all">Refine</button>
                 </div>
               </section>

               <section className="bg-white rounded-[3rem] p-10 shadow-xl border border-stone-50">
                 <h3 className="text-xl font-black mb-6 flex items-center gap-2">
                   <Video className="w-5 h-5 text-emerald-400" /> Cinematic Reveal
                 </h3>
                 <p className="text-stone-400 text-sm mb-8 font-light leading-relaxed">Generate a professional 3D showcase video with Veo. Perfect for sharing your new acquisition.</p>
                 <div className="grid grid-cols-2 gap-5">
                   <button onClick={() => handleAnimate('16:9')} className="bg-stone-50 hover:bg-stone-100 p-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] border border-stone-100 transition-all">Landscape</button>
                   <button onClick={() => handleAnimate('9:16')} className="bg-stone-50 hover:bg-stone-100 p-6 rounded-3xl font-black text-[10px] uppercase tracking-[0.2em] border border-stone-100 transition-all">Portrait</button>
                 </div>
               </section>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-2xl border border-stone-200/50 px-8 py-5 flex items-center gap-10 z-40 rounded-[3rem] shadow-[0_32px_64px_rgba(0,0,0,0.1)] transition-all duration-500 hover:scale-105">
        <button onClick={() => setView('lobby')} className={`flex flex-col items-center gap-1 transition-all ${view === 'lobby' ? 'text-stone-900 scale-110' : 'text-stone-300 hover:text-stone-500'}`}>
          <Package className={`w-6 h-6 ${view === 'lobby' ? 'fill-stone-900/10' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Lobby</span>
        </button>
        <button onClick={() => setView('mini-game')} className={`flex flex-col items-center gap-1 transition-all ${view === 'mini-game' ? 'text-emerald-600 scale-110' : 'text-stone-300 hover:text-stone-500'}`}>
          <Mic className={`w-6 h-6 ${view === 'mini-game' ? 'fill-emerald-600/10' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Lab</span>
        </button>
        <button onClick={() => setView('collection')} className={`flex flex-col items-center gap-1 transition-all ${view === 'collection' ? 'text-stone-900 scale-110' : 'text-stone-300 hover:text-stone-500'}`}>
          <LayoutGrid className={`w-6 h-6 ${view === 'collection' ? 'fill-stone-900/10' : ''}`} />
          <span className="text-[9px] font-black uppercase tracking-widest">Shelf</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
