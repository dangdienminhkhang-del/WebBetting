/**
 * Parser cho move string trong Caro game
 */

/**
 * Parse move string từ server
 * Format: "row,col,player;row,col,player;..."
 */
export const parseMoves = (moveString) => {
  if (!moveString || moveString.trim() === '') {
    return [];
  }
  
  const moves = moveString.split(';').map((moveStr, index) => {
    const parts = moveStr.split(',');
    
    // Định dạng mới: "row,col,player,win" hoặc "row,col,player"
    if (parts.length >= 3) {
      const row = parseInt(parts[0], 10);
      const col = parseInt(parts[1], 10);
      const player = parts[2]; // 'X' hoặc 'O'
      const isWinningMove = parts[3] === 'win' || parts[3] === 'true';
      
      // Validate
      if (isNaN(row) || isNaN(col) || !['X', 'O'].includes(player)) {
        console.warn(`⚠️ Invalid move format at index ${index}: ${moveStr}`);
        return null;
      }
      
      return {
        row,
        col,
        player,
        isWinningMove,
        moveNumber: index + 1
      };
    } 
    // Định dạng cũ: "row,col"
    else if (parts.length === 2) {
      const row = parseInt(parts[0], 10);
      const col = parseInt(parts[1], 10);
      
      if (isNaN(row) || isNaN(col)) {
        console.warn(`⚠️ Invalid move format at index ${index}: ${moveStr}`);
        return null;
      }
      
      // Player X luôn đi trước
      const player = index % 2 === 0 ? 'X' : 'O';
      
      return {
        row,
        col,
        player,
        isWinningMove: false,
        moveNumber: index + 1
      };
    }
    
    console.warn(`⚠️ Unknown move format at index ${index}: ${moveStr}`);
    return null;
  });
  
  return moves.filter(move => move !== null);
};

/**
 * Serialize moves thành string để lưu
 */
export const serializeMoves = (moves) => {
  return moves.map(move => 
    `${move.row},${move.col},${move.player}${move.isWinningMove ? ',win' : ''}`
  ).join(';');
};

/**
 * Debug moves
 */
export const debugMoves = (moves, title = 'Moves Debug') => {
  console.log(`🔍 [${title}] ====================`);
  console.log(`Total moves: ${moves.length}`);
  
  const xCount = moves.filter(m => m.player === 'X').length;
  const oCount = moves.filter(m => m.player === 'O').length;
  console.log(`X: ${xCount}, O: ${oCount}`);
  
  const winningMoves = moves.filter(m => m.isWinningMove);
  console.log(`Winning moves: ${winningMoves.length}`);
  
  if (moves.length > 0) {
    console.log('First 3 moves:');
    moves.slice(0, 3).forEach((m, i) => {
      console.log(`  ${i+1}. ${m.player} at (${m.row},${m.col}) ${m.isWinningMove ? '🏆' : ''}`);
    });
    
    if (moves.length > 3) {
      console.log('Last 3 moves:');
      moves.slice(-3).forEach((m, i) => {
        const idx = moves.length - 3 + i + 1;
        console.log(`  ${idx}. ${m.player} at (${m.row},${m.col}) ${m.isWinningMove ? '🏆' : ''}`);
      });
    }
  }
  
  console.log('====================================');
  return moves;
};