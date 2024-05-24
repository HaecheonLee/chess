import {
    Board,
    PieceColor,
    IMovePiece,
    ISquare,
    Piece,
    PromotionPiece,
    BoardPiece,
} from "../types/types";

let lastMove: IMovePiece | null = null;
const movedPieces: Record<string, boolean> = {};

function validateMove(
    board: Board,
    from: ISquare,
    to: ISquare,
    promotion: PromotionPiece | null = null,
) {
    const piece = board[from.row][from.col];
    if (!piece) return false;

    const targetPiece = board[to.row][to.col];

    const pieceColor = piece === piece.toUpperCase() ? "white" : "black";
    const targetPieceColor = targetPiece
        ? targetPiece === targetPiece.toUpperCase()
            ? "white"
            : "black"
        : null;

    // Ensure the target square does not contain a piece of the same color
    if (targetPiece && pieceColor === targetPieceColor) {
        return false;
    }

    // Temporarily apply the move
    const newBoard = JSON.parse(JSON.stringify(board));
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = "";

    // Check if the move leaves the king in check
    if (
        isKingInCheck(newBoard, pieceColor) &&
        !clearsCheck(board, from, to, pieceColor)
    ) {
        return false;
    }

    // Check if the move is a valid castling move
    if (piece.toLowerCase() === "k" && Math.abs(from.col - to.col) === 2) {
        return validateCastling(board, from, to, pieceColor);
    }

    return canMove(board, from, to, promotion);
}

function validateCastling(
    board: Board,
    from: ISquare,
    to: ISquare,
    kingColor: PieceColor,
) {
    const row = from.row;
    const kingStartCol = 4;
    const rookStartCol = to.col > kingStartCol ? 7 : 0;
    const step = to.col > kingStartCol ? 1 : -1;

    if (row !== to.row) {
        return false;
    }

    if (
        movedPieces[`${kingColor}K`] ||
        movedPieces[`${kingColor}R${rookStartCol}`]
    ) {
        return false;
    }

    for (let col = kingStartCol + step; col !== to.col; col += step) {
        if (
            board[row][col] !== "" ||
            isSquareAttacked(board, { row, col }, kingColor)
        ) {
            return false;
        }
    }

    if (
        isSquareAttacked(board, { row, col: kingStartCol }, kingColor) ||
        isSquareAttacked(board, to, kingColor)
    ) {
        return false;
    }

    return true;
}

function isSquareAttacked(board: Board, square: ISquare, color: PieceColor) {
    const opponentColor = color === "white" ? "black" : "white";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (
                piece &&
                (piece === piece.toUpperCase() ? "white" : "black") ===
                    opponentColor
            ) {
                const from = {
                    row: row,
                    col: col,
                };
                if (canMove(board, from, square)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isCheckmate(board: Board, kingColor: PieceColor) {
    if (!isKingInCheck(board, kingColor)) {
        return false;
    }

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (
                piece &&
                (piece === piece.toUpperCase() ? "white" : "black") ===
                    kingColor
            ) {
                const from = { row: row, col: col };
                for (let targetRow = 0; targetRow < 8; targetRow++) {
                    for (let targetCol = 0; targetCol < 8; targetCol++) {
                        const to = { row: targetRow, col: targetCol };
                        if (validateMove(board, from, to)) {
                            const newBoard = JSON.parse(JSON.stringify(board));
                            newBoard[to.row][to.col] =
                                newBoard[from.row][from.col];
                            newBoard[from.row][from.col] = "";
                            if (!isKingInCheck(newBoard, kingColor)) {
                                return false;
                            }
                        }
                    }
                }
            }
        }
    }
    return true;
}

function isKingInCheck(board: Board, kingColor: PieceColor) {
    const kingPosition = findKing(board, kingColor);
    if (!kingPosition) return false;

    const opponentColor = kingColor === "white" ? "black" : "white";

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (
                piece &&
                (piece === piece.toUpperCase() ? "white" : "black") ===
                    opponentColor
            ) {
                const from = { row, col };
                if (canMove(board, from, kingPosition)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function findKing(board: Board, kingColor: PieceColor) {
    const king = kingColor === "white" ? "K" : "k";
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] === king) {
                return { row, col };
            }
        }
    }
    return null;
}

function validatePawnMove(
    board: Board,
    from: ISquare,
    to: ISquare,
    piece: Piece,
    targetPiece: BoardPiece,
    promotion: PromotionPiece | null,
) {
    const pieceColor = piece === piece.toUpperCase() ? "white" : "black";
    const targetPieceColor = targetPiece
        ? targetPiece === targetPiece.toUpperCase()
            ? "white"
            : "black"
        : null;

    const direction = pieceColor === "white" ? -1 : 1;
    const startRow = pieceColor === "white" ? 6 : 1;

    // Standard move
    if (
        to.row === from.row + direction &&
        to.col === from.col &&
        board[to.row][to.col] === ""
    ) {
        return true;
    }

    // Double move from starting position
    if (
        from.row === startRow &&
        to.row === from.row + 2 * direction &&
        to.col === from.col &&
        board[to.row][to.col] === "" &&
        board[from.row + direction][from.col] === ""
    ) {
        return true;
    }

    // Capture move
    if (
        to.row === from.row + direction &&
        Math.abs(to.col - from.col) === 1 &&
        targetPiece &&
        targetPieceColor !== pieceColor
    ) {
        return true;
    }

    // En passant
    if (canEnPassant(from, to, piece) && !targetPiece) {
        return true;
    }

    // Promotion
    const promotionRow = pieceColor === "white" ? 0 : 7;
    if (to.row === promotionRow && promotion) {
        return true;
    }

    return false;
}

