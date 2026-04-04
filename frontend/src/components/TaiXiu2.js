/* TAI XIU STYLES - CASINO THEME */
.taixiu-container {
  min-height: 100vh;
  background: 
    radial-gradient(circle at 10% 20%, rgba(255, 215, 0, 0.15) 0%, transparent 25%),
    radial-gradient(circle at 90% 80%, rgba(255, 140, 0, 0.12) 0%, transparent 30%),
    radial-gradient(circle at 50% 50%, rgba(255, 69, 0, 0.08) 0%, transparent 40%),
    linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
  padding: 15px;
  font-family: 'Arial', sans-serif;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* HIỆU ỨNG NỀN NHẤP NHÁY */
.taixiu-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 30% 20%, rgba(255, 215, 0, 0.3) 0%, transparent 50%),
    radial-gradient(circle at 70% 80%, rgba(255, 140, 0, 0.25) 0%, transparent 50%);
  animation: pulseGlow 4s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulseGlow {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
  }
}

/* CASINO BACKGROUND EFFECTS */
.casino-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* TAI XIU CONTENT - VỪA MÀN HÌNH LAPTOP */
.taixiu-content {
  background: rgba(26, 26, 26, 0.95);
  border: 3px solid var(--casino-gold);
  padding: 25px;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(255, 215, 0, 0.25);
  max-width: 700px;
  width: 95%;
  margin: 0 auto;
  position: relative;
  z-index: 10;
  backdrop-filter: blur(8px);
  max-height: 85vh;
  overflow-y: auto;
}

.taixiu-content::-webkit-scrollbar {
  width: 5px;
}

.taixiu-content::-webkit-scrollbar-track {
  background: rgba(255, 215, 0, 0.1);
  border-radius: 3px;
}

.taixiu-content::-webkit-scrollbar-thumb {
  background: var(--casino-gold);
  border-radius: 3px;
}

/* HEADER - THU GỌN */
.taixiu-header {
  text-align: center;
  margin-bottom: 20px;
  padding: 10px;
  position: relative;
  min-height: 60px;
}

.taixiu-header h2 {
  color: var(--casino-gold);
  font-size: 1.8em;
  margin-bottom: 5px;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

.taixiu-subtitle {
  color: #ccc;
  font-size: 0.9em;
  font-style: italic;
}

/* NÚT QUAY LẠI - THU GỌN */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(45deg, var(--casino-gold), var(--casino-orange));
  color: #1a2a6c !important;
  text-decoration: none;
  border-radius: 20px;
  font-weight: bold;
  font-size: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 3px 10px rgba(255, 215, 0, 0.3);
  border: 2px solid transparent;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
}

.back-btn:hover {
  transform: translateY(-50%) translateX(-3px);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.4);
  background: linear-gradient(45deg, var(--casino-orange), var(--casino-gold));
}

/* GAME AREA - THU GỌN */
.game-area {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  padding: 18px;
  border: 2px solid rgba(255, 215, 0, 0.3);
  margin-bottom: 20px;
}

/* CHOICE SELECTION - THU GỌN */
.choice-section {
  margin-bottom: 18px;
}

.choice-label {
  text-align: center;
  color: var(--casino-gold);
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 15px;
  display: block;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.choices-container {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.choice-btn {
  flex: 1;
  padding: 15px 12px;
  border: 2px solid var(--casino-gold);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: #ccc;
  font-size: 0.9em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-height: 80px;
  justify-content: center;
}

.choice-btn:hover {
  background: rgba(255, 215, 0, 0.15);
  transform: translateY(-3px);
  border-color: var(--casino-orange);
}

.choice-btn.active {
  background: linear-gradient(135deg, var(--casino-gold), var(--casino-orange));
  color: #1a2a6c;
  border-color: var(--casino-orange);
  box-shadow: 0 5px 15px rgba(255, 215, 0, 0.3);
  transform: translateY(-3px);
}

.choice-emoji {
  font-size: 1.6em;
  filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
}

.choice-text {
  font-size: 1em;
  font-weight: bold;
}

.choice-range {
  font-size: 0.8em;
  opacity: 0.9;
  color: #fff;
}

/* BET AMOUNT - THU GỌN */
.bet-section {
  margin-bottom: 18px;
}

.bet-input {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--casino-gold);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 14px;
  color: #333;
  text-align: center;
  transition: all 0.3s ease;
  font-weight: bold;
}

.bet-input:focus {
  outline: none;
  border-color: var(--casino-orange);
  box-shadow: 0 0 10px rgba(255, 140, 0, 0.3);
  transform: scale(1.01);
  background: rgba(255, 255, 255, 1);
}

.bet-input::placeholder {
  color: #999;
  font-weight: normal;
}

/* BET BUTTON - THU GỌN */
.bet-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, var(--casino-gold), var(--casino-orange));
  border: none;
  border-radius: 8px;
  color: #1a2a6c;
  font-size: 1em;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}

