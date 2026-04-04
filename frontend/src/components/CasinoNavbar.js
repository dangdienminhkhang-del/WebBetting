import React from "react";
import "../styles/casino-theme.css";

function CasinoNavbar() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <nav className="casino-nav">
      <div className="container nav-container">
        {/* BRAND */}
        <a href="/" className="nav-brand">
          <img 
            src="https://media4.giphy.com/media/CFaGnXWf6GABHKKZcC/giphy.gif" 
            className="brand-logo" 
            alt="Casino Logo" 
          />
          <span className="glow-text" style={{ fontSize: "1.5rem" }}>
            WebBetting
          </span>
        </a>

        {/* NAVIGATION LINKS */}
        <div className="nav-menu">
          <a href="/home" className="nav-link">🏠 Trang chủ</a>
          <a href="/taixiu" className="nav-link">🎲 Tài Xỉu</a>
          <a href="/leaderboard" className="nav-link">🏆 Bảng xếp hạng</a>
          
          {/* USER INFO */}
          {user ? (
            <div className="user-nav-info">
              <span className="text-light d-none d-lg-inline">👤 <strong>{user.nickname}</strong></span>
              <span className="text-warning">💰 {user.balance.toLocaleString()} điểm</span>
              <button 
                onClick={() => {
                  localStorage.removeItem("user");
                  window.location.href = "/login";
                }}
                className="btn-casino"
                style={{ padding: '5px 15px', minWidth: 'auto', fontSize: '0.8rem' }}
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <div className="user-nav-info">
              <a href="/login" className="nav-link">Đăng nhập</a>
              <a href="/register" className="btn-casino" style={{ padding: '5px 15px', minWidth: 'auto', fontSize: '0.8rem' }}>Đăng ký</a>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default CasinoNavbar;