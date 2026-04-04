import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import SocialLoginButtons from "./SocialLoginButtons";
import "../styles/casino-theme.css";
import "../styles/Login.css";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [lockedModal, setLockedModal] = useState(null); // { lockedAt }
  const [sessionModal, setSessionModal] = useState(false);
  const [winners, setWinners] = useState([
    { name: "Hoang****", game: "Tài Xỉu", win: "2,500,000" },
    { name: "Minh****", game: "Cờ Caro", win: "1,200,000" },
    { name: "An****", game: "Tài Xỉu", win: "5,800,000" },
    { name: "Quoc****", game: "Tài Xỉu", win: "850,000" },
  ]);
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.token) {
      navigate("/home");
    }
    // Kiểm tra lý do redirect về login
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "session_expired") {
      setSessionModal(true);
      // Xóa param khỏi URL
      window.history.replaceState({}, "", "/login");
    }
  }, [navigate]);

  // SIMULATE NEW WINNERS
  useEffect(() => {
    const names = ["Tuan****", "Lan****", "Binh****", "Khai****", "Nga****", "Duc****"];
    const games = ["Tài Xỉu", "Cờ Caro"];
    const interval = setInterval(() => {
      const newWinner = {
        name: names[Math.floor(Math.random() * names.length)],
        game: games[Math.floor(Math.random() * games.length)],
        win: (Math.floor(Math.random() * 100) * 50000).toLocaleString()
      };
      setWinners(prev => [newWinner, ...prev.slice(0, 3)]);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await API.post("/auth/login", { username, password });
      
      const userData = {
        ...res.data.user,
        token: res.data.token
      };
      localStorage.setItem("user", JSON.stringify(userData));
      
      setToast({ show: true, message: "🚀 Đăng nhập thành công! Đang vào sảnh...", type: "success" });
      
      setTimeout(() => {
        navigate("/home");
      }, 1500);
      
    } catch (error) {
      const data = error.response?.data;
      if (data?.code === "ACCOUNT_LOCKED") {
        setLockedModal({ lockedAt: data.lockedAt });
        setLoading(false);
        return;
      }
      const errorMsg = data?.message || "Sai tài khoản hoặc mật khẩu";
      setToast({ show: true, message: `❌ ${errorMsg}`, type: "error" });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* PREMIUM TOAST NOTIFICATION */}
      {toast.show && (
        <div className={`premium-toast ${toast.type}`}>
          <div className="toast-content">
            <span className="toast-msg">{toast.message}</span>
            <div className="toast-progress"></div>
          </div>
        </div>
      )}

      {/* LOCKED ACCOUNT MODAL */}
      {lockedModal && (
        <div className="locked-modal-overlay">
          <div className="locked-modal-card">
            <div className="locked-icon">🔒</div>
            <h2 className="locked-title">TÀI KHOẢN ĐÃ BỊ KHOÁ</h2>
            <p className="locked-desc">Lý do: Phát hiện hành vi bất thường.</p>
            <div className="locked-time-box">
              <span className="locked-time-label">Thời gian khóa</span>
              <span className="locked-time-value">{lockedModal.lockedAt}</span>
            </div>
            <p className="locked-contact">Vui lòng liên hệ hỗ trợ để được mở khóa.</p>
            <button className="locked-btn-close" onClick={() => setLockedModal(null)}>Đóng</button>
          </div>
        </div>
      )}

      {/* SESSION EXPIRED / ACCOUNT DISABLED MODAL */}
      {sessionModal && (
        <div className="locked-modal-overlay">
          <div className="locked-modal-card">
            <div className="locked-icon" style={{ background: "rgba(255,149,0,0.1)", borderColor: "rgba(255,149,0,0.3)" }}>🚫</div>
            <h2 className="locked-title" style={{ color: "#ff9500" }}>TÀI KHOẢN BỊ VÔ HIỆU HOÁ</h2>
            <p className="locked-desc">Tài khoản của bạn đã bị vô hiệu hóa hoặc phiên đăng nhập không còn hợp lệ.</p>
            <p className="locked-contact">Vui lòng liên hệ hỗ trợ nếu bạn cho rằng đây là nhầm lẫn.</p>
            <button className="locked-btn-close"
              style={{ borderColor: "rgba(255,149,0,0.3)", color: "#ff9500" }}
              onClick={() => setSessionModal(false)}>Đã hiểu</button>
          </div>
        </div>
      )}

      {/* BACKGROUND EFFECTS */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <div className="login-content">
        {/* LEFT SIDE: BRANDING & WINNERS */}
        <div className="login-teaser">
          <div className="brand-box" onClick={() => navigate("/#games")} style={{ cursor: 'pointer' }}>
            <div className="brand-main">
              <img 
                src="https://media4.giphy.com/media/CFaGnXWf6GABHKKZcC/giphy.gif" 
                className="login-logo" 
                alt="Logo" 
              />
              <h1 className="glow-text main-title">WebBetting</h1>
            </div>    
            <p className="slogan">Đẳng Cấp Cá Cược Trực Tuyến Thế Hệ Mới</p>
          </div>

          <div className="live-stats-box">
            <div className="winners-feed">
              <div className="feed-header">
                <span className="live-dot"></span>
                <span>VỪA THẮNG LỚN</span>
              </div>
              <div className="winners-list">
                {winners.map((w, i) => (
                  <div key={i} className="winner-card">
                    <div className="winner-avatar">👤</div>
                    <div className="winner-info">
                      <span className="w-name">{w.name}</span>
                      <span className="w-game">{w.game}</span>
                    </div>
                    <div className="winner-amount">+{w.win}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: LOGIN FORM */}
        <div className="login-form-wrapper">
          <div className="login-card casino-box">
            <div className="card-header">
              <h2>ĐĂNG NHẬP</h2>
              <div className="header-line"></div>
            </div>

            <form onSubmit={handleLogin} className="auth-form">
              <div className="input-group-modern">
                <span className="input-icon">👤</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Tên đăng nhập"
                  required 
                />
              </div>

              <div className="input-group-modern">
                <span className="input-icon">🔒</span>
                <input 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Mật khẩu"
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="btn-casino-lg" 
                disabled={loading}
              >
                {loading ? <span className="loader"></span> : "VÀO SẢNH CHƠI"}
              </button>
            </form>

            <div className="card-footer">
              <span>Bạn chưa có tài khoản?</span>
              <a href="/register" className="link-highlight">Đăng ký ngay</a>
            </div>

            <SocialLoginButtons
              onSuccess={(userData) => {
                setToast({ show: true, message: "🚀 Đăng nhập thành công!", type: "success" });
                setTimeout(() => navigate("/home"), 1000);
              }}
              onError={(msg) => {
                setToast({ show: true, message: `❌ ${msg}`, type: "error" });
                setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;