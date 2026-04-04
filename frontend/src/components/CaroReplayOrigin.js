import React, { useState, useEffect, useRef } from 'react';
import CaroService from '../services/caroService';
import CaroBoard from '../components/CaroBoard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { checkWin, hasWin, checkDraw } from '../utils/caroWinDetection';

import '../styles/CaroReplay.css';

const CaroReplay = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const [gameData, setGameData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [board, setBoard] = useState([]);
  const [currentMove, setCurrentMove] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500);
  const [boardSize, setBoardSize] = useState(50);
  const [gameResult, setGameResult] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [winningCells, setWinningCells] = useState([]); // Thêm để lưu các ô chiến thắng

  const intervalRef = useRef(null);
  const movesRef = useRef([]);
  const location = useLocation();

  useEffect(() => {
    fetchGameData();
    return () => clearInterval(intervalRef.current);
  }, [gameId]);


  const fetchGameData = async () => {
  try {
    setLoading(true);
    const data = await CaroService.getGameReplay(gameId);
    setGameData(data);

    const size = data.boardSize || 50;
    setBoardSize(size);

    const emptyBoard = Array(size)
      .fill(null)
      .map(() => Array(size).fill(''));
    setBoard(emptyBoard);

    if (data.gameMoves) {
      const moves = data.gameMoves.split(';').map((m, index) => {
        const [row, col] = m.split(',').map(Number);
        return {
          row,
          col,
          player: index % 2 === 0 ? 'X' : 'O',
        };
      });
      movesRef.current = moves;
      
      // Sử dụng kết quả từ server
      if (data.gameResult) {
        const result = data.gameResult === 'WIN' ? '❌ X THẮNG' : 
                      data.gameResult === 'LOSE' ? '⭕ O THẮNG' : 
                      '🏳️ HÒA';
        setGameResult(result);
        
        // Tìm winning cells nếu có chiến thắng
        if (data.gameResult !== 'DRAW') {
          setTimeout(() => {
            const { winningCells } = findWinningMove();
            if (winningCells.length === 5) {
              setWinningCells(winningCells);
            }
          }, 100);
        }
      }
    } else {
      movesRef.current = [];
    }

    setCurrentMove(0);
    setLoading(false);
  } catch (err) {
    console.error(err);
    setError('Không thể tải replay.');
    setLoading(false);
  }
};

    const playMove = (index) => {
  if (index >= movesRef.current.length) {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    return;
  }

  const move = movesRef.current[index];
  setBoard((prev) => {
    const newBoard = prev.map((row) => [...row]);
    newBoard[move.row][move.col] = move.player;
    
    // Sửa: Gọi checkWin để lấy winning cells
    const winCells = checkWin(newBoard, move.row, move.col, move.player);
    
    // Nếu có 5 ô chiến thắng
    if (winCells.length === 5) {
      setWinningCells(winCells);
      
      // Nếu đây là nước CUỐI CÙNG
      if (index === movesRef.current.length - 1) {
        const winner = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
        setGameResult(winner);
        setShowResult(true);
        
        clearInterval(intervalRef.current);
        setIsPlaying(false);
      }
    }
    
    return newBoard;
  });

  setCurrentMove(index + 1);
};

 const startReplay = () => {
  if (isPlaying) {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    return;
  }

  if (currentMove >= movesRef.current.length) {
    resetReplay();
  }

  setIsPlaying(true);
  
  intervalRef.current = setInterval(() => {
    setCurrentMove(prev => {
      const nextMoveIndex = prev;
      if (nextMoveIndex >= movesRef.current.length) {
        clearInterval(intervalRef.current);
        setIsPlaying(false);
        
        // Khi kết thúc replay
        if (gameData?.gameResult && gameData.gameResult !== 'DRAW') {
          const winner = gameData.gameResult === 'WIN' ? '❌ X THẮNG' : '⭕ O THẮNG';
          setGameResult(winner);
          setShowResult(true);
          
          // Tìm winning cells
          const finalBoard = Array(boardSize)
            .fill(null)
            .map(() => Array(boardSize).fill(''));
          
          for (let i = 0; i < movesRef.current.length; i++) {
            const move = movesRef.current[i];
            finalBoard[move.row][move.col] = move.player;
            
            // Kiểm tra ở nước cuối cùng
            if (i === movesRef.current.length - 1) {
              const winCells = checkWin(finalBoard, move.row, move.col, move.player);
              if (winCells.length === 5) {
                setWinningCells(winCells);
                break;
              }
            }
          }
        }
        
        return prev;
      }
      
      const move = movesRef.current[nextMoveIndex];
      setBoard(prevBoard => {
        const newBoard = prevBoard.map((row) => [...row]);
        newBoard[move.row][move.col] = move.player;
        
        // Kiểm tra chiến thắng
        const winCells = checkWin(newBoard, move.row, move.col, move.player);
        
        // Nếu có 5 ô chiến thắng VÀ đây là nước cuối cùng
        if (winCells.length === 5 && nextMoveIndex === movesRef.current.length - 1) {
          setWinningCells(winCells);
          const winner = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
          setGameResult(winner);
          setShowResult(true);
          
          clearInterval(intervalRef.current);
          setIsPlaying(false);
        }
        
        return newBoard;
      });
      
      return nextMoveIndex + 1;
    });
  }, speed);
};

  const resetReplay = () => {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setGameResult(null);
    setShowResult(false);
    setWinningCells([]);

    const emptyBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));

    setBoard(emptyBoard);
    setCurrentMove(0);
  };

  const nextMove = () => {
    if (currentMove < movesRef.current.length) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      if (showResult) {
        setShowResult(false);
        setGameResult(null);
        setWinningCells([]);
      }
      playMove(currentMove);
    }
  };

  const prevMove = () => {
    if (currentMove === 0) return;

    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setGameResult(null);
    setShowResult(false);
    setWinningCells([]);

    const emptyBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));

    for (let i = 0; i < currentMove - 1; i++) {
      const move = movesRef.current[i];
      emptyBoard[move.row][move.col] = move.player;
    }

    setBoard(emptyBoard);
    setCurrentMove(currentMove - 1);
  };

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (isPlaying) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setCurrentMove(prev => {
          const nextMoveIndex = prev;
          if (nextMoveIndex >= movesRef.current.length) {
            clearInterval(intervalRef.current);
            setIsPlaying(false);
            return prev;
          }
          
          const move = movesRef.current[nextMoveIndex];
          setBoard(prevBoard => {
            const newBoard = prevBoard.map((row) => [...row]);
            newBoard[move.row][move.col] = move.player;
            
            // Sửa: Gọi checkWin để lấy winning cells
            const winCells = checkWin(newBoard, move.row, move.col, move.player);
            
            if (winCells.length === 5 && nextMoveIndex === movesRef.current.length - 1) {
              const winner = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
              setGameResult(winner);
              setShowResult(true);
              setWinningCells(winCells);
              
              clearInterval(intervalRef.current);
              setIsPlaying(false);
            }
            
            return newBoard;
          });
          
          return nextMoveIndex + 1;
        });
      }, s);
    }
  };

  const jumpToLatest = () => {
  clearInterval(intervalRef.current);
  setIsPlaying(false);
  
  const emptyBoard = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(''));
  
  // Chơi tất cả các nước
  for (let i = 0; i < movesRef.current.length; i++) {
    const move = movesRef.current[i];
    emptyBoard[move.row][move.col] = move.player;
    
    // QUAN TRỌNG: Chỉ kiểm tra winning cells ở nước CUỐI CÙNG
    if (i === movesRef.current.length - 1) {
      const winCells = checkWin(emptyBoard, move.row, move.col, move.player);
      if (winCells.length === 5) {
        setWinningCells(winCells);
        
        // Sử dụng kết quả từ server nếu có
        if (gameData?.gameResult) {
          const result = gameData.gameResult === 'WIN' ? '❌ X THẮNG' : 
                        gameData.gameResult === 'LOSE' ? '⭕ O THẮNG' : 
                        '🏳️ HÒA';
          setGameResult(result);
          if (gameData.gameResult !== 'DRAW') {
            setShowResult(true);
          }
        } else {
          const winner = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
          setGameResult(winner);
          setShowResult(true);
        }
      } else if (movesRef.current.length > 0) {
        // Nếu không có chiến thắng, hiển thị hòa
        setGameResult('🏳️ HÒA');
        setShowResult(true);
      }
    }
  }
  
  setBoard(emptyBoard);
  setCurrentMove(movesRef.current.length);
};
// Thêm hàm này để tìm nước thắng
const findWinningMove = () => {
  const emptyBoard = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(''));
  
  let winningMoveIndex = -1;
  let winningCells = [];
  
  // Tìm nước nào tạo thành 5 con liên tiếp
  for (let i = 0; i < movesRef.current.length; i++) {
    const move = movesRef.current[i];
    emptyBoard[move.row][move.col] = move.player;
    
    // Sửa: Gọi checkWin để lấy winning cells
    const winCells = checkWin(emptyBoard, move.row, move.col, move.player);
    if (winCells.length === 5) {
      winningMoveIndex = i;
      winningCells = winCells;
      break;
    }
  }
  
  return { winningMoveIndex, winningCells };
};

