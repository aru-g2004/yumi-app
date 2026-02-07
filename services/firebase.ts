import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyDYng6zh_UseJINtDNwlHJRgLSjEw-OJJM",
    authDomain: "yumi-d4904.firebaseapp.com",
    projectId: "yumi-d4904",
    storageBucket: "yumi-d4904.firebasestorage.app",
    messagingSenderId: "1087729319762",
    appId: "1:1087729319762:web:8c8600effefd7ee958848b"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Uploads a base64 image to Firebase Storage and returns the download URL
 * New structure: users/{userId}/themes/{themeId}/{filename}
 * @param base64Image - Base64 encoded image string (with or without data URI prefix)
 * @param userId - User ID who owns this image
 * @param themeId - Theme ID this image belongs to
 * @param filename - Filename (e.g., 'box.png' or 'characters/char_123.png')
 * @returns Promise resolving to the download URL of the uploaded image
 */
export const uploadImageToStorage = async (
    base64Image: string,
    userId: string,
    themeId: string,
    filename: string
): Promise<string> => {
    // Ensure user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error('User must be authenticated to upload images to Firebase Storage');
    }

    // Verify the userId matches the authenticated user
    if (currentUser.uid !== userId) {
        throw new Error('Cannot upload images for another user');
    }

    // Construct the storage path: users/{userId}/themes/{themeId}/{filename}
    const storagePath = `users/${userId}/themes/${themeId}/${filename}`;

    console.log('[Firebase Storage] Uploading to:', storagePath);
    console.log('[Firebase Storage] User authenticated:', currentUser.uid);

    // Remove the data URI prefix if present (e.g., "data:image/png;base64,")
    const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    // Convert base64 to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    console.log('[Firebase Storage] Blob size:', blob.size, 'bytes');

    // Create a reference to the storage location
    const storageRef = ref(storage, storagePath);

    try {
        // Upload the blob
        const uploadResult = await uploadBytes(storageRef, blob);
        console.log('[Firebase Storage] Upload successful:', uploadResult.metadata.fullPath);

        // Get and return the download URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Firebase Storage] Download URL:', downloadURL);
        return downloadURL;
    } catch (error: any) {
        console.error('[Firebase Storage] Upload failed:', error);
        console.error('[Firebase Storage] Error code:', error.code);
        console.error('[Firebase Storage] Error message:', error.message);
        throw new Error(`Firebase Storage upload failed: ${error.message}`);
    }
};

