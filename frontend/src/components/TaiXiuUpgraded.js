import React, { useState, useEffect } from 'react';
import Dice3D from './Dice3D';
import API from '../services/api';
import '../styles/TaiXiuUpgraded.css';

const TaiXiuUpgraded = () => {
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState(1000);
  const [choice, setChoice] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [diceValues, setDiceValues] = useState({ dice1: 1, dice2: 1 });
  const [gameHistory, setGameHistory] = useState([]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || !userData.token) {
      window.location.href = '/login';
      return;
    }
    setUser(userData);
    setBalance(userData.balance);
  }, []);

  const handleBet = async () => {
    if (!choice) {
      alert('Vui lòng chọn Tài hoặc Xỉu!');
      return;
    }
    
    if (amount > balance) {
      alert('Số dư không đủ!');
      return;
    }

    if (amount < 100) {
      alert('Số điểm tối thiểu là 100!');
      return;
    }

    setIsRolling(true);
    setResult(null);

    // Animation duration - 2 seconds
    setTimeout(async () => {
      try {
        const res = await API.post('/bet/taixiu', {
          userId: user.id,
          amount: amount,
          choice: choice
        });

        const { betHistory, result: gameResult, newBalance } = res.data;
        
        setDiceValues({
          dice1: betHistory.dice1 || Math.floor(Math.random() * 6) + 1,
          dice2: betHistory.dice2 || Math.floor(Math.random() * 6) + 1
        });
        
        setResult({
          win: gameResult === 'WIN',
          message: gameResult === 'WIN' ? '🎉 CHÚC MỪNG BẠN THẮNG!' : '😞 RẤT TIẾC BẠN THUA!',
          newBalance: newBalance
        });

        setBalance(newBalance);
        
        // Update user in localStorage
        const updatedUser = { ...user, balance: newBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Add to game history
        setGameHistory(prev => [{
          dice1: diceValues.dice1,
          dice2: diceValues.dice2,
          choice: choice,
          result: gameResult,
          amount: amount,
          timestamp: new Date()
        }, ...prev.slice(0, 9)]); // Keep last 10 games

      } catch (error) {
        alert('Đặt cược thất bại: ' + (error.response?.data?.message || 'Lỗi không xác định'));
      } finally {
        setIsRolling(false);
      }
    }, 2000);
  };

  const handleRollComplete = () => {
    // Additional effects when rolling completes
  };

  const quickSelectAmount = (value) => {
    setAmount(value);
  };

  const getHistoryIcon = (game) => {
    const total = game.dice1 + game.dice2;
    if (total >= 8) return '🎉';
    return '🎯';
  };

  return (
    <div className="taixiu-upgraded">
      {/* Header */}
      <div className="tx-header">
        <button className="back-btn" onClick={() => window.location.href = '/home'}>
          ← Quay lại
        </button>
        <h1 className="tx-title">🎰 TÀI XỈU CASINO</h1>
        <div className="balance-display">
          💰 {balance.toLocaleString()} điểm
        </div>
      </div>

      <div className="tx-content">
        {/* Dice Area */}
        <div className="dice-area">
          <Dice3D 
            dice1={diceValues.dice1}
            dice2={diceValues.dice2}
            isRolling={isRolling}
            onRollComplete={handleRollComplete}
          />
        </div>

        {/* Betting Panel */}
        <div className="betting-panel">
          <div className="bet-choices">
            <button 
              className={`choice-btn tai ${choice === 'TAI' ? 'active' : ''}`}
              onClick={() => setChoice('TAI')}
              disabled={isRolling}
            >
              🟢 TÀI (8-12 điểm)
            </button>
            <button 
              className={`choice-btn xiu ${choice === 'XIU' ? 'active' : ''}`}
              onClick={() => setChoice('XIU')}
              disabled={isRolling}
            >
              🔴 XỈU (2-7 điểm)
            </button>
          </div>

          {/* Amount Selection */}
          <div className="amount-section">
            <h3>💰 Số điểm cược:</h3>
            <div className="quick-amounts">
              {[100, 500, 1000, 5000, 10000].map(value => (
                <button
                  key={value}
                  className={`quick-amount-btn ${amount === value ? 'active' : ''}`}
                  onClick={() => quickSelectAmount(value)}
                  disabled={isRolling}
                >
                  {value.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="custom-amount">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                min="100"
                max={balance}
                disabled={isRolling}
                placeholder="Nhập số điểm..."
              />
            </div>
          </div>

          {/* Bet Button */}
          <button 
            className={`bet-btn ${isRolling ? 'rolling' : ''}`}
            onClick={handleBet}
            disabled={isRolling || !choice || amount < 100}
          >
            {isRolling ? '🎲 ĐANG LẮC...' : `🎲 ĐẶT CƯỢC ${amount.toLocaleString()} ĐIỂM`}
          </button>

          {/* Result Display */}
          {result && (
            <div className={`result-display ${result.win ? 'win' : 'lose'}`}>
              <div className="result-message">{result.message}</div>
              <div className="result-balance">
                Số dư mới: {result.newBalance.toLocaleString()} điểm
              </div>
            </div>
          )}
        </div>

        {/* Game History */}
        {gameHistory.length > 0 && (
          <div className="game-history">
            <h3>📜 Lịch sử 10 ván gần nhất:</h3>
            <div className="history-list">
              {gameHistory.map((game, index) => (
                <div key={index} className="history-item">
                  <span className="history-icon">{getHistoryIcon(game)}</span>
                  <span className="history-dice">⚀{game.dice1} ⚁{game.dice2}</span>
                  <span className="history-choice">{game.choice}</span>
                  <span className={`history-result ${game.result === 'WIN' ? 'win' : 'lose'}`}>
                    {game.result === 'WIN' ? 'THẮNG' : 'THUA'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaiXiuUpgraded;