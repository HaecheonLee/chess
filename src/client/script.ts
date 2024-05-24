import { io } from "socket.io-client";
import {
    BoardPiece,
    IMoveHistory,
    ISquare,
    ISquareString,
    UserRole,
} from "../types/types";
import { initializeBoard, initializePieces } from "../common/initialState";

document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const chessboard = document.getElementById("chessboard")!;
    const turnIndicator = document.getElementById("turn-indicator")!;
    const moveHistoryElement = document.getElementById("move-history")!;
    const resetButton = document.getElementById("reset-game")!;

    // Set the initial state
    const pieces = initializePieces();
    let board = initializeBoard();

    let currentTurn: UserRole = "white"; // 'white' or 'black'
    let playerSide: UserRole | null = null; // 'white' or 'black' or 'spectator'
    let selectedPieceSquare: ISquare | null = null;
    let moveHistory: IMoveHistory[] = [];

    resetButton.addEventListener("click", () => socket.emit("reset"));

    function createBoard() {
        chessboard.innerHTML = "";
        if (playerSide === "black") {
            chessboard.classList.add("black");
        } else {
            chessboard.classList.remove("black");
        }

        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const row = playerSide === "black" ? 7 - i : i;
                const col = playerSide === "black" ? 7 - j : j;
                const square = document.createElement("div");
                square.className = `square ${
                    (i + j) % 2 === 0 ? "white" : "black"
                }`;
                square.dataset.row = String(row);
                square.dataset.col = String(col);

                const pieceOnBoard = board[row][col];
                if (pieceOnBoard) {
                    const piece = document.createElement("div");
                    piece.className = "piece";
                    piece.textContent = pieces[pieceOnBoard];
                    piece.draggable = true;
                    piece.dataset.row = String(row);
                    piece.dataset.col = String(col);
                    piece.addEventListener("dragstart", onDragStart);
                    piece.addEventListener("click", onPieceClick);
                    square.appendChild(piece);
                }

                square.addEventListener("dragover", onDragOver);
                square.addEventListener("drop", onDrop);
                square.addEventListener("click", onSquareClick);
                chessboard.appendChild(square);
            }
        }

        const latestMoveHistory = moveHistory[moveHistory.length - 1];
        if (latestMoveHistory) {
            highlightSquares(
                latestMoveHistory.from,
                latestMoveHistory.to,
                null,
            );
        }
    }

    function updateMoveHistory(history: IMoveHistory[]) {
        moveHistoryElement.innerHTML = "";
        history.forEach(({ moveNotation }, index) => {
            const moveElement = document.createElement("div");
            moveElement.textContent = `${index + 1}. ${moveNotation}`;
            moveHistoryElement.appendChild(moveElement);
        });
    }

    function onDragStart(event: DragEvent) {
        if (
            !checkEventTarget(event.target) ||
            !checkDataset(event.target.dataset) ||
            event.dataTransfer == null
        ) {
            return;
        }

        const row = parseInt(event.target.dataset.row, 10);
        const col = parseInt(event.target.dataset.col, 10);
        const piece = board[row][col];
        const pieceColor = piece === piece.toUpperCase() ? "white" : "black";

        if (pieceColor !== playerSide || pieceColor !== currentTurn) {
            event.preventDefault(); // Prevent dragging if it's not this player's turn
            return;
        }

        event.dataTransfer.setData("text/plain", JSON.stringify({ row, col }));
    }

    function onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    function onDrop(event: DragEvent) {
        event.preventDefault();

        if (
            !checkEventTarget(event.target) ||
            !checkDataset(event.target.dataset) ||
            event.dataTransfer == null
        ) {
            return;
        }

        const from = JSON.parse(event.dataTransfer.getData("text/plain"));
        const to = {
            row: parseInt(event.target.dataset.row, 10),
            col: parseInt(event.target.dataset.col, 10),
        };

        // Check for promotion
        const piece = board[from.row][from.col];
        const promotion = promptPromotion(piece, to.row);

        socket.emit("move", { from, to, promotion });
    }

    function onPieceClick(event: MouseEvent) {
        if (
            !checkEventTarget(event.target) ||
            !checkDataset(event.target.dataset)
        ) {
            return;
        }

        const row = parseInt(event.target.dataset.row, 10);
        const col = parseInt(event.target.dataset.col, 10);
        const piece = board[row][col];
        const pieceColor = piece === piece.toUpperCase() ? "white" : "black";

        if (pieceColor !== playerSide || pieceColor !== currentTurn) {
            return; // Prevent selecting if it's not this player's turn
        }

        selectedPieceSquare = { row, col };
        addPointerToValidMoves(selectedPieceSquare);
    }

    function onSquareClick(event: MouseEvent) {
        if (
            !checkEventTarget(event.target) ||
            !checkDataset(event.target.dataset) ||
            !selectedPieceSquare
        ) {
            return;
        }

        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);

        const from = selectedPieceSquare;
        const to = { row, col };

        // Check for promotion
        const piece = board[from.row][from.col];
        const promotion = promptPromotion(piece, to.row);

        socket.emit("move", { from, to, promotion });
    }

    function addPointerToValidMoves(from: ISquare) {
        clearSquares();
        socket.emit("getValidMoves", from, (validMoves: ISquare[]) => {
            validMoves.forEach((move) => {
                const square = getSquareElement(move);
                if (square) {
                    square.classList.add(
                        square.hasChildNodes() ? "corners" : "pointer",
                    );
                }
            });
        });
    }

    function clearSquares() {
        const squares = document.querySelectorAll(".pointer, .corners");
        squares.forEach((square) => {
            square.classList.remove("pointer", "corners");
        });
    }

    function highlightSquares(
        from: ISquare,
        to: ISquare,
        kingPosition: ISquare | null,
    ) {
        const squares = [
            {
                square: getSquareElement(from),
                className: "highlight",
            },
            {
                square: getSquareElement(to),
                className: "highlight",
            },
            {
                square: getSquareElement(kingPosition),
                className: "checked",
            },
        ];

        squares.forEach(({ square, className }) => {
            if (square) {
                square.classList.add(className);
            }
        });
    }

    function getSquareElement(position: ISquare | null) {
        if (!position) {
            return null;
        }

        return document.querySelector(
            `.square[data-row='${position.row}'][data-col='${position.col}']`,
        );
    }

    function promptPromotion(piece: BoardPiece, row: number) {
        const promotion =
            (piece === "P" && row === 0) || (piece === "p" && row === 7)
                ? prompt("Promote to (q/r/b/n):", "q")
                : undefined;

        if (promotion === undefined) {
            return null;
        }

        const newPiece = promotion === null ? "q" : promotion;

        return piece === piece.toUpperCase()
            ? newPiece.toUpperCase()
            : newPiece.toLowerCase();
    }

    function updateStatus(user: UserRole, isAssigned: boolean) {
        const statusDot = document.querySelector(`.status #${user} .dot`);

        if (!statusDot) {
            return;
        }

        if (isAssigned) {
            statusDot.classList.add("assigned");
        } else {
            statusDot.classList.remove("assigned");
        }
    }

    /**
     * Checks if the given event target is an HTML element.
     * @param {EventTarget | null} target - The event target to check.
     * @returns {target is HTMLElement} - Returns true if the target is an HTMLElement, otherwise false.
     */
    function checkEventTarget(
        target: EventTarget | null,
    ): target is HTMLElement {
        return target instanceof HTMLElement;
    }

    /**
     * Checks if the given dataset contains the properties of ISquareString.
     * @param {DOMStringMap} dataset - The dataset to check.
     * @returns {dataset is DOMStringMap & ISquareString} - Returns true if the dataset contains the properties of ISquareString, otherwise false.
     */
    function checkDataset(
        dataset: DOMStringMap,
    ): dataset is DOMStringMap & ISquareString {
        return (
            Object.prototype.hasOwnProperty.call(dataset, "row") &&
            Object.prototype.hasOwnProperty.call(dataset, "col")
        );
    }

    socket.on("move", (data) => {
        const {
            currentTurn: newTurn,
            moveHistory: history,
            from,
            to,
            kingPosition,
            newBoard,
        } = data;
        board = newBoard;
        currentTurn = newTurn;
        moveHistory = history;
        turnIndicator.textContent = `Current Turn: ${currentTurn}`;
        selectedPieceSquare = null;
        updateMoveHistory(moveHistory);
        createBoard();
        highlightSquares(from, to, kingPosition);
    });

    socket.on("boardState", (data) => {
        board = data.board;
        currentTurn = data.currentTurn;
        moveHistory = data.moveHistory;
        updateMoveHistory(moveHistory);
        turnIndicator.textContent = `Current Turn: ${currentTurn}`;
        createBoard();
        updateStatus(data.white, true);
        updateStatus(data.black, true);
        resetButton.hidden = true;
    });

    socket.on("assignedSide", (side) => {
        playerSide = side;
        createBoard(); // Re-create the board to adjust piece positions
    });

    socket.on("spectator", () => {
        playerSide = "spectator";
        turnIndicator.textContent = "You are a spectator";
    });

    socket.on("gameOver", (data) => {
        const { winner } = data;
        turnIndicator.textContent = `Game over! ${winner} wins!`;
        resetButton.hidden = false;
    });

    socket.on("attach", (data) => {
        updateStatus(data.white, true);
        updateStatus(data.black, true);
    });

    socket.on("detach", (data) => {
        updateStatus(data.user, false);
    });
});
