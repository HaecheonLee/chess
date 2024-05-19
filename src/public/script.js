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
    let moveHistory = [];

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

        const latestMoveHistory = moveHistory[moveHistory.length - 1];
        if (latestMoveHistory) {
            highlightSquares(
                latestMoveHistory.from,
                latestMoveHistory.to,
                null
            );
        }
    }

    function updateMoveHistory(history) {
        moveHistoryElement.innerHTML = "";
        history.forEach(({ moveNotation }, index) => {
            const moveElement = document.createElement("div");
            moveElement.textContent = `${index + 1}. ${moveNotation}`;
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

        // Check for promotion
        const piece = board[from.row][from.col];
        const promotion = promptPromotion(piece, to.row);

        socket.emit("move", { from, to, promotion });
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
        addPointerToValidMoves(selectedPiece);
    }

    function onSquareClick(event) {
        if (!selectedPiece) return;

        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);

        const from = selectedPiece;
        const to = { row, col };

        // Check for promotion
        const piece = board[from.row][from.col];
        const promotion = promptPromotion(piece, to.row);

        socket.emit("move", { from, to, promotion });
    }

    function addPointerToValidMoves(from) {
        clearSquares();
        socket.emit("getValidMoves", from, (validMoves) => {
            validMoves.forEach((move) => {
                const square = getSquareElement(move);
                if (square) {
                    const hasPiece =
                        square.firstChild?.classList.contains("piece");
                    square.classList.add(hasPiece ? "corners" : "pointer");
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

    function highlightSquares(from, to, kingPosition) {
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

    function getSquareElement(position) {
        if (!position) {
            return null;
        }

        return document.querySelector(
            `.square[data-row='${position.row}'][data-col='${position.col}']`
        );
    }

    function promptPromotion(piece, row) {
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

    function updateStatus(user, on) {
        const statusDot = document.querySelector(`.status #${user} .dot`);

        if (!statusDot) {
            return;
        }

        if (on) {
            statusDot.classList.add("assigned");
        } else {
            statusDot.classList.remove("assigned");
        }
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
        selectedPiece = null;
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
    });

    socket.on("attach", (data) => {
        updateStatus(data.white, true);
        updateStatus(data.black, true);
    });

    socket.on("detach", (data) => {
        updateStatus(data.user, false);
    });
});
