import { db } from './firebase';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    collection,
    addDoc,
    query,
    where,
    getDocs,
    serverTimestamp,
    increment,
    writeBatch,
    Timestamp
} from 'firebase/firestore';
import { CollectionTheme, Character, User } from '../types';

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

/**
 * Create or update user profile in Firestore
 */
export const createOrUpdateUserProfile = async (user: User): Promise<void> => {
    const userRef = doc(db, 'users', user.id, 'profile', 'data');

    const existingDoc = await getDoc(userRef);

    if (existingDoc.exists()) {
        // Update existing profile - only update core fields, don't overwrite onboarding
        const updates: any = {
            name: user.name,
            email: user.email,
            picture: user.picture,
            lastActive: serverTimestamp()
        };

        // Only update these if they are explicitly provided (e.g. from handleOnboardingComplete)
        if (user.studioName) updates.studioName = user.studioName;

        // ONLY update hasOnboarded to true, never back to false
        if (user.hasOnboarded === true) {
            updates.hasOnboarded = true;
        }

        await updateDoc(userRef, updates);
    } else {
        // Create new profile
        await setDoc(userRef, {
            uid: user.id,
            name: user.name,
            email: user.email,
            picture: user.picture,
            coins: 500, // Increased starting coins for overhaul
            hasOnboarded: false,
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            stats: {
                themesCreated: 0,
                charactersCollected: 0,
                tradesCompleted: 0
            }
        });
    }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (userId: string): Promise<any | null> => {
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        return userDoc.data();
    }
    return null;
};

/**
 * Update user coins
 */
export const updateUserCoins = async (userId: string, amount: number): Promise<void> => {
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    const profile = await getUserProfile(userId);
    const currentCoins = profile?.coins || 0;

    if (currentCoins + amount < 0) {
        throw new Error('Insufficient coins');
    }

    await updateDoc(userRef, {
        coins: increment(amount)
    });
};

export const updateLastSpin = async (userId: string): Promise<void> => {
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    await updateDoc(userRef, {
        lastSpin: Date.now()
    });
};

// ============================================================================
// THEME FUNCTIONS
// ============================================================================

/**
 * Save theme to Firestore
 */
export const saveTheme = async (
    userId: string,
    theme: CollectionTheme,
    isPublic: boolean = false
): Promise<void> => {
    const themeRef = doc(db, 'users', userId, 'themes', theme.id);

    const themeData = {
        id: theme.id,
        name: theme.name,
        description: theme.description,
        visualStyle: theme.visualStyle,
        boxImageUrl: theme.boxImageUrl,
        keywords: theme.keywords || '',
        colorScheme: theme.colorScheme || [],
        toyFinish: theme.toyFinish || '',
        variationHint: theme.variationHint || '',
        inspirationImages: theme.inspirationImages || [],
        rareTraits: theme.rareTraits || '',
        legendaryTraits: theme.legendaryTraits || '',
        createdAt: serverTimestamp(),
        createdBy: userId,
        characterCount: theme.characterDefinitions?.length || 0,
        characterDefinitions: theme.characterDefinitions?.map(d => ({
            name: d.name,
            rarity: d.rarity,
            description: d.description
        })) || [],
        isPublic: isPublic,
        blindBoxPrice: 100,
        totalPurchases: 0
    };

    await setDoc(themeRef, themeData);

    // If public, also add to public_themes collection
    if (isPublic) {
        const publicThemeRef = doc(db, 'public_themes', theme.id);
        const user = await getUserProfile(userId);

        await setDoc(publicThemeRef, {
            ...themeData,
            creatorId: userId,
            creatorName: user?.name || 'Unknown'
        });
    }

    // Update user stats
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    await updateDoc(userRef, {
        'stats.themesCreated': increment(1)
    });
};

/**
 * Delete theme and all its characters (Rollback/Cleanup)
 */
