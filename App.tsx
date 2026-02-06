import React, { useState, useEffect, useCallback, useRef } from 'react';
import Confetti from 'react-confetti';
import {
  Package,
  LayoutGrid,
  Coins,
  ChevronDown,
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
  Search,
  Store,
  Trophy,
  HelpCircle,
  LogOut
} from 'lucide-react';
import { AppState, AppView, Character, CollectionTheme, User } from './types';
import {
  generateThemeSet,
  generateCharacterImage,
  generateCharacterVideo,
  generateBoxArt,
  requestApiKey,
  checkApiKey
} from './services/geminiService';

import BlindBoxOpener from './components/BlindBoxOpener';
import CharacterShelf from './components/CharacterShelf';
import Onboarding from './components/Onboarding';
import StudioFlow from './components/StudioFlow';
import SpinWheel from './components/SpinWheel';
import AdminPanel from './components/AdminPanel';
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
  updateLastSpin,
  deleteTheme,
  markCollectionComplete
} from './services/firestoreService';
import { isAdmin } from './services/adminService';

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
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [apiKeySelected, setApiKeySelected] = useState(false);
  const [unboxingChar, setUnboxingChar] = useState<Character | null>(null);
  const [unboxingTheme, setUnboxingTheme] = useState<CollectionTheme | null>(null);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCreator, setFilterCreator] = useState('');

  // Unboxing & Batch State
  const [unboxingQueue, setUnboxingQueue] = useState<Character[]>([]);
  const [purchaseModalTheme, setPurchaseModalTheme] = useState<CollectionTheme | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  // Production states
  const [activeStep, setActiveStep] = useState(0); // 0-5 for characters
  const [isProducing, setIsProducing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [previewCharacters, setPreviewCharacters] = useState<any[]>([]);

  // Completion & Celebration State
  const [completedCollections, setCompletedCollections] = useState<string[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Profile Dropdown State
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Admin State
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // Track if collection was completed during current unboxing session
  const [completionDuringUnboxing, setCompletionDuringUnboxing] = useState<{ themeId: string, themeName: string } | null>(null);

  // Stable reference for tracking server-side coin changes
  const lastCoinValue = useRef<number | null>(null);

  // Real-time coin listener for notifications
  useEffect(() => {
    if (!user?.id) {
      lastCoinValue.current = null;
      return;
    }

    const userRef = doc(db, 'users', user.id, 'profile', 'data');

    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newCoins = data.coins || 0;

        // Ensure we have a baseline before showing notifications
        if (lastCoinValue.current !== null && newCoins > lastCoinValue.current) {
          const earned = newCoins - lastCoinValue.current;
          setNotification(`You earned ${earned} coins!`);
          setTimeout(() => setNotification(null), 5000);
        }

        lastCoinValue.current = newCoins;
        setState(prev => ({ ...prev, coins: newCoins }));
      }
    });

    return () => unsubscribe();
  }, [user?.id]);

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

          // Check admin status
          setIsUserAdmin(isAdmin(newUser.email));

          setState(prev => ({
            ...prev,
            user: fullUser,
            coins: profile?.coins || 500,
            themeHistory: themes,
            currentTheme: themes[0] || null,
            collection: collection,
            publicThemes: publicThemes
          }));

          // Load completed collections
          setCompletedCollections(profile?.completedCollections || []);

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
          setAuthLoading(false);
        }
      } else {
        setUser(null);
        setView('login');
        setLoading(false);
        setAuthLoading(false);
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

  // Window resize listener for Confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showProfileDropdown && !target.closest('.profile-dropdown-container')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const handleLogout = () => {
    signOut(auth).then(() => {
      setUser(null);
      setView('login');
    });
  };

  const addCoins = (amount: number, themeName?: string) => {
    console.log(`[App] Adding ${amount} coins. Theme: ${themeName}`);
    // Show notification for local-only/guest updates
    if (!user) {
      setNotification(`You earned ${amount} coins!`);
      setTimeout(() => setNotification(null), 5000);
    }

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
    const apiMessage = error?.message || errorStr;
    console.error("Caught Error:", error);

    // Specific check for Firestore permission errors to avoid confusing them with API Key issues
    if (errorStr.includes('Missing or insufficient permissions') || (error as any)?.code === 'permission-denied') {
      setGlobalError(`Database Permission Error: Access denied. Please try again now that rules are updated.`);
    } else if (errorStr.toLowerCase().includes('403') || errorStr.toLowerCase().includes('401') || errorStr.toLowerCase().includes('permission')) {
      setGlobalError(`API Access Issue: ${apiMessage}. (If this is 403, billing is likely required for public domains)`);
      setApiKeySelected(false);
    } else if (errorStr.toLowerCase().includes('429')) {
      setGlobalError("Generator Heat: Rate limit reached. Taking a short break...");
    } else {
      setGlobalError(`Production Error: ${errorStr.substring(0, 100)}...`);
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

  const urlToBase64 = async (url: string): Promise<string> => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String.split(',')[1]); // Return raw base64 without prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('[Template Seed] Failed to fetch image for base64:', err);
      return '';
    }
  };

  const handleCreateTheme = async (advancedData: Partial<CollectionTheme>) => {
    if (!user) return;
    setLoading(true);
    setLoadingMsg('Initiating series creation...');
    let tempThemeId: string | null = null;

    try {
      await updateUserCoins(user.id, -500);
      setState(prev => ({ ...prev, coins: prev.coins - 500 }));

      setLoadingMsg('Writing series DNA...');
      let theme = await generateThemeSet(advancedData.name || 'Untitled', advancedData);
      tempThemeId = theme.id; // Store for potential rollback

      // Validation Guard: Ensure character definitions aren't empty/malformed
      if (!theme.characterDefinitions || theme.characterDefinitions.length === 0) {
        throw new Error('AI failed to generate unique characters. Please try again.');
      }

      // Ensure every character has a name and description before proceeding
      theme.characterDefinitions = theme.characterDefinitions.map((d, i) => ({
        ...d,
        name: d.name || `Figurine #${i + 1}`,
        description: d.description || `A unique character from the ${theme.name} series.`
      }));

      // Template Seeding: If using a template, fetch its characters to find a baseline
      let seedBaselineData = '';
      if ((advancedData as any).id && (advancedData as any).creatorId) {
        setLoadingMsg('Synchronizing template design...');
        try {
          const sourceChars = await getThemeCharacters((advancedData as any).creatorId, (advancedData as any).id);
          if (sourceChars.length > 0 && sourceChars[0].imageUrl) {
            seedBaselineData = await urlToBase64(sourceChars[0].imageUrl);
          }
        } catch (seedErr) {
          console.warn('[Template Seed] Error fetching source characters:', seedErr);
        }
      }

      // Safe Merge: Protect AI-generated names/descriptions from being overwritten by empty form inputs
      const finalTheme: CollectionTheme = {
        ...theme,
        ...advancedData,
        boxImageUrl: '', // Will be generated after production
        id: theme.id,
        characterDefinitions: theme.characterDefinitions.map((aiDef, i) => {
          const userDef = advancedData.characterDefinitions?.[i];
          return {
            ...aiDef,
            name: userDef?.name?.trim() ? userDef.name.trim() : aiDef.name,
            description: userDef?.description?.trim() ? userDef.description.trim() : aiDef.description,
          };
        })
      };

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
      startSequentialProduction(finalTheme, seedBaselineData);
    } catch (error) {
      console.error('[Creation Failure] Cleaning up and refunding...');

      // Rollback: Deleting theme record if it was created
      if (tempThemeId) {
        try {
          await deleteTheme(user.id, tempThemeId);
        } catch (delErr) {
          console.error('[Rollback Error] Failed to delete theme:', delErr);
        }
      }

      // Refund the 500 coins fee
      try {
        await updateUserCoins(user.id, 500);
        setState(prev => ({ ...prev, coins: prev.coins + 500 }));
      } catch (refundErr) {
        console.error('[Rollback Error] Failed to refund coins:', refundErr);
      }

      await handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const startSequentialProduction = async (theme: CollectionTheme, initialBaseline?: string) => {
    if (isProducing) return;
    if (!user) {
      setGlobalError('You must be logged in to produce characters');
      return;
    }
    setIsProducing(true);
    setActiveStep(0);
    setGlobalError(null);

    // Sort definitions by rarity: Common -> Rare -> Legendary
    const rarityOrder: Record<string, number> = { 'Common': 1, 'Rare': 2, 'Legendary': 3 };
    const sortedDefs = [...theme.characterDefinitions].sort((a, b) =>
      rarityOrder[a.rarity as keyof typeof rarityOrder] - rarityOrder[b.rarity as keyof typeof rarityOrder]
    );

    // Helper to generate and update state
    const produceCharacter = async (index: number, baselineBase64?: string) => {
      setActiveStep(index);
      try {
        const { url, base64 } = await generateCharacterImage(user.id, theme.id, sortedDefs[index], theme.name, theme.visualStyle, '1K', baselineBase64);
        sortedDefs[index].imageUrl = url;

        setState(prev => {
          if (!prev.currentTheme) return prev;
          const updatedDefs = [...prev.currentTheme.characterDefinitions];
          // Find original index in state to update correctly
          const originalIdx = prev.currentTheme.characterDefinitions.findIndex(d => d.name === sortedDefs[index].name);
          if (originalIdx !== -1) {
            updatedDefs[originalIdx] = { ...updatedDefs[originalIdx], imageUrl: url };
          }
          return {
            ...prev,
            currentTheme: { ...prev.currentTheme, characterDefinitions: updatedDefs }
          };
        });

        // Final save to db for this character
        await saveCharacter(user.id, theme.id, { ...sortedDefs[index], imageUrl: url });
        return base64; // Return base64 for baseline support
      } catch (err) {
        throw err;
      }
    };

    try {
      // Flow: 1 -> 2 -> 2 -> 1
      // 1. Generate the first "Baseline" figurine (using initialBaseline if provided)
      const baselineBase64 = await produceCharacter(0, initialBaseline);
      await new Promise(r => setTimeout(r, 2000));

      // 2. Generate next 2 in parallel
      await Promise.all([
        produceCharacter(1, baselineBase64),
        produceCharacter(2, baselineBase64)
      ]);
      await new Promise(r => setTimeout(r, 2000));

      // 3. Generate next 2 in parallel
      await Promise.all([
        produceCharacter(3, baselineBase64),
        produceCharacter(4, baselineBase64)
      ]);
      await new Promise(r => setTimeout(r, 2000));

      // 4. Generate the final figurine
      await produceCharacter(5, baselineBase64);

    } catch (err) {
      console.error('[Production Failure] Cleaning up and refunding for theme:', theme.id);

      try {
        await deleteTheme(user.id, theme.id);

        // Remove from local publicThemes list if it was added
        setState(prev => ({
          ...prev,
          currentTheme: null,
          publicThemes: prev.publicThemes.filter(t => t.id !== theme.id)
        }));

        // Refund the 500 coins fee
        await updateUserCoins(user.id, 500);
        setState(prev => ({ ...prev, coins: prev.coins + 500 }));

        setGlobalError(`Production failed for "${theme.name}". 500 coins have been refunded.`);
      } catch (rollbackErr) {
        console.error('[Rollback Error] Failed during production cleanup:', rollbackErr);
      }

      handleError(err);
      setIsProducing(false);
      setView('marketplace'); // Back to safety
      return;
    }

    // 5. Finalize Box Art
    try {
      setLoadingMsg('Rendering visual packaging...');
      const boxArt = await generateBoxArt(user.id, theme.id, theme.name, theme.visualStyle, user.studioName);

      // 6. Final state and DB update
      const updatedTheme = { ...theme, boxImageUrl: boxArt, characterDefinitions: sortedDefs };
      await saveTheme(user.id, updatedTheme, true);

      setState(prev => ({
        ...prev,
        currentTheme: updatedTheme,
        publicThemes: prev.publicThemes.map(t => t.id === theme.id ? { ...t, boxImageUrl: boxArt } : t)
      }));
    } catch (boxErr) {
      console.error('[Box Art Failure]', boxErr);
    }

    setIsProducing(false);
    setActiveStep(7); // Mark as complete

    // After completion, reload theme data to ensure sync
    if (user) {
      try {
        const themes = await getUserThemes(user.id);
        setState(prev => ({
          ...prev,
          themeHistory: themes
        }));
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

  const handleOpenBox = (targetTheme: CollectionTheme = state.currentTheme!) => {
    if (!targetTheme) return;
    if (!user) {
      setGlobalError('You must be logged in to unbox characters');
      return;
    }
    setPurchaseModalTheme(targetTheme);
    setPurchaseQuantity(1);
  };

  const executeBatchPurchase = async () => {
    if (!purchaseModalTheme || !user) return;
    const totalCost = purchaseQuantity * 100;

    if (state.coins < totalCost) {
      setGlobalError(`Insufficient coins. You need ${totalCost} coins.`);
      return;
    }

    setPurchaseModalTheme(null); // Close modal
    setLoading(true);
    setLoadingMsg(purchaseQuantity > 1 ? `Preparing ${purchaseQuantity} boxes...` : 'Unboxing your surprise...');

    try {
      const creatorId = (purchaseModalTheme as any).createdBy || (purchaseModalTheme as any).creatorId;
      if (!creatorId) throw new Error('Creator ID not found');

      // Deduct coins locally
      setState(prev => ({ ...prev, coins: prev.coins - totalCost }));

      const newQueue: Character[] = [];
      const themeChars = await getThemeCharacters(creatorId, purchaseModalTheme.id);
      setPreviewCharacters(themeChars);

      const themeToUse = { ...purchaseModalTheme, characterDefinitions: themeChars };

      // Batch purchase loop
      for (let i = 0; i < purchaseQuantity; i++) {
        const def = await purchaseBlindBox(user.id, purchaseModalTheme.id, creatorId, 100);

        let finalImageUrl = def.imageUrl;
        if (!finalImageUrl) {
          // Generate if missing (rare case in production)
          finalImageUrl = await generateCharacterImage(user.id, themeToUse.id, def, themeToUse.name, themeToUse.visualStyle, '1K');
        }

        // Generate 360 video in background (don't block UI)
        let videoUrl: string | undefined;
        generateCharacterVideo(user.id, themeToUse.id, def, themeToUse.name, themeToUse.visualStyle)
          .then(url => {
            console.log(`[App] 360 video generated for ${def.name}: ${url}`);
            // Update the character in queue/state with videoUrl
            setUnboxingQueue(prev => prev.map(c => c.name === def.name ? { ...c, videoUrl: url } : c));
            setState(prev => ({
              ...prev,
              collection: prev.collection.map(c => c.name === def.name && c.themeId === themeToUse.id ? { ...c, videoUrl: url } : c)
            }));
          })
          .catch(err => console.warn(`[App] Video gen failed for ${def.name}:`, err));

        newQueue.push({
          id: Math.random().toString(36).substr(2, 9),
          name: def.name,
          description: def.description || '',
          rarity: def.rarity,
          imageUrl: finalImageUrl,
          videoUrl,
          theme: themeToUse.name,
          themeId: themeToUse.id,
          themeCreatorId: creatorId,
          obtainedAt: Date.now(),
          count: 1
        });
      }

      // Start Opening Flow
      const firstChar = newQueue[0];
      const remainingQueue = newQueue.slice(1);

      setUnboxingChar(firstChar);
      setUnboxingTheme(themeToUse);
      setUnboxingQueue(remainingQueue);
      setView('opening');

    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNextBox = async () => {
    if (!unboxingChar || !user) return;

    // 1. Save current character
    await saveUnboxingChar(unboxingChar);

    // 2. Load next
    if (unboxingQueue.length > 0) {
      const nextChar = unboxingQueue[0];
      const remaining = unboxingQueue.slice(1);
      setUnboxingChar(nextChar); // Trigger re-render of Opener with new char
      setUnboxingQueue(remaining);
    } else {
      // Should not happen if button logic is correct, but safe fallback
      setView('collection');
    }
  };

  const saveUnboxingChar = async (char: Character) => {
    if (!char || !user || !unboxingTheme) return;
    const themeToUse = unboxingTheme;
    const creatorId = (themeToUse as any).createdBy || (themeToUse as any).creatorId || user.id;
    const creatorName = (themeToUse as any).creatorName || user.studioName || user.name;

    await addToCollection(user.id, char, themeToUse.id, creatorId, creatorName);

    // Update local state
    setState(prev => {
      const existingIndex = prev.collection.findIndex(c => c.name === char.name && c.theme === char.theme);
      let newCollection = [...prev.collection];

      if (existingIndex >= 0) {
        newCollection[existingIndex] = { ...newCollection[existingIndex], count: (newCollection[existingIndex].count || 1) + 1, obtainedAt: Date.now() };
      } else {
        newCollection = [char, ...newCollection];
      }
      return { ...prev, collection: newCollection, activeCharacter: char };
    });

    // Check for collection completion
    try {
      const allThemeChars = await getThemeCharacters(creatorId, themeToUse.id);
      const userThemeChars = state.collection.filter(c => c.themeId === themeToUse.id);

      // Add the current character if it's new
      const isNew = !state.collection.some(c => c.name === char.name && c.themeId === themeToUse.id);
      const totalCollected = isNew ? userThemeChars.length + 1 : userThemeChars.length;

      const totalChars = allThemeChars.length;
      const isComplete = totalCollected === totalChars;
      const alreadyMarkedComplete = completedCollections.includes(themeToUse.id);

      if (isComplete && !alreadyMarkedComplete) {
        // Mark as complete in database
        await markCollectionComplete(user.id, themeToUse.id);
        setCompletedCollections(prev => [...prev, themeToUse.id]);

        // Award 250 coins
        await updateUserCoins(user.id, 250);

        // Store completion info to trigger confetti AFTER unboxing is done
        setCompletionDuringUnboxing({ themeId: themeToUse.id, themeName: themeToUse.name });
      }
    } catch (error) {
      console.error('Error checking collection completion:', error);
    }
  };

  const onUnboxingComplete = async () => {
    // Save current
    if (unboxingChar) await saveUnboxingChar(unboxingChar);

    // Auto-collect remaining queue if any (to prevent data loss)
    if (unboxingQueue.length > 0) {
      setLoading(true); // brief visual feedback handling leftovers
      for (const char of unboxingQueue) {
        await saveUnboxingChar(char);
      }
      setLoading(false);
    }

    setUnboxingChar(null);
    setUnboxingQueue([]);

    // Trigger confetti if collection was completed during this unboxing session
    if (completionDuringUnboxing) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 6000);

      setNotification(`🎉 ${completionDuringUnboxing.themeName} Complete! +250 Coins`);
      setTimeout(() => setNotification(null), 5000);

      setCompletionDuringUnboxing(null);
    }

    setView('collection');
  };


  const handleViewSeries = async (theme: CollectionTheme) => {
    // Look-ahead Optimization: If definitions are already present on the theme object, show them immediately
    if (theme.characterDefinitions && theme.characterDefinitions.length > 0) {
      setPreviewCharacters(theme.characterDefinitions);
      setState(prev => ({ ...prev, currentTheme: theme }));
      setView('series-preview');

      // Still fetch in background to get latest images/details if needed
      const creatorId = (theme as any).createdBy || (theme as any).creatorId;
      getThemeCharacters(creatorId, theme.id).then(chars => {
        setPreviewCharacters(chars);
      });
      return;
    }

    setLoading(true);
    setLoadingMsg(`Loading figurines for ${theme.name}...`);
    try {
      const creatorId = (theme as any).createdBy || (theme as any).creatorId;
      const chars = await getThemeCharacters(creatorId, theme.id);
      setPreviewCharacters(chars);
      setState(prev => ({ ...prev, currentTheme: theme }));
      setView('series-preview');
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
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

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <Loader2 className="w-10 h-10 animate-spin text-stone-300" />
      </div>
    );
  }

  if (view === 'login') return <Login />;

  if (view === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  const handleBuyAnother = async () => {
    if (!unboxingTheme || !user) return;

    // 1. Save the CURRENT character before moving on, otherwise it won't show as collected in the next screen's legend
    if (unboxingChar) {
      await saveUnboxingChar(unboxingChar);
    }

    if (state.coins < 100) {
      setNotification('Insufficient coins!');
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setLoading(true);
    setLoadingMsg('Opening another box...');

    // Deduct immediately and notify
    setState(prev => ({ ...prev, coins: prev.coins - 100 }));
    setNotification('-100 Coins');
    setTimeout(() => setNotification(null), 3000);

    try {
      const creatorId = (unboxingTheme as any).createdBy || (unboxingTheme as any).creatorId;
      const def = await purchaseBlindBox(user.id, unboxingTheme.id, creatorId, 100);

      let finalImageUrl = def.imageUrl;
      if (!finalImageUrl) {
        const themeToUse = unboxingTheme; // reuse existing full theme object
        finalImageUrl = await generateCharacterImage(user.id, themeToUse.id, def, themeToUse.name, themeToUse.visualStyle, '1K');
      }

      // Generate 360 video in background
      generateCharacterVideo(user.id, unboxingTheme.id, def, unboxingTheme.name, unboxingTheme.visualStyle)
        .then(url => {
          console.log(`[App] 360 video generated for ${def.name}: ${url}`);
          setState(prev => ({
            ...prev,
            collection: prev.collection.map(c => c.name === def.name && c.themeId === unboxingTheme.id ? { ...c, videoUrl: url } : c)
          }));
        })
        .catch(err => console.warn(`[App] Video gen failed for ${def.name}:`, err));

      const newChar: Character = {
        id: Math.random().toString(36).substr(2, 9),
        name: def.name,
        description: def.description || '',
        rarity: def.rarity,
        imageUrl: finalImageUrl,
        theme: unboxingTheme.name,
        themeId: unboxingTheme.id,
        themeCreatorId: creatorId,
        obtainedAt: Date.now(),
        count: 1
      };

      // Reset opener state by clearing char briefly or just setting new one
      // To be safe and ensure animation replay, we rely on the `key` prop in the render
      setUnboxingChar(newChar);
      // Queue remains empty as this is a single ad-hoc buy
    } catch (err) {
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'opening' && unboxingChar && unboxingTheme) {
    return (
      <BlindBoxOpener
        key={unboxingChar.id} // Force re-mount on character change to reset animation state
        character={unboxingChar}
        theme={unboxingTheme}
        themeCharacters={previewCharacters}
        userCollection={state.collection}
        onComplete={onUnboxingComplete}
        onNext={handleNextBox}
        onBuyMore={handleBuyAnother}
        hasNext={unboxingQueue.length > 0}
        currentCoins={state.coins}
      />
    );
  }

  // --- Purchase Modal ---
  const renderPurchaseModal = () => {
    if (!purchaseModalTheme) return null;
    return (
      <div className="fixed inset-0 z-[80] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
          <div className="text-center space-y-2 mb-8">
            <h3 className="text-2xl font-black tracking-tight text-stone-900">Purchase Blind Boxes</h3>
            <p className="text-stone-500 font-medium">{purchaseModalTheme.name}</p>
          </div>

          <div className="flex items-center justify-center gap-6 mb-8">
            <button
              onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
              className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <span className="text-2xl font-black text-stone-600">-</span>
            </button>

            <div className="flex flex-col items-center w-24">
              <span className="text-4xl font-black text-stone-900">{purchaseQuantity}</span>
              <span className="text-xs font-black uppercase text-stone-400 tracking-wider">BOXES</span>
            </div>

            <button
              onClick={() => setPurchaseQuantity(Math.min(10, purchaseQuantity + 1))}
              className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center hover:bg-stone-200 transition-colors"
            >
              <span className="text-2xl font-black text-stone-600">+</span>
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={executeBatchPurchase}
              className="w-full bg-stone-900 text-white py-4 rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              Pay <span className="text-emerald-400">{purchaseQuantity * 100} Coins</span>
            </button>


            <button
              onClick={() => setPurchaseModalTheme(null)}
              className="w-full bg-white text-stone-400 py-3 rounded-2xl font-black text-sm hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-32 bg-[#faf9f6] text-stone-900">
      {loading && renderLoading()}
      {renderPurchaseModal()}
      {renderGlobalError()}

      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-stone-900 text-white px-8 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-500 border border-white/10">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="font-black text-xs uppercase tracking-widest">{notification}</span>
        </div>
      )}

      {/* Confetti Celebration */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={500}
        />
      )}

      {showSpin && <SpinWheel
        onWin={async (amount) => {
          setShowSpin(false);
          if (user) {
            // Persist to server (listener will handle local state and notification)
            await updateUserCoins(user.id, amount);
            await updateLastSpin(user.id);
            const now = Date.now();
            setUser(prev => prev ? { ...prev, lastSpin: now } : null);
          } else {
            // Guest mode
            addCoins(amount);
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
            <div className="relative profile-dropdown-container">
              <img
                src={user.picture}
                alt={user.name}
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-105 transition-transform"
              />
              {showProfileDropdown && (
                <div className="absolute right-0 top-12 bg-white rounded-2xl shadow-2xl border border-stone-100 w-48 overflow-hidden z-50">
                  <div className="p-4 border-b border-stone-100">
                    <p className="font-bold text-sm text-stone-900 truncate">{user.name}</p>
                    <p className="text-[10px] text-stone-400 truncate">{user.email}</p>
                  </div>
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setShowProfileDropdown(false);
                        setView('admin');
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors flex items-center gap-3 text-stone-600 hover:text-purple-600"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="font-medium text-sm">Admin Panel</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      handleLogout();
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-stone-50 transition-colors flex items-center gap-3 text-stone-600 hover:text-rose-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium text-sm">Log Out</span>
                  </button>
                </div>
              )}
            </div>
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

                {/* Search and Filter Panel */}
                <div className="flex flex-wrap items-center justify-center gap-4 pt-4 max-w-2xl mx-auto">
                  <div className="relative flex-1 min-w-[200px] group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                    <input
                      type="text"
                      placeholder="Search collections..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-white border-2 border-stone-100 rounded-full pl-14 pr-6 py-4 font-bold text-sm outline-none focus:border-stone-900 text-stone-900 transition-all shadow-sm placeholder:text-stone-300"
                    />
                  </div>

                  <div className="relative min-w-[180px]">
                    <select
                      value={filterCreator}
                      onChange={(e) => setFilterCreator(e.target.value)}
                      className="w-full appearance-none bg-white border-2 border-stone-100 rounded-full pl-6 pr-12 py-4 font-bold text-sm outline-none focus:border-stone-900 text-stone-900 transition-all shadow-sm cursor-pointer"
                    >
                      <option value="">All Design Studios</option>
                      {Array.from(new Set(state.publicThemes.map(t => {
                        // Consistent name logic: Use Studio Name for current user's themes
                        if (user && t.creatorId === user.id && user.studioName) {
                          return user.studioName;
                        }
                        return t.creatorName;
                      }))).filter(Boolean).sort().map(creator => (
                        <option key={creator} value={creator}>{creator}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {state.publicThemes
                  .filter(theme => {
                    const matchesSearch = theme.name.toLowerCase().includes(searchTerm.toLowerCase());
                    // Calculate effective creator name to match filter
                    const effectiveCreatorName = (user && theme.creatorId === user.id && user.studioName)
                      ? user.studioName
                      : theme.creatorName;

                    const matchesCreator = filterCreator ? effectiveCreatorName === filterCreator : true;
                    return matchesSearch && matchesCreator;
                  })
                  .map((theme) => (
                    <div key={theme.id} className="bg-white rounded-[2.5rem] p-5 shadow-xl border border-stone-50 hover:scale-[1.02] transition-all duration-500 flex flex-col items-center text-center h-[400px]">
                      <div className="w-full aspect-square bg-stone-50 rounded-[2rem] overflow-hidden mb-2 flex items-center justify-center">
                        <img src={theme.boxImageUrl} className="w-full h-full object-contain" alt={theme.name} />
                      </div>
                      <div className="flex flex-col flex-1 justify-center gap-6 w-full h-full">
                        <div className="space-y-0.5">
                          <h3
                            className="font-black leading-tight mb-1 overflow-hidden"
                            style={{
                              fontSize: theme.name.length > 20 ? '1.1rem' : theme.name.length > 12 ? '1.4rem' : '1.7rem',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              minHeight: '3rem'
                            }}
                          >
                            {theme.name}
                          </h3>
                          <p className="text-[9px] font-black uppercase text-emerald-500">By {theme.creatorId === user?.id && user?.studioName ? user.studioName : theme.creatorName}</p>
                        </div>

                        <div className="flex w-full gap-2">
                          <button onClick={() => handleViewSeries(theme)} className="flex-1 bg-stone-100 py-3.5 rounded-xl font-black text-[9px] uppercase hover:bg-stone-200 transition-colors">View</button>
                          {completedCollections.includes(theme.id) ? (
                            <button disabled className="flex-1 bg-emerald-50 text-emerald-600 py-3.5 rounded-xl font-black text-[9px] uppercase cursor-not-allowed flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> COMPLETE
                            </button>
                          ) : (
                            <button onClick={() => handleOpenBox(theme)} className="flex-1 bg-emerald-400 py-3.5 rounded-xl font-black text-[9px] uppercase hover:bg-emerald-500 transition-colors">Buy (100)</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {view === 'manufacturing' && state.currentTheme && (
          <div className="space-y-16 py-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="text-center space-y-6">
              <div className="inline-flex items-center gap-3 px-6 py-2 bg-emerald-50 rounded-full border border-emerald-100 mb-4">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Production Suite Active</span>
              </div>
              <h2 className="text-7xl font-black tracking-tighter leading-[0.9]">Crafting "{state.currentTheme.name}"</h2>
              <p className="text-stone-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">
                The Lab is generating your series figurines. Please wait for the production cycle to complete.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {state.currentTheme.characterDefinitions.map((char, i) => {
                const isBuilding = activeStep === i && isProducing;
                const isDone = !!char.imageUrl;
                const isPending = !isDone && !isBuilding;

                return (
                  <div key={i} className={`group relative bg-white rounded-[2.5rem] p-6 shadow-xl border transition-all duration-700 overflow-hidden ${isBuilding ? 'border-emerald-200 scale-105 shadow-emerald-100/50' : 'border-stone-50 opacity-90'}`}>
                    {/* Status Badge */}
                    <div className="absolute top-6 right-8">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isDone ? 'bg-emerald-50 text-emerald-500' :
                        isBuilding ? 'bg-amber-50 text-amber-500 animate-pulse' :
                          'bg-stone-50 text-stone-300'
                        }`}>
                        {isDone ? 'Completed' : isBuilding ? 'Building...' : 'Pending'}
                      </span>
                    </div>

                    {/* Figurine Preview */}
                    <div className={`aspect-square rounded-[1.5rem] overflow-hidden mb-6 shadow-inner border flex items-center justify-center relative transition-all duration-700 ${isDone ? 'bg-white border-stone-100 shadow-emerald-50' : 'bg-stone-50 border-dashed border-stone-200'}`}>
                      {isDone ? (
                        <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover animate-in zoom-in duration-1000 grayscale opacity-80" />
                      ) : isBuilding ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 border-4 border-stone-100 border-t-emerald-500 rounded-full animate-spin"></div>
                          <Cpu className="w-8 h-8 text-emerald-200 absolute animate-pulse" />
                        </div>
                      ) : (
                        <Package className="w-12 h-12 text-stone-200" />
                      )}
                    </div>

                    <h3 className={`text-2xl font-black tracking-tight mb-2 transition-colors duration-500 ${isDone ? 'text-stone-900' : 'text-stone-300'}`}>
                      {char.name}
                    </h3>
                    <p className={`text-sm leading-relaxed transition-colors duration-500 line-clamp-2 ${isDone ? 'text-stone-500' : 'text-stone-300'}`}>
                      {isDone ? char.description : "Awaiting production cycle..."}
                    </p>
                  </div>
                );
              })}
            </div>

            {!isProducing && activeStep >= 6 && (
              <div className="flex flex-col items-center pt-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <button
                  onClick={() => setView('marketplace')}
                  className="bg-stone-900 text-white px-20 py-8 rounded-[2.5rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 group"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 group-hover:scale-125 transition-transform" />
                  View in Marketplace
                </button>
                <p className="mt-6 text-stone-400 font-bold uppercase tracking-widest text-[10px]">Production Run Successful</p>
              </div>
            )}
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
                    const rarityOrder = { 'Common': 1, 'Rare': 2, 'Legendary': 3 };
                    const chars = themeDef.characterDefinitions?.length > 0 ? themeDef.characterDefinitions :
                      Array.from(new Set(ownedInTheme.map(c => c.name))).map(n => {
                        const c = ownedInTheme.find(x => x.name === n)!;
                        return { name: n, description: c.description, rarity: c.rarity };
                      });

                    const sortedChars = [...chars].sort((a, b) =>
                      (rarityOrder[a.rarity as keyof typeof rarityOrder] || 99) - (rarityOrder[b.rarity as keyof typeof rarityOrder] || 99)
                    );

                    const mergedDef = {
                      ...themeDef,
                      characterDefinitions: sortedChars
                    };
                    return <CharacterShelf key={tName} theme={mergedDef} ownedCharacters={ownedInTheme} onCharacterClick={c => { setState(p => ({ ...p, activeCharacter: c })); setView('tools'); }} />;
                  });
                })()}
              </div>
            )}
          </div>
        )}

        {view === 'tools' && state.activeCharacter && (() => {
          const relatedChars = state.collection.filter(c => c.themeId === state.activeCharacter?.themeId && c.id !== state.activeCharacter?.id);
          const obtainedDate = new Date(state.activeCharacter.obtainedAt).toLocaleDateString();

          return (
            <div className="space-y-8 animate-in slide-in-from-bottom-12 duration-700">
              <button onClick={() => setView('collection')} className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-900 transition-colors">
                <ChevronLeft className="w-5 h-5" /> Back to Shelf
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                {/* Left: Character Image */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-stone-50 sticky top-8">
                    <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-stone-50 to-stone-100 mb-6 shadow-inner border border-stone-100 relative group">
                      {state.activeCharacter.videoUrl ? (
                        <video src={state.activeCharacter.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                      ) : (
                        <img src={state.activeCharacter.imageUrl} alt={state.activeCharacter.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      )}
                      <div className="absolute top-4 right-4 z-10">
                        <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${state.activeCharacter.rarity === 'Legendary' ? 'bg-gradient-to-r from-rose-500 to-purple-600 text-white' :
                          state.activeCharacter.rarity === 'Rare' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
                            'bg-gradient-to-r from-emerald-400 to-teal-500 text-white'
                          } shadow-lg`}>
                          {state.activeCharacter.rarity}
                        </span>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-stone-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Obtained</p>
                        <p className="text-sm font-bold text-stone-900">{obtainedDate}</p>
                      </div>
                      <div className="bg-stone-50 rounded-2xl p-4 text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-stone-400 mb-1">Copies</p>
                        <p className="text-sm font-bold text-stone-900">{state.activeCharacter.count || 1}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Character Info */}
                <div className="lg:col-span-3 space-y-6">
                  {/* Name & Description */}
                  <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-stone-50">
                    <div className="mb-6">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2 block">Character Profile</span>
                      <h1 className="text-5xl font-black tracking-tight mb-2">{state.activeCharacter.name}</h1>
                      <p className="text-stone-400 text-sm font-medium">{state.activeCharacter.theme}</p>
                    </div>
                    <div className="bg-stone-50 rounded-[2rem] p-6 border border-stone-100">
                      <p className="text-stone-600 leading-relaxed">{state.activeCharacter.description}</p>
                    </div>
                  </div>

                  {/* Related Characters */}
                  {relatedChars.length > 0 && (
                    <div className="bg-white rounded-[3rem] p-8 shadow-2xl border border-stone-50">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-6">From Same Series ({relatedChars.length})</h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {relatedChars.slice(0, 10).map((char) => (
                          <div
                            key={char.id}
                            onClick={() => setState(prev => ({ ...prev, activeCharacter: char }))}
                            className="group cursor-pointer"
                          >
                            <div className="aspect-square rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 hover:border-emerald-400 transition-all hover:shadow-lg mb-2">
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <p className="text-[9px] font-bold text-stone-600 truncate text-center">{char.name}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Series Info */}
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[3rem] p-8 shadow-xl border border-emerald-100">
                    <div className="flex items-start gap-6">
                      <div className="flex-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 mb-2">Collection Series</h3>
                        <p className="text-2xl font-black text-emerald-900 mb-3">{state.activeCharacter.theme}</p>
                        <p className="text-sm text-emerald-700">
                          You own {state.collection.filter(c => c.themeId === state.activeCharacter?.themeId).length} characters from this series
                        </p>
                      </div>
                      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 text-center min-w-[80px]">
                        <p className="text-3xl font-black text-emerald-600">{state.collection.filter(c => c.themeId === state.activeCharacter?.themeId).length}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest text-emerald-700 mt-1">Owned</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {view === 'series-preview' && state.currentTheme && (
          <div className="space-y-16 py-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <div className="flex flex-col items-center text-center space-y-6">
              <button
                onClick={() => setView('marketplace')}
                className="flex items-center gap-2 text-stone-400 font-bold hover:text-stone-900 transition-colors bg-white px-6 py-3 rounded-full border border-stone-100 shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" /> Back to Market
              </button>
              <div className="pt-8 mb-10">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500 mb-4 block">Official Series Set</span>
                <h2 className="text-7xl font-black tracking-tighter mb-4">{state.currentTheme.name}</h2>
                <p className="text-stone-400 text-xl font-light max-w-2xl mx-auto leading-relaxed">{state.currentTheme.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto items-start">
              {/* Left: Box Art */}
              <div className="sticky top-10 flex justify-center lg:justify-end">
                <div className="bg-white rounded-[4rem] p-8 shadow-2xl border border-stone-50 flex items-center justify-center aspect-square relative overflow-hidden group max-w-[420px] w-full">
                  <div className="absolute inset-0 bg-gradient-to-br from-stone-50/50 to-transparent" />
                  <img
                    src={state.currentTheme.boxImageUrl}
                    alt={state.currentTheme.name}
                    className="w-full h-full object-contain relative z-10 transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-10 inset-x-0 text-center z-20">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-300 mb-2">Mystery Series</p>
                    <h3 className="text-2xl font-black tracking-tight">{state.currentTheme.name}</h3>
                  </div>
                </div>
              </div>

              {/* Right: Character Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                {(() => {
                  const safeChars = previewCharacters.length > 0 ? previewCharacters : Array(6).fill(null);
                  // Sort by rarity: Common -> Rare -> Legendary
                  const rarityOrder: Record<string, number> = { 'Common': 1, 'Rare': 2, 'Legendary': 3 };
                  const sortedChars = [...safeChars].sort((a, b) => {
                    if (!a || !b) return 0;
                    return (rarityOrder[a.rarity as keyof typeof rarityOrder] || 99) - (rarityOrder[b.rarity as keyof typeof rarityOrder] || 99);
                  });

                  return sortedChars.map((char, i) => {
                    const isCollected = state.collection.some(c => c.name === char?.name && c.themeId === (state.currentTheme?.id || char?.themeId));
                    const isLegendary = char?.rarity === 'Legendary';
                    const isMystery = isLegendary && !isCollected;

                    return (
                      <div key={i} className="group relative flex flex-col gap-3">
                        <div className={`aspect-square bg-white rounded-[2.5rem] shadow-xl border border-stone-50 hover:scale-[1.05] transition-all duration-500 overflow-hidden relative flex items-center justify-center p-4 ${isMystery ? 'bg-stone-900 overflow-hidden' : ''}`}>
                          {isMystery ? (
                            <>
                              {/* Colorful Translucent Gradient Background */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white via-purple-100 to-purple-300 opacity-30"></div>
                              <div className="absolute inset-0 backdrop-blur-md"></div>

                              {/* Content */}
                              <div className="relative z-10 flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-purple-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                  <HelpCircle className="w-8 h-8 text-purple-600" strokeWidth={3} />
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600">Mystery</span>
                              </div>
                            </>
                          ) : char?.imageUrl ? (
                            <img
                              src={char.imageUrl}
                              alt={char.name || `Figurine #${i + 1}`}
                              className={`w-full h-full object-cover transition-all duration-700 scale-110 group-hover:scale-100 rounded-[2rem] ${isCollected ? 'grayscale-0' : 'grayscale opacity-40'
                                } ${isCollected ? 'group-hover:grayscale-0' : ''}`}
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <Package className="w-6 h-6 text-stone-200" />
                              <span className="text-[7px] font-black uppercase tracking-widest text-stone-300">Classified</span>
                            </div>
                          )}

                          {/* Mystery Overlay for non-legendary uncollected */}
                          {(!char || (!char.imageUrl && !isMystery) || (!isCollected && !isMystery)) && (
                            <div className="absolute inset-0 bg-stone-900/5 backdrop-blur-[1px]"></div>
                          )}
                        </div>

                        {char?.name && (
                          <div className="px-2 text-center">
                            <p className={`text-[10px] font-black tracking-tight truncate mb-0.5 ${isMystery ? 'text-stone-300' : 'text-stone-900'}`}>
                              {isMystery ? '???' : char.name}
                            </p>
                            <p className={`text-[8px] font-black uppercase tracking-widest ${char.rarity === 'Legendary' ? 'text-rose-500' :
                              char.rarity === 'Rare' ? 'text-amber-500' :
                                'text-emerald-500'
                              }`}>{char.rarity}</p>
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <button
                onClick={() => handleOpenBox(state.currentTheme!)}
                className="bg-stone-900 text-white px-20 py-8 rounded-[2.5rem] font-black text-xl hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-4 group"
              >
                <ShoppingBag className="w-6 h-6 text-emerald-400" />
                Buy Blind Box (100)
              </button>
            </div>
          </div>
        )}

        {view === 'admin' && (
          <AdminPanel onClose={() => setView('marketplace')} />
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
    </div >
  );
};

export default App;