.bet-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: left 0.5s;
}

.bet-btn:hover::before {
  left: 100%;
}

.bet-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(255, 215, 0, 0.4);
  background: linear-gradient(135deg, var(--casino-orange), var(--casino-gold));
}

.bet-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 3px 8px rgba(255, 215, 0, 0.2);
}

/* DICE CONTAINER - THU GỌN */
.dice-roll-container {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin: 20px 0;
  perspective: 600px;
  position: relative;
  min-height: 100px;
}

.dice-roll-item {
  width: 60px;
  height: 60px;
  position: relative;
  transform-style: preserve-3d;
  transform-origin: center;
}

.dice-table {
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 4px;
  background: linear-gradient(90deg, #5D4037, #6D4C41, #5D4037);
  border-radius: 2px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.5);
  z-index: -1;
}

/* CÁC MẶT XÚC XẮC - THU GỌN */
.dice-face {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #ffffff, #f0f0f0);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 
    inset -2px -2px 4px rgba(0,0,0,0.2),
    inset 1px 1px 3px rgba(255,255,255,0.8),
    1px 1px 6px rgba(0,0,0,0.2);
  backface-visibility: hidden;
  border: 1px solid #e0e0e0;
}

.dice-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2c3e50;
  position: absolute;
  box-shadow: inset -1px -1px 3px rgba(0,0,0,0.5);
}

.face-1 .dice-dot {
  background: #e74c3c;
  width: 14px;
  height: 14px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  box-shadow: inset -2px -2px 4px rgba(150,0,0,0.7);
}

/* BỐ TRÍ CHẤM */
.face-2 .dice-dot:nth-child(1) { top: 20%; left: 20%; }
.face-2 .dice-dot:nth-child(2) { bottom: 20%; right: 20%; }

.face-3 .dice-dot:nth-child(1) { top: 20%; left: 20%; }
.face-3 .dice-dot:nth-child(2) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.face-3 .dice-dot:nth-child(3) { bottom: 20%; right: 20%; }

.face-4 .dice-dot:nth-child(1) { top: 20%; left: 20%; }
.face-4 .dice-dot:nth-child(2) { top: 20%; right: 20%; }
.face-4 .dice-dot:nth-child(3) { bottom: 20%; left: 20%; }
.face-4 .dice-dot:nth-child(4) { bottom: 20%; right: 20%; }

.face-5 .dice-dot:nth-child(1) { top: 20%; left: 20%; }
.face-5 .dice-dot:nth-child(2) { top: 20%; right: 20%; }
.face-5 .dice-dot:nth-child(3) { top: 50%; left: 50%; transform: translate(-50%, -50%); }
.face-5 .dice-dot:nth-child(4) { bottom: 20%; left: 20%; }
.face-5 .dice-dot:nth-child(5) { bottom: 20%; right: 20%; }

.face-6 .dice-dot:nth-child(1) { top: 20%; left: 20%; }
.face-6 .dice-dot:nth-child(2) { top: 20%; right: 20%; }
.face-6 .dice-dot:nth-child(3) { top: 50%; left: 20%; transform: translateY(-50%); }
.face-6 .dice-dot:nth-child(4) { top: 50%; right: 20%; transform: translateY(-50%); }
.face-6 .dice-dot:nth-child(5) { bottom: 20%; left: 20%; }
.face-6 .dice-dot:nth-child(6) { bottom: 20%; right: 20%; }

/* VỊ TRÍ CÁC MẶT 3D */
.face-1 { transform: translateZ(30px); }
.face-2 { transform: translateZ(-30px) rotateY(180deg); }
.face-3 { transform: translateX(30px) rotateY(90deg); }
.face-4 { transform: translateX(-30px) rotateY(-90deg); }
.face-5 { transform: translateY(-30px) rotateX(90deg); }
.face-6 { transform: translateY(30px) rotateX(-90deg); }

