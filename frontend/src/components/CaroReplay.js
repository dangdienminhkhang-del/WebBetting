import React, { useState, useEffect, useRef } from 'react';
import CaroService from '../services/caroService';
import CaroBoard from '../components/CaroBoard';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { checkWin } from '../utils/caroWinDetection';
import { parseMoves, debugMoves as debugParserMoves } from '../utils/moveParser';
import '../styles/CaroReplay.css';

// ⭐ CUSTOM HOOK: Tự động scroll khi currentMove thay đổi
const useAutoScroll = (currentMove, movesRef, viewportRef) => {
  useEffect(() => {
    // Không scroll nếu chưa có nước đi
    if (currentMove === 0) return;
    
    const move = movesRef.current[currentMove - 1];
    if (!move) return;
    
    // Sử dụng requestAnimationFrame để đảm bảo DOM đã render
    const scrollFrame = requestAnimationFrame(() => {
      const cellId = `cell-${move.row}-${move.col}`;
      const cellElement = document.getElementById(cellId);
      
      if (cellElement && viewportRef.current) {
        const viewport = viewportRef.current;
        const boardRect = viewport.getBoundingClientRect();
        const cellRect = cellElement.getBoundingClientRect();
        
        // Tính toán scroll để cell vào giữa viewport
        const scrollLeft = viewport.scrollLeft + (cellRect.left - boardRect.left) - (boardRect.width / 2) + (cellRect.width / 2);
        const scrollTop = viewport.scrollTop + (cellRect.top - boardRect.top) - (boardRect.height / 2) + (cellRect.height / 2);
        
        viewport.scrollTo({
          left: Math.max(0, scrollLeft),
          top: Math.max(0, scrollTop),
          behavior: 'smooth'
        });
        
        console.log(`✨ [AUTO-SCROLL] Scrolled to move #${currentMove} at (${move.row},${move.col})`);
      }
    });
    
    return () => cancelAnimationFrame(scrollFrame);
  }, [currentMove, movesRef, viewportRef]); // Chạy lại khi currentMove thay đổi
};

