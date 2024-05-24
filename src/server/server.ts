import { Board, IMoveHistory, PieceColor } from "../types/types";
import { initializeBoard, initializePieces } from "../common/initialState";

import { Server, Socket } from "socket.io";
import express from "express";
import http from "http";
import path from "path";
import {
    validateMove,
    applyMove,
    getValidMoves,
    isCheckmate,
} from "./moveValidation";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the 'client' directory
app.use(express.static(path.join(__dirname, "../client")));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../../public")));

const pieces = initializePieces();
let board: Board = initializeBoard();
let currentTurn: PieceColor = "white"; // 'white' or 'black'
let whiteSocket: Socket | null = null;
let blackSocket: Socket | null = null;
let moveHistory: IMoveHistory[] = [];
let isGameOver = false;

io.on("connection", (socket) => {
    console.log("a user connected");

    // Send the current board state, turn, and move history to the new user
    socket.emit("boardState", {
        board,
        currentTurn,
        moveHistory,
    });

    if (!whiteSocket) {
        whiteSocket = socket;
        socket.emit("assignedSide", "white");
    } else if (!blackSocket) {
        blackSocket = socket;
        socket.emit("assignedSide", "black");
    } else {
        socket.emit("spectator");
    }

    io.emit("attach", {
        white: whiteSocket == null ? null : "white",
        black: blackSocket == null ? null : "black",
    });

    socket.on("move", (data) => {
        const { from, to, promotion } = data;
        const piece = board[from.row][from.col];
        const pieceColor = piece === piece.toUpperCase() ? "white" : "black";

        if (to.row == null || to.col == null) {
            return; // Only when "to" contains valid row and col
        }

        if (
            (pieceColor === "white" && socket !== whiteSocket) ||
            (pieceColor === "black" && socket !== blackSocket)
        ) {
            return; // Only the assigned player can move their pieces
        }

        if (pieceColor !== currentTurn) {
            return; // It's not this player's turn
        }

        if (piece === "") {
            return; // Piece is not valid
        }

        if (validateMove(board, from, to, promotion)) {
            const { newBoard, kingPosition } = applyMove(
                board,
                from,
                to,
                piece,
                promotion,
            );
            board = newBoard;
            currentTurn = currentTurn === "white" ? "black" : "white"; // Switch turns
            const moveNotation = `${pieces[piece]}${String.fromCharCode(
                97 + from.col,
            )}${8 - from.row}-${String.fromCharCode(97 + to.col)}${8 - to.row}`;
            moveHistory.push({ moveNotation, from, to });

            io.emit("move", {
                currentTurn,
                moveHistory,
                from,
                to,
                kingPosition,
                newBoard: JSON.parse(JSON.stringify(board)),
            });

            if (isCheckmate(board, currentTurn)) {
                isGameOver = true;
                io.emit("gameOver", {
                    winner: currentTurn === "white" ? "black" : "white",
                });
            }
        }
    });

    socket.on("getValidMoves", (from, callback) => {
        const piece = board[from.row][from.col];
        const pieceColor = piece === piece.toUpperCase() ? "white" : "black";

        if (
            (pieceColor === "white" && socket !== whiteSocket) ||
            (pieceColor === "black" && socket !== blackSocket)
        ) {
            callback([]); // Only the assigned player can get valid moves for their pieces
            return;
        }

        if (pieceColor !== currentTurn) {
            callback([]); // It's not this player's turn
            return;
        }

        const validMoves = getValidMoves(board, from);
        callback(validMoves);
    });

    socket.on("disconnect", () => {
        console.log("user disconnected");
        if (socket === whiteSocket) {
            whiteSocket = null;
            io.emit("detach", { user: "white" });
        } else if (socket === blackSocket) {
            blackSocket = null;
            io.emit("detach", { user: "black" });
        }
    });

    socket.on("reset", () => {
        if (!isGameOver) {
            return;
        }

        board = initializeBoard();
        currentTurn = "white";
        moveHistory = [];
        isGameOver = false;

        io.emit("boardState", {
            board,
            currentTurn,
            moveHistory,
        });
    });
});

// Start the server on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
