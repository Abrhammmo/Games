
export type View = 'HOME' | 'TIC_TAC_TOE' | 'SNAKE' | 'TETRIS' | 'SUDOKU';

export interface TicTacToeStats {
    playerWins: number;
    aiWins: number;
    draws: number;
}

export interface SnakeStats {
    highScore: number;
}

export interface TetrisStats {
    highScore: number;
}

export interface SudokuStats {
    gamesWon: number;
    bestTime: number; // stored in seconds, 0 means no record yet
}

export interface GameData {
    ticTacToe: TicTacToeStats;
    snake: SnakeStats;
    tetris: TetrisStats;
    sudoku: SudokuStats;
}