const CaroReplay = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = 'replay';

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
  const [winningCells, setWinningCells] = useState([]);
  const [winner, setWinner] = useState(null); 

  const intervalRef = useRef(null);
  const movesRef = useRef([]);
  
  // Ref cho board viewport để scroll
  const boardViewportRef = useRef(null);
  
  // ⭐ SỬ DỤNG CUSTOM HOOK - TỰ ĐỘNG SCROLL KHI currentMove THAY ĐỔI
  useAutoScroll(currentMove, movesRef, boardViewportRef);

  useEffect(() => {
    fetchGameData();
    return () => clearInterval(intervalRef.current);
  }, [gameId]);

  // Hàm scroll đến nước đi (dùng cho click manual)
  const scrollToMove = (row, col) => {
    if (row === -1 || col === -1) return;
    
    const cellId = `cell-${row}-${col}`;
    const cellElement = document.getElementById(cellId);
    
    if (cellElement && boardViewportRef.current) {
      const viewport = boardViewportRef.current;
      const boardRect = viewport.getBoundingClientRect();
      const cellRect = cellElement.getBoundingClientRect();
      
      const scrollLeft = viewport.scrollLeft + (cellRect.left - boardRect.left) - (boardRect.width / 2) + (cellRect.width / 2);
      const scrollTop = viewport.scrollTop + (cellRect.top - boardRect.top) - (boardRect.height / 2) + (cellRect.height / 2);
      
      viewport.scrollTo({
        left: Math.max(0, scrollLeft),
        top: Math.max(0, scrollTop),
        behavior: 'smooth'
      });
      
      console.log(`🔍 [MANUAL SCROLL] Scrolling to move at (${row},${col})`);
    }
  };

  // Hàm xử lý khi click vào nước đi trong lịch sử
  const handleMoveClick = (index) => {
    if (index >= movesRef.current.length) return;
    
    // Dừng replay nếu đang phát
    if (isPlaying) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
    }
    
    const move = movesRef.current[index];
    
    // Tạo board mới với các nước đi đến index
    const newBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));
    
    for (let i = 0; i <= index; i++) {
      const m = movesRef.current[i];
      newBoard[m.row][m.col] = m.player;
    }
    
    setBoard(newBoard);
    setCurrentMove(index + 1); // ⭐ Hook useAutoScroll sẽ tự động chạy
    
    // Kiểm tra nếu là nước thắng
    const winCells = checkWin(newBoard, move.row, move.col, move.player);
    
    if (winCells.length === 5) {
      console.log('✅ [REPLAY] Found winning cells at move #' + (index + 1), winCells);
      setWinningCells(winCells);
      setWinner(move.player); 
      // Hiển thị kết quả
      if (gameData?.gameResult) {
        let result;
        switch(gameData.gameResult) {
          case 'WIN':
            result = '❌ X THẮNG';
            break;
          case 'LOSE':
            result = '⭕ O THẮNG';
            break;
          case 'DRAW':
            result = '🏳️ HÒA';
            break;
          default:
            result = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
        }
        setGameResult(result);
      } else {
        setGameResult(move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG');
      }
      setShowResult(true);
    } else {
      setWinningCells([]);
    }
    
  };

  const fetchGameData = async () => {
    try {
      setLoading(true);
      const data = await CaroService.getGameReplay(gameId);
      setGameData(data);
      
      console.log('🔍 [DEBUG REPLAY] Game data:', {
        gameId: data.id,
        gameResult: data.gameResult,
        movesCount: data.gameMoves ? data.gameMoves.split(';').length : 0,
        betAmount: data.betAmount
      });

      const size = data.boardSize || 50;
      setBoardSize(size);

      const emptyBoard = Array(size)
        .fill(null)
        .map(() => Array(size).fill(''));
      setBoard(emptyBoard);

      if (data.gameMoves) {
        movesRef.current = parseMoves(data.gameMoves);
        console.log('✅ [DEBUG PARSE] Parsed moves:', movesRef.current.length);
        debugParserMoves(movesRef.current, 'REPLAY PARSED MOVES');
      } else {
        movesRef.current = [];
        console.warn('⚠️ [DEBUG] No moves found in game data');
      }
      
      setCurrentMove(0);
      setWinningCells([]);
      setGameResult(null);
      setShowResult(false);
      setLoading(false);
    } catch (err) {
      console.error('❌ [DEBUG REPLAY] Error:', err);
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
    const isLastMove = index === movesRef.current.length - 1;

    setBoard(prev => {
      const newBoard = prev.map(r => [...r]);
      newBoard[move.row][move.col] = move.player;

      if (move.isWinningMove) {
        console.log(`🏆 [REPLAY MOVE #${index + 1}] Winning move: ${move.player} at (${move.row},${move.col})`);
      } else {
        console.log(`🔍 [REPLAY MOVE #${index + 1}] ${move.player} at (${move.row},${move.col})`);
      }
      
      if (move.isWinningMove || isLastMove) {
        const winCells = checkWin(newBoard, move.row, move.col, move.player);
        
        if (winCells.length === 5) {
          console.log('✅ [REPLAY] Found winning cells:', winCells);
          setWinningCells(winCells);
          setWinner(move.player);
          if (gameData?.gameResult) {
            let result;
            switch(gameData.gameResult) {
              case 'WIN':
                result = '❌ X THẮNG';
                break;
              case 'LOSE':
                result = '⭕ O THẮNG';
                break;
              case 'DRAW':
                result = '🏳️ HÒA';
                break;
              default:
                result = move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG';
            }
            setGameResult(result);
          } else {
            setGameResult(move.player === 'X' ? '❌ X THẮNG' : '⭕ O THẮNG');
          }
          setShowResult(true);
        } else if (isLastMove && gameData?.gameResult === 'DRAW') {
          setGameResult('🏳️ HÒA');
          setShowResult(true);
        }
      }

      return newBoard;
    });

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
      if (prev >= movesRef.current.length) {
        clearInterval(intervalRef.current);
        setIsPlaying(false);
        
        if (gameData?.gameResult === 'DRAW') {
          setGameResult('🏳️ HÒA');
          setShowResult(true);
        }
        return prev;
      }

      // ⭐ Gọi playMove với prev
      playMove(prev);
      
      // ⭐ Tăng prev lên 1
      return prev + 1;
    });
  }, speed);
};

  const nextMove = () => {
    if (currentMove < movesRef.current.length) {
      clearInterval(intervalRef.current);
      setIsPlaying(false);
      setShowResult(false);
      setGameResult(null);
      setWinningCells([]);
      playMove(currentMove); // ⭐ currentMove sẽ được cập nhật trong playMove
    }
  };

  const prevMove = () => {
    if (currentMove === 0) return;

    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setShowResult(false);
    setGameResult(null);
    setWinningCells([]);

    const emptyBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));

    for (let i = 0; i < currentMove - 1; i++) {
      const m = movesRef.current[i];
      emptyBoard[m.row][m.col] = m.player;
    }

    setBoard(emptyBoard);
    setCurrentMove(currentMove - 1); // ⭐ Hook useAutoScroll sẽ tự động chạy
    // ⭐ KHÔNG CẦN setTimeout Ở ĐÂY NỮA
  };

  const handleSpeedChange = (s) => {
    setSpeed(s);
    if (!isPlaying) return;

    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentMove(prev => {
        if (prev >= movesRef.current.length) {
          clearInterval(intervalRef.current);
          setIsPlaying(false);
          return prev;
        }
        playMove(prev);
        return prev + 1;
      });
    }, s);
  };

  const jumpToLatest = () => {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setShowResult(false);
    setGameResult(null);
    setWinningCells([]);
    
    const emptyBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));

    movesRef.current.forEach(m => {
      emptyBoard[m.row][m.col] = m.player;
    });

    const lastIndex = movesRef.current.length - 1;
    if (lastIndex >= 0) {
      const lastMove = movesRef.current[lastIndex];
      const winCells = checkWin(
        emptyBoard,
        lastMove.row,
        lastMove.col,
        lastMove.player
      );

      if (winCells.length === 5) {
        setWinningCells(winCells);
        setWinner(lastMove.player);
        if (gameData?.gameResult) {
          const result = gameData.gameResult === 'WIN' ? '❌ THẮNG' : 
                        gameData.gameResult === 'LOSE' ? '⭕ THẮNG' : 
                        '🏳️ HÒA';
          setGameResult(result);
        } else {
          setGameResult(lastMove.player === 'X' ? '❌ THẮNG' : '⭕ THẮNG');
        }
        setShowResult(true);
      } else if (movesRef.current.length > 0) {
        if (gameData?.gameResult === 'DRAW') {
          setGameResult('🏳️ HÒA');
          setShowResult(true);
        }
      }
    } else if (gameData?.gameResult === 'DRAW') {
      setGameResult('🏳️ HÒA');
      setShowResult(true);
    }

    setBoard(emptyBoard);
    setCurrentMove(movesRef.current.length); // ⭐ Hook useAutoScroll sẽ tự động chạy
    // ⭐ KHÔNG CẦN setTimeout Ở ĐÂY NỮA
  };

  const resetReplay = () => {
    clearInterval(intervalRef.current);
    setIsPlaying(false);
    setShowResult(false);
    setGameResult(null);
    setWinningCells([]);

    const emptyBoard = Array(boardSize)
      .fill(null)
      .map(() => Array(boardSize).fill(''));

    setBoard(emptyBoard);
    setCurrentMove(0); // ⭐ currentMove = 0 nên không scroll
  };

  const closeResultModal = () => setShowResult(false);

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

  const lastMoveObj =
    currentMove > 0
      ? {
          row: movesRef.current[currentMove - 1].row,
          col: movesRef.current[currentMove - 1].col,
          type: movesRef.current[currentMove - 1].player === 'X' ? 'player' : 'ai'
        }
      : { row: -1, col: -1, type: null };

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
              <div className={`stat-value-header ${gameData.gameResult === 'WIN' ? 'win' : 
                            gameData.gameResult === 'LOSE' ? 'lose' : 'pending'}`}>
                {gameData.gameResult === 'WIN' ? 'X THẮNG' : 
                 gameData.gameResult === 'LOSE' ? 'O THẮNG' : 
                 gameData.gameResult === 'DRAW' ? 'HÒA' : 'ĐANG CHƠI'}
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
          <CaroBoard
            board={board}
            boardSize={boardSize}
            disabled={true}
            onCellClick={() => {}}
            lastMove={lastMoveObj}
            winningCells={winningCells}
            mode="replay"
            viewportRef={boardViewportRef}
            winner={winner}
          />
        </div>
      </div>

      {/* RIGHT PANEL: MOVE HISTORY */}
      <div className="move-history-panel">
        <div className="move-history-header">
          <h3 className="move-history-title">📜 LỊCH SỬ NƯỚC ĐI</h3>
        </div>
        <div className="move-history-subheader">
          <span>Click vào nước để xem vị trí</span>
          <button 
            className="scroll-to-last-btn" 
            onClick={() => lastMoveObj.row !== -1 && scrollToMove(lastMoveObj.row, lastMoveObj.col)} 
            disabled={currentMove === 0}
          >
            🔍 Đến nước hiện tại
            {lastMoveObj.type && (
              <span style={{marginLeft: '5px', fontSize: '0.7em'}}>
                ({lastMoveObj.type === 'player' ? 'X' : 'O'})
              </span>
            )}
          </button>
        </div>
        <div className="moves-list-container">
          <div className="moves-list-header">
            <span>#</span>
            <span>Người</span>
            <span>Tọa độ</span>
          </div>
          <div className="moves-list">
            {movesRef.current.map((m, i) => (
              <div 
                key={i} 
                className={`move-item ${i === currentMove - 1 ? 'current' : ''} ${m.isWinningMove ? 'winning-move' : ''}`}
                onClick={() => handleMoveClick(i)}
                style={{ cursor: 'pointer' }}
              >
                <span className="move-number">#{i + 1}</span>
                <span className={`move-player ${m.player === 'X' ? 'x' : 'o'}`}>
                  {m.player}{m.isWinningMove ? ' 🏆' : ''}
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

      
    </div>
  );
};

export default CaroReplay;