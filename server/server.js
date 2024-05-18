const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const {
    validateMove,
    applyMove,
    getValidMoves,
    isCheckmate,
} = require("./moveValidation");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "../public")));

const pieces = {
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
let board = [
    ["r", "n", "b", "q", "k", "b", "n", "r"],
    ["p", "p", "p", "p", "p", "p", "p", "p"],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", ""],
    ["P", "P", "P", "P", "P", "P", "P", "P"],
    ["R", "N", "B", "Q", "K", "B", "N", "R"],
];
let currentTurn = "white"; // 'white' or 'black'
let whiteSocket = null;
let blackSocket = null;
let moveHistory = [];

io.on("connection", (socket) => {
    console.log("a user connected");

    // Send the current board state, turn, and move history to the new user
    socket.emit("boardState", { board, currentTurn, moveHistory });

    if (!whiteSocket) {
        whiteSocket = socket;
        socket.emit("assignedSide", "white");
    } else if (!blackSocket) {
        blackSocket = socket;
        socket.emit("assignedSide", "black");
    } else {
        socket.emit("spectator");
    }

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

        if (validateMove(board, from, to, promotion)) {
            const { newBoard, kingPosition } = applyMove(
                board,
                from,
                to,
                piece,
                promotion
            );
            board = newBoard;
            currentTurn = currentTurn === "white" ? "black" : "white"; // Switch turns
            const moveNotation = `${pieces[piece]}${String.fromCharCode(
                97 + from.col
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
        } else if (socket === blackSocket) {
            blackSocket = null;
        }
    });
});

// Start the server on port 3003
const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
