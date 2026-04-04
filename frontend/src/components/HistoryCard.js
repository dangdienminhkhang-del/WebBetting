import React from 'react';
import '../styles/History.css';

const HistoryCard = ({ bet, onReplay, highlight }) => {
  const getGameIcon = (game) => {
    switch (game) {
      case 'TAIXIU': return '🎲';
      case 'CARO':
      case 'Caro': return '⭕';
      case 'CHESS': return '♟️';
      case 'LOTTERY': return '🎯';
      default: return '🎮';
    }
  };

  const getStatusColor = (result) => {
    switch (result) {
      case 'WIN': return 'win';
      case 'LOSE': return 'lose';
      case 'DRAW': return 'pending';
      case 'PENDING': return 'pending';
      default: return '';
    }
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return 'N/A';
    return new Date(dateTime).toLocaleString('vi-VN');
  };

  const getGameName = (game) => {
    switch (game) {
      case 'TAIXIU': return 'Tài Xỉu';
      case 'CARO':
      case 'Caro': return 'Caro';
      case 'CHESS': return 'Cờ Vua';
      case 'LOTTERY': return 'Xổ Số';
      default: return game;
    }
  };

  const getBetAmount = () => bet.amount || bet.betAmount || 0;
  const getBalanceAfter = () => bet.balanceAfter || 0;

  return (
    <div
      className={`history-card ${getStatusColor(bet.result)} ${
        highlight ? 'highlight' : ''
      }`}
    >
      <div className="history-header">
        <span className="game-icon">{getGameIcon(bet.game)}</span>

        <div className="game-info">
          <span className="game-name">{getGameName(bet.game)}</span>
          <span className="game-time">{formatDateTime(bet.createdAt)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {bet.hasReplay && (
            <button
              className="replay-btn"
              onClick={(e) => {
                e.stopPropagation();
                window.location.href = `/caro/replay/${bet.originalId}`;
              }}
              title="Xem lại trận đấu"
              style={{ margin: 0, padding: '4px 10px' }}
            >
              🎬 Xem lại
            </button>
          )}
          <span className={`result-badge ${getStatusColor(bet.result)}`}>
            {bet.result === 'WIN'
              ? 'THẮNG'
              : bet.result === 'LOSE'
              ? 'THUA'
              : bet.result === 'DRAW'
              ? 'HÒA'
              : 'ĐANG CHỜ'}
          </span>
        </div>
      </div>

      <div className="history-details">
        <div className="detail-row">
          <span className="label">Số điểm cược:</span>
          <span className={`amount ${getStatusColor(bet.result)}`}>
            {getBetAmount().toLocaleString()} điểm
          </span>
        </div>

        <div className="detail-row">
          <span className="label">Số dư sau:</span>
          <span className="balance">
            {getBalanceAfter().toLocaleString()} điểm
          </span>
        </div>

        {(bet.game === 'CARO' || bet.game === 'Caro' || bet.game === 'CHESS') && (
          <div className="detail-row">
            <span className="label">Chế độ:</span>
            <span className="balance">{bet.difficulty || (bet.game === 'CHESS' ? 'EASY' : 'Medium')}</span>
          </div>
        )}

        {(bet.game === 'CARO' || bet.game === 'Caro') && bet.playerSymbol && (
          <div className="detail-row">
            <span className="label">Quân cờ:</span>
            <span className="balance" style={{ color: bet.playerSymbol === 'X' ? '#ff3b3b' : '#00ffff' }}>
              {bet.playerSymbol === 'X' ? '✕' : 'O'}
            </span>
          </div>
        )}

        {bet.game === 'CHESS' && (
          <div className="detail-row">
            <span className="label">Quân cờ:</span>
            <span className="balance">{bet.playerColor === 'WHITE' ? '♔ Trắng' : '♚ Đen'}</span>
          </div>
        )}
      </div>
      
    </div>
  );
};

export default HistoryCard;
