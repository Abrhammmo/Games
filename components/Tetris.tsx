

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameData } from '../types';
import { ArrowLeftIcon, PlayIcon, RefreshIcon } from './Icons';

interface TetrisProps {
    gameData: GameData;
    onDataUpdate: (data: GameData) => void;
    navigateHome: () => void;
}

// Game constants
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 20;
const CANVAS_WIDTH = COLS * BLOCK_SIZE;
const CANVAS_HEIGHT = ROWS * BLOCK_SIZE;

const TETROMINOES = {
    'I': { shape: [[1, 1, 1, 1]], color: '#06b6d4' },
    'J': { shape: [[1, 0, 0], [1, 1, 1]], color: '#3b82f6' },
    'L': { shape: [[0, 0, 1], [1, 1, 1]], color: '#f97316' },
    'O': { shape: [[1, 1], [1, 1]], color: '#eab308' },
    'S': { shape: [[0, 1, 1], [1, 1, 0]], color: '#22c55e' },
    'T': { shape: [[0, 1, 0], [1, 1, 1]], color: '#8b5cf6' },
    'Z': { shape: [[1, 1, 0], [0, 1, 1]], color: '#ef4444' },
};

type TetrominoKey = keyof typeof TETROMINOES;

const Tetris: React.FC<TetrisProps> = ({ gameData, onDataUpdate, navigateHome }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const nextPieceCanvasRef = useRef<HTMLCanvasElement>(null);
    const gameLoopTimeout = useRef<number | null>(null);

    const [board, setBoard] = useState(() => createEmptyBoard());
    const [currentPiece, setCurrentPiece] = useState(() => createRandomPiece());
    const [nextPiece, setNextPiece] = useState(() => createRandomPiece());
    const [score, setScore] = useState(0);
    const [lines, setLines] = useState(0);
    const [level, setLevel] = useState(0);
    const [highScore, setHighScore] = useState(gameData.tetris.highScore);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    
    function createEmptyBoard() {
        return Array.from({ length: ROWS }, () => Array(COLS).fill({ color: null, filled: false }));
    }

    function createRandomPiece() {
        const keys = Object.keys(TETROMINOES) as TetrominoKey[];
        const randKey = keys[Math.floor(Math.random() * keys.length)];
        const piece = TETROMINOES[randKey];
        return {
            ...piece,
            x: Math.floor(COLS / 2) - Math.floor(piece.shape[0].length / 2),
            y: 0,
            key: randKey,
        };
    }

    const isValidMove = useCallback((piece: any, newX: number, newY: number) => {
        for (let y = 0; y < piece.shape.length; y++) {
            for (let x = 0; x < piece.shape[y].length; x++) {
                if (piece.shape[y][x]) {
                    const boardX = newX + x;
                    const boardY = newY + y;
                    if (boardX < 0 || boardX >= COLS || boardY >= ROWS || (boardY >= 0 && board[boardY][boardX].filled)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }, [board]);

    const lockPiece = useCallback(() => {
        let gameOver = false;
        setBoard(prevBoard => {
            const newBoard = prevBoard.map(row => [...row]);
            for (let y = 0; y < currentPiece.shape.length; y++) {
                for (let x = 0; x < currentPiece.shape[y].length; x++) {
                    if (currentPiece.shape[y][x]) {
                        const boardX = currentPiece.x + x;
                        const boardY = currentPiece.y + y;
                        if (boardY < 0) {
                            gameOver = true;
                        } else {
                            newBoard[boardY][boardX] = { color: currentPiece.color, filled: true };
                        }
                    }
                }
            }
            return newBoard;
        });
        return gameOver;
    }, [currentPiece]);

    const clearLines = useCallback(() => {
        setBoard(prevBoard => {
            let linesCleared = 0;
            const newBoard = prevBoard.filter(row => !row.every(cell => cell.filled));
            linesCleared = ROWS - newBoard.length;
            while (newBoard.length < ROWS) {
                newBoard.unshift(Array(COLS).fill({ color: null, filled: false }));
            }
            if (linesCleared > 0) {
                setLines(prev => prev + linesCleared);
                const points = [0, 40, 100, 300, 1200];
                setScore(prev => prev + points[linesCleared] * (level + 1));
            }
            return newBoard;
        });
    }, [level]);
    
    const resetGame = useCallback(() => {
        setBoard(createEmptyBoard());
        setCurrentPiece(createRandomPiece());
        setNextPiece(createRandomPiece());
        setScore(0);
        setLines(0);
        setLevel(0);
        setIsGameOver(false);
        setIsPaused(true);
    }, []);

    const movePiece = (dx: number, dy: number) => {
        if (isGameOver || isPaused) return;
        if (isValidMove(currentPiece, currentPiece.x + dx, currentPiece.y + dy)) {
            setCurrentPiece(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        }
    };

    const rotatePiece = () => {
        if (isGameOver || isPaused || currentPiece.key === 'O') return;
        const { shape } = currentPiece;
        const newShape = shape[0].map((_, colIndex) => shape.map(row => row[colIndex]).reverse());
        
        // Wall kick logic
        let kickX = 0;
        if (!isValidMove({ ...currentPiece, shape: newShape }, currentPiece.x, currentPiece.y)) {
            kickX = currentPiece.x > COLS / 2 ? -1 : 1;
        }
        if (isValidMove({ ...currentPiece, shape: newShape }, currentPiece.x + kickX, currentPiece.y)) {
             setCurrentPiece(prev => ({ ...prev, shape: newShape, x: prev.x + kickX }));
        }
    };
    
    useEffect(() => {
        if (isGameOver) {
            if (score > gameData.tetris.highScore) {
                onDataUpdate({ ...gameData, tetris: { highScore: score } });
            }
        }
    }, [isGameOver, score, gameData, onDataUpdate]);

    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
        }
    }, [score, highScore]);

    useEffect(() => {
        setLevel(Math.floor(lines / 10));
    }, [lines]);

    const gameTick = useCallback(() => {
        if (isPaused || isGameOver) return;
        
        if (isValidMove(currentPiece, currentPiece.x, currentPiece.y + 1)) {
            setCurrentPiece(prev => ({...prev, y: prev.y + 1}));
        } else {
            const gameOver = lockPiece();
            if(gameOver) {
                setIsGameOver(true);
                return;
            }
            clearLines();
            const newPiece = nextPiece;
            setCurrentPiece(newPiece);
            setNextPiece(createRandomPiece());
            if (!isValidMove(newPiece, newPiece.x, newPiece.y)) {
                setIsGameOver(true);
            }
        }
    }, [isPaused, isGameOver, currentPiece, nextPiece, isValidMove, lockPiece, clearLines]);

    useEffect(() => {
        if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
        if(!isPaused && !isGameOver) {
            const gameSpeed = 1000 - level * 50 > 100 ? 1000 - level * 50 : 100;
            gameLoopTimeout.current = window.setTimeout(gameTick, gameSpeed);
        }
        return () => {
            if (gameLoopTimeout.current) clearTimeout(gameLoopTimeout.current);
        };
    }, [gameTick, level, isPaused, isGameOver]);
    
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
        if (!gameKeys.includes(e.key)) {
            return;
        }
        
        e.preventDefault(); // Prevent page scrolling for all game keys

        if (isPaused && !isGameOver) {
            setIsPaused(false);
        }
        
        if (isGameOver) return;

        switch (e.key) {
            case 'ArrowLeft': movePiece(-1, 0); break;
            case 'ArrowRight': movePiece(1, 0); break;
            case 'ArrowDown': gameTick(); break;
            case 'ArrowUp': rotatePiece(); break;
            case ' ': 
                rotatePiece();
                break;
        }
    }, [isPaused, isGameOver, gameTick]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 1; i < COLS; i++) {
            ctx.beginPath();
            ctx.moveTo(i * BLOCK_SIZE, 0);
            ctx.lineTo(i * BLOCK_SIZE, CANVAS_HEIGHT);
            ctx.stroke();
        }
        for (let i = 1; i < ROWS; i++) {
             ctx.beginPath();
            ctx.moveTo(0, i * BLOCK_SIZE);
            ctx.lineTo(CANVAS_WIDTH, i * BLOCK_SIZE);
            ctx.stroke();
        }
        
        board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell.filled) {
                    ctx.fillStyle = cell.color;
                    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });

        currentPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = currentPiece.color;
                    ctx.fillRect((currentPiece.x + x) * BLOCK_SIZE, (currentPiece.y + y) * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
                }
            });
        });

    }, [board, currentPiece]);

    useEffect(() => {
        const canvas = nextPieceCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
    
        const NP_GRID_SIZE = 4;
        const NP_BLOCK_SIZE = 15;
        canvas.width = NP_GRID_SIZE * NP_BLOCK_SIZE;
        canvas.height = NP_GRID_SIZE * NP_BLOCK_SIZE;
    
        ctx.fillStyle = '#111827'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    
        const piece = nextPiece.shape;
        const color = nextPiece.color;
        const xOffset = (NP_GRID_SIZE - piece[0].length) / 2;
        const yOffset = (NP_GRID_SIZE - piece.length) / 2;
    
        piece.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    ctx.fillStyle = color;
                    ctx.fillRect(
                        (x + xOffset) * NP_BLOCK_SIZE,
                        (y + yOffset) * NP_BLOCK_SIZE,
                        NP_BLOCK_SIZE,
                        NP_BLOCK_SIZE
                    );
                }
            });
        });
    }, [nextPiece]);

    return (
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-2xl shadow-lg w-full max-w-md animate-fade-in">
            <div className="w-full flex justify-between items-center mb-2">
                <button onClick={navigateHome} className="p-2 rounded-full hover:bg-gray-700 transition"><ArrowLeftIcon className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-amber-400">Tetris</h2>
                <button onClick={resetGame} className="p-2 rounded-full hover:bg-gray-700 transition"><RefreshIcon className="w-6 h-6" /></button>
            </div>
            
            <div className="flex w-full justify-center items-start space-x-4">
                <div className="relative w-auto h-full bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                    <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />
                    {(isPaused || isGameOver) && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                            {isGameOver ? (
                                <>
                                    <h3 className="text-4xl font-bold text-red-500">Game Over</h3>
                                    <p className="text-xl mt-2">Final Score: {score}</p>
                                    <button onClick={resetGame} className="mt-4 bg-amber-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-amber-600 transition">Play Again</button>
                                </>
                            ) : (
                                <>
                                   <h3 className="text-3xl font-bold text-white mb-2">Game Paused</h3>
                                   <p className="mb-4 text-gray-300">Use Arrow Keys or Space to Start</p>
                                   <button onClick={() => setIsPaused(false)} className="p-4 bg-teal-500 rounded-full hover:bg-teal-600 transition animate-pulse">
                                       <PlayIcon className="w-8 h-8 text-white" />
                                   </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col space-y-3 w-32">
                    <div className="bg-gray-900 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400">HIGH SCORE</p>
                        <p className="text-lg font-bold text-amber-400">{highScore}</p>
                    </div>
                     <div className="bg-gray-900 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400">NEXT</p>
                        <canvas ref={nextPieceCanvasRef} className="mx-auto mt-1" />
                    </div>
                    <div className="bg-gray-900 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400">SCORE</p>
                        <p className="text-lg font-bold">{score}</p>
                    </div>
                    <div className="bg-gray-900 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400">LINES</p>
                        <p className="text-lg font-bold">{lines}</p>
                    </div>
                    <div className="bg-gray-900 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400">LEVEL</p>
                        <p className="text-lg font-bold">{level}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Tetris;