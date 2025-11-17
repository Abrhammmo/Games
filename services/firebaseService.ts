// FIX: Refactored to use Firebase v8 compat syntax to fix module import errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import type { GameData } from '../types';

// These are expected to be on the window object as per the spec.
declare global {
    interface Window {
        __app_id: string;
        __firebase_config: any;
        __initial_auth_token: string | null;
    }
}

const firebaseConfig = window.__firebase_config;
export const appId = window.__app_id || 'default-app-id';

// --- Demo Mode ---
// Will be true if Firebase config is missing, allowing the app to run offline.
export let isDemoMode = false;
const LOCAL_STORAGE_KEY = `game-hub-demo-data-${appId}`;

const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('YOUR_API_KEY');

// Initialize Firebase only if it's configured.
let app: firebase.app.App | null = null;
let db: firebase.firestore.Firestore | null = null;
export let auth: firebase.auth.Auth | null = null;

if (isFirebaseConfigured) {
    try {
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        auth = firebase.auth();
    } catch (e) {
        console.error("Firebase initialization failed:", e);
        // Fallback to demo mode if initialization fails for any reason
        isDemoMode = true;
    }
} else {
    isDemoMode = true;
    console.warn("Firebase configuration is missing or invalid. Running in offline demo mode. Game data will be stored locally and will not persist across devices.");
}

export const performAnonymousSignIn = async (): Promise<{ uid: string } | firebase.User | null> => {
    if (isDemoMode) {
        return { uid: 'demo-user-offline' };
    }

    if (!auth) {
        throw new Error("Firebase auth is not initialized.");
    }
    
    if (auth.currentUser) {
        return auth.currentUser;
    }
    
    const userCredential = await auth.signInAnonymously();
    return userCredential.user;
};


const DEFAULT_GAME_DATA: GameData = {
    ticTacToe: {
        playerWins: 0,
        aiWins: 0,
        draws: 0,
    },
    snake: {
        highScore: 0,
    },
    tetris: {
        highScore: 0,
    }
};

const getGameDataRef = (userId: string, currentAppId: string): firebase.firestore.DocumentReference | null => {
    if (isDemoMode || !db) return null;
    return db.collection('artifacts').doc(currentAppId).collection('users').doc(userId).collection('game_data').doc('scores');
};

export const getGameData = async (userId: string, currentAppId: string): Promise<GameData> => {
    if (isDemoMode) {
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localData) {
            try {
                const parsedData = JSON.parse(localData);
                // Merge with defaults to ensure data structure is up-to-date
                 return {
                    ticTacToe: { ...DEFAULT_GAME_DATA.ticTacToe, ...parsedData.ticTacToe },
                    snake: { ...DEFAULT_GAME_DATA.snake, ...parsedData.snake },
                    tetris: { ...DEFAULT_GAME_DATA.tetris, ...parsedData.tetris }
                };
            } catch (e) {
                console.error("Could not parse local data, returning default.", e);
                return DEFAULT_GAME_DATA;
            }
        }
        return DEFAULT_GAME_DATA;
    }

    const docRef = getGameDataRef(userId, currentAppId);
    if (!docRef) throw new Error("Firestore is not initialized.");
    
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        const data = docSnap.data() || {};
        // Merge with defaults to ensure all keys exist
        return {
            ticTacToe: { ...DEFAULT_GAME_DATA.ticTacToe, ...data.ticTacToe },
            snake: { ...DEFAULT_GAME_DATA.snake, ...data.snake },
            tetris: { ...DEFAULT_GAME_DATA.tetris, ...data.tetris }
        };
    } else {
        console.log("No such document! Creating with default data.");
        await docRef.set(DEFAULT_GAME_DATA);
        return DEFAULT_GAME_DATA;
    }
};

export const updateGameData = async (userId: string, currentAppId: string, data: GameData): Promise<void> => {
    if (isDemoMode) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
        return;
    }

    const docRef = getGameDataRef(userId, currentAppId);
    if (!docRef) throw new Error("Firestore is not initialized.");

    await docRef.set(data, { merge: true });
};