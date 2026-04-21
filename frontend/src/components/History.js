import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HistoryCard from './HistoryCard';
import betService from '../services/betService';
import CaroService from '../services/caroService';
import API from '../services/api';
import DashboardSidebar from './DashboardSidebar';
import '../styles/Home.css';
import '../styles/casino-theme.css';
import '../styles/History.css';

const History = () => {
  const [betHistory, setBetHistory]       = useState([]);
  const [userStats, setUserStats]         = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');
  const [activeFilter, setActiveFilter]   = useState('ALL');
  const [gameFilter, setGameFilter]       = useState('ALL');
  const [successToast, setSuccessToast]   = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [highlightId, setHighlightId]     = useState(null);
  const [sidebarOpen, setSidebarOpen]     = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation();
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user')));

  useEffect(() => {
    const onStorage = () => {
      const u = JSON.parse(localStorage.getItem('user'));
      if (u) setUser(u);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('userUpdated', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('userUpdated', onStorage);
    };
  }, []);

  useEffect(() => {
    if (!user?.token) { navigate('/login'); return; }
    fetchHistoryAndStats(user.id);
  }, [navigate]);

  useEffect(() => {
    if (location.state?.highlightId) {
      setHighlightId(location.state.highlightId);
      const t = setTimeout(() => setHighlightId(null), 3000);
      return () => clearTimeout(t);
    }
  }, [location.state]);

  useLayoutEffect(() => {
    if (!loading && location.state?.scrollY !== undefined)
      window.scrollTo(0, location.state.scrollY);
  }, [loading, location.state]);

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const calcCaroBalanceAfter = (game) => {
    if (game.balanceAfter) return game.balanceAfter;
    const before = game.balanceBefore || 0;
    if (!before) return 0;
    if (game.gameResult === 'WIN')  return before + (game.betAmount || 0);
    if (game.gameResult === 'LOSE') return before - (game.betAmount || 0);
    return before;
  };

  const hasReplay = (game) =>
    game.gameMoves && game.gameMoves.trim().length > 10 &&
    game.gameMoves !== '[]' && game.gameMoves !== '""';

  const fetchHistoryAndStats = async (userId) => {
    try {
      setLoading(true); setError('');
      const [txHistory, txStats, caroHistory, caroStats, chessHistory] = await Promise.all([
        betService.getBetHistory(userId).catch(() => []),
        betService.getUserStats(userId).catch(() => null),
        CaroService.getGameHistory().catch(() => []),
        CaroService.getUserStats().catch(() => null),
        API.get('/chess/history').then(r => r.data).catch(() => []),
      ]);

      const formattedCaro = (caroHistory || []).map(g => ({
        id: `caro-${g.id}`, originalId: g.id, game: 'CARO',
        amount: g.betAmount || 0, result: g.gameResult || 'LOSE',
        balanceAfter: calcCaroBalanceAfter(g),
        createdAt: g.finishedAt || g.createdAt,
        difficulty: g.difficulty || 'Medium',
        playerSymbol: g.playerSymbol || null,
        gameMoves: g.gameMoves, hasReplay: hasReplay(g),
      }));

      const formattedChess = (chessHistory || []).map(g => {
        let balAfter = g.balanceAfter;
        if (!balAfter) {
          const stake = g.stakeAmount || 0, before = g.balanceBefore || 0;
          if (before > 0) {
            if (g.gameResult === 'WIN')  balAfter = before + stake;
            else if (g.gameResult === 'LOSE') balAfter = before - stake;
            else balAfter = before;
          }
        }
        return {
          id: `chess-${g.id}`, originalId: g.id, game: 'CHESS',
          amount: g.stakeAmount || 0,
          result: g.gameResult === 'DRAW' ? 'DRAW' : (g.gameResult || 'LOSE'),
          balanceAfter: balAfter || 0,
          createdAt: g.finishedAt || g.createdAt,
          difficulty: g.difficulty || 'EASY',
          playerColor: g.playerColor || 'WHITE',
        };
      });

      const combined = [...(txHistory || []), ...formattedCaro, ...formattedChess]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setBetHistory(combined);

      const chessWins   = chessHistory?.filter(g => g.gameResult === 'WIN').length  || 0;
      const chessLosses = chessHistory?.filter(g => g.gameResult === 'LOSE').length || 0;
      const chessDraws  = chessHistory?.filter(g => g.gameResult === 'DRAW').length || 0;
      const totalBets   = (txStats?.totalStats?.totalBets || 0) + (caroStats?.totalBets || 0) + (chessHistory?.length || 0);
      const totalWins   = (txStats?.totalStats?.totalWins || 0) + (caroStats?.wins || 0) + chessWins;
      const totalLosses = (txStats?.totalStats?.totalLosses || 0) + (caroStats?.losses || 0) + chessLosses;
      const totalDraws  = chessDraws;
      setUserStats({
        totalBets, totalWins, totalLosses, totalDraws,
        winRate: totalBets > 0 ? Math.round((totalWins / totalBets) * 100) : 0,
      });
    } catch (err) {
      setError('Không thể tải lịch sử cược. Vui lòng thử lại sau.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHistory = async () => {
    setShowDeleteConfirm(false);
    try {
      await API.delete('/bet/history/delete-filtered', {
        params: { userId: user.id, game: gameFilter, result: activeFilter },
      });
      setSuccessToast(`🗑️ Đã xóa lịch sử thành công!`);
      setTimeout(() => setSuccessToast(null), 1500);
      fetchHistoryAndStats(user.id);
    } catch { alert('Xóa lịch sử thất bại.'); }
  };

  const filteredHistory = betHistory.filter(b =>
    (gameFilter === 'ALL' || b.game === gameFilter) &&
    (activeFilter === 'ALL' || b.result === activeFilter)
  );

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <DashboardSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)}
        extraMenuGroups={
          <div className="menu-group">
            <span className="menu-label">GIAO DỊCH</span>
            <button className="menu-item deposit-highlight" onClick={() => navigate("/home?deposit=1")}>
              <span className="menu-icon">💰</span> Nạp KGT
            </button>
            <button className="menu-item" onClick={() => navigate("/home?history=1")}>
              <span className="menu-icon">📜</span> Lịch Sử Giao Dịch
            </button>
          </div>
        }
      />

      {/* MAIN */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.5rem' }}>📜</span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: '1.1rem', letterSpacing: 1 }}>
              LỊCH SỬ CƯỢC
            </span>
          </div>
          <div className="header-user-actions">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
            <div className="wallet-card">
              <span className="wallet-label">SỐ DƯ</span>
              <div className="wallet-amount">
                <span className="gold">{(user?.balance || 0).toLocaleString()}</span>
                <span className="unit"> KGT</span>
              </div>
            </div>
            <div className="user-profile-mini">
              <div className="user-avatar">
                <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nickname||"?")}&background=ffcc00&color=000`} alt="Avatar" />
                <span className="online-indicator"></span>
              </div>
              <div className="user-meta">
                <span className="user-name">{user?.nickname}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {/* TOAST */}
          {successToast && (
            <div className="success-toast-overlay">
              <div className="success-toast-card">
                <div className="success-toast-icon">🗑️</div>
                <div className="success-toast-message">{successToast}</div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRM */}
          {showDeleteConfirm && (
            <div className="premium-modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
              <div className="premium-modal-card" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>XÁC NHẬN XÓA</h3>
                  <button className="btn-close-modal" onClick={() => setShowDeleteConfirm(false)}>×</button>
                </div>
                <div className="modal-body">
                  <div className="modal-icon">⚠️</div>
                  <p className="modal-title">Bạn có chắc chắn muốn xóa lịch sử cược?</p>
                  <div className="modal-subtitle">
                    {gameFilter === 'ALL' ? 'Tất cả trò chơi' : gameFilter} | {activeFilter === 'ALL' ? 'Tất cả trạng thái' : activeFilter}
                  </div>
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost-wide" onClick={() => setShowDeleteConfirm(false)}>HỦY</button>
                  <button className="btn-gold-wide" onClick={handleDeleteHistory}>XÓA NGAY</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="hist-loading">⏳ Đang tải lịch sử...</div>
          ) : (
            <>
              {error && <div className="error-message">{error}</div>}

              {/* STATS */}
              {userStats && (
                <div className="hist-stats-row">
                  {[
                    { label: 'Tổng ván', val: userStats.totalBets,   cls: '' },
                    { label: 'Thắng',    val: userStats.totalWins,   cls: 'win' },
                    { label: 'Thua',     val: userStats.totalLosses, cls: 'lose' },
                    { label: 'Hòa',      val: userStats.totalDraws,  cls: 'draw' },
                    { label: 'Tỉ lệ',   val: userStats.winRate + '%', cls: 'rate' },
                  ].map(s => (
                    <div key={s.label} className="hist-stat-box">
                      <div className={`hist-stat-num ${s.cls}`}>{s.val}</div>
                      <div className="hist-stat-lbl">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* FILTERS */}
              <div className="hist-filters-wrap">
                <div className="hist-filter-group">
                  <span className="hist-filter-label">TRÒ CHƠI</span>
                  <div className="hist-filter-btns">
                    {[['ALL','Tất cả'],['TAIXIU','Tài Xỉu'],['CARO','Caro'],['CHESS','Cờ Vua']].map(([v,l]) => (
                      <button key={v} className={`cat-item ${gameFilter === v ? 'active' : ''}`} onClick={() => setGameFilter(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <div className="hist-filter-group">
                  <span className="hist-filter-label">TRẠNG THÁI</span>
                  <div className="hist-filter-btns">
                    {[['ALL','Tất cả'],['WIN','Thắng'],['LOSE','Thua'],['DRAW','Hòa']].map(([v,l]) => (
                      <button key={v} className={`cat-item ${activeFilter === v ? 'active' : ''}`} onClick={() => setActiveFilter(v)}>{l}</button>
                    ))}
                  </div>
                </div>
                <button className="btn-delete-history" onClick={() => setShowDeleteConfirm(true)}>
                  🗑️ Xóa lịch sử đã lọc
                </button>
              </div>

              {/* LIST */}
              <div className="history-list">
                {filteredHistory.length === 0 ? (
                  <div className="hist-empty">📭 Chưa có lịch sử cược</div>
                ) : (
                  filteredHistory.map(bet => (
                    <HistoryCard
                      key={bet.id}
                      bet={bet}
                      highlight={bet.id === highlightId}
                      onReplay={() => navigate(`/caro/replay/${bet.originalId}`, {
                        state: { scrollY: window.scrollY, highlightId: bet.id, fromHistory: true }
                      })}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* BACK TO TOP */}
      {showScrollTop && (
        <button className="back-to-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>⇡</button>
      )}
    </div>
  );
};

export default History;
