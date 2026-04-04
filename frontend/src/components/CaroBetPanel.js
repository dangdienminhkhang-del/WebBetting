import React, { useState } from 'react';
import '../styles/ChessGame.css';
import RoomLobby from './RoomLobby';

const btn = (active, disabled) => ({
  padding: "8px 14px",
  background: active ? "#ffea00" : "rgba(255,255,255,0.05)",
  color: active ? "#000" : "#fff",
  border: "1px solid rgba(255,234,0,0.3)",
  borderRadius: "999px",
  fontWeight: 900,
  cursor: disabled ? "not-allowed" : "pointer",
  textTransform: "uppercase",
  fontSize: "0.8rem",
  opacity: disabled ? 0.5 : 1,
});

const CaroBetPanel = ({ onBetPlaced, balance, gameMode = 'ai', onNavigateHome, savedSnapshot, onResume, onDiscardSave }) => {
  const [betAmount, setBetAmount] = useState(1000);
  const [stakeInput, setStakeInput] = useState("1000");
  const [aiMode, setAiMode] = useState('Easy');
  const [playerSymbol, setPlayerSymbol] = useState('X');
  const [uiMessage, setUiMessage] = useState('');
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  // PvP sub-mode: 'matchmaking' | 'room'
  const [pvpSubMode, setPvpSubMode] = useState('matchmaking');
  const [showRoomLobby, setShowRoomLobby] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const parseStake = (v) => {
    const n = parseInt(String(v).replace(/[^\d]/g, ''), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const handleStart = () => {
    if (savedSnapshot && onResume && gameMode !== 'pvp') {
      setUiMessage('Bạn đang có ván chưa kết thúc. Hãy tiếp tục hoặc bỏ ván cũ trước.');
      setTimeout(() => setUiMessage(''), 1500);
      return;
    }
    const amount = parseStake(stakeInput);
    if (!amount) { setUiMessage('Vui lòng nhập mức cược hợp lệ.'); return; }
    if (amount > balance) { setUiMessage('Số dư không đủ!'); return; }
    if (amount < 100) { setUiMessage('Mức cược tối thiểu là 100 KGT.'); return; }
    setUiMessage('');

    if (gameMode === 'pvp' && pvpSubMode === 'room') {
      setBetAmount(amount);
      setShowRoomLobby(true);
      return;
    }
    onBetPlaced(amount, aiMode, playerSymbol);
  };

  const sectionTitle = (t) => (
    <div className="chess-setup-title">{t}</div>
  );

  // Hiển thị RoomLobby
  if (showRoomLobby) return (
    <div style={{ minHeight: "100vh", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", padding: "15px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.8rem", marginBottom: "6px" }}>
          CARO <span style={{ color: "#ffea00" }}>PVP</span>
        </h1>
      </div>
      <div className="chess-setup-wrap">
        <div className="chess-setup-card">
          <RoomLobby
            gameType="CARO"
            betAmount={betAmount}
            userId={String(user.id)}
            nickname={user.nickname || user.username}
            onMatchFound={(data) => onBetPlaced(data.betAmount, null, null, data)}
            onBack={() => setShowRoomLobby(false)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "15px 20px",
    }}>
      <div style={{ textAlign: "center", marginBottom: "12px" }}>
        <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.8rem", marginBottom: "6px" }}>
          CARO <span style={{ color: "#ffea00" }}>{gameMode === 'pvp' ? 'PVP' : 'VS AI'}</span>
        </h1>
      </div>

      <div className="chess-setup-wrap">
      <div className="chess-setup-card">
        {/* Balance */}
        <div className="chess-setup-balance">
          <span className="label">SỐ DƯ HIỆN TẠI</span>
          <span className="value">{balance.toLocaleString()} KGT</span>
        </div>

        <div className="chess-setup-grid">
          {/* AI mode: chọn độ khó + chọn X/O */}
          {gameMode !== 'pvp' && (
            <>
              <div className="chess-setup-section">
                {sectionTitle("CHỌN ĐỘ KHÓ AI")}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[['Easy', 'Dễ 😊'], ['Medium', 'Trung bình 🧠'], ['Hard', 'Khó 🤖']].map(([val, label]) => (
                    <button key={val} onClick={() => setAiMode(val)} style={btn(aiMode === val, false)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chess-setup-section">
                {sectionTitle("CHỌN QUÂN")}
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {[['X', 'X - Đi trước ✕'], ['O', 'O - Đi sau ○']].map(([val, label]) => (
                    <button key={val} onClick={() => setPlayerSymbol(val)} style={btn(playerSymbol === val, false)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Mức cược */}
          <div className="chess-setup-section">
            {sectionTitle("CHỌN MỨC CƯỢC (KGT)")}
            <input
              className="stake-input"
              inputMode="numeric"
              value={stakeInput}
              onChange={(e) => setStakeInput(e.target.value)}
              placeholder="Nhập mức cược..."
              style={{ padding: "10px", fontSize: "0.9rem" }}
            />
            <div className="stake-quick" style={{ gap: "6px", marginTop: "8px" }}>
              {[100, 500, 1000, 5000, 10000, 500000].map((amt) => (
                <button key={amt} type="button" onClick={() => setStakeInput(String(amt))}
                  style={{ padding: "6px", fontSize: "0.75rem" }}>
                  {amt.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* PvP: 2 nút chọn chế độ, nằm ngang với card mức cược */}
          {gameMode === 'pvp' && (
            <div className="chess-setup-section">
              {sectionTitle("CHỌN CHẾ ĐỘ")}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button onClick={() => setPvpSubMode('matchmaking')} style={btn(pvpSubMode === 'matchmaking', false)}>
                  🔍 GHÉP NGẪU NHIÊN
                </button>
                <button onClick={() => setPvpSubMode('room')} style={btn(pvpSubMode === 'room', false)}>
                  TẠO / VÀO PHÒNG
                </button>
              </div>
            </div>
          )}
        </div>

        {uiMessage && (
          <div style={{
            position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9999,
            background: 'rgba(20,20,35,0.97)',
            border: '1px solid rgba(255,234,0,0.4)',
            borderRadius: '16px',
            padding: '20px 32px',
            textAlign: 'center',
            fontWeight: 900,
            color: '#ffea00',
            fontSize: '0.95rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(12px)',
            pointerEvents: 'none',
          }}>
            {uiMessage}
          </div>
        )}

        <div className="chess-setup-actions" style={{ marginTop: "12px" }}>
          <button className="btn-gold-wide" onClick={handleStart} style={{ padding: "12px" }}>
            {gameMode === 'pvp'
              ? pvpSubMode === 'room' ? '🏠 VÀO LOBBY PHÒNG' : 'TÌM ĐỐI THỦ'
              : 'VÀO BÀN'}
          </button>
          {savedSnapshot && onResume && gameMode !== 'pvp' && (
            <>
              <button className="btn-ghost-wide" onClick={onResume} style={{ padding: "12px", borderColor: 'rgba(0,255,157,0.4)', color: '#00ff9d' }}>
                ↩️ TIẾP TỤC VÁN {savedSnapshot.currentMoveCount ? `(${savedSnapshot.currentMoveCount} nước)` : ''}
              </button>
              <button className="btn-ghost-wide" onClick={() => setShowDiscardConfirm(true)} style={{ padding: "12px", borderColor: 'rgba(255,68,68,0.3)', color: '#ff6b6b', fontSize: '0.75rem' }}>
                🗑️ BỎ VÁN CŨ
              </button>
            </>
          )}
          <button className="btn-ghost-wide" onClick={onNavigateHome || (() => window.location.href = '/home')} style={{ padding: "12px" }}>
            VỀ SẢNH
          </button>
        </div>
      </div>
      </div>

      {showDiscardConfirm && (
        <div className="premium-modal-overlay" onClick={() => setShowDiscardConfirm(false)}>
          <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ BỎ VÁN CŨ?</h3>
              <button className="btn-close-modal" onClick={() => setShowDiscardConfirm(false)}>×</button>
            </div>
            <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.8)", fontWeight: 700, lineHeight: 1.6, textAlign: 'center' }}>
              Ván cũ sẽ bị xóa. Tiền cược{' '}
              <span style={{ color: '#ffea00', fontWeight: 900 }}>
                {(savedSnapshot?.betAmount || 0).toLocaleString()} KGT
              </span>{' '}
              đã bị trừ và sẽ không được hoàn lại. Xác nhận?
            </div>
            <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
              <button className="btn-ghost-wide" onClick={() => setShowDiscardConfirm(false)} style={{ flex: 1 }}>Ở LẠI</button>
              <button className="btn-gold-wide" onClick={() => { setShowDiscardConfirm(false); onDiscardSave?.(); setUiMessage(''); }} style={{ flex: 1, background: '#ff4444', color: '#fff' }}>XÁC NHẬN BỎ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaroBetPanel;
