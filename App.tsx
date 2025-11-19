
import React, { useState, useEffect } from 'react';
import Home from './components/Home';
import TicTacToe from './components/TicTacToe';
import Snake from './components/Snake';
import Tetris from './components/Tetris';
import Sudoku from './components/sudoku';
import { getGameData, updateGameData, appId, performAnonymousSignIn, isDemoMode } from './services/firebaseService';
import type { GameData, View } from './types';
import { LoaderIcon, InfoIcon } from './components/Icons';

const DemoModeBanner = () => (
    <div className="w-full max-w-md mx-auto bg-yellow-900/50 border border-yellow-600 text-yellow-200 text-sm p-3 rounded-lg mb-4 flex items-start text-left animate-fade-in">
        <InfoIcon className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
        <div>
            <p className="font-semibold">Running in Offline Demo Mode</p>
            <p>Your scores are saved locally on this browser. To enable cloud saves, please configure your Firebase credentials in the <code className="bg-gray-700 text-xs px-1 py-0.5 rounded">index.html</code> file.</p>
        </div>
    </div>
);

const App: React.FC = () => {
    const [view, setView] = useState<View>('HOME');
    const [gameData, setGameData] = useState<GameData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [demoModeActive, setDemoModeActive] = useState(false);

    useEffect(() => {
        const initializeApp = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // The service now handles the check internally and exports the flag
                setDemoModeActive(isDemoMode);
                
                const user = await performAnonymousSignIn();
                const uid = user.uid;
                setUserId(uid);

                const data = await getGameData(uid, appId);
                setGameData(data);

            } catch (err: any) {
                console.error("Initialization failed:", err);
                setError("An unexpected error occurred during initialization. Please check the console for details.");
            } finally {
                setLoading(false);
            }
        };
        initializeApp();
    }, []);

    const handleDataUpdate = async (newGameData: GameData) => {
        if (!userId) return;
        setGameData(newGameData);
        await updateGameData(userId, appId, newGameData);
    };

    const navigateTo = (newView: View) => {
        setView(newView);
    };
    
    const renderContent = () => {
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-teal-400">
                    <LoaderIcon className="w-16 h-16 animate-spin" />
                    <p className="mt-4 text-lg">Loading Game Hub...</p>
                </div>
            );
        }

        if (error) {
            return (
                <div className="text-center bg-red-900/50 border border-red-500 text-red-300 p-6 rounded-lg animate-fade-in">
                    <h3 className="font-bold text-xl mb-2">Application Error</h3>
                    <p className="text-sm">{error}</p>
                </div>
            );
        }

        if (!gameData || !userId) {
            return <div className="text-center text-yellow-400">Could not load user data.</div>;
        }

        switch (view) {
            case 'TIC_TAC_TOE':
                return <TicTacToe gameData={gameData} onDataUpdate={handleDataUpdate} navigateHome={() => navigateTo('HOME')} />;
            case 'SNAKE':
                return <Snake gameData={gameData} onDataUpdate={handleDataUpdate} navigateHome={() => navigateTo('HOME')} />;
            case 'TETRIS':
                return <Tetris gameData={gameData} onDataUpdate={handleDataUpdate} navigateHome={() => navigateTo('HOME')} />;
            case 'SUDOKU':
                return <Sudoku gameData={gameData} onDataUpdate={handleDataUpdate} navigateHome={() => navigateTo('HOME')} />;
            case 'HOME':
            default:
                return <Home gameData={gameData} navigateTo={navigateTo} userId={userId} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
            <main className="w-full max-w-md mx-auto">
                {demoModeActive && <DemoModeBanner />}
                {renderContent()}
            </main>
        </div>
    );
};

export default App;
