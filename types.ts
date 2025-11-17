export type View = 'HOME' | 'TIC_TAC_TOE' | 'SNAKE' | 'TETRIS';

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

export interface GameData {
    ticTacToe: TicTacToeStats;
    snake: SnakeStats;
    tetris: TetrisStats;
}
