
import React, { useState, useEffect, useCallback } from 'react';
import type { GameData } from '../types';
import { ArrowLeftIcon, PauseIcon, PlayIcon } from './Icons';

interface SudokuProps {
    gameData: GameData;
    onDataUpdate: (data: GameData) => void;
    navigateHome: () => void;
}

// --- Sudoku Configuration & Logic ---

type Grid = number[][];

interface GridConfig {
    size: number;
    boxH: number; // Height of the sub-box (rows)
    boxW: number; // Width of the sub-box (cols)
    emptyCounts: { Easy: number; Medium: number; Hard: number };
}

const CONFIGS: Record<number, GridConfig> = {
    6: { 
        size: 6, 
        boxH: 2, 
        boxW: 3, 
        emptyCounts: { Easy: 12, Medium: 16, Hard: 20 } 
    },
    9: { 
        size: 9, 
        boxH: 3, 
        boxW: 3, 
        emptyCounts: { Easy: 30, Medium: 40, Hard: 50 } 
    }
};

const isValid = (grid: Grid, row: number, col: number, num: number, config: GridConfig): boolean => {
    const { size, boxH, boxW } = config;
    
    // Check Row & Column
    for (let x = 0; x < size; x++) {
        if (grid[row][x] === num) return false;
        if (grid[x][col] === num) return false;
    }

    // Check Box
    const startRow = row - (row % boxH);
    const startCol = col - (col % boxW);
    for (let i = 0; i < boxH; i++) {
        for (let j = 0; j < boxW; j++) {
            if (grid[startRow + i][startCol + j] === num) return false;
        }
    }
    return true;
};

