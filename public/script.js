document.addEventListener("DOMContentLoaded", () => {
    const socket = io();
    const chessboard = document.getElementById("chessboard");
    const turnIndicator = document.getElementById("turn-indicator");
    const moveHistoryElement = document.getElementById("move-history");
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
    let playerSide = null; // 'white' or 'black' or 'spectator'
    let selectedPiece = null;

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
                square.dataset.row = row;
                square.dataset.col = col;

                if (board[row][col]) {
                    const piece = document.createElement("div");
                    piece.className = "piece";
                    piece.textContent = pieces[board[row][col]];
                    piece.draggable = true;
                    piece.dataset.row = row;
                    piece.dataset.col = col;
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
    }

    function updateMoveHistory(history) {
        moveHistoryElement.innerHTML = "";
        history.forEach((move, index) => {
            const moveElement = document.createElement("div");
            moveElement.textContent = `${index + 1}. ${move}`;
            moveHistoryElement.appendChild(moveElement);
        });
    }

    function onDragStart(event) {
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

    function onDragOver(event) {
        event.preventDefault();
    }

    function onDrop(event) {
        event.preventDefault();
        const from = JSON.parse(event.dataTransfer.getData("text/plain"));
        const to = {
            row: parseInt(event.target.dataset.row, 10),
            col: parseInt(event.target.dataset.col, 10),
        };

        socket.emit("move", { from, to });
    }

    function onPieceClick(event) {
        const row = parseInt(event.target.dataset.row, 10);
        const col = parseInt(event.target.dataset.col, 10);
        const piece = board[row][col];
        const pieceColor = piece === piece.toUpperCase() ? "white" : "black";

        if (pieceColor !== playerSide || pieceColor !== currentTurn) {
            return; // Prevent selecting if it's not this player's turn
        }

        selectedPiece = { row, col };
        highlightValidMoves(selectedPiece);
    }

    function onSquareClick(event) {
        if (!selectedPiece) return;

        const to = {
            row: parseInt(event.target.dataset.row, 10),
            col: parseInt(event.target.dataset.col, 10),
        };
        socket.emit("move", { from: selectedPiece, to });
        clearHighlights();
    }

    function highlightValidMoves(from) {
        clearHighlights();
        socket.emit("getValidMoves", from, (validMoves) => {
            validMoves.forEach((move) => {
                const square = document.querySelector(
                    `.square[data-row='${move.row}'][data-col='${move.col}']`
                );
                if (square) {
                    square.classList.add("highlight");
                }
            });
        });
    }

    function clearHighlights() {
        const highlightedSquares = document.querySelectorAll(".highlight");
        highlightedSquares.forEach((square) => {
            square.classList.remove("highlight");
        });
    }

    socket.on("move", (data) => {
        const { currentTurn: newTurn, moveHistory, newBoard } = data;
        board = newBoard;
        currentTurn = newTurn;
        turnIndicator.textContent = `Current Turn: ${currentTurn}`;
        selectedPiece = null;
        updateMoveHistory(moveHistory);
        createBoard();
    });

    socket.on("boardState", (data) => {
        board = data.board;
        currentTurn = data.currentTurn;
        updateMoveHistory(data.moveHistory);
        turnIndicator.textContent = `Current Turn: ${currentTurn}`;
        createBoard();
    });

    socket.on("assignedSide", (side) => {
        playerSide = side;
        turnIndicator.textContent = `You are playing as: ${playerSide}`;
        createBoard(); // Re-create the board to adjust piece positions
    });

    socket.on("spectator", () => {
        playerSide = "spectator";
        turnIndicator.textContent = "You are a spectator";
    });

    socket.on("gameOver", (data) => {
        const { winner } = data;
        turnIndicator.textContent = `Game over! ${winner} wins!`;
    });

    turnIndicator.textContent = `Current Turn: ${currentTurn}`;
    createBoard();
});
