import { db } from './firebase';
import {
    collection,
    getDocs,
    doc,
    getDoc,
    deleteDoc,
    query,
    where,
    writeBatch,
    Timestamp,
    updateDoc
} from 'firebase/firestore';

// Admin email whitelist
const ADMIN_EMAILS = ['anikagupta2004@gmail.com'];

// ============================================================================
// ADMIN AUTHENTICATION
// ============================================================================

/**
 * Check if an email has admin access
 */
export const isAdmin = (email: string): boolean => {
    return ADMIN_EMAILS.includes(email.toLowerCase());
};

// ============================================================================
// ADMIN USER MANAGEMENT
// ============================================================================

export interface AdminUserData {
    id: string;
    name: string;
    email: string;
    picture: string;
    coins: number;
    studioName?: string;
    createdAt: number;
    lastActive: number;
    hasOnboarded?: boolean;
    stats: {
        themesCreated: number;
        charactersCollected: number;
        tradesCompleted: number;
    };
}

/**
 * Get all users in the system (admin only)
 */
export const getAllUsers = async (): Promise<AdminUserData[]> => {
    const users: AdminUserData[] = [];
    
    // Get all user documents
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        // Get user profile data
        const profileRef = doc(db, 'users', userId, 'profile', 'data');
        const profileDoc = await getDoc(profileRef);
        
        if (profileDoc.exists()) {
            const data = profileDoc.data();
            users.push({
                id: userId,
                name: data.name || 'Unknown',
                email: data.email || 'N/A',
                picture: data.picture || '',
                coins: data.coins || 0,
                studioName: data.studioName,
                hasOnboarded: data.hasOnboarded || false,
                createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
                lastActive: (data.lastActive as Timestamp)?.toMillis() || Date.now(),
                stats: data.stats || {
                    themesCreated: 0,
                    charactersCollected: 0,
                    tradesCompleted: 0
                }
            });
        }
    }
    
    // Sort by creation date (newest first)
    return users.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Update user coins directly (admin only)
 */
export const updateUserCoinsAdmin = async (userId: string, newAmount: number): Promise<void> => {
    const userRef = doc(db, 'users', userId, 'profile', 'data');
    await updateDoc(userRef, {
        coins: newAmount
    });
};

// ============================================================================
// ADMIN COLLECTION MANAGEMENT
// ============================================================================

export interface AdminCollectionData {
    id: string;
    name: string;
    description: string;
    creatorId: string;
    creatorName: string;
    boxImageUrl?: string;
    characterCount: number;
    totalPurchases: number;
    createdAt: number;
    blindBoxPrice: number;
}

/**
 * Get all public collections (admin only)
 */
export const getAllCollections = async (): Promise<AdminCollectionData[]> => {
    const collectionsRef = collection(db, 'public_themes');
    const snapshot = await getDocs(collectionsRef);
    
    const collections: AdminCollectionData[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || 'Unnamed Collection',
            description: data.description || '',
            creatorId: data.creatorId || data.createdBy || '',
            creatorName: data.creatorName || 'Unknown',
            boxImageUrl: data.boxImageUrl,
            characterCount: data.characterCount || 0,
            totalPurchases: data.totalPurchases || 0,
            createdAt: (data.createdAt as Timestamp)?.toMillis() || Date.now(),
            blindBoxPrice: data.blindBoxPrice || 100
        };
    });
    
    // Sort by total purchases (most popular first)
    return collections.sort((a, b) => b.totalPurchases - a.totalPurchases);
};

/**
 * Delete a collection and cascade remove from all users (admin only)
 * WARNING: This permanently removes the collection and all user-owned items
 */
export const deleteCollectionCascade = async (themeId: string, creatorId: string): Promise<void> => {
    console.log(`[Admin] Starting cascade deletion for theme: ${themeId}`);
    
    // Step 1: Delete from public_themes
    const publicThemeRef = doc(db, 'public_themes', themeId);
    await deleteDoc(publicThemeRef);
    console.log(`[Admin] Deleted from public_themes`);
    
    // Step 2: Delete from creator's themes
    const creatorThemeRef = doc(db, 'users', creatorId, 'themes', themeId);
    await deleteDoc(creatorThemeRef);
    console.log(`[Admin] Deleted from creator's themes`);
    
    // Step 3: Delete all characters in theme (from creator's subcollection)
    const charactersRef = collection(db, 'users', creatorId, 'themes', themeId, 'characters');
    const charactersSnapshot = await getDocs(charactersRef);
    const charDeletePromises = charactersSnapshot.docs.map(charDoc => deleteDoc(charDoc.ref));
    await Promise.all(charDeletePromises);
    console.log(`[Admin] Deleted ${charactersSnapshot.docs.length} characters from theme`);
    
    // Step 4: Remove from ALL users' collections
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let totalItemsRemoved = 0;
    
    for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userCollectionRef = collection(db, 'users', userId, 'collection');
        
        // Query for items from this theme
        const q = query(userCollectionRef, where('themeId', '==', themeId));
        const userItemsSnapshot = await getDocs(q);
        
        if (!userItemsSnapshot.empty) {
            const batch = writeBatch(db);
            userItemsSnapshot.docs.forEach(itemDoc => {
                batch.delete(itemDoc.ref);
            });
            await batch.commit();
            totalItemsRemoved += userItemsSnapshot.docs.length;
            console.log(`[Admin] Removed ${userItemsSnapshot.docs.length} items from user ${userId}`);
        }
    }
    
    console.log(`[Admin] Cascade deletion complete. Total items removed: ${totalItemsRemoved}`);
};

// ============================================================================
// ADMIN ANALYTICS
// ============================================================================

export interface AnalyticsData {
    totalUsers: number;
    totalCollections: number;
    totalPurchases: number;
    activeUsers: number; // Users active in last 7 days
    userGrowth: { date: string; count: number }[];
    collectionsByCreator: { creatorName: string; count: number }[];
    topCollections: { name: string; purchases: number; id: string }[];
}

/**
 * Get analytics data for admin dashboard
 */
export const getAnalytics = async (): Promise<AnalyticsData> => {
    // Get all users
    const users = await getAllUsers();
    const totalUsers = users.length;
    
    // Calculate active users (last 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const activeUsers = users.filter(u => u.lastActive > sevenDaysAgo).length;
    
    // User growth over time (group by date)
    const usersByDate: { [key: string]: number } = {};
    users.forEach(user => {
        const date = new Date(user.createdAt).toISOString().split('T')[0];
        usersByDate[date] = (usersByDate[date] || 0) + 1;
    });
    
    // Convert to array and sort by date
    const userGrowth = Object.entries(usersByDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    
    // Get all collections
    const collections = await getAllCollections();
    const totalCollections = collections.length;
    
    // Calculate total purchases across all collections
    const totalPurchases = collections.reduce((sum, col) => sum + col.totalPurchases, 0);
    
    // Collections by creator
    const creatorMap: { [key: string]: number } = {};
    collections.forEach(col => {
        creatorMap[col.creatorName] = (creatorMap[col.creatorName] || 0) + 1;
    });
    
    const collectionsByCreator = Object.entries(creatorMap)
        .map(([creatorName, count]) => ({ creatorName, count }))
        .sort((a, b) => b.count - a.count);
    
    // Top collections by purchases
    const topCollections = collections
        .slice(0, 10)
        .map(col => ({
            name: col.name,
            purchases: col.totalPurchases,
            id: col.id
        }));
    
    return {
        totalUsers,
        totalCollections,
        totalPurchases,
        activeUsers,
        userGrowth,
        collectionsByCreator,
        topCollections
    };
};