const highlightWinningMove = () => {
  const { winningMoveIndex, winningCells } = findWinningMove();
  if (winningMoveIndex !== -1) {
    console.log(`Nước thắng là #${winningMoveIndex + 1} tại (${movesRef.current[winningMoveIndex].row + 1}, ${movesRef.current[winningMoveIndex].col + 1})`);
    setWinningCells(winningCells);
  }
};

// Thêm hàm này
const checkAndShowWin = () => {
  if (movesRef.current.length > 0) {
    const { winningCells } = findWinningMove();
    if (winningCells.length === 5) {
      setWinningCells(winningCells);
      
      // Xác định người thắng từ nước cuối cùng
      const lastMove = movesRef.current[movesRef.current.length - 1];
      const winner = lastMove.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
      setGameResult(winner);
      
      return true;
    }
  }
  return false;
};

// Gọi trong các hàm khi cần
const onReplayComplete = () => {
  const hasWin = checkAndShowWin();
  if (hasWin) {
    setShowResult(true);
  }
};
// Gọi trong fetchGameData sau khi có moves
if (movesRef.current.length > 0) {
  setTimeout(highlightWinningMove, 500);
}
  const closeResultModal = () => {
    setShowResult(false);
  };

  if (loading) {
    return (
      <div className="casino-body replay-page">
        <div className="casino-box text-center" style={{ 
          minHeight: '200px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gridColumn: '1 / -1'
        }}>
          <div>
            <div className="spinner" style={{ fontSize: '3rem', marginBottom: '20px' }}>⌛</div>
            <p className="glow-text">Đang tải replay...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="casino-body replay-page">
        <div className="casino-box" style={{ gridColumn: '1 / -1' }}>
          <div className="error-message">
            <p>{error}</p>
            <button className="btn-casino mt-10" onClick={() => navigate('/history')}>
              ← Quay lại lịch sử
            </button>
          </div>
        </div>
      </div>
    );
  }

  const lastMove =
    currentMove > 0
      ? {
          row: movesRef.current[currentMove - 1].row,
          col: movesRef.current[currentMove - 1].col,
          type: movesRef.current[currentMove - 1].player === 'X' ? 'player' : 'ai',
        }
      : { row: -1, col: -1 };

  return (
    <div className="casino-body replay-page">
      {/* HEADER */}
      <div className="replay-header">
        <h1 className="replay-title glow-text">
          🎬 Replay #{gameId}
        </h1>
        
        {gameData && (
          <div className="game-stats-header">
            <div className="stat-card-header">
              <div className="stat-label-header">KẾT QUẢ</div>
              <div className={`stat-value-header ${gameData.gameResult?.includes('Win') ? 'win' : 
                            gameData.gameResult?.includes('Lose') ? 'lose' : 'pending'}`}>
                {gameData.gameResult || 'Chưa xác định'}
              </div>
            </div>
            <div className="stat-card-header">
              <div className="stat-label-header">CƯỢC</div>
              <div className="stat-value-header gold">{gameData.betAmount || 0}</div>
            </div>
            <div className="stat-card-header">
              <div className="stat-label-header">TỔNG NƯỚC</div>
              <div className="stat-value-header">{movesRef.current.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* LEFT PANEL: CONTROLS */}
      <div className="controls-panel">
        <div className="control-section">
          <div className="control-section-title">ĐIỀU KHIỂN</div>
          <div className="playback-controls">
            <button 
              className="playback-btn" 
              onClick={prevMove}
              disabled={currentMove === 0}
              title="Nước trước"
            >
              ⏪
            </button>
            <button 
              className={`playback-btn play-pause ${isPlaying ? 'playing' : ''}`}
              onClick={startReplay}
              title={isPlaying ? 'Dừng' : 'Phát'}
            > 
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <button 
              className="playback-btn" 
              onClick={nextMove}
              disabled={currentMove >= movesRef.current.length}
              title="Nước sau"
            >
              ⏩
            </button>
            <button 
              className="playback-btn" 
              onClick={resetReplay}
              title="Về đầu"
            >
              🔄
            </button>
          </div>
        </div>

        <div className="control-section">
          <div className="control-section-title">TỐC ĐỘ</div>
          <div className="speed-controls-grid">
            {[
              { label: '🐢', value: 1500, title: 'Rất chậm' },
              { label: '🚶', value: 1000, title: 'Chậm' },
              { label: '🚗', value: 500, title: 'Bình thường' },
              { label: '🚀', value: 200, title: 'Nhanh' },
              { label: '⚡', value: 100, title: 'Rất nhanh' }
            ].map((item) => (
              <button
                key={item.value}
                className={`speed-btn ${speed === item.value ? 'active' : ''}`}
                onClick={() => handleSpeedChange(item.value)}
                title={item.title}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-section progress-section">
          <div className="control-section-title">TIẾN TRÌNH</div>
          <div className="progress-info">
            <span>Nước: {currentMove}/{movesRef.current.length}</span>
            <span>{Math.round((currentMove / movesRef.current.length) * 100) || 0}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${(currentMove / movesRef.current.length) * 100 || 0}%` }}
            ></div>
          </div>
          
          
          <div className="current-move-display">
            {winningCells.length === 5 ? (
              <div className="result-display">
                <span className="result-icon">
                  {gameResult?.includes('X') ? '❌' : '⭕'}
                </span>
                <span className="result-text">
                  {gameResult || 'Chiến thắng!'}
                </span>
                <span className="winning-move-info" style={{fontSize: '0.8rem', marginLeft: '10px'}}>
                  (Nước #{currentMove} tạo thành 5 con liên tiếp)
                </span>
              </div>
            ) : currentMove > 0 ? `Đang xem nước #${currentMove}` : 'Sẵn sàng xem replay'}
          </div>

          <div className="nav-buttons">
            <button className="nav-btn" onClick={() => navigate('/history', { state: location.state })}>
              📜 Về lịch sử
            </button>
            <button className="nav-btn" onClick={jumpToLatest}>
              ⚡ Đến nước cuối cùng
            </button>
          </div>
        </div>
      </div>

      {/* CENTER PANEL: BOARD */}
      <div className="board-center-panel">
        <div className="board-container-main">
          <div className="board-wrapper">
            <CaroBoard
              board={board}
              boardSize={boardSize}
              disabled={true}
              onCellClick={() => {}}
              lastMove={lastMove}
              winningCells={winningCells} // Truyền winningCells vào board
              mode="replay"
            />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: MOVE HISTORY */}
      <div className="move-history-panel">
        <div className="move-history-header">
          <h3 className="move-history-title">📜 LỊCH SỬ NƯỚC ĐI</h3>
        </div>
        <div className="moves-list-container">
          <div className="moves-list-header">
            <span>#</span>
            <span>Người</span>
            <span>Tọa độ</span>
          </div>
          <div className="moves-list">
            {movesRef.current.slice(0, currentMove).map((m, i) => (
              <div key={i} className={`move-item ${i === currentMove - 1 ? 'current' : ''}`}>
                <span className="move-number">#{i + 1}</span>
                <span className={`move-player ${m.player === 'X' ? 'x' : 'o'}`}>
                  {m.player}
                </span>
                <span className="move-coords">({m.row + 1}, {m.col + 1})</span>
              </div>
            ))}
            {movesRef.current.length === 0 && (
              <div className="no-moves-message">Không có nước đi nào</div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <button
        className="back-to-history-btn"
        onClick={() => navigate('/history', { state: location.state })}
      >
        ← Quay lại lịch sử
      </button>

      {/* MODAL HIỂN THỊ KẾT QUẢ */}
      {showResult && gameResult && (
        <div className="result-modal-overlay">
          <div className="result-modal">
            <div className="result-modal-header">
              <h2>🎉 KẾT QUẢ VÁN ĐẤU 🎉</h2>
              <button className="close-modal-btn" onClick={closeResultModal}>✕</button>
            </div>
            <div className="result-modal-body">
              <div className="result-icon-large">
                {gameResult.includes('X') ? '❌' : 
                 gameResult.includes('O') ? '⭕' : '🤝'}
              </div>
              <h3 className="result-text-large">{gameResult}</h3>
              <p className="result-detail">
                {winningCells.length >= 5 ? 
                  `Với 5 nước liên tiếp tại vị trí: ${winningCells.slice(0, 3).map(cell => `(${cell.row+1},${cell.col+1})`).join(', ')}...` :
                  `Sau ${currentMove} nước đi`}
              </p>
              <div className="result-actions">
                <button className="result-btn replay-btn" onClick={resetReplay}>
                  🔄 Xem lại từ đầu
                </button>
                <button className="result-btn history-btn" onClick={() => navigate('/history', { state: location.state })}>
                  📜 Về lịch sử
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaroReplay;