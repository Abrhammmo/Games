
import React from 'react';
import type { GameData, View } from '../types';
import { GamepadIcon, CrownIcon } from './Icons';

interface HomeProps {
    gameData: GameData;
    navigateTo: (view: View) => void;
    userId: string;
}

const Home: React.FC<HomeProps> = ({ gameData, navigateTo, userId }) => {
    const formatTime = (seconds: number) => {
        if (!seconds) return '--:--';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-gray-800 p-6 rounded-2xl shadow-lg w-full max-w-sm text-center animate-fade-in">
            <div className="flex justify-center items-center mb-4">
                <GamepadIcon className="w-10 h-10 text-teal-400" />
                <h1 className="text-3xl font-bold ml-3 text-white">Game Hub</h1>
            </div>

            <p className="text-xs text-gray-400 mb-6 break-all">UserID: {userId}</p>

            <div className="space-y-4 mb-8">
                <button
                    onClick={() => navigateTo('TIC_TAC_TOE')}
                    className="w-full bg-teal-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-opacity-75"
                >
                    Play Tic-Tac-Toe
                </button>
                <button
                    onClick={() => navigateTo('SNAKE')}
                    className="w-full bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
                >
                    Play Snake
                </button>
                 <button
                    onClick={() => navigateTo('TETRIS')}
                    className="w-full bg-amber-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-amber-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-opacity-75"
                >
                    Play Tetris
                </button>
                <button
                    onClick={() => navigateTo('SUDOKU')}
                    className="w-full bg-rose-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-rose-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-opacity-75"
                >
                    Play Sudoku
                </button>
            </div>
            
            <div className="bg-gray-700/50 p-4 rounded-lg">
                <h2 className="text-xl font-semibold text-teal-300 mb-3 flex items-center justify-center">
                    <CrownIcon className="w-6 h-6 mr-2" />
                    High Scores & Stats
                </h2>
                <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <span className="font-semibold text-gray-300">Tic-Tac-Toe Wins:</span>
                        <span className="font-bold text-teal-400 text-lg">{gameData.ticTacToe.playerWins}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <span className="font-semibold text-gray-300">Snake High Score:</span>
                        <span className="font-bold text-indigo-400 text-lg">{gameData.snake.highScore}</span>
                    </div>
                     <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <span className="font-semibold text-gray-300">Tetris High Score:</span>
                        <span className="font-bold text-amber-400 text-lg">{gameData.tetris.highScore}</span>
                    </div>
                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <span className="font-semibold text-gray-300">Sudoku Best Time:</span>
                        <span className="font-bold text-rose-400 text-lg">{formatTime(gameData.sudoku.bestTime)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
