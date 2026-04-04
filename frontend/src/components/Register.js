import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import SocialLoginButtons from "./SocialLoginButtons";
import "../styles/casino-theme.css";
import "../styles/Login.css";

function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });
  const [winners, setWinners] = useState([
    { name: "Hoang****", game: "Tài Xỉu", win: "2,500,000" },
    { name: "Minh****", game: "Cờ Caro", win: "1,200,000" },
    { name: "An****", game: "Tài Xỉu", win: "5,800,000" },
    { name: "Quoc****", game: "Tài Xỉu", win: "850,000" },
  ]);
  const navigate = useNavigate();

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
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const finalNickname = nickname.trim() || username;
    
    try {
      await API.post("/auth/register", { 
        username, 
        password, 
        nickname: finalNickname 
      });
      
      setToast({ show: true, message: "🎉 Đăng ký thành công! Đang chuyển hướng...", type: "success" });
      
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Tên đăng nhập đã tồn tại";
      setToast({ show: true, message: `❌ ${errorMessage}`, type: "error" });
      setTimeout(() => setToast({ ...toast, show: false }), 3000);
    } finally {
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

      {/* BACKGROUND EFFECTS */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
      
      <div className="login-content">
        {/* LEFT SIDE: BRANDING & WINNERS */}
        <div className="login-teaser">
          <div className="brand-box">
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

        {/* RIGHT SIDE: REGISTER FORM */}
        <div className="login-form-wrapper">
          <div className="login-card casino-box">
            <div className="card-header">
              <h2>ĐĂNG KÝ</h2>
              <div className="header-line"></div>
              <p className="register-promo">Nhận ngay 1,000 KGT khởi nghiệp!</p>
            </div>

            <form onSubmit={handleRegister} className="auth-form">
              <div className="input-group-modern">
                <span className="input-icon">👤</span>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  placeholder="Tên đăng nhập (Dùng để login)"
                  required 
                />
              </div>

              <div className="input-group-modern">
                <span className="input-icon">🏷️</span>
                <input 
                  type="text" 
                  value={nickname} 
                  onChange={(e) => setNickname(e.target.value)} 
                  placeholder="Tên hiển thị trong game"
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
                {loading ? <span className="loader"></span> : "TẠO TÀI KHOẢN"}
              </button>
            </form>

            <div className="card-footer">
              <span>Đã có tài khoản?</span>
              <a href="/login" className="link-highlight">Đăng nhập ngay</a>
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

export default Register;