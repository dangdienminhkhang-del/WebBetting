import React, { useState } from "react";
import API from "../services/api";
import "../styles/TaiXiu.css";
import "../styles/dice-animation.css";

function TaiXiu() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [amount, setAmount] = useState("");
  const [choice, setChoice] = useState("TAI");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle');
  const [diceValues, setDiceValues] = useState([1, 1]);
  const [showDice, setShowDice] = useState(false);
  const [finalDiceValues, setFinalDiceValues] = useState([1, 1]);

  if (!user || !user.token) {
    window.location.href = "/login";
    return null;
  }

  const handleBet = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert("Vui lòng nhập số điểm cược hợp lệ!");
      return;
    }

    setLoading(true);
    setAnimationPhase('falling');
    setShowDice(true);
    setResult(null);

    try {
      // RỚT XÚC XẮC
      await new Promise(resolve => setTimeout(resolve, 800));
      setAnimationPhase('rolling');
      
      // TUNG XÚC XẮC VÀ LẤY KẾT QUẢ THẬT
      const finalValues = await simulateRealDiceRoll();
      
      // DỪNG LẠI VỚI MẶT ĐÃ TUNG
      setAnimationPhase('stopping');
      setDiceValues(finalValues); // SET KẾT QUẢ THẬT
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // GỬI REQUEST SERVER VỚI KẾT QUẢ ĐÃ BIẾT
      const res = await API.post("/bet/taixiu", {
        userId: user.id,
        amount: parseFloat(amount),
        choice: choice
      });
      
      setFinalDiceValues(finalValues);
      setResult(res.data);
      
      // CẬP NHẬT SỐ DƯ
      const updatedUser = { ...user, balance: res.data.newBalance };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // KẾT THÚC ANIMATION
      setAnimationPhase('idle');
      
      // RESET FORM SAU 5 GIÂY
      // setTimeout(() => {
      //   setAmount("");
      //   setResult(null);
      //   setShowDice(false);
      // }, 5000);
      
    } catch (err) {
      alert("Đặt cược thất bại: " + (err.response?.data?.message || "Lỗi không xác định"));
      setAnimationPhase('idle');
      setShowDice(false);
    } finally {
      setLoading(false);
    }
  };

  // HÀM TUNG XÚC XẮC THẬT - XOAY VÀ DỪNG ĐÚNG MẶT
  // HÀM TUNG XÚC XẮC THẬT - MÔ PHỎNG VẬT LÝ THỰC