/* RESULT DISPLAY - THU GỌN */
.result-section {
  margin-top: 18px;
  padding: 15px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid;
  animation: resultPopIn 0.4s ease-out;
  text-align: center;
}

@keyframes resultPopIn {
  from {
    opacity: 0;
    transform: scale(0.8) translateY(15px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.result-win {
  background: rgba(40, 167, 69, 0.2);
  border-color: #28a745;
  color: #d4edda;
}

.result-lose {
  background: rgba(220, 53, 69, 0.2);
  border-color: #dc3545;
  color: #f8d7da;
}

.result-title {
  font-size: 1.1em;
  font-weight: bold;
  margin-bottom: 10px;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
}

.result-balance {
  font-size: 1.1em;
  color: var(--casino-gold);
  font-weight: bold;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
}

/* RULES SECTION - THU GỌN */
.rules-section {
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 215, 0, 0.3);
  border-radius: 10px;
  padding: 18px;
  margin-top: 20px;
  backdrop-filter: blur(8px);
}

.rules-title {
  color: var(--casino-gold);
  font-size: 1.1em;
  margin-bottom: 15px;
  text-align: center;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
  font-weight: bold;
}

.rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.rules-list li {
  padding: 6px 0;
  color: #e0e0e0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 0.85em;
  text-align: center;
}

.rules-list li:last-child {
  border-bottom: none;
}

.rules-list li::before {
  content: "🎯";
  font-size: 1em;
  filter: drop-shadow(1px 1px 1px rgba(0,0,0,0.3));
}

/* DICE LOADING & RESULT TEXT - THU GỌN */
.dice-loading {
  text-align: center;
  color: #FFD700;
  font-size: 0.95em;
  margin: 12px 0;
  font-style: italic;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
  font-weight: bold;
}

.dice-result-text {
  text-align: center;
  margin: 15px 0;
  padding: 15px;
  background: rgba(255, 215, 0, 0.08);
  border: 2px solid #FFD700;
  border-radius: 10px;
  color: #FFD700;
  font-size: 1em;
  font-weight: bold;
  text-shadow: 0 0 6px rgba(255, 215, 0, 0.5);
  backdrop-filter: blur(5px);
}

.dice-values {
  font-size: 1.1em;
  color: white;
  margin: 4px 0;
  font-weight: bold;
}

.dice-total {
  font-size: 1.3em;
  color: #FFD700;
  margin: 8px 0;
  text-shadow: 0 0 8px rgba(255, 215, 0, 0.6);
}

/* RESPONSIVE - TỐI ƯU CHO LAPTOP & MOBILE */
@media (max-width: 1024px) {
  .taixiu-content {
    max-width: 650px;
    padding: 20px;
  }
  
  .taixiu-header h2 {
    font-size: 1.6em;
  }
  
  .choice-btn {
    padding: 12px 10px;
    min-height: 70px;
  }
  
  .dice-roll-container {
    gap: 25px;
  }
  
  .dice-roll-item {
    width: 55px;
    height: 55px;
  }
}

@media (max-width: 768px) {
  .taixiu-container {
    padding: 10px;
    align-items: flex-start;
  }
  
  .taixiu-content {
    margin: 0;
    padding: 15px;
    max-height: 90vh;
  }
  
  .taixiu-header {
    padding-top: 50px;
    min-height: 70px;
  }
  
  .back-btn {
    position: absolute;
    left: 50%;
    top: 10px;
    transform: translateX(-50%);
  }
  
  .back-btn:hover {
    transform: translateX(-50%) translateY(-2px);
  }
  
  .taixiu-header h2 {
    font-size: 1.4em;
    margin-top: 8px;
  }
  
  .choices-container {
    flex-direction: column;
    gap: 10px;
  }
  
  .choice-btn {
    padding: 12px 10px;
    min-height: 65px;
  }
  
  .bet-input {
    padding: 10px;
    font-size: 13px;
  }
  
  .bet-btn {
    padding: 12px;
    font-size: 0.9em;
  }
  
  .dice-roll-container {
    gap: 20px;
  }
  
  .dice-roll-item {
    width: 50px;
    height: 50px;
  }
  
  .dice-table {
    width: 200px;
  }
  
  .rules-list li {
    font-size: 0.8em;
    padding: 5px 0;
  }
}

/* Ẩn các phần tử không cần thiết cho mobile */
@media (max-width: 480px) {
  .taixiu-subtitle {
    display: none;
  }
  
  .choice-range {
    display: none;
  }
}