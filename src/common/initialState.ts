import { Board, Piece } from "../types/types";

/**
 * Initializes the chess board to the standard starting position.
 * @returns {Board} The initial state of the chess board, represented as a 2D array of BoardPieces.
 */
export function initializeBoard(): Board {
    return [
        ["r", "n", "b", "q", "k", "b", "n", "r"],
        ["p", "p", "p", "p", "p", "p", "p", "p"],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", ""],
        ["P", "P", "P", "P", "P", "P", "P", "P"],
        ["R", "N", "B", "Q", "K", "B", "N", "R"],
    ];
}

/**
 * Initializes the mapping of chess piece characters to their unicode symbols by Piece.
 * @returns {Pieces} An object mapping chess piece characters to their unicode symbols by Piece.
 */
export function initializePieces(): Record<Piece, string> {
    return {
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
        p: "♟",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
        P: "♙",
    };
}