function validateRookMove(board: Board, from: ISquare, to: ISquare) {
    if (from.row !== to.row && from.col !== to.col) return false;
    if (from.row === to.row) {
        const direction = from.col < to.col ? 1 : -1;
        for (let col = from.col + direction; col !== to.col; col += direction) {
            if (board[from.row][col]) return false;
        }
    } else {
        const direction = from.row < to.row ? 1 : -1;
        for (let row = from.row + direction; row !== to.row; row += direction) {
            if (board[row][from.col]) return false;
        }
    }
    return true;
}

function validateKnightMove(from: ISquare, to: ISquare) {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function validateBishopMove(board: Board, from: ISquare, to: ISquare) {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    if (rowDiff !== colDiff) return false;
    const rowDirection = from.row < to.row ? 1 : -1;
    const colDirection = from.col < to.col ? 1 : -1;
    for (let i = 1; i < rowDiff; i++) {
        if (board[from.row + i * rowDirection][from.col + i * colDirection])
            return false;
    }
    return true;
}

function validateQueenMove(board: Board, from: ISquare, to: ISquare) {
    return (
        validateRookMove(board, from, to) || validateBishopMove(board, from, to)
    );
}

function validateKingMove(from: ISquare, to: ISquare) {
    const rowDiff = Math.abs(from.row - to.row);
    const colDiff = Math.abs(from.col - to.col);
    return rowDiff <= 1 && colDiff <= 1;
}

function applyMove(
    board: Board,
    from: ISquare,
    to: ISquare,
    piece: Piece,
    promotion: PromotionPiece | null = null,
) {
    const pieceColor = piece === piece.toUpperCase() ? "white" : "black";
    const newBoard = board.map((row) => row.slice());

    // Handle promotion
    if (promotion) {
        newBoard[to.row][to.col] =
            pieceColor === "white"
                ? (promotion.toUpperCase() as Uppercase<PromotionPiece>)
                : (promotion.toLowerCase() as Lowercase<PromotionPiece>);
    } else {
        newBoard[to.row][to.col] = newBoard[from.row][from.col];
    }
    newBoard[from.row][from.col] = "";

    // Handle en passant capture
    if (lastMove && canEnPassant(from, to, piece)) {
        newBoard[lastMove.to.row][lastMove.to.col] = "";
    }

    lastMove = { piece, from, to };

    // Handle castling
    if (piece.toLowerCase() === "k" && Math.abs(from.col - to.col) === 2) {
        const rookCol = to.col > from.col ? 7 : 0;
        const newRookCol = to.col > from.col ? to.col - 1 : to.col + 1;
        newBoard[from.row][newRookCol] = newBoard[from.row][rookCol];
        newBoard[from.row][rookCol] = "";
    }

    // Track moved pieces
    movedPieces[`${pieceColor}${piece}`] = true;

    // Return the opponent king's position when it is in check
    const opponentColor = pieceColor === "white" ? "black" : "white";
    if (isKingInCheck(newBoard, opponentColor)) {
        return {
            newBoard,
            kingPosition: findKing(newBoard, opponentColor),
        };
    }

    return { newBoard };
}

function getValidMoves(board: Board, from: ISquare): ISquare[] {
    const validMoves: ISquare[] = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const to = { row, col };
            if (validateMove(board, from, to)) {
                validMoves.push(to);
            }
        }
    }
    return validMoves;
}

function canEnPassant(from: ISquare, to: ISquare, piece: Piece) {
    const direction = piece === piece.toUpperCase() ? -1 : 1;

    return (
        lastMove &&
        lastMove.piece.toLowerCase() === "p" &&
        lastMove.piece !== piece &&
        Math.abs(lastMove.to.row - lastMove.from.row) === 2 &&
        Math.abs(lastMove.to.col - from.col) === 1 &&
        lastMove.to.row === from.row &&
        to.row === from.row + direction &&
        to.col === lastMove.to.col
    );
}

function clearsCheck(
    board: Board,
    from: ISquare,
    to: ISquare,
    kingColor: PieceColor,
) {
    const newBoard = JSON.parse(JSON.stringify(board));
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = "";

    return !isKingInCheck(newBoard, kingColor);
}

function canMove(
    board: Board,
    from: ISquare,
    to: ISquare,
    promotion: PromotionPiece | null = null,
) {
    const piece = board[from.row][from.col];
    const targetPiece = board[to.row][to.col];

    if (piece === "") {
        return false; // Piece is not valid to move
    }

    // Validate move based on piece type
    switch (piece.toLowerCase()) {
        case "p": // Pawn
            return validatePawnMove(
                board,
                from,
                to,
                piece,
                targetPiece,
                promotion,
            );
        case "r": // Rook
            return validateRookMove(board, from, to);
        case "n": // Knight
            return validateKnightMove(from, to);
        case "b": // Bishop
            return validateBishopMove(board, from, to);
        case "q": // Queen
            return validateQueenMove(board, from, to);
        case "k": // King
            return validateKingMove(from, to);
        default:
            return false;
    }
}

export { validateMove, applyMove, getValidMoves, isCheckmate };