// Solves the grid in place
const solveSudoku = (grid: Grid, config: GridConfig): boolean => {
    const { size } = config;
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            if (grid[row][col] === 0) {
                for (let num = 1; num <= size; num++) {
                    if (isValid(grid, row, col, num, config)) {
                        grid[row][col] = num;
                        if (solveSudoku(grid, config)) return true;
                        grid[row][col] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
};

const generateSudoku = (size: number, difficulty: 'Easy' | 'Medium' | 'Hard'): { initial: Grid; solution: Grid } => {
    const config = CONFIGS[size];
    const grid: Grid = Array.from({ length: size }, () => Array(size).fill(0));

    // 1. Fill Diagonal Boxes (Optimization for randomness)
    // For 9x9 (3x3 boxes): (0,0), (3,3), (6,6) are independent.
    // For 6x6 (2x3 boxes): (0,0) and (4,3) [row 4, col 3] are independent?
    // To keep it simple and generic: simply use the solver with random seed injection or 
    // just try to fill the first box randomly.
    
    const fillBox = (r: number, c: number) => {
        let num: number;
        for (let i = 0; i < config.boxH; i++) {
            for (let j = 0; j < config.boxW; j++) {
                // Try to fill, but if we get stuck in a loop (unlikely in empty grid), just break.
                let attempts = 0;
                do {
                    num = Math.floor(Math.random() * size) + 1;
                    attempts++;
                } while (!isValidBox(grid, r, c, num, config) && attempts < 20);
                if (attempts < 20) grid[r + i][c + j] = num;
            }
        }
    };

    const isValidBox = (g: Grid, rStart: number, cStart: number, n: number, conf: GridConfig) => {
        for (let i = 0; i < conf.boxH; i++) {
            for (let j = 0; j < conf.boxW; j++) {
                if (g[rStart + i][cStart + j] === n) return false;
            }
        }
        return true;
    }

    // Fill diagonal boxes roughly.
    // We step by boxHeight for rows and boxWidth for cols.
    // e.g. 9x9: (0,0), (3,3), (6,6).
    // e.g. 6x6: (0,0), (2,3), (4,6)->Out.
    for (let i = 0; i * config.boxH < size && i * config.boxW < size; i++) {
        fillBox(i * config.boxH, i * config.boxW);
    }

    // 2. Solve the rest
    solveSudoku(grid, config);
    const solution = grid.map(row => [...row]);

    // 3. Remove digits
    let count = config.emptyCounts[difficulty];
    
    // Safety check to not remove too many
    const totalCells = size * size;
    if (totalCells - count < 8) count = totalCells - 8; // Ensure at least 8 clues remain

    while (count > 0) {
        const row = Math.floor(Math.random() * size);
        const col = Math.floor(Math.random() * size);
        if (grid[row][col] !== 0) {
            grid[row][col] = 0;
            count--;
        }
    }

    return { initial: grid, solution };
};

const Sudoku: React.FC<SudokuProps> = ({ gameData, onDataUpdate, navigateHome }) => {
    const [gridSize, setGridSize] = useState<number>(9);
    const [initialBoard, setInitialBoard] = useState<Grid>([]);
    const [board, setBoard] = useState<Grid>([]);
    const [solution, setSolution] = useState<Grid>([]);
    const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
    const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
    const [timer, setTimer] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [gameWon, setGameWon] = useState(false);

    // --- Initialization ---
    const startNewGame = useCallback((diff: 'Easy' | 'Medium' | 'Hard' = difficulty, size: number = gridSize) => {
        const { initial, solution: sol } = generateSudoku(size, diff);
        setInitialBoard(initial.map(r => [...r]));
        setBoard(initial.map(r => [...r]));
        setSolution(sol);
        setTimer(0);
        setGameWon(false);
        setIsPaused(false);
        setDifficulty(diff);
        setGridSize(size);
        setSelectedCell(null);
    }, [difficulty, gridSize]);

    useEffect(() => {
        startNewGame(difficulty, gridSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Timer ---
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (!isPaused && !gameWon && board.length > 0) {
            interval = setInterval(() => {
                setTimer(t => t + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isPaused, gameWon, board]);

    // --- Interactions ---
    const handleCellClick = (r: number, c: number) => {
        if (isPaused || gameWon) return;
        setSelectedCell({ r, c });
    };

    const handleNumberInput = (num: number) => {
        if (isPaused || gameWon || !selectedCell) return;
        const { r, c } = selectedCell;

        if (initialBoard[r][c] !== 0) return;

        const newBoard = board.map(row => [...row]);
        
        if (newBoard[r][c] === num) {
            newBoard[r][c] = 0;
        } else {
            newBoard[r][c] = num;
        }
        
        setBoard(newBoard);

        if (checkWin(newBoard)) {
            handleWin();
        }
    };

    const checkWin = (currentBoard: Grid) => {
        if (currentBoard.length === 0) return false;
        const size = currentBoard.length;
        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                if (currentBoard[i][j] !== solution[i][j]) return false;
            }
        }
        return true;
    };

    const handleWin = () => {
        setGameWon(true);
        const prevStats = gameData.sudoku;
        const newBestTime = prevStats.bestTime === 0 ? timer : Math.min(prevStats.bestTime, timer);
        onDataUpdate({
            ...gameData,
            sudoku: {
                gamesWon: prevStats.gamesWon + 1,
                bestTime: newBestTime
            }
        });
    };

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (isPaused || gameWon) return;
        
        if (selectedCell) {
            const { r, c } = selectedCell;
            const maxNum = gridSize;
            const num = parseInt(e.key);

            if (!isNaN(num) && num >= 1 && num <= maxNum) {
                handleNumberInput(num);
            } else if (e.key === 'Backspace' || e.key === 'Delete') {
                if (initialBoard[r][c] === 0) {
                    const newBoard = board.map(row => [...row]);
                    newBoard[r][c] = 0;
                    setBoard(newBoard);
                }
            } else if (e.key === 'ArrowUp') setSelectedCell({ r: Math.max(0, r - 1), c });
            else if (e.key === 'ArrowDown') setSelectedCell({ r: Math.min(gridSize - 1, r + 1), c });
            else if (e.key === 'ArrowLeft') setSelectedCell({ r, c: Math.max(0, c - 1) });
            else if (e.key === 'ArrowRight') setSelectedCell({ r, c: Math.min(gridSize - 1, c + 1) });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCell, board, initialBoard, isPaused, gameWon, gridSize]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // --- Styling & Helpers ---
    
    const getCellStyles = (r: number, c: number, val: number) => {
        const config = CONFIGS[gridSize];
        const classes = [];
        
        // Colors
        if (initialBoard[r][c] !== 0) classes.push('text-gray-300 font-bold');
        else if (val === 0) classes.push(''); // empty
        else if (val !== solution[r][c]) classes.push('text-rose-500'); // Error
        else classes.push('text-teal-400'); // Correct user input

        // Backgrounds
        if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
            classes.push('bg-teal-500/30');
        } else if (selectedCell && board[selectedCell.r][selectedCell.c] !== 0 && board[r][c] === board[selectedCell.r][selectedCell.c]) {
            classes.push('bg-indigo-500/20');
        } else {
            classes.push('bg-gray-800 hover:bg-gray-700');
        }

        // Borders
        // Right border for box separation
        if ((c + 1) % config.boxW === 0 && c !== config.size - 1) {
            classes.push('border-r-2 border-r-gray-500');
        }
        // Bottom border for box separation
        if ((r + 1) % config.boxH === 0 && r !== config.size - 1) {
            classes.push('border-b-2 border-b-gray-500');
        }

        return classes.join(' ');
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleHint = () => {
        if (gameWon || isPaused) return;
        const emptyCells: {r: number, c: number}[] = [];
        for(let i=0; i<gridSize; i++) {
            for(let j=0; j<gridSize; j++) {
                if(board[i][j] === 0) emptyCells.push({r:i, c:j});
            }
        }
        
        if(emptyCells.length > 0) {
            const rnd = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            const newBoard = board.map(r => [...r]);
            newBoard[rnd.r][rnd.c] = solution[rnd.r][rnd.c];
            setBoard(newBoard);
        }
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDiff = e.target.value as any;
        startNewGame(newDiff, gridSize);
    };

    const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newSize = parseInt(e.target.value);
        startNewGame(difficulty, newSize);
    };

    return (
        <div className="flex flex-col items-center p-4 bg-gray-900 rounded-2xl shadow-lg w-full max-w-md animate-fade-in select-none">
            
            {/* Header */}
            <div className="w-full flex justify-between items-center mb-4">
                <button onClick={navigateHome} className="p-2 rounded-full hover:bg-gray-700 transition"><ArrowLeftIcon className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-rose-500">Sudoku</h2>
                <div className="flex space-x-2">
                    <button onClick={() => setIsPaused(!isPaused)} className="p-2 rounded-full hover:bg-gray-700 transition">
                        {isPaused ? <PlayIcon className="w-6 h-6 text-yellow-400" /> : <PauseIcon className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Controls / Info */}
            <div className="w-full flex justify-between items-center mb-3 px-1 text-sm text-gray-300 flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                    <select 
                        value={gridSize}
                        onChange={handleSizeChange}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none cursor-pointer"
                    >
                        <option value="6">6x6 Grid</option>
                        <option value="9">9x9 Grid</option>
                    </select>
                    <select 
                        value={difficulty} 
                        onChange={handleDifficultyChange}
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-xs focus:outline-none cursor-pointer"
                    >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                    </select>
                </div>
                <div className="font-mono text-xl">{formatTime(timer)}</div>
            </div>

            {/* Board Container */}
            <div className="relative w-full aspect-square bg-gray-700 p-1 rounded-lg shadow-inner">
                {/* Grid */}
                <div className={`grid ${gridSize === 6 ? 'grid-cols-6' : 'grid-cols-9'} ${gridSize === 6 ? 'grid-rows-6' : 'grid-rows-9'} gap-px w-full h-full border-2 border-gray-600 bg-gray-600`}>
                    {board.map((row, r) => (
                        row.map((val, c) => (
                            <div 
                                key={`${r}-${c}`}
                                onClick={() => handleCellClick(r, c)}
                                className={`flex items-center justify-center text-lg cursor-pointer transition-colors ${getCellStyles(r, c, val)}`}
                            >
                                {val !== 0 ? val : ''}
                            </div>
                        ))
                    ))}
                </div>

                {/* Paused Overlay */}
                {isPaused && (
                    <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-20 backdrop-blur-sm rounded-lg">
                        <h3 className="text-3xl font-bold text-white mb-4">Paused</h3>
                        <button 
                            onClick={() => setIsPaused(false)} 
                            className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-full flex items-center transition-transform hover:scale-105 font-bold"
                        >
                            <PlayIcon className="w-6 h-6 mr-2" /> Resume
                        </button>
                    </div>
                )}

                {/* Win Overlay */}
                {gameWon && (
                    <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center z-20 rounded-lg">
                        <h3 className="text-4xl font-bold text-teal-400 mb-2">Solved!</h3>
                        <p className="text-gray-300 mb-4">Time: {formatTime(timer)}</p>
                        <button 
                            onClick={() => startNewGame(difficulty, gridSize)}
                            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-full font-bold"
                        >
                            New Game
                        </button>
                    </div>
                )}
            </div>

            {/* Number Pad */}
            <div className={`grid ${gridSize === 6 ? 'grid-cols-6' : 'grid-cols-9'} gap-1 w-full mt-4`}>
                {Array.from({ length: gridSize }, (_, i) => i + 1).map(num => (
                    <button
                        key={num}
                        onClick={() => handleNumberInput(num)}
                        className="aspect-square bg-gray-800 rounded-md text-xl font-semibold text-teal-400 hover:bg-gray-700 focus:outline-none focus:ring-1 focus:ring-teal-500 active:scale-95 transition shadow"
                        disabled={isPaused || gameWon}
                    >
                        {num}
                    </button>
                ))}
            </div>

            {/* Action Buttons */}
            <div className="flex w-full justify-between mt-4 space-x-2">
                 <button 
                    onClick={() => startNewGame(difficulty, gridSize)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold text-gray-300 transition"
                >
                    Reset
                </button>
                <button 
                    onClick={handleHint}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold text-yellow-400 transition"
                >
                    Hint
                </button>
                 <button 
                    onClick={() => {
                        if(selectedCell && initialBoard[selectedCell.r][selectedCell.c] === 0) {
                            handleNumberInput(board[selectedCell.r][selectedCell.c]); // Toggles off
                        }
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 py-2 rounded-lg text-sm font-semibold text-red-400 transition"
                >
                    Clear
                </button>
            </div>
        </div>
    );
};

export default Sudoku;
