// Define piece types for white and black
export type WhitePiece = "R" | "N" | "B" | "Q" | "K" | "P";
export type BlackPiece = "r" | "n" | "b" | "q" | "k" | "p";

// Combine into a single Piece type
export type Piece = WhitePiece | BlackPiece;

// Define board piece type, including empty squares
export type BoardPiece = Piece | "";

// Define the board type as a 2D array of board pieces
export type Board = BoardPiece[][];

// Define promotion piece types, excluding kings and pawns
export type PromotionPiece = Exclude<Piece, "K" | "k" | "P" | "p">;

// Define player roles
export type PieceColor = "white" | "black";
export type UserRole = PieceColor | "spectator";

// Define interfaces for square and move types
export interface ISquare {
    row: number;
    col: number;
}

export interface ISquareString {
    row: string;
    col: string;
}

export interface IMove {
    from: ISquare;
    to: ISquare;
}

export interface IMoveHistory extends IMove {
    moveNotation: string;
}

export interface IMovePiece extends IMove {
    piece: Piece;
}
