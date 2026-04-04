import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import '../styles/TaiXiuLottie.css';
import { taixiuSounds, useBgMusic } from '../hooks/useSoundEngine';

// Component Xúc xắc 3D bằng CSS thuần (Cực kỳ ổn định)
const Dice3D = ({ value, isRolling, isLanding, index }) => {
  return (
    <div className={`dice-toss-wrapper ${isRolling ? `tossing-${index}` : ''} ${isLanding ? 'landing-bounce' : ''}`}>
      <div className={`dice-3d-stable ${isRolling ? `spinning-${index}` : `show-${value}`}`}>
        <div className="dice-face face-1"><div className="dot-3d"></div></div>
        <div className="dice-face face-2"><div className="dot-3d"></div><div className="dot-3d"></div></div>
        <div className="dice-face face-3"><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div></div>
        <div className="dice-face face-4"><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div></div>
        <div className="dice-face face-5"><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div></div>
        <div className="dice-face face-6"><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div><div className="dot-3d"></div></div>
      </div>
    </div>
  );
};

function TaiXiuLottie() {
  const navigate = useNavigate();
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")));
  const [amount, setAmount] = useState("");
  const [choice, setChoice] = useState("TAI");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [isLanding, setIsLanding] = useState(false);
  const [diceValues, setDiceValues] = useState([1, 1]);
  const [showResult, setShowResult] = useState(false);

  // Nhạc nền TaiXiu
  useBgMusic('taixiu');

  useEffect(() => {
    if (!user || !user.token) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleBet = async (e) => {
    e.preventDefault();
    
    const betAmount = parseInt(amount);
    if (!amount || betAmount <= 0) {
      alert("Vui lòng nhập số điểm cược hợp lệ!");
      return;
    }

    if (betAmount > user.balance) {
      alert("Số dư không đủ!");
      return;
    }

    setLoading(true);
    setIsRolling(true);
    setIsLanding(false);
    setShowResult(false);
    setResult(null);

    // Âm thanh lắc xúc xắc
    taixiuSounds.shake();

    try {
      // Gửi request lên server
      const res = await API.post("/bet/taixiu", {
        userId: user.id,
        amount: betAmount,
        choice: choice
      });
      
      // Âm thanh lăn trong khi chờ
      setTimeout(() => taixiuSounds.rolling(), 600);

      // Giả lập thời gian tung xúc xắc cho thật (2.5 giây)
      setTimeout(() => {
        setDiceValues([res.data.dice1, res.data.dice2]);
        setResult(res.data);
        setIsRolling(false);
        setIsLanding(true);

        // Âm thanh chạm đất
        taixiuSounds.land();

        // HIỆN KẾT QUẢ NGAY KHI RƠI
        setShowResult(true);
        const updatedUser = { ...user, balance: res.data.newBalance };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setLoading(false);

        // Âm thanh kết quả sau 300ms
        setTimeout(() => {
          if (res.data.win) taixiuSounds.win();
          else taixiuSounds.lose();
        }, 300);

        setTimeout(() => { setIsLanding(false); }, 1500);
      }, 2500);
      
    } catch (err) {
      alert("Lỗi: " + (err.response?.data?.message || "Không thể kết nối server"));
      setIsRolling(false);
      setIsLanding(false);
      setLoading(false);
    }
  };

  const total = result?.total || diceValues[0] + diceValues[1];
  const isWin = result?.win || false;
  const quickAmounts = [100, 500, 1000, 5000, 10000];

  return (
    <div className="taixiu-lottie-container">
      <div className="taixiu-lottie-content">
        <header className="taixiu-lottie-header">
          <button onClick={() => navigate('/home')} className="back-btn-lottie">← QUAY LẠI</button>
          <h2>🎲 TÀI XỈU 3D</h2>
          <div className="balance-display">
            💰 Số dư: <span className="balance-amount">{user?.balance?.toLocaleString()}</span> điểm
          </div>
        </header>

        <div className="game-area-lottie">
          <form onSubmit={handleBet} className="taixiu-form-layout">
            <div className="bet-controls-column">
              <div className="choice-section-lottie">
                <span className="choice-label-lottie">CHỌN CỬA CƯỢC:</span>
                <div className="choices-container-lottie">
                  <button 
                    type="button" 
                    className={`choice-btn-lottie ${choice === "TAI" ? "active" : ""}`} 
                    onClick={() => setChoice("TAI")}
                    disabled={loading || isRolling}
                  >
                    <span className="choice-text-lottie">TÀI</span>
                    <span className="choice-range-lottie">(8-12đ)</span>
                  </button>
                  <button 
                    type="button" 
                    className={`choice-btn-lottie ${choice === "XIU" ? "active" : ""}`} 
                    onClick={() => setChoice("XIU")}
                    disabled={loading || isRolling}
                  > 
                    <span className="choice-text-lottie">XỈU</span>
                    <span className="choice-range-lottie">(2-7đ)</span>
                  </button>
                </div>
              </div>

              <div className="bet-section-lottie">
                <h3 className="amount-title">💰 ĐIỂM CƯỢC:</h3>
                <div className="quick-amounts">
                  {quickAmounts.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`quick-amount-btn ${parseInt(amount) === v ? 'active' : ''}`}
                      onClick={() => setAmount(v.toString())}
                      disabled={loading || isRolling}
                    >
                      {v >= 1000 ? (v/1000) + 'k' : v}
                    </button>
                  ))}
                </div>
                <input 
                  type="number"
                  className="bet-input-lottie"
                  placeholder="Nhập số điểm..."
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading || isRolling}
                />
              </div>

              <div className="bet-button-container">
                <button type="submit" className="btn-bet-lottie" disabled={loading || isRolling}>
                  {loading || isRolling ? "ĐANG TUNG XÚC XẮC..." : "ĐẶT CƯỢC NGAY"}
                </button>
              </div>
            </div>

            <div className="animation-section">
              <div className={`dice-pair-container ${isLanding ? 'impact-shake' : ''}`}>
                <Dice3D value={diceValues[0]} isRolling={isRolling} isLanding={isLanding} index={1} />
                <Dice3D value={diceValues[1]} isRolling={isRolling} isLanding={isLanding} index={2} />
              </div>
              
              {isRolling && <div className="rolling-text">ĐANG QUAY...</div>}
              
              {showResult && (
                <div className="dice-result-display">
                  <div className="total-number">{total} điểm</div>
                  <div className={`final-result ${isWin ? 'win' : 'lose'}`}>
                    {isWin ? `🎉 THẮNG +${amount}đ` : `😞 THUA -${amount}đ`}
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        <div className="rules-section-lottie">
          <div className="rules-grid">
            <div className="rule-item"><span>🎲</span> CSS 3D Engine</div>
            <div className="rule-item"><span>🐲</span> TÀI: 8-12</div>
            <div className="rule-item"><span>🐯</span> XỈU: 2-7</div>
            <div className="rule-item"><span>💰</span> x2 thưởng</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaiXiuLottie;
