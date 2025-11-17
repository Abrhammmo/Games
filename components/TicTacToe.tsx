import React, { useState, useEffect, useCallback } from 'react';
import type { GameData } from '../types';
import { ArrowLeftIcon, RefreshIcon, UserIcon, RobotIcon, TrophyIcon } from './Icons';

type Player = 'X' | 'O' | null;
type Difficulty = 'Easy' | 'Medium' | 'Hard';

interface TicTacToeProps {
    gameData: GameData;
    onDataUpdate: (data: GameData) => void;
    navigateHome: () => void;
}

const TicTacToe: React.FC<TicTacToeProps> = ({ gameData, onDataUpdate, navigateHome }) => {
    const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [winner, setWinner] = useState<Player | 'Draw' | null>(null);
    const [statusMessage, setStatusMessage] = useState('Your Turn (X)');
    const [difficulty, setDifficulty] = useState<Difficulty>('Medium');

    const isGameInProgress = board.some(cell => cell !== null) && !winner;

    const checkWinner = useCallback((currentBoard: Player[]): Player | 'Draw' | null => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
            [0, 4, 8], [2, 4, 6]             // diagonals
        ];
        for (const line of lines) {
            const [a, b, c] = line;
            if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
                return currentBoard[a];
            }
        }
        if (currentBoard.every(cell => cell !== null)) {
            return 'Draw';
        }
        return null;
    }, []);

    const resetGame = useCallback(() => {
        setBoard(Array(9).fill(null));
        setIsPlayerTurn(true);
        setWinner(null);
        setStatusMessage('Your Turn (X)');
    }, []);

    const handlePlayerMove = (index: number) => {
        if (board[index] || winner || !isPlayerTurn) return;
        
        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        
        const gameResult = checkWinner(newBoard);
        if (gameResult) {
            setWinner(gameResult);
        } else {
            setIsPlayerTurn(false);
            setStatusMessage('AI is Thinking...');
        }
    };

    // --- AI Logic ---

    const findWinningMove = (b: Player[], player: Player): number | null => {
        for (let i = 0; i < 9; i++) {
            if (b[i] === null) {
                const tempBoard = [...b];
                tempBoard[i] = player;
                if (checkWinner(tempBoard) === player) {
                    return i;
                }
            }
        }
        return null;
    };

    const getAvailableMoves = (b: Player[]): number[] => {
        return b.map((val, idx) => (val === null ? idx : -1)).filter(val => val !== -1);
    };

    const easyAIMove = (b: Player[]): number | null => {
        const availableMoves = getAvailableMoves(b);
        if (availableMoves.length === 0) return null;
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    };

    const mediumAIMove = (b: Player[]): number | null => {
        const winningMove = findWinningMove(b, 'O');
        if (winningMove !== null) return winningMove;

        const blockingMove = findWinningMove(b, 'X');
        if (blockingMove !== null) return blockingMove;

        if (b[4] === null) return 4;
        
        const availableMoves = getAvailableMoves(b);
        const corners = [0, 2, 6, 8].filter(i => availableMoves.includes(i));
        if (corners.length > 0) {
            return corners[Math.floor(Math.random() * corners.length)];
        }
        
        return availableMoves[0] ?? null;
    };
    
    const hardAIMove = (b: Player[]): number | null => {
        const winningMove = findWinningMove(b, 'O');
        if (winningMove !== null) return winningMove;

        const blockingMove = findWinningMove(b, 'X');
        if (blockingMove !== null) return blockingMove;

        if (b[4] === null) return 4;

        if (b[0] === 'X' && b[8] === null) return 8;
        if (b[8] === 'X' && b[0] === null) return 0;
        if (b[2] === 'X' && b[6] === null) return 6;
        if (b[6] === 'X' && b[2] === null) return 2;

        const availableMoves = getAvailableMoves(b);
        const corners = [0, 2, 6, 8].filter(i => availableMoves.includes(i));
        if (corners.length > 0) return corners[0];

        return availableMoves[0] ?? null;
    };

    // --- Effects ---

    useEffect(() => {
        if (winner) {
            const newGameData = { ...gameData };
            let shouldUpdate = false;
            if (winner === 'X') {
                setStatusMessage('You Win!');
                newGameData.ticTacToe.playerWins++;
                shouldUpdate = true;
            } else if (winner === 'O') {
                setStatusMessage('AI Wins!');
                newGameData.ticTacToe.aiWins++;
                shouldUpdate = true;
            } else if (winner === 'Draw') {
                setStatusMessage('It\'s a Draw!');
                newGameData.ticTacToe.draws++;
                shouldUpdate = true;
            }
            if (shouldUpdate) {
                onDataUpdate(newGameData);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [winner]);
    
    useEffect(() => {
        if (!isPlayerTurn && !winner) {
            const timeoutId = setTimeout(() => {
                const newBoard = [...board];
                
                let moveIndex: number | null;
                switch(difficulty) {
                    case 'Easy': moveIndex = easyAIMove(newBoard); break;
                    case 'Hard': moveIndex = hardAIMove(newBoard); break;
                    default: moveIndex = mediumAIMove(newBoard); break;
                }

                if (moveIndex !== null) {
                    newBoard[moveIndex] = 'O';
                    setBoard(newBoard);
                    const gameResult = checkWinner(newBoard);
                    if (gameResult) {
                        setWinner(gameResult);
                    } else {
                        setIsPlayerTurn(true);
                        setStatusMessage('Your Turn (X)');
                    }
                }
            }, 700);
            return () => clearTimeout(timeoutId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlayerTurn, winner, board, difficulty]);

    const getStatusColor = () => {
        if (winner === 'X') return 'text-teal-400';
        if (winner === 'O') return 'text-red-400';
        if (winner === 'Draw') return 'text-yellow-400';
        return 'text-gray-300';
    };

    return (
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm animate-fade-in">
            <div className="w-full flex justify-between items-center mb-4">
                <button onClick={navigateHome} className="p-2 rounded-full hover:bg-gray-700 transition"><ArrowLeftIcon className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-teal-400">Tic-Tac-Toe</h2>
                <button onClick={resetGame} className="p-2 rounded-full hover:bg-gray-700 transition"><RefreshIcon className="w-6 h-6" /></button>
            </div>

            <div className="grid grid-cols-3 gap-2 w-full aspect-square mb-4">
                {board.map((value, index) => (
                    <div
                        key={index}
                        onClick={() => handlePlayerMove(index)}
                        className={`flex items-center justify-center bg-gray-900 rounded-lg cursor-pointer transition ${!value && isPlayerTurn && !winner ? 'hover:bg-gray-700' : ''}`}
                    >
                        <span className={`text-5xl font-bold ${value === 'X' ? 'text-teal-400' : 'text-indigo-400'}`}>{value}</span>
                    </div>
                ))}
            </div>
            
            <p className={`text-xl font-semibold mb-4 h-7 ${getStatusColor()}`}>{statusMessage}</p>

            <div className="w-full bg-gray-900 p-3 rounded-lg flex justify-around text-center mb-4">
                <div className="flex flex-col items-center">
                    <div className="flex items-center text-teal-400"><UserIcon className="w-5 h-5 mr-2" /> Player (X)</div>
                    <span className="text-2xl font-bold">{gameData.ticTacToe.playerWins}</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center text-yellow-400"><TrophyIcon className="w-5 h-5 mr-2" /> Draws</div>
                    <span className="text-2xl font-bold">{gameData.ticTacToe.draws}</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center text-indigo-400"><RobotIcon className="w-5 h-5 mr-2" /> AI (O)</div>
                    <span className="text-2xl font-bold">{gameData.ticTacToe.aiWins}</span>
                </div>
            </div>

            <div className="w-full bg-gray-900 p-3 rounded-lg">
                <p className="text-center text-sm text-gray-400 mb-2">Difficulty</p>
                <div className="flex justify-center space-x-2">
                    {(['Easy', 'Medium', 'Hard'] as Difficulty[]).map(level => (
                         <button 
                            key={level}
                            onClick={() => setDifficulty(level)}
                            disabled={isGameInProgress}
                            className={`px-4 py-1 text-sm font-semibold rounded-md transition ${
                                difficulty === level 
                                ? 'bg-teal-500 text-white' 
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {level}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TicTacToe;
