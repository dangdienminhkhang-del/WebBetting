import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import CaroService from "../services/caroService";
import AvatarCropper from "./AvatarCropper";
import DashboardSidebar from "./DashboardSidebar";
import "../styles/Home.css";
import "../styles/casino-theme.css";
import "../styles/Profile.css";

// Lấy stats cờ vua từ lịch sử
const getChessStats = async () => {
  try {
    const res = await API.get("/chess/history");
    const games = res.data || [];
    const wins   = games.filter(g => g.gameResult === "WIN").length;
    const losses = games.filter(g => g.gameResult === "LOSE").length;
    const draws  = games.filter(g => g.gameResult === "DRAW").length;
    const total  = games.length;
    return { totalBets: total, wins, losses, draws, winRate: total > 0 ? Math.round((wins / total) * 100) : 0 };
  } catch { return { totalBets: 0, wins: 0, losses: 0, draws: 0, winRate: 0 }; }
};

function Profile() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [stats, setStats] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState(null);
  const [showAvatarFull, setShowAvatarFull] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const avatarInputRef = React.useRef(null);
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!currentUser?.token) { navigate("/login"); return; }
    fetchUserProfile();
    fetchUserStats();

    const handleStorage = () => {
      const u = JSON.parse(localStorage.getItem("user"));
      if (u) setUser(u);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await API.get(`/users/${currentUser.id}`);
      setUser(res.data);
      setNickname(res.data.nickname);
    } catch {
      setMessage("❌ Không thể tải thông tin cá nhân");
    }
  };

  const fetchUserStats = async () => {
    try {
      let taiXiuStats = { totalStats: {}, gameStats: { TAIXIU: {} } };
      try { const r = await API.get(`/bet/stats/${currentUser.id}`); taiXiuStats = r.data; } catch {}

      let caroStats = { totalBets: 0, wins: 0, losses: 0, winRate: 0 };
      try { caroStats = await CaroService.getUserStats(); } catch {}

      const chessStats = await getChessStats();

      const taiXiuTotal = taiXiuStats.totalStats || {};
      const taiXiuGame  = taiXiuStats.gameStats?.TAIXIU || {};
      const totalBets   = (taiXiuTotal.totalBets  || 0) + (caroStats.totalBets || 0) + chessStats.totalBets;
      const totalWins   = (taiXiuTotal.totalWins  || 0) + (caroStats.wins      || 0) + chessStats.wins;
      const totalLosses = (taiXiuTotal.totalLosses|| 0) + (caroStats.losses    || 0) + chessStats.losses;
      const totalDraws  = chessStats.draws;
      const winRate     = totalBets > 0 ? Math.round((totalWins / totalBets) * 10000) / 100 : 0;

      setStats({
        total: { totalBets, totalWins, totalLosses, totalDraws, winRate },
        taixiu: {
          totalBets: taiXiuGame.totalBets || 0,
          wins:      taiXiuGame.wins      || 0,
          losses:    taiXiuGame.losses    || 0,
          winRate:   taiXiuGame.winRate   || 0,
        },
        caro: {
          totalBets: caroStats.totalBets || 0,
          wins:      caroStats.wins      || 0,
          losses:    caroStats.losses    || 0,
          winRate:   caroStats.winRate   || 0,
        },
        chess: chessStats,
      });
    } catch {
      setStats({ total: { totalBets:0, totalWins:0, totalLosses:0, totalDraws:0, winRate:0 }, taixiu:{}, caro:{}, chess:{} });
    }
  };

  const handleUpdateNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) { setMessage("❌ Nickname không được để trống"); return; }
    setLoading(true);
    try {
      const res = await API.put(`/users/${currentUser.id}/nickname`, { nickname });
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify({ ...currentUser, nickname: res.data.nickname }));
      setMessage("✅ Cập nhật nickname thành công!");
    } catch {
      setMessage("❌ Lỗi cập nhật nickname");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // reset input để có thể chọn lại cùng file
    e.target.value = "";
    if (file.size > 5 * 1024 * 1024) {
      setMessage("❌ Ảnh quá lớn, vui lòng chọn ảnh dưới 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setCropSrc(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (croppedBase64) => {
    setCropSrc(null);
    setAvatarUploading(true);
    try {
      await API.put(`/users/${currentUser.id}/avatar`, { avatarUrl: croppedBase64 });
      // Đọc lại localStorage tại thời điểm này để không dùng snapshot cũ
      const freshUser = JSON.parse(localStorage.getItem("user")) || currentUser;
      const updated = { ...freshUser, avatarUrl: croppedBase64 };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      window.dispatchEvent(new Event("userUpdated"));
      setMessage("✅ Cập nhật avatar thành công!");
    } catch {
      setMessage("❌ Lỗi cập nhật avatar");
    } finally {
      setAvatarUploading(false);
    }
  };

  const getAvatarSrc = () =>
    user?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nickname || "?")}&background=ffcc00&color=000&size=120`;

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
            <span style={{ fontSize: "1.5rem" }}>👤</span>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontWeight: 900, fontSize: "1.1rem", letterSpacing: 1 }}>
              HỒ SƠ CÁ NHÂN
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
                <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.nickname || "?")}&background=ffcc00&color=000`} alt="Avatar" />
                <span className="online-indicator"></span>
              </div>
              <div className="user-meta">
                <span className="user-name">{user?.nickname}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="dashboard-content">
          {!user ? (
            <div className="profile-loading">⏳ Đang tải thông tin...</div>
          ) : (
            <div className="profile-grid">
              {/* CỘT TRÁI: THÔNG TIN TÀI KHOẢN */}
              <div className="profile-panel">
                <div className="panel-title">⚙️ THIẾT LẬP TÀI KHOẢN</div>

                {/* AVATAR */}
                <div className="avatar-block">
                  <div
                    className={`avatar-wrapper ${showAvatarMenu ? "menu-open" : ""}`}
                    onClick={() => !avatarUploading && setShowAvatarMenu(v => !v)}
                  >
                    <img src={getAvatarSrc()} alt="Avatar" className="profile-avatar-img" />
                    {avatarUploading ? (
                      <div className="avatar-overlay static">⏳</div>
                    ) : (
                      <div className="avatar-menu-overlay">
                        <button className="avatar-menu-btn" onClick={e => { e.stopPropagation(); setShowAvatarMenu(false); setShowAvatarFull(true); }}>
                          🔍 Xem ảnh
                        </button>
                        <button className="avatar-menu-btn" onClick={e => { e.stopPropagation(); setShowAvatarMenu(false); avatarInputRef.current?.click(); }}>
                          📷 Thay ảnh
                        </button>
                      </div>
                    )}
                  </div>
                  <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarChange} />
                  <span className="avatar-hint">Nhấn vào ảnh để xem tùy chọn</span>
                </div>

                {/* CROPPER */}
                {cropSrc && (
                  <AvatarCropper
                    imageSrc={cropSrc}
                    onConfirm={handleCropConfirm}
                    onCancel={() => setCropSrc(null)}
                  />
                )}

                {/* XEM ẢNH FULL */}
                {showAvatarFull && (
                  <div className="avatar-fullview-overlay" onClick={() => setShowAvatarFull(false)}>
                    <img src={getAvatarSrc()} alt="Avatar full" className="avatar-fullview-img" />
                    <span className="avatar-fullview-hint">Nhấn bất kỳ để đóng</span>
                  </div>
                )}

                <div className="profile-info-row">
                  <span className="pi-label">Tên đăng nhập</span>
                  <span className="pi-value">{user.username}</span>
                </div>
                <div className="profile-info-row">
                  <span className="pi-label">Số dư</span>
                  <span className="pi-value gold">{user.balance?.toLocaleString()} KGT</span>
                </div>

                <div className="nickname-block">
                  <label className="pi-label">Chỉnh sửa tên hiển thị</label>
                  <div className="nickname-row">
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Nhập biệt danh mới..."
                      className="nickname-input-field"
                    />
                    <button onClick={handleUpdateNickname} disabled={loading} className="btn-update-nick">
                      {loading ? "..." : "Lưu"}
                    </button>
                  </div>
                  {message && (
                    <div className={`profile-msg ${message.includes("❌") ? "error" : "success"}`}>
                      {message}
                    </div>
                  )}
                </div>
              </div>

              {/* CỘT PHẢI: THỐNG KÊ */}
              <div className="profile-panel">
                <div className="panel-title">📊 THỐNG KÊ TỔNG QUAN</div>
                <div className="stats-5-grid">
                  <div className="stat-box">
                    <div className="stat-num">{stats?.total.totalBets ?? "—"}</div>
                    <div className="stat-lbl">Tổng ván</div>
                  </div>
                  <div className="stat-box win">
                    <div className="stat-num">{stats?.total.totalWins ?? "—"}</div>
                    <div className="stat-lbl">Thắng</div>
                  </div>
                  <div className="stat-box lose">
                    <div className="stat-num">{stats?.total.totalLosses ?? "—"}</div>
                    <div className="stat-lbl">Thua</div>
                  </div>
                  <div className="stat-box draw">
                    <div className="stat-num">{stats?.total.totalDraws ?? "—"}</div>
                    <div className="stat-lbl">Hòa</div>
                  </div>
                  <div className="stat-box gold-box">
                    <div className="stat-num">{stats?.total.winRate ?? "—"}%</div>
                    <div className="stat-lbl">Tỉ lệ thắng</div>
                  </div>
                </div>

                {/* GAME BREAKDOWN */}
                <div className="panel-title" style={{ marginTop: 24 }}>🎮 THEO TỪNG GAME</div>
                <div className="game-stats-list">
                  {[
                    { name: "🎲 Tài Xỉu", d: stats?.taixiu, hasDraw: false },
                    { name: "⭕ Caro",    d: stats?.caro,   hasDraw: false },
                    { name: "♟️ Cờ Vua",  d: stats?.chess,  hasDraw: true  },
                  ].map(({ name, d, hasDraw }) => (
                    <div key={name} className="game-stat-row">
                      <span className="gs-name">{name}</span>
                      <span className="gs-item win">{d?.wins ?? 0} W</span>
                      <span className="gs-item lose">{d?.losses ?? 0} L</span>
                      {hasDraw && <span className="gs-item draw">{d?.draws ?? 0} D</span>}
                      <span className="gs-item rate">{d?.winRate ?? 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Profile;
