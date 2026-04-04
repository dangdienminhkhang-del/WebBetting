import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import ExportButton from "./ExportButton";
import FilterBar from "./FilterBar";
import "../styles/AdminDashboard.css";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "users", label: "Người Dùng", icon: "👥" },
  { id: "bets", label: "Tài Xỉu", icon: "🎲" },
  { id: "caro", label: "Caro", icon: "⬜" },
  { id: "chess", label: "Cờ Vua", icon: "♟️" },
  { id: "topup", label: "Lịch Sử Nạp", icon: "💳" },
  { id: "logs", label: "Hành Động Admin", icon: "📋" },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [stats, setStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(0);
  const [userTotalPages, setUserTotalPages] = useState(0);
  const [userKeyword, setUserKeyword] = useState("");
  const [userActiveFilter, setUserActiveFilter] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [setBalanceAmount, setSetBalanceAmount] = useState("");

  const [bets, setBets] = useState([]);
  const [betPage, setBetPage] = useState(0);
  const [betTotalPages, setBetTotalPages] = useState(0);
  const [betGameFilter, setBetGameFilter] = useState("");
  const [betResultFilter, setBetResultFilter] = useState("");
  const [betUsernameFilter, setBetUsernameFilter] = useState("");
  const [betDateFilter, setBetDateFilter] = useState("");

  const [chess, setChess] = useState([]);
  const [chessPage, setChessPage] = useState(0);
  const [chessTotalPages, setChessTotalPages] = useState(0);
  const [chessUsername, setChessUsername] = useState("");
  const [chessResult, setChessResult] = useState("");
  const [chessDifficulty, setChessDifficulty] = useState("");
  const [chessDate, setChessDate] = useState("");

  const [caro, setCaro] = useState([]);
  const [caroPage, setCaroPage] = useState(0);
  const [caroTotalPages, setCaroTotalPages] = useState(0);
  const [caroUsername, setCaroUsername] = useState("");
  const [caroResult, setCaroResult] = useState("");
  const [caroOpponent, setCaroOpponent] = useState("");
  const [caroDate, setCaroDate] = useState("");

  const [topups, setTopups] = useState([]);
  const [topupPage, setTopupPage] = useState(0);
  const [topupTotalPages, setTopupTotalPages] = useState(0);
  const [topupUsername, setTopupUsername] = useState("");
  const [topupCreatedBy, setTopupCreatedBy] = useState("");
  const [topupDate, setTopupDate] = useState("");

  const [logs, setLogs] = useState([]);
  const [logPage, setLogPage] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(0);
  const [logAction, setLogAction] = useState("");
  const [logDate, setLogDate] = useState("");

  const showToast = (msg, type = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };
  const showConfirm = (message, onConfirm) => setConfirmModal({ message, onConfirm });

  // Parse "2024-01-01|2024-01-07" → { date: "2024-01-01", dateTo: "2024-01-07" }
  const parseDateRange = (v) => {
    if (!v) return {};
    const parts = v.split("|");
    return { date: parts[0] || undefined, dateTo: parts[1] || undefined };
  };

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    if (!u || u.username !== "adminK") navigate("/home");
  }, [navigate]);

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    API.get("/admin/dashboard").then(r => setStats(r.data)).catch(() => {});
    API.get("/admin/stats/user-stats").then(r => setUserStats(r.data)).catch(() => {});
  }, [activeTab]);

  const loadUsers = useCallback(() => {
    const params = { page: userPage, size: 10, keyword: userKeyword || undefined };
    if (userActiveFilter !== "") params.active = userActiveFilter;
    API.get("/admin/users", { params }).then(r => { setUsers(r.data.content); setUserTotalPages(r.data.totalPages); }).catch(() => {});
  }, [userPage, userKeyword, userActiveFilter]);
  useEffect(() => { if (activeTab === "users") loadUsers(); }, [activeTab, loadUsers]);

  const loadBets = useCallback(() => {
    API.get("/admin/bets", { params: { page: betPage, size: 10, game: betGameFilter || undefined, result: betResultFilter || undefined, username: betUsernameFilter || undefined, ...parseDateRange(betDateFilter) } })
      .then(r => { setBets(r.data.content); setBetTotalPages(r.data.totalPages); }).catch(() => {});
  }, [betPage, betGameFilter, betResultFilter, betUsernameFilter, betDateFilter]);
  useEffect(() => { if (activeTab === "bets") loadBets(); }, [activeTab, loadBets]);

  const loadCaro = useCallback(() => {
    API.get("/admin/caro-games", { params: { page: caroPage, size: 10, username: caroUsername || undefined, result: caroResult || undefined, opponentType: caroOpponent || undefined, ...parseDateRange(caroDate) } })
      .then(r => { setCaro(r.data.content); setCaroTotalPages(r.data.totalPages); }).catch(() => {});
  }, [caroPage, caroUsername, caroResult, caroOpponent, caroDate]);
  useEffect(() => { if (activeTab === "caro") loadCaro(); }, [activeTab, loadCaro]);

  const loadChess = useCallback(() => {
    API.get("/admin/chess-games", { params: { page: chessPage, size: 10, username: chessUsername || undefined, result: chessResult || undefined, difficulty: chessDifficulty || undefined, ...parseDateRange(chessDate) } })
      .then(r => { setChess(r.data.content); setChessTotalPages(r.data.totalPages); }).catch(() => {});
  }, [chessPage, chessUsername, chessResult, chessDifficulty, chessDate]);
  useEffect(() => { if (activeTab === "chess") loadChess(); }, [activeTab, loadChess]);

  const loadTopup = useCallback(() => {
    API.get("/admin/topup-history", { params: { page: topupPage, size: 10, username: topupUsername || undefined, createdBy: topupCreatedBy || undefined, ...parseDateRange(topupDate) } })
      .then(r => { setTopups(r.data.content); setTopupTotalPages(r.data.totalPages); }).catch(() => {});
  }, [topupPage, topupUsername, topupCreatedBy, topupDate]);
  useEffect(() => { if (activeTab === "topup") loadTopup(); }, [activeTab, loadTopup]);

  const loadLogs = useCallback(() => {
    API.get("/admin/action-logs", { params: { page: logPage, size: 10, action: logAction || undefined, ...parseDateRange(logDate) } })
      .then(r => { setLogs(r.data.content); setLogTotalPages(r.data.totalPages); }).catch(() => {});
  }, [logPage, logAction, logDate]);
  useEffect(() => { if (activeTab === "logs") loadLogs(); }, [activeTab, loadLogs]);

  const handleLockUser = async (userId, currentActive) => {
    setActionLoading(true);
    try {
      const res = await API.put(`/admin/users/${userId}/lock`, null, { params: { active: !currentActive } });
      showToast(currentActive ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản");
      loadUsers();
      if (selectedUser?.id === userId) setSelectedUser(res.data);
    } catch { showToast("Thao tác thất bại", "error"); }
    finally { setActionLoading(false); }
  };

  const handleDeleteUser = async (userId) => {
    showConfirm("Xác nhận xóa người dùng này? Hành động không thể hoàn tác.", async () => {
      setActionLoading(true);
      try {
        await API.delete(`/admin/users/${userId}`);
        showToast("Đã xóa người dùng");
        setSelectedUser(null);
        loadUsers();
      } catch { showToast("Xóa thất bại", "error"); }
      finally { setActionLoading(false); }
    });
  };

  const handleTopUp = async () => {
    const amount = parseInt(topupAmount);
    if (!amount || amount <= 0) return showToast("Nhập số tiền hợp lệ", "error");
    setActionLoading(true);
    try {
      await API.post(`/admin/users/${selectedUser.id}/topup`, { amount });
      showToast(`Nạp ${amount.toLocaleString()} KGT thành công`);
      setTopupAmount("");
      loadUsers();
    } catch { showToast("Nạp tiền thất bại", "error"); }
    finally { setActionLoading(false); }
  };

  const handleSetBalance = async () => {
    const balance = parseInt(setBalanceAmount);
    if (isNaN(balance) || balance < 0) return showToast("Nhập số dư hợp lệ", "error");
    setActionLoading(true);
    try {
      await API.put(`/admin/users/${selectedUser.id}/set-balance`, { balance });
      showToast(`Đã đặt số dư thành ${balance.toLocaleString()} KGT`);
      setSetBalanceAmount("");
      loadUsers();
    } catch { showToast("Thao tác thất bại", "error"); }
    finally { setActionLoading(false); }
  };

  const handleResetBalance = async () => {
    showConfirm("Reset số dư người này về 1,000 KGT?", async () => {
      setActionLoading(true);
      try {
        await API.post(`/admin/users/${selectedUser.id}/reset-balance`);
        showToast("Đã reset số dư về 1,000 KGT");
        loadUsers();
      } catch { showToast("Thao tác thất bại", "error"); }
      finally { setActionLoading(false); }
    });
  };

  const fmtDate = (dt) => dt ? new Date(dt).toLocaleDateString("vi-VN") : "-";
  const fmtDateTime = (dt) => dt ? new Date(dt).toLocaleString("vi-VN") : "-";

  const resultBadge = (r) => (
    <span className={`result-badge ${(r || "").toLowerCase()}`}>
      {r === "WIN" ? "🏆 Thắng" : r === "LOSE" ? "💀 Thua" : r === "DRAW" ? "🤝 Hòa" : r || "-"}
    </span>
  );

  const RESULT_OPTS = [
    { value: "", label: "Tất cả" },
    { value: "WIN", label: "🏆 Thắng" },
    { value: "LOSE", label: "💀 Thua" },
    { value: "DRAW", label: "🤝 Hòa" },
  ];

  return (
    <div className="admin-layout">
      {toast && <div className={`admin-toast ${toast.type}`}>{toast.type === "success" ? "✅" : "❌"} {toast.msg}</div>}

      {confirmModal && (
        <div className="admin-confirm-overlay">
          <div className="admin-confirm-card">
            <div className="admin-confirm-icon">⚠️</div>
            <p className="admin-confirm-msg">{confirmModal.message}</p>
            <div className="admin-confirm-actions">
              <button className="admin-confirm-btn cancel" onClick={() => setConfirmModal(null)}>Hủy</button>
              <button className="admin-confirm-btn ok" onClick={() => { setConfirmModal(null); confirmModal.onConfirm(); }}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      <aside className="admin-sidebar">
        <div className="admin-brand" onClick={() => navigate("/home")} style={{ cursor: "pointer" }}>
          <img src="https://media4.giphy.com/media/CFaGnXWf6GABHKKZcC/giphy.gif" alt="Logo" className="admin-logo" />
          <div>
            <span className="admin-brand-name">WEB<span className="gold">BETTING</span></span>
            <span className="admin-badge">ADMIN</span>
          </div>
        </div>
        <nav className="admin-nav">
          {TABS.map(tab => (
            <button key={tab.id} className={`admin-nav-item ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              <span className="nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button className="btn-back-home" onClick={() => navigate("/home")}>← VỀ SẢNH GAME</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1 className="admin-page-title">{TABS.find(t => t.id === activeTab)?.icon} {TABS.find(t => t.id === activeTab)?.label}</h1>
          <div className="admin-header-right">
            <ExportButton
              endpoint="/admin/export/users"
              params={{ keyword: activeTab === "users" ? userKeyword || undefined : undefined, active: activeTab === "users" ? userActiveFilter || undefined : undefined }}
              currentPageData={users}
              csvHeaders={["ID","Username","Nickname","Role","Balance","Status","Ngay Tao"]}
              csvRow={u => [u.id, u.username, u.nickname, u.role, u.balance, u.active ? "Active" : "Locked", u.createdAt ? new Date(u.createdAt).toLocaleDateString("vi-VN") : ""]}
              filename="users"
            />
            <span className="admin-user-badge">👑 adminK</span>
          </div>
        </header>

        <div className="admin-content">

          {activeTab === "dashboard" && (
            <div className="admin-dashboard">
              <div className="stats-grid">
                <StatCard icon="👥" label="Tổng Người Dùng" value={stats?.totalUsers ?? "..."} color="blue" />
                <StatCard icon="✅" label="Đang Hoạt Động" value={stats?.activeUsers ?? "..."} color="green" onClick={() => { setUserActiveFilter("true"); setActiveTab("users"); }} clickable />
                <StatCard icon="🔒" label="Bị Khóa" value={stats?.lockedUsers ?? "..."} color="red" onClick={() => { setUserActiveFilter("false"); setActiveTab("users"); }} clickable />
                <StatCard icon="💰" label="Tổng KGT Hệ Thống" value={stats ? Number(stats.totalBalance).toLocaleString() : "..."} color="gold" />
                <StatCard icon="🎲" label="Cược Hôm Nay" value={stats?.todayBets ?? "..."} color="purple" />
                <StatCard icon="📦" label="Tổng Lượt Cược" value={stats?.totalBets ?? "..."} color="orange" />
              </div>
              {userStats && (
                <div className="stats-section-row">
                  <div className="stats-box">
                    <h3>Phân Loại Theo Role</h3>
                    {Object.entries(userStats.byRole || {}).map(([role, count]) => (
                      <div key={role} className="stat-row"><span>{role}</span><span className="gold">{count}</span></div>
                    ))}
                  </div>
                  <div className="stats-box">
                    <h3>Trạng Thái Hoạt Động</h3>
                    {Object.entries(userStats.byActivity || {}).map(([status, count]) => (
                      <div key={status} className="stat-row">
                        <span>{status === "ACTIVE" ? "✅ Hoạt động" : "🔒 Bị khóa"}</span>
                        <span className="gold">{count}</span>
                      </div>
                    ))}
                  </div>
                  <div className="stats-box">
                    <h3>Số Dư Trung Bình</h3>
                    <div className="big-stat gold">{Number(userStats.averageBalance || 0).toLocaleString()} KGT</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "users" && (
            <div className="admin-users">
              <FilterBar
                filters={[
                  { type: "search", key: "keyword", placeholder: "Tìm username, nickname..." },
                  { type: "dropdown", key: "active", label: "Trạng thái", options: [{ value: "", label: "Tất cả" }, { value: "true", label: "✅ Hoạt động" }, { value: "false", label: "🔒 Bị khóa" }] },
                ]}
                values={{ keyword: userKeyword, active: userActiveFilter }}
                onChange={(k, v) => { if (k === "keyword") { setUserKeyword(v); setUserPage(0); } else { setUserActiveFilter(v); setUserPage(0); } }}
                onClear={() => { setUserKeyword(""); setUserActiveFilter(""); setUserPage(0); }}
              />
              <div className="users-layout">
                <div className="users-table-wrap">
                  <table className="admin-table">
                    <thead><tr><th>ID</th><th>Username</th><th>Nickname</th><th>Số Dư</th><th>Trạng Thái</th><th>Ngày Tạo</th><th>Thao Tác</th></tr></thead>
                    <tbody>
                      {users.length === 0 && <tr><td colSpan={7} className="empty-row">Không có dữ liệu</td></tr>}
                      {users.map(u => (
                        <tr key={u.id} className={selectedUser?.id === u.id ? "selected" : ""} onClick={() => setSelectedUser(u)} style={{ cursor: "pointer" }}>
                          <td className="dim">#{u.id}</td>
                          <td className="bold">{u.username}</td>
                          <td>{u.nickname}</td>
                          <td className="gold bold">{Number(u.balance).toLocaleString()}</td>
                          <td><span className={`status-pill ${u.active ? "active" : "locked"}`}>{u.active ? "✅ Active" : "🔒 Locked"}</span></td>
                          <td className="dim">{fmtDate(u.createdAt)}</td>
                          <td onClick={e => e.stopPropagation()}>
                            <button className={`btn-action ${u.active ? "lock" : "unlock"}`} onClick={() => handleLockUser(u.id, u.active)} disabled={actionLoading}>
                              {u.active ? "Khóa" : "Mở"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="pagination">
                    <button disabled={userPage === 0} onClick={() => setUserPage(p => p - 1)}>‹</button>
                    <span>Trang {userPage + 1} / {userTotalPages || 1}</span>
                    <button disabled={userPage >= userTotalPages - 1} onClick={() => setUserPage(p => p + 1)}>›</button>
                  </div>
                </div>
                {selectedUser && (
                  <div className="user-detail-panel">
                    <div className="panel-header">
                      <h3>Chi Tiết</h3>
                      <button className="btn-close-panel" onClick={() => setSelectedUser(null)}>×</button>
                    </div>
                    <div className="user-detail-avatar">
                      <img src={`https://ui-avatars.com/api/?name=${selectedUser.nickname}&background=ffcc00&color=000&size=80`} alt="avatar" />
                      <div>
                        <div className="bold">{selectedUser.nickname}</div>
                        <div className="dim">@{selectedUser.username}</div>
                        <span className={`role-badge ${selectedUser.role?.toLowerCase()}`}>{selectedUser.role}</span>
                      </div>
                    </div>
                    <div className="detail-balance">
                      <span className="dim">Số dư hiện tại</span>
                      <span className="gold big-num">{Number(selectedUser.balance).toLocaleString()} KGT</span>
                    </div>
                    <div className="panel-section">
                      <label>💰 Nạp KGT</label>
                      <div className="input-row">
                        <input type="number" placeholder="Nhập..." value={topupAmount} onChange={e => setTopupAmount(e.target.value)} />
                        <button className="btn-panel-action topup" onClick={handleTopUp} disabled={actionLoading}>Nạp</button>
                      </div>
                    </div>
                    <div className="panel-section">
                      <label>✏️ Đặt Số Dư</label>
                      <div className="input-row">
                        <input type="number" placeholder="Số dư mới..." value={setBalanceAmount} onChange={e => setSetBalanceAmount(e.target.value)} />
                        <button className="btn-panel-action set" onClick={handleSetBalance} disabled={actionLoading}>Đặt</button>
                      </div>
                    </div>
                    <div className="panel-actions">
                      <button className="btn-panel-action reset" onClick={handleResetBalance} disabled={actionLoading}>🔄 Reset về 1,000</button>
                      <button className={`btn-panel-action ${selectedUser.active ? "lock" : "unlock"}`} onClick={() => handleLockUser(selectedUser.id, selectedUser.active)} disabled={actionLoading}>
                        {selectedUser.active ? "🔒 Khóa TK" : "🔓 Mở TK"}
                      </button>
                      <button className="btn-panel-action delete" onClick={() => handleDeleteUser(selectedUser.id)} disabled={actionLoading}>🗑️ Xóa</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "bets" && (
            <div className="admin-bets">
              <FilterBar
                filters={[
                  { type: "search", key: "username", placeholder: "Tìm username..." },
                  { type: "dropdown", key: "result", label: "Kết quả", options: RESULT_OPTS },
                  { type: "date", key: "date", label: "Ngày" },
                ]}
                values={{ username: betUsernameFilter, result: betResultFilter, date: betDateFilter }}
                onChange={(k, v) => {
                  if (k === "username") { setBetUsernameFilter(v); setBetPage(0); }
                  else if (k === "result") { setBetResultFilter(v); setBetPage(0); }
                  else { setBetDateFilter(v); setBetPage(0); }
                }}
                onClear={() => { setBetUsernameFilter(""); setBetGameFilter(""); setBetResultFilter(""); setBetDateFilter(""); setBetPage(0); }}
              />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Người Chơi</th><th>Game</th><th>Mức Cược</th><th>Kết Quả</th><th>Số Dư Sau</th><th>Thời Gian</th></tr></thead>
                <tbody>
                  {bets.length === 0 && <tr><td colSpan={7} className="empty-row">Không có dữ liệu</td></tr>}
                  {bets.map(b => (
                    <tr key={b.id}>
                      <td className="dim">#{b.id}</td>
                      <td className="bold">{b.username || b.userId}</td>
                      <td><span className="game-badge">{b.game}</span></td>
                      <td className="gold bold">{Number(b.betAmount || 0).toLocaleString()}</td>
                      <td>{resultBadge(b.result)}</td>
                      <td className="dim">{Number(b.balanceAfter || 0).toLocaleString()}</td>
                      <td className="dim">{fmtDateTime(b.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled={betPage === 0} onClick={() => setBetPage(p => p - 1)}>‹</button>
                <span>Trang {betPage + 1} / {betTotalPages || 1}</span>
                <button disabled={betPage >= betTotalPages - 1} onClick={() => setBetPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}

          {activeTab === "caro" && (
            <div className="admin-bets">
              <FilterBar
                filters={[
                  { type: "search", key: "username", placeholder: "Tìm username..." },
                  { type: "dropdown", key: "result", label: "Kết quả", options: RESULT_OPTS },
                  { type: "dropdown", key: "opponentType", label: "Chế Độ", options: [
                    { value: "", label: "Tất cả" },
                    { value: "AI", label: "🤖 AI" },
                    { value: "PVP", label: "👥 PvP" },
                  ]},
                  { type: "date", key: "date", label: "Ngày" },
                ]}
                values={{ username: caroUsername, result: caroResult, opponentType: caroOpponent, date: caroDate }}
                onChange={(k, v) => {
                  if (k === "username") { setCaroUsername(v); setCaroPage(0); }
                  else if (k === "result") { setCaroResult(v); setCaroPage(0); }
                  else if (k === "opponentType") { setCaroOpponent(v); setCaroPage(0); }
                  else { setCaroDate(v); setCaroPage(0); }
                }}
                onClear={() => { setCaroUsername(""); setCaroResult(""); setCaroOpponent(""); setCaroDate(""); setCaroPage(0); }}
              />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Người Chơi</th><th>Chế Độ</th><th>Độ Khó</th><th>Cược</th><th>Kết Quả</th><th>Kết Thúc</th></tr></thead>
                <tbody>
                  {caro.length === 0 && <tr><td colSpan={7} className="empty-row">Không có dữ liệu</td></tr>}
                  {caro.map(g => (
                    <tr key={g.id}>
                      <td className="dim">#{g.id}</td>
                      <td className="bold">{g.username}</td>
                      <td className="dim">{g.opponentType === "AI" ? "🤖 AI" : "👥 PvP"}</td>
                      <td className="dim">{g.difficulty || "-"}</td>
                      <td className="gold bold">{Number(g.betAmount || 0).toLocaleString()}</td>
                      <td>{resultBadge(g.gameResult)}</td>
                      <td className="dim">{fmtDateTime(g.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled={caroPage === 0} onClick={() => setCaroPage(p => p - 1)}>‹</button>
                <span>Trang {caroPage + 1} / {caroTotalPages || 1}</span>
                <button disabled={caroPage >= caroTotalPages - 1} onClick={() => setCaroPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}

          {activeTab === "chess" && (
            <div className="admin-bets">
              <FilterBar
                filters={[
                  { type: "search", key: "username", placeholder: "Tìm username..." },
                  { type: "dropdown", key: "result", label: "Kết quả", options: RESULT_OPTS },
                  { type: "dropdown", key: "difficulty", label: "Độ Khó", options: [
                    { value: "", label: "Tất cả" },
                    { value: "Easy", label: "😊 Dễ" },
                    { value: "Medium", label: "🧠 Trung bình" },
                    { value: "Hard", label: "🤖 Khó" },
                  ]},
                  { type: "date", key: "date", label: "Ngày" },
                ]}
                values={{ username: chessUsername, result: chessResult, difficulty: chessDifficulty, date: chessDate }}
                onChange={(k, v) => {
                  if (k === "username") { setChessUsername(v); setChessPage(0); }
                  else if (k === "result") { setChessResult(v); setChessPage(0); }
                  else if (k === "difficulty") { setChessDifficulty(v); setChessPage(0); }
                  else { setChessDate(v); setChessPage(0); }
                }}
                onClear={() => { setChessUsername(""); setChessResult(""); setChessDifficulty(""); setChessDate(""); setChessPage(0); }}
              />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Người Chơi</th><th>Độ Khó</th><th>Màu Quân</th><th>Cược</th><th>Kết Quả</th><th>Số Nước</th><th>Thời Gian</th></tr></thead>
                <tbody>
                  {chess.length === 0 && <tr><td colSpan={8} className="empty-row">Không có dữ liệu</td></tr>}
                  {chess.map(g => (
                    <tr key={g.id}>
                      <td className="dim">#{g.id}</td>
                      <td className="bold">{g.username}</td>
                      <td className="dim">{g.difficulty}</td>
                      <td className="dim">{g.playerColor === "white" ? "⬜ Trắng" : "⬛ Đen"}</td>
                      <td className="gold bold">{Number(g.stakeAmount || 0).toLocaleString()}</td>
                      <td>{resultBadge(g.gameResult)}</td>
                      <td className="dim">{g.moveCount}</td>
                      <td className="dim">{fmtDateTime(g.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled={chessPage === 0} onClick={() => setChessPage(p => p - 1)}>‹</button>
                <span>Trang {chessPage + 1} / {chessTotalPages || 1}</span>
                <button disabled={chessPage >= chessTotalPages - 1} onClick={() => setChessPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}

          {activeTab === "topup" && (
            <div className="admin-bets">
              <FilterBar
                filters={[
                  { type: "search", key: "username", placeholder: "Tìm username..." },
                  { type: "dropdown", key: "createdBy", label: "Nguồn", options: [
                    { value: "", label: "Tất cả" },
                    { value: "USER", label: "👤 Người dùng" },
                    { value: "ADMIN", label: "👑 Admin" },
                  ]},
                  { type: "date", key: "date", label: "Ngày" },
                ]}
                values={{ username: topupUsername, createdBy: topupCreatedBy, date: topupDate }}
                onChange={(k, v) => {
                  if (k === "username") { setTopupUsername(v); setTopupPage(0); }
                  else if (k === "createdBy") { setTopupCreatedBy(v); setTopupPage(0); }
                  else { setTopupDate(v); setTopupPage(0); }
                }}
                onClear={() => { setTopupUsername(""); setTopupCreatedBy(""); setTopupDate(""); setTopupPage(0); }}
              />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Người Dùng</th><th>Số Tiền</th><th>Trước</th><th>Sau</th><th>Nguồn</th><th>Phương Thức</th><th>Thời Gian</th></tr></thead>
                <tbody>
                  {topups.length === 0 && <tr><td colSpan={8} className="empty-row">Không có dữ liệu</td></tr>}
                  {topups.map(t => (
                    <tr key={t.id}>
                      <td className="dim">#{t.id}</td>
                      <td className="bold">{t.username}</td>
                      <td className="gold bold">+{Number(t.amount || 0).toLocaleString()}</td>
                      <td className="dim">{Number(t.balanceBefore || 0).toLocaleString()}</td>
                      <td className="dim">{Number(t.balanceAfter || 0).toLocaleString()}</td>
                      <td><span className={`status-pill ${t.createdBy === "ADMIN" ? "locked" : "active"}`}>{t.createdBy === "ADMIN" ? "👑 Admin" : "👤 User"}</span></td>
                      <td className="dim">{t.method || "-"}</td>
                      <td className="dim">{fmtDateTime(t.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled={topupPage === 0} onClick={() => setTopupPage(p => p - 1)}>‹</button>
                <span>Trang {topupPage + 1} / {topupTotalPages || 1}</span>
                <button disabled={topupPage >= topupTotalPages - 1} onClick={() => setTopupPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="admin-bets">
              <FilterBar
                filters={[
                  { type: "dropdown", key: "action", label: "Hành động", options: [
                    { value: "", label: "Tất cả" },
                    { value: "LOCK_USER", label: "🔒 Khóa TK" },
                    { value: "UNLOCK_USER", label: "🔓 Mở khóa" },
                    { value: "DELETE_USER", label: "🗑️ Xóa user" },
                    { value: "TOP_UP", label: "💰 Nạp tiền" },
                    { value: "SET_BALANCE", label: "✏️ Đặt số dư" },
                    { value: "RESET_BALANCE", label: "🔄 Reset số dư" },
                  ]},
                  { type: "date", key: "date", label: "Ngày" },
                ]}
                values={{ action: logAction, date: logDate }}
                onChange={(k, v) => {
                  if (k === "action") { setLogAction(v); setLogPage(0); }
                  else { setLogDate(v); setLogPage(0); }
                }}
                onClear={() => { setLogAction(""); setLogDate(""); setLogPage(0); }}
              />
              <table className="admin-table">
                <thead><tr><th>ID</th><th>Admin ID</th><th>Hành Động</th><th>Target User</th><th>Số Tiền</th><th>Mô Tả</th><th>Thời Gian</th></tr></thead>
                <tbody>
                  {logs.length === 0 && <tr><td colSpan={7} className="empty-row">Không có dữ liệu</td></tr>}
                  {logs.map(l => (
                    <tr key={l.id}>
                      <td className="dim">#{l.id}</td>
                      <td className="dim">#{l.adminId}</td>
                      <td><span className="game-badge">{l.action}</span></td>
                      <td className="dim">{l.targetUserId ? `#${l.targetUserId}` : "-"}</td>
                      <td className={l.amount ? "gold bold" : "dim"}>{l.amount ? Number(l.amount).toLocaleString() : "-"}</td>
                      <td className="dim" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</td>
                      <td className="dim">{fmtDateTime(l.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pagination">
                <button disabled={logPage === 0} onClick={() => setLogPage(p => p - 1)}>‹</button>
                <span>Trang {logPage + 1} / {logTotalPages || 1}</span>
                <button disabled={logPage >= logTotalPages - 1} onClick={() => setLogPage(p => p + 1)}>›</button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, color, onClick, clickable }) {
  return (
    <div className={`stat-card ${color}${clickable ? " clickable" : ""}`} onClick={onClick} style={clickable ? { cursor: "pointer" } : {}}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-info">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {clickable && <div className="stat-hint">Xem danh sách →</div>}
      </div>
    </div>
  );
}