const simulateRealDiceRoll = () => {
  return new Promise((resolve) => {
    // RANDOM KẾT QUẢ CUỐI CÙNG
    const finalDice1 = Math.floor(Math.random() * 6) + 1;
    const finalDice2 = Math.floor(Math.random() * 6) + 1;
    const finalValues = [finalDice1, finalDice2];
    
    let rolls = 0;
    const maxRolls = 30; // Tăng thời gian lăn
    
    const rollInterval = setInterval(() => {
      rolls++;
      
      // GIAI ĐOẠN 1: RƠI VÀ NẢY (0-40%)
      if (rolls <= 12) {
        // HIỂN THỊ CÁC MẶT NGẪU NHIÊN TRONG KHI NẢY
        const tempDice1 = Math.floor(Math.random() * 6) + 1;
        const tempDice2 = Math.floor(Math.random() * 6) + 1;
        setDiceValues([tempDice1, tempDice2]);
      }
      // GIAI ĐOẠN 2: LĂN CHẬM DẦN (40-70%)
      else if (rolls <= 21) {
        // BẮT ĐẦU HIỆN KẾT QUẢ THẬT THỈNH THOẢNG
        const showReal = Math.random() > 0.7;
        if (showReal) {
          setDiceValues(finalValues);
        } else {
          const tempDice1 = Math.floor(Math.random() * 6) + 1;
          const tempDice2 = Math.floor(Math.random() * 6) + 1;
          setDiceValues([tempDice1, tempDice2]);
        }
      }
      // GIAI ĐOẠN 3: CHUẨN BỊ DỪNG (70-90%)
      else if (rolls <= 27) {
        // HIỆN KẾT QUẢ THẬT THƯỜNG XUYÊN HƠN
        const showReal = Math.random() > 0.4;
        if (showReal) {
          setDiceValues(finalValues);
        } else {
          const tempDice1 = Math.floor(Math.random() * 6) + 1;
          const tempDice2 = Math.floor(Math.random() * 6) + 1;
          setDiceValues([tempDice1, tempDice2]);
        }
      }
      // GIAI ĐOẠN 4: DỪNG HẲN (90-100%)
      else {
        setDiceValues(finalValues);
      }
      
      if (rolls >= maxRolls) {
        clearInterval(rollInterval);
        setDiceValues(finalValues);
        resolve(finalValues);
      }
    }, 80);
  });
};

  const Dice = ({ value, isRolling, isStopping }) => {
    const getDiceTransform = (val) => {
      const transforms = {
        1: 'rotateX(0deg) rotateY(0deg) rotateZ(0deg)',
        2: 'rotateX(0deg) rotateY(-180deg) rotateZ(0deg)',
        3: 'rotateX(0deg) rotateY(-90deg) rotateZ(0deg)',
        4: 'rotateX(0deg) rotateY(90deg) rotateZ(0deg)',
        5: 'rotateX(-90deg) rotateY(0deg) rotateZ(0deg)',
        6: 'rotateX(90deg) rotateY(0deg) rotateZ(0deg)'
      };
      return transforms[val] || transforms[1];
    };

    const getDiceClass = () => {
      switch(animationPhase) {
        case 'falling': return 'dice-falling';
        case 'rolling': return 'dice-rolling';
        case 'stopping': return 'dice-stopping';
        default: return '';
      }
    };

    return (
      <div 
        className={`dice-roll-item ${getDiceClass()}`}
        style={{ 
          transform: animationPhase === 'idle' ? getDiceTransform(value) : undefined 
        }}
      >
        <div className="dice-face face-1"><div className="dice-dot"></div></div>
        <div className="dice-face face-2"><div className="dice-dot"></div><div className="dice-dot"></div></div>
        <div className="dice-face face-3"><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div></div>
        <div className="dice-face face-4"><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div></div>
        <div className="dice-face face-5"><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div></div>
        <div className="dice-face face-6"><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div><div className="dice-dot"></div></div>
      </div>
    );
  };

  const total = diceValues[0] + diceValues[1];
  const diceResult = total >= 8 ? 'TÀI' : 'XỈU';
  const isWin = result && diceResult === choice;

  return (
    <div className="taixiu-container">
      <div className="casino-bg"></div>

      <div className="taixiu-content">
        <div className="taixiu-header">
          <a href="/home" className="back-btn">← QUAY LẠI</a>
          <h2>🎲 TÀI XỈU</h2>
          <p className="taixiu-subtitle">Thử vận may - Thắng lớn!</p>
        </div>

        <div className="game-area">
          <form onSubmit={handleBet}>
            {/* CHỌN TÀI/XỈU */}
            <div className="choice-section">
              <span className="choice-label">CHỌN CỬA CƯỢC:</span>
              <div className="choices-container">
                <button type="button" className={`choice-btn ${choice === "TAI" ? "active" : ""}`} onClick={() => setChoice("TAI")}>
                  <span className="choice-emoji">🐲</span>
                  <span className="choice-text">TÀI</span>
                  <span className="choice-range">(8-12 điểm)</span>
                </button>
                <button type="button" className={`choice-btn ${choice === "XIU" ? "active" : ""}`} onClick={() => setChoice("XIU")}>
                  <span className="choice-emoji">🐯</span>
                  <span className="choice-text">XỈU</span>
                  <span className="choice-range">(1-7 điểm)</span>
                </button>
              </div>
            </div>

            {/* HIỆU ỨNG TUNG XÚC XẮC */}
            {showDice && (
              <div className={`dice-roll-container ${animationPhase === 'rolling' ? 'dice-shake' : ''}`}>
                <Dice value={diceValues[0]} isRolling={animationPhase === 'rolling'} isStopping={animationPhase === 'stopping'} />
                <Dice value={diceValues[1]} isRolling={animationPhase === 'rolling'} isStopping={animationPhase === 'stopping'} />
                <div className="dice-table"></div>
                
                {animationPhase === 'falling' && (
                  <div className="dice-loading">🎰 Xúc xắc đang rớt xuống...</div>
                )}
                {animationPhase === 'rolling' && (
                  <div className="dice-loading">🎲 Xúc xắc đang lăn...</div>
                )}
                {animationPhase === 'stopping' && (
                  <div className="dice-loading">⏳ Đang dừng...</div>
                )}
                {animationPhase === 'idle' && result && (
                  <div className="dice-result-text">
                    <div className="dice-values">🎲 {diceValues[0]} + {diceValues[1]}</div>
                    <div className="dice-total">= {total} điểm → {diceResult}</div>
                    <div style={{ marginTop: '10px', fontSize: '1.1em' }}>
                      Bạn chọn: <strong>{choice}</strong> | 
                      Kết quả: <strong style={{ color: isWin ? '#4CD964' : '#FF6B6B' }}>
                        {isWin ? 'THẮNG 🎉' : 'THUA 😞'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NHẬP SỐ ĐIỂM & NÚT CƯỢC */}
            <div className="bet-section">
              <input 
                type="number"
                placeholder="Nhập số điểm cược..."
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bet-input"
                disabled={loading || animationPhase !== 'idle'}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || animationPhase !== 'idle' || !amount}
              className="bet-btn"
            >
              {loading ? "🎰 ĐANG XỬ LÝ..." : "🎲 ĐẶT CƯỢC NGAY"}
            </button>
          </form>

          {/* KẾT QUẢ SERVER */}
          {result && animationPhase === 'idle' && (
            <div className={`result-section ${isWin ? "result-win" : "result-lose"}`}>
              <div className="result-title">
                {isWin ? "🎉 CHÚC MỪNG! BẠN THẮNG!" : "😞 RẤT TIẾC! BẠN THUA"}
              </div>
              <div className="result-balance">
                Số dư mới: {result.newBalance.toLocaleString()} điểm
              </div>
            </div>
          )}
        </div>

        {/* LUẬT CHƠI */}
        <div className="rules-section">
          <h4 className="rules-title">📖 LUẬT CHƠI TÀI XỈU</h4>
          <ul className="rules-list">
            <li>2 xúc xắc (1-6), tổng = 2-12 điểm</li>
            <li>🐲 TÀI: Tổng 8-12 điểm → Thắng</li>
            <li>🐯 XỈU: Tổng 1-7 điểm → Thắng</li>
            <li>Thắng: +100% số cược | Thua: -100% số cược</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default TaiXiu;