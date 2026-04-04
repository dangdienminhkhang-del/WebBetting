import React, { useState, useEffect } from 'react';
import HistoryCard from './HistoryCard';
import CaroService from '../services/caroService';
import '../styles/History.css';

const CaroHistory = () => {
  const [caroHistory, setCaroHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCaroHistory();
  }, []);

  const fetchCaroHistory = async () => {
    try {
      const history = await CaroService.getGameHistory();
      console.log('Caro History data:', history); // DEBUG
       history.forEach((game, index) => {
      console.log(`🎮 Game ${game.id}:`, {
        id: game.id,
        moves: game.gameMoves,
        movesLength: game.gameMoves?.length,
        isNotEmpty: game.gameMoves && game.gameMoves !== '[]',
        hasReplay: game.gameMoves && game.gameMoves.length > 2 && game.gameMoves !== '[]'
      });
    });
      const formattedHistory = history.map(game => ({
        id: game.id,
        game: 'CARO',
        amount: game.betAmount,
        result: game.gameResult,
        balanceAfter: calculateBalanceAfter(game),
        createdAt: game.finishedAt,
        difficulty: game.difficulty,
        // ✅ QUAN TRỌNG: Kiểm tra moves thật, không phải "[]"
        hasReplay: game.gameMoves && 
          game.gameMoves.trim().length > 10 &&  // Ít nhất 10 ký tự
          !game.gameMoves.includes('[]') &&
          !game.gameMoves.includes('""')
      }));
      
      console.log('Formatted with replay:', formattedHistory); // DEBUG
      setCaroHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching Caro history:', error);
      setCaroHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateBalanceAfter = (game) => {
    if (game.gameResult === 'WIN') {
      return (game.betAmount || 0) * 2;
    } else if (game.gameResult === 'LOSE') {
      return -(game.betAmount || 0);
    } else {
      return 0;
    }
  };

  // ✅ Hàm xem replay
  const handleViewReplay = (gameId) => {
    window.location.href = `/caro/replay/${gameId}`;
  };

  if (loading) {
    return <div className="loading">Đang tải lịch sử Caro...</div>;
  }

  return (
    <div className="history-section">
      <h3>📜 Lịch sử chơi Caro</h3>
      
      <div className="history-list">
        {caroHistory.length === 0 ? (
          <div className="no-history">Chưa có lịch sử chơi Caro</div>
        ) : (
          caroHistory.map(bet => (
            <div key={bet.id} className="history-item-with-replay">
               <HistoryCard bet={{ ...bet, hasReplay: bet.hasReplay }} />
              
              {/* ✅ NÚT REPLAY */}
              {bet.hasReplay && (
                <button 
                  className="replay-btn"
                  onClick={() => handleViewReplay(bet.id)}
                  title="Xem lại từng nước đi"
                >
                  <span className="replay-icon">▶️</span>
                  <span className="replay-text">Xem lại</span>
                </button>
              )}
              
              {/* ✅ HIỂN THỊ NẾU KHÔNG CÓ REPLAY */}
              {!bet.hasReplay && bet.id > 90 && ( // Chỉ show cho game mới
                <div className="no-replay-note">
                  <small>Không có replay</small>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaroHistory;