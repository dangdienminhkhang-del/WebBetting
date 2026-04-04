import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../services/api';
import webSocketService from '../services/WebSocketService';
import '../styles/ChessGame.css';

/**
 * RoomLobby — dùng chung cho Caro và Chess PvP
 * Props:
 *   gameType: 'CARO' | 'CHESS'
 *   betAmount: number
 *   timeControlMs: number (Chess)
 *   incrementMs: number (Chess)
 *   userId: string
 *   nickname: string
 *   onMatchFound: (matchData) => void  — khi trận bắt đầu
 *   onBack: () => void
 */
const RoomLobby = ({ gameType, betAmount, timeControlMs = 0, incrementMs = 0,
                     userId, nickname, onMatchFound, onBack }) => {

  const [mode, setMode] = useState(null); // null | 'create' | 'join'
  const [room, setRoom] = useState(null);
  const [joinInput, setJoinInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [notification, setNotification] = useState(null); // { guestNickname }
  const [copied, setCopied] = useState(false);
  const roomRef = useRef(null);

  // Sync room vào ref để handler không stale
  useEffect(() => { roomRef.current = room; }, [room]);

  // WebSocket room handler
  const handleRoomEvent = useCallback((data) => {
    if (!data) return;
    if (data.type === 'ROOM_STATE') {
      setRoom(prev => ({ ...prev, ...data }));
    } else if (data.type === 'GUEST_JOINED') {
      setRoom(prev => prev ? { ...prev, members: data.members, status: 'READY' } : prev);
      setNotification({ guestNickname: data.guestNickname });
    } else if (data.type === 'ROOM_CLOSED') {
      setError('Chủ phòng đã rời. Phòng đã đóng.');
      setRoom(null);
      setMode(null);
    }
  }, []);

  const handleMatchEvent = useCallback((data) => {
    if (data && data.gameId) onMatchFound(data);
  }, [onMatchFound]);

  useEffect(() => {
    webSocketService.connect(userId, () => {});
    webSocketService.subscribe('room', handleRoomEvent);
    webSocketService.subscribe('match', handleMatchEvent);
    return () => {
      webSocketService.unsubscribe('room', handleRoomEvent);
      webSocketService.unsubscribe('match', handleMatchEvent);
      // Rời phòng khi unmount nếu đang trong phòng
      const r = roomRef.current;
      if (r?.roomId) {
        API.post('/room/leave', { roomId: r.roomId }).catch(() => {});
      }
    };
  }, [userId, handleRoomEvent, handleMatchEvent]);

  const handleCreate = async () => {
    setLoading(true); setError('');
    try {
      const res = await API.post('/room/create', { gameType, betAmount, timeControlMs, incrementMs });
      setRoom(res.data);
      setMode('create');
    } catch (e) {
      setError(e.response?.data?.error || 'Không thể tạo phòng.');
    } finally { setLoading(false); }
  };

  const handleJoin = async () => {
    if (!joinInput.trim()) { setError('Nhập mã phòng.'); return; }
    setLoading(true); setError('');
    try {
      const res = await API.post('/room/join', { roomId: joinInput.trim().toUpperCase() });
      setRoom(res.data);
      setMode('join');
    } catch (e) {
      setError(e.response?.data?.error || 'Không thể vào phòng.');
    } finally { setLoading(false); }
  };

  const handleStart = async () => {
    if (!room?.roomId) return;
    setLoading(true); setError('');
    try {
      await API.post('/room/start', { roomId: room.roomId });
      setNotification(null);
      // match event sẽ đến qua WebSocket
    } catch (e) {
      setError(e.response?.data?.error || 'Không thể bắt đầu.');
    } finally { setLoading(false); }
  };

  const handleLeave = async () => {
    if (room?.roomId) {
      await API.post('/room/leave', { roomId: room.roomId }).catch(() => {});
    }
    setRoom(null); setMode(null); setNotification(null); setError('');
  };

  const copyRoomId = () => {
    if (!room?.roomId) return;
    navigator.clipboard.writeText(room.roomId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isHost = mode === 'create';
  const isReady = room?.status === 'READY';
  const memberCount = room?.members?.length || 0;

  // ── Render ────────────────────────────────────────────────────────────────

  // Chưa chọn mode
  if (!mode) return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>
        {gameType === 'CARO' ? '⬜' : '♟️'} PVP — <span style={{ color: '#ffea00' }}>Tạo / Vào phòng</span>
      </h2>
      <p style={styles.sub}>Mức cược: <span style={{ color: '#ffea00', fontWeight: 900 }}>{betAmount.toLocaleString()} KGT</span></p>

      <div style={styles.btnRow}>
        <button className="btn-gold-wide" onClick={handleCreate} disabled={loading} style={{ flex: 1, padding: '14px' }}>
          🏠 Tạo phòng
        </button>
        <button className="btn-ghost-wide" onClick={() => setMode('join')} disabled={loading} style={{ flex: 1, padding: '14px' }}>
          🔑 Vào phòng
        </button>
      </div>

      <button onClick={onBack} style={styles.backBtn}>← Quay lại</button>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );

  // Nhập mã phòng
  if (mode === 'join' && !room) return (
    <div style={styles.wrap}>
      <h2 style={styles.title}>🔑 Nhập mã phòng</h2>
      <input
        value={joinInput}
        onChange={e => setJoinInput(e.target.value.toUpperCase())}
        onKeyDown={e => e.key === 'Enter' && handleJoin()}
        placeholder="VD: AB3X7K"
        maxLength={6}
        style={styles.input}
        autoFocus
      />
      <div style={styles.btnRow}>
        <button className="btn-gold-wide" onClick={handleJoin} disabled={loading || !joinInput.trim()} style={{ flex: 1, padding: '12px' }}>
          {loading ? 'Đang vào...' : 'Vào phòng'}
        </button>
        <button className="btn-ghost-wide" onClick={() => { setMode(null); setError(''); }} style={{ flex: 1, padding: '12px' }}>
          Quay lại
        </button>
      </div>
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );

  // Trong phòng
  return (
    <div style={styles.wrap}>
      {/* Header phòng */}
      <div style={styles.roomHeader}>
        <div>
          <div style={styles.roomLabel}>MÃ PHÒNG</div>
          <div style={styles.roomId} onClick={copyRoomId} title="Click để copy">
            {room?.roomId}
            <span style={{ marginLeft: 8, fontSize: '0.75rem', opacity: 0.6 }}>
              {copied ? '✅ Đã copy' : '📋 Copy'}
            </span>
          </div>
        </div>
        {/* Số người — click để xem tên */}
        <button style={styles.memberBtn} onClick={() => setShowMembers(v => !v)}>
          👥 {memberCount}/2
          {isReady && <span style={{ marginLeft: 6, color: '#00ff9d', fontSize: '0.7rem' }}>● ĐỦ NGƯỜI</span>}
        </button>
      </div>

      {/* Popup danh sách thành viên */}
      {showMembers && (
        <div style={styles.memberPopup}>
          <div style={styles.memberTitle}>Thành viên trong phòng</div>
          {(room?.members || []).map((m, i) => (
            <div key={i} style={styles.memberRow}>
              <span style={{ fontWeight: 900 }}>{m.nickname}</span>
              <span style={{ fontSize: '0.7rem', color: m.role === 'HOST' ? '#ffea00' : '#00ff9d', marginLeft: 8 }}>
                {m.role === 'HOST' ? '👑 Chủ phòng' : '🎮 Khách'}
              </span>
            </div>
          ))}
          {memberCount < 2 && (
            <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 8 }}>Đang chờ người chơi...</div>
          )}
        </div>
      )}

      {/* Thông báo có người vào (chỉ host thấy) */}
      {notification && isHost && (
        <div style={styles.notification}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>
            🎉 <span style={{ color: '#ffea00' }}>{notification.guestNickname}</span> đã vào phòng!
          </div>
          <button
            className="btn-gold-wide"
            onClick={handleStart}
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '1rem' }}
          >
            {loading ? 'Đang bắt đầu...' : '⚔️ Bắt đầu trận đấu'}
          </button>
        </div>
      )}

      {/* Trạng thái chờ */}
      {!notification && (
        <div style={styles.waitBox}>
          {isReady && isHost ? (
            <>
              <div style={{ marginBottom: 12, color: '#00ff9d', fontWeight: 900 }}>✅ Đủ 2 người — sẵn sàng!</div>
              <button className="btn-gold-wide" onClick={handleStart} disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: '1rem' }}>
                {loading ? 'Đang bắt đầu...' : '⚔️ Bắt đầu trận đấu'}
              </button>
            </>
          ) : isReady && !isHost ? (
            <div style={{ color: '#00ff9d', fontWeight: 900 }}>✅ Đủ 2 người — chờ chủ phòng bắt đầu...</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={styles.spinner} />
              <span style={{ opacity: 0.7 }}>Đang chờ người chơi tham gia...</span>
            </div>
          )}
        </div>
      )}

      {/* Thông tin cược */}
      <div style={styles.infoRow}>
        <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>MỨC CƯỢC:</span>
        <span style={{ fontWeight: 900, color: '#ffea00' }}>{betAmount.toLocaleString()} KGT</span>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <button onClick={handleLeave} style={styles.backBtn}>
        {isHost ? '🗑️ Đóng phòng' : '← Rời phòng'}
      </button>
    </div>
  );
};

// ── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  wrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, width: '100%', maxWidth: 480, margin: '0 auto', padding: '20px 0',
  },
  title: {
    fontFamily: 'Montserrat, sans-serif', fontWeight: 900,
    fontSize: '1.4rem', textAlign: 'center', margin: 0,
  },
  sub: { margin: 0, fontSize: '0.9rem', opacity: 0.8 },
  btnRow: { display: 'flex', gap: 12, width: '100%' },
  backBtn: {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontSize: '0.85rem', padding: '4px 0', marginTop: 4,
  },
  error: {
    background: 'rgba(255,68,68,0.12)', border: '1px solid rgba(255,68,68,0.3)',
    color: '#ff6b6b', borderRadius: 10, padding: '10px 16px',
    fontSize: '0.85rem', width: '100%', textAlign: 'center',
  },
  input: {
    width: '100%', padding: '14px 16px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,234,0,0.3)', borderRadius: 12, color: '#fff',
    fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', letterSpacing: 6,
    outline: 'none', boxSizing: 'border-box',
  },
  roomHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 18px',
  },
  roomLabel: { fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 },
  roomId: {
    fontSize: '1.8rem', fontWeight: 900, letterSpacing: 6, color: '#ffea00',
    cursor: 'pointer', fontFamily: 'monospace',
  },
  memberBtn: {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#fff', borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
    fontWeight: 900, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4,
  },
  memberPopup: {
    width: '100%', background: 'rgba(15,15,26,0.98)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12, padding: '14px 18px',
  },
  memberTitle: { fontWeight: 900, fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 },
  memberRow: { display: 'flex', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  notification: {
    width: '100%', background: 'rgba(0,255,157,0.08)', border: '1px solid rgba(0,255,157,0.25)',
    borderRadius: 14, padding: '16px 18px', textAlign: 'center',
  },
  waitBox: {
    width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 14, padding: '20px', textAlign: 'center', minHeight: 80,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  infoRow: {
    display: 'flex', justifyContent: 'space-between', width: '100%',
    padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
  },
  spinner: {
    width: 20, height: 20, border: '3px solid rgba(255,234,0,0.2)',
    borderTop: '3px solid #ffea00', borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

export default RoomLobby;
