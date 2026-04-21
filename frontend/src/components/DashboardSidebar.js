import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Home.css";

/**
 * Props:
 *   open        – boolean, controlled từ parent
 *   onClose     – fn đóng sidebar
 *   extraMenuGroups – JSX thêm vào giữa
 */
export default function DashboardSidebar({ open, onClose, extraMenuGroups }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Đóng khi navigate
  useEffect(() => { onClose?.(); }, [location.pathname]);

  // Đóng khi resize lên desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 768) onClose?.(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [onClose]);

  const isActive = (path) => location.pathname === path;

  return (
    <>
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${open ? "visible" : ""}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <img
            src="https://media4.giphy.com/media/CFaGnXWf6GABHKKZcC/giphy.gif"
            alt="Logo"
            className="sidebar-logo"
          />
          <span className="brand-name-sidebar">WEB<span className="gold">BETTING</span></span>
        </div>

        <nav className="sidebar-menu">
          <div className="menu-group">
            <span className="menu-label">MENU CHÍNH</span>
            <button className={`menu-item ${isActive("/home") ? "active" : ""}`} onClick={() => navigate("/home")}>
              <span className="menu-icon">🏠</span> Sảnh Game
            </button>
            <button className={`menu-item ${isActive("/leaderboard") ? "active" : ""}`} onClick={() => navigate("/leaderboard")}>
              <span className="menu-icon">🏆</span> Bảng Xếp Hạng
            </button>
          </div>

          <div className="menu-group">
            <span className="menu-label">GIAO DỊCH</span>
            <button className="menu-item deposit-highlight" onClick={() => navigate("/home?deposit=1")}>
              <span className="menu-icon">💰</span> Nạp KGT
            </button>
            <button className="menu-item" onClick={() => navigate("/home?history=1")}>
              <span className="menu-icon">📜</span> Lịch Sử Giao Dịch
            </button>
          </div>

          {extraMenuGroups}

          <div className="menu-group">
            <span className="menu-label">CÁ NHÂN</span>
            <button className={`menu-item ${isActive("/profile") ? "active" : ""}`} onClick={() => navigate("/profile")}>
              <span className="menu-icon">👤</span> Hồ Sơ
            </button>
            <button className={`menu-item ${isActive("/history") ? "active" : ""}`} onClick={() => navigate("/history")}>
              <span className="menu-icon">📜</span> Lịch Sử Cược
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
}