export const deleteTheme = async (userId: string, themeId: string): Promise<void> => {
    const batch = writeBatch(db);

    // 1. Delete from user themes
    const themeRef = doc(db, 'users', userId, 'themes', themeId);
    batch.delete(themeRef);

    // 2. Delete from public themes
    const publicThemeRef = doc(db, 'public_themes', themeId);
    batch.delete(publicThemeRef);

    // 3. Delete characters subcollection
    const charactersRef = collection(db, 'users', userId, 'themes', themeId, 'characters');
    const charactersSnapshot = await getDocs(charactersRef);
    charactersSnapshot.docs.forEach(d => batch.delete(d.ref));

    // 4. Decrement user stats
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    batch.update(userRef, {
        'stats.themesCreated': increment(-1)
    });

    await batch.commit();
};

/**
 * Save character to theme
 */
export const saveCharacter = async (
    userId: string,
    themeId: string,
    character: any
): Promise<void> => {
    // Use character.id if available, otherwise generate from name
    const characterId = character.id || character.name?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || Math.random().toString(36).substr(2, 9);

    const characterRef = doc(db, 'users', userId, 'themes', themeId, 'characters', characterId);

    await setDoc(characterRef, {
        id: characterId,
        name: character.name,
        description: character.description,
        rarity: character.rarity,
        imageUrl: character.imageUrl,
        videoUrl: character.videoUrl || null,
        createdAt: serverTimestamp()
    });
};

/**
 * Get characters for a specific theme
 */
export const getThemeCharacters = async (userId: string, themeId: string): Promise<any[]> => {
    const charactersRef = collection(db, 'users', userId, 'themes', themeId, 'characters');
    const charactersSnapshot = await getDocs(charactersRef);

    return charactersSnapshot.docs.map(charDoc => ({
        id: charDoc.data().id,
        name: charDoc.data().name,
        description: charDoc.data().description,
        rarity: charDoc.data().rarity as 'Common' | 'Rare' | 'Legendary',
        imageUrl: charDoc.data().imageUrl,
        videoUrl: charDoc.data().videoUrl
    }));
};

/**
 * Get user's themes
 */
export const getUserThemes = async (userId: string): Promise<CollectionTheme[]> => {
    const themesRef = collection(db, 'users', userId, 'themes');
    const themesSnapshot = await getDocs(themesRef);

    const themes: CollectionTheme[] = [];

    for (const themeDoc of themesSnapshot.docs) {
        const themeData = themeDoc.data();

        // Get characters for this theme
        const charactersRef = collection(db, 'users', userId, 'themes', themeDoc.id, 'characters');
        const charactersSnapshot = await getDocs(charactersRef);

        const characterDefinitions = charactersSnapshot.docs.map(charDoc => ({
            id: charDoc.data().id,
            name: charDoc.data().name,
            description: charDoc.data().description,
            rarity: charDoc.data().rarity as 'Common' | 'Rare' | 'Legendary',
            imageUrl: charDoc.data().imageUrl,
            videoUrl: charDoc.data().videoUrl
        }));

        themes.push({
            id: themeData.id,
            name: themeData.name,
            description: themeData.description,
            visualStyle: themeData.visualStyle,
            boxImageUrl: themeData.boxImageUrl,
            keywords: themeData.keywords || '',
            colorScheme: themeData.colorScheme || [],
            toyFinish: themeData.toyFinish || '',
            variationHint: themeData.variationHint || '',
            inspirationImages: themeData.inspirationImages || [],
            rareTraits: themeData.rareTraits || '',
            legendaryTraits: themeData.legendaryTraits || '',
            characterDefinitions
        } as CollectionTheme);
    }

    return themes;
};

// ============================================================================
// COLLECTION FUNCTIONS
// ============================================================================

/**
 * Add character to user's collection
 */
