export const checkWin = (board, row, col, player) => {
  // Kiểm tra đầu vào
  if (!board || row < 0 || col < 0 || row >= board.length || col >= board[0].length) {
    console.log('❌ [checkWin] Invalid input');
    return [];
  }
  
  if (board[row][col] !== player) {
    console.log(`❌ [checkWin] Board[${row}][${col}] = "${board[row][col]}" but checking for "${player}"`);
    return [];
  }
  
  const directions = [
    [0, 1],   // ngang
    [1, 0],   // dọc
    [1, 1],   // chéo xuống
    [1, -1]   // chéo lên
  ];
  
  let winningCells = [];
  
  for (const [dx, dy] of directions) {
    let cells = [];
    
    // Tìm tất cả ô liên tiếp cùng player theo hướng này
    for (let i = -4; i <= 4; i++) {
      const newRow = row + dx * i;
      const newCol = col + dy * i;
      
      // Kiểm tra trong biên
      if (newRow >= 0 && newRow < board.length && 
          newCol >= 0 && newCol < board[0].length && 
          board[newRow][newCol] === player) {
        cells.push({ row: newRow, col: newCol });
      } else {
        // Nếu gặp ô không phải player hoặc ngoài biên, reset nếu đã có ít hơn 5
        if (cells.length < 5) {
          cells = [];
        } else {
          break; // Đã tìm thấy 5+ ô liên tiếp
        }
      }
    }
    
    // Kiểm tra xem có ít nhất 5 ô liên tiếp không
    if (cells.length >= 5) {
      // Lấy chính xác 5 ô
      winningCells = cells.slice(0, 5);
      console.log(`✅ [checkWin] Found winning cells for ${player} at (${row},${col})`);
      console.log(`   Direction: [${dx},${dy}], Cells:`, winningCells);
      break;
    }
  }
  
  if (winningCells.length === 0) {
    console.log(`❌ [checkWin] No win found for ${player} at (${row},${col})`);
  }
  
  return winningCells;
};
export const checkDraw = (board) => {
  // Kiểm tra xem board còn ô trống không
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === '') {
        return false; // Còn ô trống, chưa hòa
      }
    }
  }
  return true; // Không còn ô trống, hòa
};

// HÀM HAS WIN - THÊM LẠI VÀO
export const hasWin = (board, row, col, player) => {
  const result = checkWin(board, row, col, player).length === 5;
  console.log('🎯 [DEBUG hasWin]', {row, col, player, result});
  return result;
};