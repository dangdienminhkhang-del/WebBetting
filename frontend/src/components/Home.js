import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import AiChatWidget from "./AiChatWidget";
import DashboardSidebar from "./DashboardSidebar";
import "../styles/casino-theme.css";
import "../styles/Home.css";
import { useBgMusic } from "../hooks/useSoundEngine";

function Home() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
  const [balance, setBalance] = useState(() => {
    const u = JSON.parse(localStorage.getItem("user"));
    return u?.balance || 0;
  });
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositMethod, setDepositMethod] = useState("bank");
  const [isDepositing, setIsDepositing] = useState(false);
  const [topupHistory, setTopupHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [successToast, setSuccessToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tappedCard, setTappedCard] = useState(null);
  const navigate = useNavigate();

  // Nhạc nền Home (casino lounge)
  useBgMusic('home');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData || !userData.token) {
      navigate("/login");
      return;
    }
    
    setUser(userData);
    setBalance(userData.balance || 0);
    refreshBalanceFromServer();

    const onUserUpdated = () => {
      const u = JSON.parse(localStorage.getItem("user"));
      if (u) { setUser(u); setBalance(u.balance || 0); }
    };
    window.addEventListener("storage", onUserUpdated);
    window.addEventListener("userUpdated", onUserUpdated);
    return () => {
      window.removeEventListener("storage", onUserUpdated);
      window.removeEventListener("userUpdated", onUserUpdated);
    };
  }, [navigate]);

  const fetchTopupHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await API.get("/users/me/topup-history");
      // Sắp xếp lịch sử mới nhất lên đầu
      const sortedData = res.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setTopupHistory(sortedData);
    } catch (error) {
      console.error("❌ Lỗi lấy lịch sử giao dịch:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    setShowHistoryModal(true);
    fetchTopupHistory();
  };

  const refreshBalanceFromServer = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (!userData) return;
      const res = await API.get(`/users/${userData.id}`);
      // Lấy balance và avatarUrl từ server, giữ token và các field khác từ localStorage
      const updatedUser = {
        ...userData,
        balance: res.data.balance,
        nickname: res.data.nickname,
        avatarUrl: res.data.avatarUrl ?? userData.avatarUrl,
      };
      setBalance(updatedUser.balance);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("❌ Lỗi cập nhật số dư:", error);
    }
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    setIsDepositing(true);
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      // Gọi API nạp tiền cho chính mình kèm theo phương thức
      await API.post("/users/me/topup", { 
        amount,
        method: depositMethod 
      });
      
      setSuccessToast(`🎉 Nạp thành công ${amount.toLocaleString()} KGT qua ${depositMethod.toUpperCase()}!`);
      setTimeout(() => setSuccessToast(null), 1200);
      
      setShowDepositModal(false);
      setDepositAmount("");
      refreshBalanceFromServer();
    } catch (error) {
      console.error("❌ Lỗi nạp tiền:", error);
      alert("Nạp tiền thất bại, vui lòng thử lại sau");
    } finally {
      setIsDepositing(false);
    }
  };

  if (!user) return <div className="loader-container"><div className="loader"></div></div>;

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const games = [
    {
      id: "taixiu",
      title: "TÀI XỈU 3D",
      path: "/taixiu-lottie",
      category: "hot",
      tag: "POPULAR",
      players: "12,458",
      className: "taixiu-card"
    },
    {
      id: "caro",
      title: "CỜ CARO",
      path: "/caro",
      category: "table",
      tag: "STRATEGY",
      players: "8,210",
      className: "caro-card"
    },
    {
      id: "chess",
      title: "CỜ VUA",
      path: "/chess",
      category: "table",
      tag: "GRANDMASTER",
      players: "5,430",
      className: "chess-card"
    }
  ];

  const filteredGames = games.filter(game => {
    const matchesTab = activeTab === "all" || game.category === activeTab;
    const matchesSearch = game.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="dashboard-layout">
      {/* TOAST NOTIFICATION */}
      {successToast && (
        <div className="success-toast-overlay">
          <div className="success-toast-card">
            <div className="success-toast-icon">✅</div>
            <div className="success-toast-message">{successToast}</div>
          </div>
        </div>
      )}

      {/* SIDEBAR NAVIGATION */}
      <DashboardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        extraMenuGroups={
          <div className="menu-group">
            <span className="menu-label">GIAO DỊCH</span>
            <button className="menu-item deposit-highlight" onClick={() => setShowDepositModal(true)}>
              <span className="menu-icon">💰</span> Nạp KGT
            </button>
            <button className="menu-item" onClick={handleOpenHistory}>
              <span className="menu-icon">📜</span> Lịch Sử Giao Dịch
            </button>
          </div>
        }
      />

      {/* MAIN CONTENT AREA */}
      <main className="dashboard-main">
        {/* TOP USER HEADER */}
        <header className="dashboard-header">
          <div className="header-search">
             <span className="search-icon">🔍</span>
             <input 
               type="text" 
               placeholder="Tìm kiếm trò chơi..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>

          <div className="header-user-actions">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(v => !v)}>☰</button>
            {user?.username === "adminK" && (
              <button className="btn-admin-header" onClick={() => navigate("/admin")}>
                👑 ADMIN
              </button>
            )}
            <button className="btn-topup-header" onClick={() => setShowDepositModal(true)} style={{ padding: '8px 15px', fontSize: '0.75rem', minWidth: '70px' }}>
               <span></span>NẠP KGT
            </button>

            <div className="wallet-card" onClick={refreshBalanceFromServer}>
              <span className="wallet-label">SỐ DƯ</span>
              <div className="wallet-amount">
                <span className="gold">{balance.toLocaleString()}</span>
                <span className="unit">KGT</span>
              </div> 
            </div>

            <div className="user-profile-mini">
              <div className="user-avatar">
                <img src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nickname||"?")}&background=ffcc00&color=000`} alt="Avatar" />
                <span className="online-indicator"></span>
              </div>
              <div className="user-meta">
                <span className="user-name">{user.nickname}</span>
                <span className="user-level">VIP  1</span>
              </div>
              <button className="btn-logout-premium" onClick={handleLogout}> 
                <span className="logout-text">ĐĂNG XUẤT</span>
              </button>
            </div>
          </div>
        </header>

        {/* CONTENT WRAPPER */}
        <div className="dashboard-content">
          {/* GAME CATEGORIES */}
          <div className="lobby-categories">
             <button className={`cat-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>TẤT CẢ</button>
             <button className={`cat-item ${activeTab === 'hot' ? 'active' : ''}`} onClick={() => setActiveTab('hot')}>HOT 🔥</button>
             <button className={`cat-item ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>TABLE GAMES</button>
          </div>

          {/* GAMES GRID */}
          <div className="lobby-games-grid">
            {filteredGames.length > 0 ? (
              filteredGames.map(game => {
                const isTapped = tappedCard === game.id;
                return (
                  <div
                    key={game.id}
                    className={`game-card-premium ${game.className} ${isTapped ? "card-tapped" : ""}`}
                    onClick={() => {
                      // Trên desktop click ngoài nút sẽ không làm gì
                      // Trên mobile: tap lần 1 mở options, tap lần 2 đóng
                      setTappedCard(isTapped ? null : game.id);
                    }}
                  >
                    <div className="game-card-bg"></div>
                    <div className="game-card-overlay">
                      <span className="game-tag">{game.tag}</span>
                      <div className="game-card-content">
                        <h3 className={game.id === 'taixiu' ? 'taixiu-title' : 'game-title'}>
                          {game.title}
                        </h3>
                        <p className={game.id === 'taixiu' ? 'taixiu-players' : 'game-players'}>
                          {game.players} Người đang chơi
                        </p>
                      </div>

                      {game.id === 'taixiu' && (
                        <button
                          className="btn-play-game"
                          onClick={e => { e.stopPropagation(); navigate(game.path); }}
                        >
                          CHƠI NGAY
                        </button>
                      )}

                      {(game.id === 'caro' || game.id === 'chess') && (
                        <div className="game-options-hover">
                          <button
                            className="btn-option pvp"
                            onClick={e => { e.stopPropagation(); navigate(`${game.path}?mode=pvp`); }}
                          >
                            <span className="icon">👥</span> CHƠI VỚI NGƯỜI
                          </button>
                          <button
                            className="btn-option pve"
                            onClick={e => { e.stopPropagation(); navigate(`${game.path}?mode=ai`); }}
                          >
                            <span className="icon">🤖</span> CHƠI VỚI MÁY
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-games-found" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '50px', color: 'rgba(255,255,255,0.3)' }}>
                <h3>Không tìm thấy trò chơi phù hợp</h3>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DEPOSIT MODAL */}
      {showDepositModal && (
        <div className="premium-modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="premium-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>NẠP TIỀN VÀO TÀI KHOẢN</h3>
              <button className="btn-close-modal" onClick={() => setShowDepositModal(false)}>×</button>
            </div>
            
            <form onSubmit={handleDeposit} className="deposit-form">
              <div className="method-selector">
                <div 
                  className={`method-item ${depositMethod === 'bank' ? 'active' : ''}`}
                  onClick={() => setDepositMethod('bank')}
                >
                  <span className="method-icon">🏦</span>
                  <span className="method-name">Ngân Hàng</span>
                </div>
                <div 
                  className={`method-item ${depositMethod === 'momo' ? 'active' : ''}`}
                  onClick={() => setDepositMethod('momo')}
                >
                  <span className="method-icon">🧧</span>
                  <span className="method-name">Ví MoMo</span>
                </div>
                <div 
                  className={`method-item ${depositMethod === 'card' ? 'active' : ''}`}
                  onClick={() => setDepositMethod('card')}
                >
                  <span className="method-icon">💳</span>
                  <span className="method-name">Thẻ Cào</span>
                </div>
              </div>

              <div className="amount-input-group">
                <label>Số tiền muốn nạp </label>
                <div className="input-with-symbol">
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={e => setDepositAmount(e.target.value)}
                    placeholder="Nhập số tiền..."
                    required
                  />
                  <span className="input-symbol">VND</span>
                </div>
                <div className="quick-amounts">
                  {[50000, 100000, 200000, 500000].map(amt => (
                    <button 
                      key={amt} 
                      type="button"
                      className="btn-quick-amt"
                      onClick={() => setDepositAmount(amt.toString())}
                    >
                      +{amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="deposit-info-box">
                <p>💡 Tỷ lệ quy đổi: 1,000 VNĐ = 1,000 KGT</p>
                <p>⚡ Nạp tiền tự động, xử lý trong 1 giây.</p>
              </div>

              <button type="submit" className="btn-confirm-deposit" disabled={isDepositing}>
                {isDepositing ? <span className="loader-small"></span> : "XÁC NHẬN NẠP TIỀN"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION HISTORY MODAL */}
      {showHistoryModal && (
        <div className="premium-modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="premium-modal-card history-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>LỊCH SỬ GIAO DỊCH</h3>
              <button className="btn-close-modal" onClick={() => setShowHistoryModal(false)}>×</button>
            </div>
            
            <div className="modal-body history-body">
              {isLoadingHistory ? (
                <div className="loader-center"><div className="loader-small"></div></div>
              ) : topupHistory.length === 0 ? (
                <div className="empty-history">
                   <span className="empty-icon">💸</span>
                   <p>Bạn chưa có giao dịch nào.</p>
                </div>
              ) : (
                <div className="history-table-container">
                  <table className="premium-table">
                    <thead>
                      <tr>
                        <th>Ngày Giao Dịch</th>
                        <th>Phương Thức</th>
                        <th>Số Tiền</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topupHistory.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <div className="date-cell">
                              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                              <span className="time-sub">{new Date(item.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`method-badge ${item.method}`}>
                              {item.method === 'bank' ? '🏦 Ngân Hàng' : 
                               item.method === 'momo' ? '🧧 MoMo' : 
                               item.method === 'card' ? '💳 Thẻ Cào' : item.method}
                            </span>
                          </td>
                          <td className="amount-cell gold">+{item.amount.toLocaleString()} KGT</td>
                          <td>
                            <span className="status-badge success">Thành công</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* AI CHAT WIDGET */}
      <AiChatWidget />
    </div>
  );
}

export default Home;