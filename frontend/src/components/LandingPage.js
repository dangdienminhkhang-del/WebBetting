import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AiChatWidget from "./AiChatWidget";
import "../styles/casino-theme.css";
import "../styles/Login.css";
import { useBgMusic } from "../hooks/useSoundEngine";

function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState(null);

  // Nhạc nền Landing (ambient chill)
  useBgMusic('landing');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);

    // Check auth state
    const userData = JSON.parse(localStorage.getItem("user"));
    if (userData && userData.token) {
      setUser(userData);
    }

    // Handle hash scroll for #games
    if (window.location.hash === "#games") {
      const element = document.getElementById("games");
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleStartAction = (targetPath = "/home") => {
    if (user) {
      navigate(targetPath);
    } else {
      navigate("/login");
    }
  };

  const [guideModal, setGuideModal] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login");
  };

  const GUIDES = {
    taixiu: {
      title: "🎲 Luật Chơi Tài Xỉu",
      sections: [
        { heading: "Cách chơi", content: "Đặt cược vào Tài (11-18) hoặc Xỉu (3-10). Hệ thống lắc 3 xúc xắc, tổng điểm quyết định kết quả." },
        { heading: "Thắng/Thua", content: "Đoán đúng → thắng gấp đôi tiền cược. Đoán sai → mất tiền cược." },
        { heading: "Lưu ý", content: "Tổng = 3 hoặc 18 (ba cùng số) là trường hợp đặc biệt. Chơi có trách nhiệm, đặt cược vừa phải." },
      ]
    },
    caro: {
      title: "⬜ Luật Chơi Cờ Caro",
      sections: [
        { heading: "Mục tiêu", content: "Tạo thành 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo trước đối thủ." },
        { heading: "Cách chơi", content: "Hai người chơi lần lượt đặt quân X và O lên bàn cờ. Người đi trước dùng X." },
        { heading: "Chế độ", content: "PvP: đấu với người thật qua mạng. AI: luyện tập với máy 3 cấp độ Dễ / Trung bình / Khó." },
        { heading: "Cược", content: "Đặt cược KGT trước khi vào ván. Thắng nhận gấp đôi, thua mất cược." },
      ]
    },
    chess: {
      title: "♟️ Luật Chơi Cờ Vua",
      sections: [
        { heading: "Mục tiêu", content: "Chiếu hết vua đối thủ. Khi vua bị chiếu mà không có nước đi hợp lệ nào → thua." },
        { heading: "Các quân cờ", content: "Vua (K), Hậu (Q), Xe (R), Tượng (B), Mã (N), Tốt (P). Mỗi quân có cách di chuyển riêng." },
        { heading: "Thời gian", content: "Mỗi bên có giới hạn thời gian (3/5/10 phút). Hết giờ → thua. Có thể cộng thêm giây mỗi nước." },
        { heading: "Cược", content: "Đặt cược KGT trước ván. Thắng nhận gấp đôi, hòa hoàn cược, thua mất cược." },
      ]
    },
    howto: {
      title: "📖 Hướng Dẫn Sử Dụng",
      sections: [
        { heading: "1. Tạo tài khoản", content: "Nhấn 'Tham gia ngay' → điền username, mật khẩu, nickname. Tài khoản mới nhận 1,000 KGT miễn phí." },
        { heading: "2. Nạp KGT", content: "Vào Sảnh Game → Nạp KGT → chọn phương thức (Ngân hàng / MoMo / Thẻ cào) → nhập số tiền." },
        { heading: "3. Chọn game & đặt cược", content: "Chọn trò chơi yêu thích, nhập mức cược, chọn chế độ PvP hoặc AI rồi bắt đầu." },
        { heading: "4. Chat & AI hỗ trợ", content: "Trong ván PvP có thể chat với đối thủ. Nút 🤖 ở góc màn hình để hỏi AI gợi ý nước đi." },
      ]
    },
  };

  return (
    <div className="landing-premium">
      {/* PRE-LOADER / OVERLAY EFFECTS */}
      <div className="vignette-overlay"></div>
      <div className="scanline-effect"></div>

      {/* STICKY NAV */}
      <nav className={`premium-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="nav-container">
          <div className="brand-main" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} style={{ cursor: 'pointer' }}>
            <img src="https://media4.giphy.com/media/CFaGnXWf6GABHKKZcC/giphy.gif" className="premium-logo" alt="Logo" />
            <span className="brand-name">WEB<span className="gold">BETTING</span></span>
          </div>
          <div className="nav-links">
            <button
              className="nav-ai-btn"
              onClick={() => window.dispatchEvent(new Event("openAiChat"))}
              title="Trợ lý AI"
            >
              🤖 TRỢ LÝ AI
            </button>
            <a href="#games">TRÒ CHƠI</a>
            <a href="#features">TÍNH NĂNG</a>
            <a href="#about">VỀ CHÚNG TÔI</a>
            {user ? (
              <div className="user-nav-auth">
                <div className="user-info-landing" onClick={() => navigate("/home")}>
                  <span className="u-name">👤 {user.nickname}</span>
                  <span className="u-balance">💰 {user.balance?.toLocaleString()} KGT</span>
                </div>
                <button className="btn-join-premium" onClick={() => navigate("/home")}>VÀO SẢNH</button>
                <button className="btn-logout-landing" onClick={handleLogout}>ĐĂNG XUẤT</button>
              </div>
            ) : (
              <>
                <button className="btn-login-outline" onClick={() => navigate("/login")}>ĐĂNG NHẬP</button>
                <button className="btn-join-premium" onClick={() => navigate("/register")}>THAM GIA NGAY</button>
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button className="nav-hamburger" onClick={() => setMobileNavOpen(true)}>☰</button>
        </div>
      </nav>

      {/* HERO VIDEO/IMAGE SECTION */}
      <section className="hero-premium">
        <div className="hero-video-bg">
           {/* Giả lập video background bằng một gradient động hoặc hình ảnh chất lượng cao */}
           <div className="animated-bg-gradient"></div>
        </div>
        
        <div className="hero-main-content">
          <h1 className="hero-title-premium">
            TRẢI NGHIỆM <br className="title-sep"/>
            <span className="text-stroke">ĐẲNG CẤP</span> <span className="gold-gradient">CASINO</span>
          </h1>
          <p className="hero-desc-premium">
            Tham gia ngay và trải nghiệm cảm giác chiến thắng với hệ thống game mô phỏng chân thực.
          </p>
          <div className="hero-btns">
            <button className="btn-main-gold pulse-btn" onClick={() => handleStartAction()}>
              {user ? "VÀO SẢNH GAME" : "BẮT ĐẦU NGAY"}  
            </button>
            <div className="player-count">
              <span className="dot-live"></span>
              <span className="count">12,458</span> Người đang chơi
            </div>
          </div>
        </div>
      </section>

      {/* GAMES SHOWCASE */}
      <section id="games" className="games-showcase">
        <div className="section-head">
          <h2 className="title-md">SẢNH GAME <span className="gold">ĐỘC QUYỀN</span></h2>
           
        </div>

        <div className="game-banners-grid">
          <div className="game-banner-card taixiu-banner">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <span className="game-type">DICE GAME</span>
              <h3>TÀI XỈU 3D</h3>
              <p>Hệ thống lắc xí ngầu, công bằng và minh bạch nhất hiện nay.</p>
              <button className="btn-play-mini" onClick={() => handleStartAction("/taixiu-lottie")}>CHƠI NGAY</button>
            </div>
          </div>

          <div className="game-banner-card caro-banner">
            <div className="banner-overlay"></div>
            <div className="caro-banner-pieces">
              <div className="piece-o">O</div>
              <div className="piece-x-2">X</div>
            </div>
            <div className="banner-content">
              <span className="game-type">STRATEGY</span>
              <h3>CỜ CARO TRÍ TUỆ</h3>
              <p>Thách đấu cùng đối thủ thực hoặc AI cấp độ Grandmaster.</p>
              <button className="btn-play-mini" onClick={() => handleStartAction("/caro")}>CHƠI NGAY</button>
            </div>
          </div>

          <div className="game-banner-card chess-banner">
            <div className="banner-overlay"></div>
            <div className="banner-content">
              <span className="game-type">GRANDMASTER</span>
              <h3>CỜ VUA ĐẲNG CẤP</h3>
              <p>Trận đấu trí đỉnh cao trên bàn cờ 64 ô huyền thoại.</p>
              <button className="btn-play-mini" onClick={() => handleStartAction("/chess")}>CHƠI NGAY</button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST & FEATURES */}
      <section id="features" className="features-section">
        <div className="section-head">
          <h2 className="title-md">TÍNH NĂNG <span className="gold">NỔI BẬT</span></h2> 
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <h4>REAL-TIME PvP</h4>
            <p>Đấu trực tiếp với người chơi khác qua WebSocket, không độ trễ, không gián đoạn.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🤖</div>
            <h4>AI THÔNG MINH</h4>
            <p>3 cấp độ AI từ dễ đến khó. Luyện tập mọi lúc, mọi nơi mà không cần đối thủ.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💰</div>
            <h4>HỆ THỐNG KGT</h4>
            <p>Đồng tiền ảo KGT dùng để đặt cược. Nạp và rút tự động, xử lý trong vài giây.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h4>BẢO MẬT CAO</h4>
            <p>JWT Authentication, mã hóa mật khẩu BCrypt, bảo vệ tài khoản 24/7.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h4>THỐNG KÊ CHI TIẾT</h4>
            <p>Theo dõi lịch sử cược, tỷ lệ thắng/thua, số dư và mọi giao dịch của bạn.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💬</div>
            <h4>CHAT TRONG TRẬN</h4>
            <p>Nhắn tin với đối thủ ngay trong ván đấu. Có AI assistant hỗ trợ gợi ý nước đi.</p>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="about-section">
        <div className="about-container">
          <div className="about-left"> 
            <h2>Nền tảng game <span className="gold">trí tuệ</span> thế hệ mới</h2>
            <p className="about-desc">
              WebBetting được xây dựng với đam mê dành cho những người yêu thích game chiến thuật.
              Chúng tôi kết hợp trải nghiệm chơi game cổ điển với công nghệ hiện đại nhất —
              từ AI thông minh đến hệ thống PvP real-time — để tạo ra một sân chơi công bằng và hấp dẫn.
            </p>
            <p className="about-desc">
              Mỗi ván cờ, mỗi lượt tài xỉu đều được xử lý minh bạch, kết quả không thể can thiệp.
              Chúng tôi tin rằng game hay nhất là game mà người chơi hoàn toàn tin tưởng.
            </p>
            <div className="about-values">
              <div className="value-item">
                <span className="value-icon">🎯</span>
                <div>
                  <strong>Công bằng tuyệt đối</strong>
                  <span>Thuật toán minh bạch, không thể gian lận</span>
                </div>
              </div>
              <div className="value-item">
                <span className="value-icon">🚀</span>
                <div>
                  <strong>Liên tục cải tiến</strong>
                  <span>Cập nhật tính năng mới mỗi tuần</span>
                </div>
              </div>
              <div className="value-item">
                <span className="value-icon">🤝</span>
                <div>
                  <strong>Cộng đồng thân thiện</strong>
                  <span>Hỗ trợ người chơi 24/7</span>
                </div>
              </div>
            </div>
          </div>

          <div className="about-right">
            <div className="game-preview-cards">
              <div className="game-preview-card" onClick={() => setGuideModal('taixiu')}>
                <div className="gpc-icon">🎲</div>
                <div className="gpc-info">
                  <span className="gpc-name">Luật Tài Xỉu</span>
                  <span className="gpc-desc">Cách chơi & quy tắc đặt cược</span>
                </div>
                <span className="gpc-arrow">›</span>
              </div>
              <div className="game-preview-card" onClick={() => setGuideModal('caro')}>
                <div className="gpc-icon">⬜</div>
                <div className="gpc-info">
                  <span className="gpc-name">Luật Cờ Caro</span>
                  <span className="gpc-desc">Mục tiêu, chế độ PvP & AI</span>
                </div>
                <span className="gpc-arrow">›</span>
              </div>
              <div className="game-preview-card" onClick={() => setGuideModal('chess')}>
                <div className="gpc-icon">♟️</div>
                <div className="gpc-info">
                  <span className="gpc-name">Luật Cờ Vua</span>
                  <span className="gpc-desc">Quy tắc, thời gian & cược</span>
                </div>
                <span className="gpc-arrow">›</span>
              </div>
              <div className="game-preview-card" onClick={() => setGuideModal('howto')}>
                <div className="gpc-icon">📖</div>
                <div className="gpc-info">
                  <span className="gpc-name">Hướng Dẫn Sử Dụng</span>
                  <span className="gpc-desc">Từ đăng ký đến chơi game</span>
                </div>
                <span className="gpc-arrow">›</span>
              </div>
            </div>

            <div className="contact-block">
              <p className="contact-title">LIÊN HỆ & HỖ TRỢ</p>
              <div className="social-links">
                <a
                  href="https://www.facebook.com/feb145"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn facebook"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </a>
                <a
                  href="https://www.instagram.com/kghost1402?igsh=aGltZmJ2c284dTRp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="social-btn instagram"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <defs>
                      <linearGradient id="instaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#feda77" />
                        <stop offset="25%" stopColor="#f58529" />
                        <stop offset="50%" stopColor="#dd2a7b" />
                        <stop offset="75%" stopColor="#8134af" />
                        <stop offset="100%" stopColor="#515bd4" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" 
                      fill="url(#instaGradient)" />
                  </svg>
                  <span className="insta-text">Instagram</span>
                </a>
              </div>
              <p className="contact-note">Phản hồi trong vòng 24 giờ</p>
            </div>

            <div className="tech-stack">
              <span className="tech-tag">React</span>
              <span className="tech-tag">Spring Boot</span>
              <span className="tech-tag">WebSocket</span>
              <span className="tech-tag">MySQL</span>
              <span className="tech-tag">JWT</span>
              <span className="tech-tag">AI Powered</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER PREMIUM */}
      <footer className="footer-premium">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="brand-name">WEB<span className="gold">BETTING</span></span>
            <p>Cổng game giải trí trực tuyến uy tín hàng đầu.</p>
          </div>
          <div className="partner-logos">
             {/* Giả lập các logo đối tác */}
             <span className="partner">VISA</span>
             <span className="partner">MASTERCARD</span>
             <span className="partner">MOMO</span>
             <span className="partner">BITCOIN</span>
          </div>
        </div>
        <div className="footer-bottom">
          &copy; 2025 WEBBETTING ENTERTAINMENT. ALL RIGHTS RESERVED.
        </div>
      </footer>
      {/* MOBILE NAV DRAWER */}
      <div className={`nav-mobile-overlay ${mobileNavOpen ? "visible" : ""}`} onClick={() => setMobileNavOpen(false)} />
      <div className={`nav-mobile-drawer ${mobileNavOpen ? "open" : ""}`}>
        <button className="nav-drawer-close" onClick={() => setMobileNavOpen(false)}>✕</button>
        <button className="nav-drawer-item" onClick={() => { window.dispatchEvent(new Event("openAiChat")); setMobileNavOpen(false); }}>🤖 Trợ Lý AI</button>
        <a className="nav-drawer-item" href="#games" onClick={() => setMobileNavOpen(false)}>🎮 Trò Chơi</a>
        <a className="nav-drawer-item" href="#features" onClick={() => setMobileNavOpen(false)}>⚡ Tính Năng</a>
        <a className="nav-drawer-item" href="#about" onClick={() => setMobileNavOpen(false)}>ℹ️ Về Chúng Tôi</a>
        <div className="nav-drawer-divider" />
        <div className="nav-drawer-btns">
          {user ? (
            <>
              <button className="btn-join-premium" onClick={() => { navigate("/home"); setMobileNavOpen(false); }}>VÀO SẢNH</button>
              <button className="btn-logout-landing" onClick={() => { handleLogout(); setMobileNavOpen(false); }}>ĐĂNG XUẤT</button>
            </>
          ) : (
            <>
              <button className="btn-login-outline" onClick={() => { navigate("/login"); setMobileNavOpen(false); }}>ĐĂNG NHẬP</button>
              <button className="btn-join-premium" onClick={() => { navigate("/register"); setMobileNavOpen(false); }}>THAM GIA NGAY</button>
            </>
          )}
        </div>
      </div>

      {/* AI CHAT */}
      <AiChatWidget />

      {/* GUIDE MODAL */}
      {guideModal && (
        <div className="guide-modal-overlay" onClick={() => setGuideModal(null)}>
          <div className="guide-modal-card" onClick={e => e.stopPropagation()}>
            <div className="guide-modal-header">
              <h3>{GUIDES[guideModal].title}</h3>
              <button className="guide-modal-close" onClick={() => setGuideModal(null)}>×</button>
            </div>
            <div className="guide-modal-body">
              {GUIDES[guideModal].sections.map((s, i) => (
                <div key={i} className="guide-section">
                  <h4>{s.heading}</h4>
                  <p>{s.content}</p>
                </div>
              ))}
            </div>
            <div className="guide-modal-footer">
              <button className="btn-join-premium" onClick={() => { setGuideModal(null); handleStartAction(); }}>
                Chơi ngay →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LandingPage;
