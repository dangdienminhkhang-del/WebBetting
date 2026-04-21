import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import DashboardSidebar from "./DashboardSidebar";
import "../styles/Home.css";
import "../styles/casino-theme.css";
import "../styles/Leaderboard.css";

const TABS = [
  { key: "balance", label: "💰 KGT CAO NHẤT" },
  { key: "taixiu",  label: "🎲 TÀI XỈU" },
  { key: "caro",    label: "⭕ CARO" },
  { key: "chess",   label: "♟️ CỜ VUA" },
];

function UserStatsPopup({ row, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFullAvatar, setShowFullAvatar] = useState(false);

  useEffect(() => {
    API.get(`/leaderboard/user-stats/${row.id}`)
      .then(r => setStats(r.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, [row.id]);

  const avatarSrc = row.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(row.nickname || row.username)}&background=ffcc00&color=000&size=80`;

  return (
    <>
    <div className="lb-popup-overlay" onClick={onClose}>
      <div className="lb-popup-card" onClick={e => e.stopPropagation()}>
        <button className="lb-popup-close" onClick={onClose}>×</button>

        {/* Header user */}
        <div className="lb-popup-header">
          <div className="lb-popup-avatar-wrap" onClick={() => setShowFullAvatar(true)} title="Xem ảnh">
            <img src={avatarSrc} alt="avatar" className="lb-popup-avatar" />
            <div className="lb-popup-avatar-hint">🔍</div>
          </div>
          <div>
            <div className="lb-popup-username">{row.username}</div>
            <div className="lb-popup-nickname">{row.nickname}</div>
          </div>
        </div>

        {loading ? (
          <div className="lb-popup-loading">⏳ Đang tải...</div>
        ) : !stats ? (
          <div className="lb-popup-loading">Không thể tải thống kê</div>
        ) : (
          <>
            <div className="lb-popup-section-title">📊 THỐNG KÊ TỔNG QUAN</div>
            <div className="lb-popup-stats-grid">
              {[
                { label: "Tổng ván", val: stats.total.totalBets,    cls: "" },
                { label: "Thắng",    val: stats.total.totalWins,    cls: "win" },
                { label: "Thua",     val: stats.total.totalLosses,  cls: "lose" },
                { label: "Hòa",      val: stats.total.totalDraws,   cls: "draw" },
                { label: "Tỉ lệ",   val: stats.total.winRate + "%", cls: "rate" },
              ].map(s => (
                <div key={s.label} className="lb-popup-stat-box">
                  <div className={`lb-popup-stat-num ${s.cls}`}>{s.val}</div>
                  <div className="lb-popup-stat-lbl">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="lb-popup-section-title" style={{ marginTop: 16 }}>🎮 THEO TỪNG GAME</div>
            <div className="lb-popup-game-list">
              {[
                { name: "🎲 Tài Xỉu", d: stats.taixiu, hasDraw: false },
                { name: "⭕ Caro",    d: stats.caro,   hasDraw: false },
                { name: "♟️ Cờ Vua",  d: stats.chess,  hasDraw: true  },
              ].map(({ name, d, hasDraw }) => (
                <div key={name} className="lb-popup-game-row">
                  <span className="lb-popup-game-name">{name}</span>
                  <span className="lb-popup-badge win">{d?.wins ?? 0}W</span>
                  <span className="lb-popup-badge lose">{d?.losses ?? 0}L</span>
                  {hasDraw && <span className="lb-popup-badge draw">{d?.draws ?? 0}D</span>}
                  <span className="lb-popup-badge rate">{d?.winRate ?? 0}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>

    {/* XEM ẢNH FULL */}
    {showFullAvatar && (
      <div className="lb-avatar-fullview" onClick={() => setShowFullAvatar(false)}>
        <img src={avatarSrc} alt="avatar full" />
        <span>Nhấn bất kỳ để đóng</span>
      </div>
    )}
    </>
  );
}

function Leaderboard() {
  const [activeTab, setActiveTab] = useState("balance");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [selectedRow, setSelectedRow] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onStorage = () => {
      const u = JSON.parse(localStorage.getItem("user"));
      if (u) setUser(u);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("userUpdated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("userUpdated", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!user?.token) { navigate("/login"); return; }
    fetchTab(activeTab);
  }, [activeTab]);

  const fetchTab = async (tab) => {
    if (data[tab]) return; // cache
    setLoading(true);
    try {
      const res = await API.get(`/leaderboard/${tab}?limit=10`);
      setData(prev => ({ ...prev, [tab]: res.data }));
    } catch (err) {
      console.error("Lỗi tải bảng xếp hạng:", err);
      setData(prev => ({ ...prev, [tab]: [] }));
    } finally {
      setLoading(false);
    }
  };

  const currentTab = TABS.find(t => t.key === activeTab);
  const rows = data[activeTab] || [];

  const rankIcon = (i) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `#${i + 1}`;
  };

  const handleRowClick = (row) => {
    if (row.username === user?.username) {
      navigate("/profile");
    } else {
      setSelectedRow(row);
    }
  };

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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: "1.5rem" }}>🏆</span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: 1 }}>
              BẢNG XẾP HẠNG
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
          {/* TABS */}
          <div className="lobby-categories" style={{ marginBottom: 30 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                className={`cat-item ${activeTab === tab.key ? "active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TABLE */}
          <div className="leaderboard-table-card">
            {loading ? (
              <div className="lb-loading">⏳ Đang tải...</div>
            ) : rows.length === 0 ? (
              <div className="lb-empty">
                <span>📊</span>
                <p>Chưa có dữ liệu cho mục này</p>
              </div>
            ) : (
              <div className="lb-list">
                {rows.map((row, i) => {
                  const isMe = row.username === user?.username;
                  const avatarSrc = row.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(row.nickname || row.username)}&background=ffcc00&color=000&size=40`;
                  return (
                    <div
                      key={i}
                      className={`lb-row ${i < 3 ? "lb-top-" + (i + 1) : ""} ${isMe ? "lb-me" : ""}`}
                      onClick={() => handleRowClick(row)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="lb-rank">{rankIcon(i)}</div>
                      <div className="lb-avatar">
                        <img src={avatarSrc} alt="avatar" />
                      </div>
                      <div className="lb-user">
                        <span className="lb-username">
                          {row.username}
                          {isMe && <span className="lb-me-badge">Bạn</span>}
                        </span>
                        <span className="lb-nickname">{row.nickname}</span>
                      </div>
                      <div className="lb-value">
                        {currentTab.key === "balance"
                          ? (row.balance || 0).toLocaleString() + " KGT"
                          : (row.wins || 0).toLocaleString() + " thắng"}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* POPUP */}
      {selectedRow && (
        <UserStatsPopup row={selectedRow} onClose={() => setSelectedRow(null)} />
      )}
    </div>
  );
}

export default Leaderboard;
