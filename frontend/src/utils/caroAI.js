// Utility functions
const isInBoard = (board, row, col) => {
  return row >= 0 && row < board.length && col >= 0 && col < board[0].length;
};

const isEmpty = (board, row, col) => {
  return isInBoard(board, row, col) && board[row][col] === '';
};

// Main AI function - tương ứng với C# GetMove
export const getAIMove = (board, mode) => {
  switch (mode) {
    case 'Easy':
      return strategicMove(board);
    case 'Medium':
      return superStrategicMove(board);
    case 'Hard':
      return smartBlockMove(board);
    default:
      return strategicMove(board);
  }
};

// ==================== EASY MODE ====================
// Tương ứng với StrategicMove trong C#
const strategicMove = (board) => {
  const size = board.length;
  let maxScore = -Infinity;
  let bestMove = { row: -1, col: -1 };

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] !== '') continue;

      // attack (O - AI) + defend (X - Player) - giống C#
      const score = evaluateMove(board, i, j, 'O') + evaluateMove(board, i, j, 'X');

      if (score > maxScore) {
        maxScore = score;
        bestMove = { row: i, col: j };
      }
    }
  }

  return bestMove;
};

// EvaluateMove từ C# - cho cả player và AI
const evaluateMove = (board, row, col, symbol) => {
  const directions = [
    [0, 1],   // ngang
    [1, 0],   // dọc
    [1, 1],   // chéo xuống
    [1, -1]   // chéo lên
  ];

  let score = 0;

  directions.forEach(dir => {
    let count = 1;
    let blockedStart = false;
    let blockedEnd = false;

    // Đếm xuôi - giống C#
    let r = row + dir[0];
    let c = col + dir[1];
    while (isInBoard(board, r, c)) {
      if (board[r][c] === symbol) {
        count++;
        r += dir[0];
        c += dir[1];
      } else if (board[r][c] !== '') {
        blockedEnd = true;
        break;
      } else break;
    }

    // Đếm ngược - giống C#
    r = row - dir[0];
    c = col - dir[1];
    while (isInBoard(board, r, c)) {
      if (board[r][c] === symbol) {
        count++;
        r -= dir[0];
        c -= dir[1];
      } else if (board[r][c] !== '') {
        blockedStart = true;
        break;
      } else break;
    }

    // Áp dụng chấm điểm nếu không bị chặn 2 đầu - giống C#
    if (!(blockedStart && blockedEnd)) {
      if (symbol === 'O') { // AI
        score += 
          count === 2 ? 3 :
          count === 3 ? 6 :
          count === 4 ? 12 :
          count === 5 ? 100 : 0;
      } else { // Player
        score += 
          count === 2 ? 4 :
          count === 3 ? 10 :
          count === 4 ? 20 :
          count === 5 ? 30 : 0;
      }
    }
  });

  return score;
};

// ==================== MEDIUM MODE ====================
// Tương ứng với SuperStrategicMove trong C#
const superStrategicMove = (board) => {
  const size = board.length;
  let maxScore = -Infinity;
  let bestMove = { row: -1, col: -1 };

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (board[i][j] !== '') continue;

      // Ưu tiên phòng thủ hơn (nhân 2 cho player) - giống C#
      const score = evaluateSmart(board, i, j, 'O') + evaluateSmart(board, i, j, 'X') * 2;

      if (score > maxScore) {
        maxScore = score;
        bestMove = { row: i, col: j };
      }
    }
  }

  return bestMove;
};

// EvaluateSmart từ C#
const evaluateSmart = (board, row, col, symbol) => {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  let score = 0;

  directions.forEach(dir => {
    let count = 1;
    let blockedStart = false;
    let blockedEnd = false;

    // Đếm xuôi
    let r = row + dir[0];
    let c = col + dir[1];
    while (isInBoard(board, r, c)) {
      if (board[r][c] === symbol) {
        count++;
        r += dir[0];
        c += dir[1];
      } else if (board[r][c] !== '') {
        blockedEnd = true;
        break;
      } else break;
    }

    // Đếm ngược
    r = row - dir[0];
    c = col - dir[1];
    while (isInBoard(board, r, c)) {
      if (board[r][c] === symbol) {
        count++;
        r -= dir[0];
        c -= dir[1];
      } else if (board[r][c] !== '') {
        blockedStart = true;
        break;
      } else break;
    }

    // Nếu cả hai đầu bị chặn → không tính điểm - giống C#
    if (blockedStart && blockedEnd) return;

    // Chấm điểm - giống C#
    score += 
      count === 2 ? (symbol === 'O' ? 5 : 10) :
      count === 3 ? (symbol === 'O' ? 10 : 20) :
      count === 4 ? (symbol === 'O' ? 100 : 40) :
      count === 5 ? (symbol === 'O' ? 999 : 80) : 0;

    // Thêm điểm nếu tạo được chuỗi mở 2 đầu - giống C#
    if (!blockedStart && !blockedEnd && count >= 3) {
      score += 20;
    }
  });

  return score;
};

// ==================== HARD MODE ====================
// Tương ứng với SmartBlockMove trong C#
const smartBlockMove = (board) => {
  let bestScore = -Infinity;
  let bestMove = { row: -1, col: -1 };

  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === '') {
        const scoreO = evaluateMove2(i, j, board, 'O'); // AI đánh
        const scoreX = evaluateMove2(i, j, board, 'X'); // Người chơi
        const totalScore = scoreO + scoreX * 2; // Ưu tiên chặn người chơi - giống C#

        if (totalScore > bestScore) {
          bestScore = totalScore;
          bestMove = { row: i, col: j };
        }
      }
    }
  }

  return bestMove;
};

// EvaluateMove2 từ C# - chấm điểm theo pattern
const evaluateMove2 = (row, col, board, symbol) => {
  let score = 0;
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];

  directions.forEach(dir => {
    let count = 1;
    let openEnds = 0;

    // Đếm xuôi
    let r = row + dir[0];
    let c = col + dir[1];
    while (isInBoard(board, r, c) && board[r][c] === symbol) {
      count++;
      r += dir[0];
      c += dir[1];
    }
    if (isInBoard(board, r, c) && board[r][c] === '') {
      openEnds++;
    }

    // Đếm ngược
    r = row - dir[0];
    c = col - dir[1];
    while (isInBoard(board, r, c) && board[r][c] === symbol) {
      count++;
      r -= dir[0];
      c -= dir[1];
    }
    if (isInBoard(board, r, c) && board[r][c] === '') {
      openEnds++;
    }

    // Chấm điểm theo pattern và số đầu hở - giống C#
    score += getPatternScore(count, openEnds);
  });

  return score;
};

// GetPatternScore từ C#
const getPatternScore = (count, openEnds) => {
  if (count >= 5) return 1000000; // Ăn luôn

  if (count === 4) {
    if (openEnds === 2) return 100000;   // tứ sống
    if (openEnds === 1) return 10000;    // tứ bị chặn 1 đầu
  }

  if (count === 3) {
    if (openEnds === 2) return 5000;     // tam sống
    if (openEnds === 1) return 1000;     // tam chặn 1 đầu
  }

  if (count === 2) {
    if (openEnds === 2) return 500;      // đôi mở
    if (openEnds === 1) return 100;      // đôi chặn 1 đầu
  }

  if (count === 1 && openEnds === 2) return 10;

  return 0;
};