

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GameData } from '../types';
import { ArrowLeftIcon, PlayIcon, RefreshIcon } from './Icons';

interface SnakeProps {
    gameData: GameData;
    onDataUpdate: (data: GameData) => void;
    navigateHome: () => void;
}

const GRID_SIZE = 20;
const CANVAS_SIZE = 400; // Keep this a multiple of GRID_SIZE
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;
const GAME_SPEED = 150;

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
interface Point { x: number; y: number; }

const Snake: React.FC<SnakeProps> = ({ gameData, onDataUpdate, navigateHome }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }]);
    const [food, setFood] = useState<Point>({ x: 15, y: 15 });
    const direction = useRef<Direction>('RIGHT');
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(gameData.snake.highScore);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(true);

    const touchStart = useRef<Point | null>(null);
    const touchEnd = useRef<Point | null>(null);

    const resetGame = useCallback(() => {
        setSnake([{ x: 10, y: 10 }]);
        direction.current = 'RIGHT';
        setFood(createFood());
        setScore(0);
        setIsGameOver(false);
        setIsPaused(true);
    }, []);

    const createFood = (): Point => {
        let newFood: Point;
        do {
            newFood = {
                x: Math.floor(Math.random() * GRID_SIZE),
                y: Math.floor(Math.random() * GRID_SIZE),
            };
        } while (snake.some(segment => segment.x === newFood.x && segment.y === newFood.y));
        return newFood;
    };
    
    const gameLoop = useCallback(() => {
        if (isPaused || isGameOver) return;

        setSnake(prevSnake => {
            const newSnake = [...prevSnake];
            const head = { ...newSnake[0] };

            switch (direction.current) {
                case 'UP': head.y -= 1; break;
                case 'DOWN': head.y += 1; break;
                case 'LEFT': head.x -= 1; break;
                case 'RIGHT': head.x += 1; break;
            }

            // Wall collision
            if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
                setIsGameOver(true);
                return prevSnake;
            }
            // Self collision
            for (let i = 1; i < newSnake.length; i++) {
                if (head.x === newSnake[i].x && head.y === newSnake[i].y) {
                    setIsGameOver(true);
                    return prevSnake;
                }
            }

            newSnake.unshift(head);

            if (head.x === food.x && head.y === food.y) {
                setScore(s => s + 1);
                setFood(createFood());
            } else {
                newSnake.pop();
            }
            
            return newSnake;
        });
    }, [food.x, food.y, isGameOver, isPaused]);
    
    useEffect(() => {
        const interval = setInterval(gameLoop, GAME_SPEED);
        return () => clearInterval(interval);
    }, [gameLoop]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        
        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        for (let i = 0; i < GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * CELL_SIZE, 0);
            ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
            ctx.moveTo(0, i * CELL_SIZE);
            ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
            ctx.stroke();
        }


        ctx.fillStyle = '#f43f5e'; // Food color
        ctx.fillRect(food.x * CELL_SIZE, food.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        snake.forEach((segment, index) => {
            ctx.fillStyle = index === 0 ? '#34d399' : '#10b981'; // Head and body color
            ctx.fillRect(segment.x * CELL_SIZE, segment.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        });
    }, [snake, food]);
    
    useEffect(() => {
        if (score > highScore) {
            setHighScore(score);
        }
    }, [score, highScore]);

    useEffect(() => {
        if (isGameOver) {
            if (score > gameData.snake.highScore) {
                onDataUpdate({
                    ...gameData,
                    snake: { highScore: score }
                });
            }
        }
    }, [isGameOver, score, gameData, onDataUpdate]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const key = e.key;
        const gameKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

        if (gameKeys.includes(key)) {
            e.preventDefault(); // Prevent page scrolling
        } else {
            return;
        }

        if (isPaused && !isGameOver) {
             setIsPaused(false);
        }
        
        const currentDir = direction.current;
        if (key === 'ArrowUp' && currentDir !== 'DOWN') direction.current = 'UP';
        else if (key === 'ArrowDown' && currentDir !== 'UP') direction.current = 'DOWN';
        else if (key === 'ArrowLeft' && currentDir !== 'RIGHT') direction.current = 'LEFT';
        else if (key === 'ArrowRight' && currentDir !== 'LEFT') direction.current = 'RIGHT';
    }, [isPaused, isGameOver]);

    const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
        touchEnd.current = null;
        touchStart.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
        touchEnd.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
    };

    const handleTouchEnd = () => {
        if (!touchStart.current || !touchEnd.current) return;
        
        if (isPaused && !isGameOver) {
            setIsPaused(false);
        }

        const dx = touchEnd.current.x - touchStart.current.x;
        const dy = touchEnd.current.y - touchStart.current.y;
        const currentDir = direction.current;

        if (Math.abs(dx) > Math.abs(dy)) { // Horizontal swipe
            if (dx > 0 && currentDir !== 'LEFT') direction.current = 'RIGHT';
            else if (dx < 0 && currentDir !== 'RIGHT') direction.current = 'LEFT';
        } else { // Vertical swipe
            if (dy > 0 && currentDir !== 'UP') direction.current = 'DOWN';
            else if (dy < 0 && currentDir !== 'DOWN') direction.current = 'UP';
        }
    };
    
    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    return (
        <div className="flex flex-col items-center p-4 bg-gray-800 rounded-2xl shadow-lg w-full max-w-sm sm:max-w-md animate-fade-in">
            <div className="w-full flex justify-between items-center mb-2">
                <button onClick={navigateHome} className="p-2 rounded-full hover:bg-gray-700 transition"><ArrowLeftIcon className="w-6 h-6" /></button>
                <h2 className="text-2xl font-bold text-indigo-400">Snake</h2>
                <button onClick={resetGame} className="p-2 rounded-full hover:bg-gray-700 transition"><RefreshIcon className="w-6 h-6" /></button>
            </div>
            
            <div className="w-full flex justify-between px-2 mb-2 text-lg">
                <p>Score: <span className="font-bold text-teal-400">{score}</span></p>
                <p>High Score: <span className="font-bold text-indigo-400">{highScore}</span></p>
            </div>
            
            <div className="relative w-full max-w-[400px] aspect-square bg-gray-900 rounded-lg overflow-hidden border-2 border-gray-700">
                <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                />
                 {(isPaused || isGameOver) && (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-center backdrop-blur-sm">
                        {isGameOver ? (
                            <>
                                <h3 className="text-4xl font-bold text-red-500">Game Over</h3>
                                <p className="text-xl mt-2">Final Score: {score}</p>
                                <button onClick={resetGame} className="mt-4 bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-indigo-600 transition">Play Again</button>
                            </>
                        ) : (
                             <>
                                <h3 className="text-3xl font-bold text-white mb-2">Game Paused</h3>
                                <p className="mb-4 text-gray-300">Use Arrow Keys or Swipe to Start</p>
                                <button onClick={() => setIsPaused(false)} className="p-4 bg-teal-500 rounded-full hover:bg-teal-600 transition animate-pulse">
                                    <PlayIcon className="w-8 h-8 text-white" />
                                </button>
                             </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Snake;