export const addToCollection = async (
    userId: string,
    character: Character,
    themeId: string,
    themeCreatorId: string,
    themeCreatorName: string
): Promise<void> => {
    const collectionRef = collection(db, 'users', userId, 'collection');

    // Check if character already exists in collection
    const q = query(
        collectionRef,
        where('characterId', '==', character.id),
        where('themeId', '==', themeId)
    );

    const existingDocs = await getDocs(q);

    if (!existingDocs.empty) {
        // Update count of existing character
        const existingDoc = existingDocs.docs[0];
        await updateDoc(existingDoc.ref, {
            count: increment(1),
            obtainedAt: serverTimestamp()
        });
    } else {
        // Add new character to collection
        await addDoc(collectionRef, {
            characterId: character.id,
            characterName: character.name,
            themeName: character.theme,
            themeId: themeId,
            themeCreatorId: themeCreatorId,
            themeCreatorName: themeCreatorName,
            rarity: character.rarity,
            imageUrl: character.imageUrl,
            obtainedAt: serverTimestamp(),
            count: 1,
            isListedForTrade: false
        });

        // Update user stats
        const userRef = doc(db, 'users', userId, 'profile', 'data');
        await updateDoc(userRef, {
            'stats.charactersCollected': increment(1)
        });
    }
};

/**
 * Get user's collection
 */
export const getUserCollection = async (userId: string): Promise<Character[]> => {
    const collectionRef = collection(db, 'users', userId, 'collection');
    const collectionSnapshot = await getDocs(collectionRef);

    return collectionSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.characterName,
            description: '', // Not stored in collection, would need to fetch from theme
            rarity: data.rarity as 'Common' | 'Rare' | 'Legendary',
            imageUrl: data.imageUrl,
            theme: data.themeName,
            themeId: data.themeId,
            themeCreatorId: data.themeCreatorId,
            obtainedAt: (data.obtainedAt as Timestamp)?.toMillis() || Date.now(),
            count: data.count || 1
        };
    });
};

// ============================================================================
// MARKETPLACE FUNCTIONS (for future use)
// ============================================================================

/**
 * Get all public themes for marketplace
 */
export const getPublicThemes = async (): Promise<any[]> => {
    const publicThemesRef = collection(db, 'public_themes');
    const snapshot = await getDocs(publicThemesRef);

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

/**
 * Purchase blind box from public theme
 */
export const purchaseBlindBox = async (
    buyerId: string,
    themeId: string,
    creatorId: string,
    price: number
): Promise<any> => {
    const batch = writeBatch(db);

    // Deduct coins from buyer
    const buyerRef = doc(db, 'users', buyerId, 'profile', 'data');
    batch.update(buyerRef, {
        coins: increment(-price)
    });

    // Add coins to creator (100% royalty) - ONLY if it's not a self-purchase
    if (buyerId !== creatorId) {
        const creatorRef = doc(db, 'users', creatorId, 'profile', 'data');
        batch.update(creatorRef, {
            coins: increment(price)
        });
    }

    // Increment purchase count on theme
    const themeRef = doc(db, 'users', creatorId, 'themes', themeId);
    batch.update(themeRef, {
        totalPurchases: increment(1)
    });

    // Update public theme stats
    const publicThemeRef = doc(db, 'public_themes', themeId);
    batch.update(publicThemeRef, {
        totalPurchases: increment(1)
    });

    await batch.commit();

    // Get random character from theme
    const charactersRef = collection(db, 'users', creatorId, 'themes', themeId, 'characters');
    const charactersSnapshot = await getDocs(charactersRef);
    const characters = charactersSnapshot.docs.map(doc => doc.data());

    // Weighted random selection by rarity
    const rand = Math.random();
    let selectedRarity: 'Common' | 'Rare' | 'Legendary' = 'Common';
    if (rand > 0.90) selectedRarity = 'Legendary';
    else if (rand > 0.60) selectedRarity = 'Rare';

    const rarityGroup = characters.filter(c => c.rarity === selectedRarity);
    const finalGroup = rarityGroup.length > 0 ? rarityGroup : characters;
    const randomChar = finalGroup[Math.floor(Math.random() * finalGroup.length)];

    return randomChar;
};
