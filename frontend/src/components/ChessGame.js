import React, { useEffect, useMemo, useRef, useState, useCallback, startTransition } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import API from "../services/api";
import ChatBubble from "./ChatBubble";
import RoomLobby from "./RoomLobby";
import "../styles/casino-theme.css";
import "../styles/ChessGame.css";
import webSocketService from '../services/WebSocketService';
import { useBgMusic } from '../hooks/useSoundEngine';

function ChessGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const gameMode = queryParams.get('mode') || 'ai'; // 'ai' hoặc 'pvp'

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch {
      return null;
    }
  });
  
  const [phase, setPhase] = useState("setup");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [playerColor, setPlayerColor] = useState("WHITE");
  const [stakeInput, setStakeInput] = useState("10000");
  const [timeControlMs, setTimeControlMs] = useState(5 * 60 * 1000);
  const [incrementMs, setIncrementMs] = useState(0);
  const [whiteTimeMs, setWhiteTimeMs] = useState(null);
  const [blackTimeMs, setBlackTimeMs] = useState(null);
  const lastClockTsRef = useRef(null);
  const timeoutSentRef = useRef(false);
  const whiteTimeRef = useRef(null);
  const blackTimeRef = useRef(null);
  
  // PvP State
  const [isSearching, setIsSearching] = useState(false);
  const [pvpData, setPvpData] = useState({
    gameId: null,
    opponentId: null,
    opponentNickname: null,
    role: null, // 'PLAYER_1' (White) hoặc 'PLAYER_2' (Black)
  });

  const [matchId, setMatchId] = useState(null);
  const [stakeAmount, setStakeAmount] = useState(0);
  const [fen, setFen] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [movesUci, setMovesUci] = useState("");
  const [moveCount, setMoveCount] = useState(0);
  const [playerMoveCount, setPlayerMoveCount] = useState(0);
  const [canChangeConfig, setCanChangeConfig] = useState(false);

  const [uiMessage, setUiMessage] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showConfigPenaltyConfirm, setShowConfigPenaltyConfirm] = useState(false);
  // PvP sub-mode: 'matchmaking' | 'room'
  const [pvpSubMode, setPvpSubMode] = useState('matchmaking');
  const [showRoomLobby, setShowRoomLobby] = useState(false);
  const [pvpDisconnectInfo, setPvpDisconnectInfo] = useState(null);
  const pvpDisconnectInfoRef = useRef(null);
  const pvpDataRef = useRef({ gameId: null, opponentId: null, opponentNickname: null, role: null });
  const stakeAmountRef = useRef(0); // ref để tránh stale 0 khi modal mở trước khi state restore
  const [activeSnapshot, setActiveSnapshot] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);
  const [capturedByPlayer, setCapturedByPlayer] = useState([]);
  const [capturedByAi, setCapturedByAi] = useState([]);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);
  const [pendingPromotion, setPendingPromotion] = useState(null);
  const [reviewIndex, setReviewIndex] = useState(null);

  const audioCtxRef = useRef(null);
  const lastMovesLenRef = useRef(0);

  // Nhạc nền Chess
  useBgMusic('chess');

  const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  const reviewFens = useMemo(() => {
    const tokens = String(movesUci || "").trim().split(/\s+/).filter(Boolean);
    const fens = [START_FEN];
    const game = new Chess();
    for (const uci of tokens) {
      try {
        const from = uci.slice(0, 2).toLowerCase();
        const to = uci.slice(2, 4).toLowerCase();
        const promo = uci.length >= 5 ? uci.slice(4, 5).toLowerCase() : undefined;
        game.move(promo ? { from, to, promotion: promo } : { from, to });
        fens.push(game.fen());
      } catch (e) {
        break;
      }
    }
    return fens;
  }, [movesUci]);

  const currentReviewFen = useMemo(() => {
    if (reviewIndex === null) return null;
    return reviewFens[reviewIndex] || null;
  }, [reviewIndex, reviewFens]);

  const isReviewMode = reviewIndex !== null && reviewIndex < reviewFens.length - 1;

  // WebSocket Handlers
  const handleMatch = useCallback(async (data) => {
    console.log('Match Event Received in ChessGame:', data);
    if (data.gameType?.toLowerCase() !== 'chess') return;

    // Xử lý lỗi không đủ tiền
    if (data.gameId === 'ERROR_INSUFFICIENT_BALANCE') {
      setIsSearching(false);
      showToast('❌ Không đủ số dư để tham gia trận này!', 3000);
      return;
    }

    startTransition(() => {
      setIsSearching(false);
      setPvpData({
        gameId: data.gameId,
        opponentId: data.opponentId,
        opponentNickname: data.opponentNickname,
        role: data.role,
      });

      const isWhite = data.role === 'PLAYER_1';
      setMatchId(data.gameId);
      setFen(START_FEN);
      setServerStatus("IN_PROGRESS");
      setPlayerColor(isWhite ? "WHITE" : "BLACK");
      setStakeAmount(data.betAmount);
      setStakeInput(String(data.betAmount));
      const tc = Number(data.timeControlMs || timeControlMs);
      setTimeControlMs(tc);
      const inc = Number(data.incrementMs || incrementMs || 0);
      setIncrementMs(inc);
      setWhiteTimeMs(tc);
      setBlackTimeMs(tc);
      lastClockTsRef.current = Date.now();
      timeoutSentRef.current = false;
      setPhase("play");
      setReviewIndex(null);
    });
    // Refresh balance vì backend đã trừ tiền khi match
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (userData?.id) {
        API.get(`/users/${userData.id}`).then(res => {
          const updated = { ...userData, balance: res.data.balance };
          localStorage.setItem("user", JSON.stringify(updated));
          setUser(updated);
        }).catch(() => {});
      }
    } catch {}
  }, [timeControlMs, incrementMs]);

  // Sync pvpDataRef mỗi khi pvpData thay đổi
  useEffect(() => { pvpDataRef.current = pvpData; }, [pvpData]);
  useEffect(() => { stakeAmountRef.current = stakeAmount; }, [stakeAmount]);

  // Handler cho server-authoritative game state (timer broadcast mỗi 1s)
  const handleGameState = useCallback((data) => {
    if (!data || !data.gameId) return;
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;

    const myId = String(user?.id);
    const isP1 = myId === String(data.player1Id);
    setWhiteTimeMs(isP1 ? data.timePlayer1Ms : data.timePlayer2Ms);
    setBlackTimeMs(isP1 ? data.timePlayer2Ms : data.timePlayer1Ms);

    if (data.fen && data.fen !== fen) setFen(data.fen);
    if (data.moves !== undefined) setMovesUci(data.moves || '');

    if (data.status === 'DISCONNECTED' && data.disconnectedPlayerId) {
      const isOpponentDisconnected = data.disconnectedPlayerId !== myId;
      if (isOpponentDisconnected) {
        const remaining = Math.max(0, data.reconnectRemainingMs ?? 0);
        const info = { show: true, remainingMs: remaining, opponentName: currentPvpData.opponentNickname || 'Đối thủ' };
        pvpDisconnectInfoRef.current = info;
        setPvpDisconnectInfo(info);
      }
    } else if (data.status === 'IN_PROGRESS') {
      if (pvpDisconnectInfoRef.current?.show) {
        pvpDisconnectInfoRef.current = null;
        setPvpDisconnectInfo(null);
        showToast(`✅ ${currentPvpData.opponentNickname || 'Đối thủ'} đã quay lại!`, 2000);
      }
    } else if (data.status === 'FINISHED') {
      setServerStatus('FINISHED');
      pvpDisconnectInfoRef.current = null;
      setPvpDisconnectInfo(null);
    }
  }, [matchId, fen, user?.id]);

  const handleGameOverReceived = useCallback((data) => {
    console.log('🏁 Received PvP Chess Game Over:', data);
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;

    pvpDisconnectInfoRef.current = null;
    setPvpDisconnectInfo(null);
    setServerStatus("FINISHED");
    const result = String(data.result || "").toUpperCase();
    if (result === "WIN" || result === "LOSE" || result === "DRAW") {
      setGameResult(result);
    }

    if (typeof data.myBalanceAfter === "number") {
      const updatedUser = { ...user, balance: data.myBalanceAfter };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('storage'));
    }

    const bet = Number(data.betAmount || stakeAmount || 0);
    const reason = String(data.reason || "");
    const isDisconnectWin = reason === "disconnect_timeout" && result === "WIN";
    const isSurrender = reason === "resign" && result === "WIN";
    
    // ✅ Sử dụng toast với style đặc biệt thay vì showToast thường
    if (result === "WIN") {
      if (isDisconnectWin) {
        // Đối thủ bỏ cuộc (mất kết nối)
        setResultModalData({
          title: "CHIẾN THẮNG",
          subtitle: `Đối thủ bỏ cuộc! Bạn được +${bet.toLocaleString()} KGT`,
          delta: bet,
          type: "WIN",
          special: "disconnect"
        });
      } else if (isSurrender) {
        // Đối thủ đầu hàng
        setResultModalData({
          title: "CHIẾN THẮNG",
          subtitle: `Đối thủ quá gà nên đã đầu hàng`,
          delta: bet,
          type: "WIN",
          special: "surrender"
        });
      } else {
        setResultModalData({
          title: "🏆 CHIẾN THẮNG",
          subtitle: `May mắn đấy! +${bet.toLocaleString()} KGT`,
          delta: bet,
          type: "WIN",
        });
      }
      setShowResultModal(true);
    } else if (result === "DRAW") {
      setResultModalData({
        title: "HÒA",
        subtitle: `Hoàn lại ${bet.toLocaleString()} KGT (không lời/lỗ)`,
        delta: 0,
        type: "DRAW",
      });
      setShowResultModal(true);
    } else if (result === "LOSE") {
      const isResign = reason === "resign";
      setResultModalData({
        title: "THẤT BẠI",
        subtitle: isResign ? `CHÀO ĐỒ THẤT BẠI` : `Con gàaaaa`,
        delta: -bet,
        type: "LOSE",
      });
      setShowResultModal(true);
      // Nếu là resign, tự navigate về home sau 4s
      if (isResign) {
        setTimeout(() => navigate("/home"), 4000);
      }
    }

    const msg = result === "WIN"
      ? (isDisconnectWin 
          ? `🏆 Đối thủ bỏ cuộc! Bạn thắng +${bet.toLocaleString()} KGT` 
          : (isSurrender 
              ? `🏆 Đối thủ đầu hàng! Bạn thắng +${bet.toLocaleString()} KGT`
              : `🎉 Đối thủ đầu hàng! Bạn thắng +${bet.toLocaleString()} KGT`))
      : result === "DRAW"
      ? `🤝 Hòa! Không đổi KGT`
      : `💀 Bạn thua! -${bet.toLocaleString()} KGT`;

    // Hiển thị toast đặc biệt với CSS mới
    if (result === "WIN" && (isDisconnectWin || isSurrender)) {
      const toastDiv = document.createElement('div');
      toastDiv.className = `surrender-toast ${isDisconnectWin ? 'victory-toast' : ''}`;
      toastDiv.innerHTML = `
        <span class="surrender-toast-icon">${isDisconnectWin ? '⚠️' : '🏳️'}</span>
        <span class="surrender-toast-message">${isDisconnectWin ? 'Đối thủ bỏ cuộc!' : 'Đối thủ đầu hàng!'}</span>
        <span class="surrender-toast-amount">+${bet.toLocaleString()} KGT</span>
      `;
      document.body.appendChild(toastDiv);
      setTimeout(() => {
        if (toastDiv && toastDiv.parentNode) toastDiv.remove();
      }, 4000);
    } else {
      showToast(msg, 4000);
    }
  }, [pvpData, user, stakeAmount]);

  const handleMoveReceived = useCallback((data) => {
    console.log('Move received:', data);
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;
    // Timer không sync qua move payload nữa - dùng game-state từ server
    const { from, to, promotion } = data.move;
    const uci = `${from}${to}${promotion || ""}`;
    setMovesUci(prev => prev ? `${prev} ${uci}` : uci);
    const game = new Chess(fen);
    try {
      if (promotion) game.move({ from, to, promotion });
      else game.move({ from, to });
      setFen(game.fen());
      setMoveCount(prev => prev + 1);
    } catch (e) {
      console.error("Invalid move received:", e);
    }
  }, [pvpData, fen]);

  // Helper: apply server game state cho Chess PvP
  const applyChessServerState = useCallback((s) => {
    if (!s || !user) return;
    const isP1 = String(user.id) === String(s.player1Id);
    setPvpData({
      gameId: s.gameId,
      opponentId: isP1 ? s.player2Id : s.player1Id,
      opponentNickname: isP1 ? s.player2Nickname : s.player1Nickname,
      role: isP1 ? 'PLAYER_1' : 'PLAYER_2',
    });
    setMatchId(s.gameId);
    setFen(s.fen || START_FEN);
    setMovesUci(s.moves || '');
    setServerStatus(s.status === 'FINISHED' ? 'FINISHED' : 'IN_PROGRESS');
    setPlayerColor(isP1 ? 'WHITE' : 'BLACK');
    setStakeAmount(s.betAmount || 0);
    stakeAmountRef.current = s.betAmount || 0; // sync ref ngay lập tức

    // ✅ Timer từ server - dùng thẳng, server broadcast mỗi 1s
    const p1Time = Number(s.timePlayer1Ms ?? 0);
    const p2Time = Number(s.timePlayer2Ms ?? 0);
    const wTime = isP1 ? p1Time : p2Time;
    const bTime = isP1 ? p2Time : p1Time;
    whiteTimeRef.current = wTime;
    blackTimeRef.current = bTime;
    lastClockTsRef.current = Date.now();
    timeoutSentRef.current = false;
    setWhiteTimeMs(wTime);
    setBlackTimeMs(bTime);
    setPhase('play');
  }, [user]);

  useEffect(() => {
      if (gameMode === 'pvp' && user?.id) {
        console.log('Connecting WebSocket for PvP mode...');
        
        webSocketService.subscribe('match', handleMatch);
        webSocketService.subscribe('move', handleMoveReceived);
        webSocketService.subscribe('game-over', handleGameOverReceived);
        webSocketService.subscribe('game-state', handleGameState);
        
        webSocketService.connect(user.id.toString(), () => {
          console.log('WebSocket connected successfully!');
          // Gọi /api/pvp/current để check game đang active
          if (phase === 'setup' && !matchId) {
            API.get('/pvp/current')
              .then(res => {
                if (res.data.hasGame && res.data.state?.gameType === 'CHESS') {
                  applyChessServerState(res.data.state); 
                }
              })
              .catch(() => {});
          }
        });
      }

      return () => {
        if (gameMode === 'pvp') {
          webSocketService.unsubscribe('match', handleMatch);
          webSocketService.unsubscribe('move', handleMoveReceived);
          webSocketService.unsubscribe('game-over', handleGameOverReceived);
          webSocketService.unsubscribe('game-state', handleGameState);
        }
      };
    }, [gameMode, user?.id]);

  // localStorage chỉ lưu gameId để reconnect, không lưu full state nữa
  useEffect(() => {
    if (gameMode !== "pvp" || !user?.id) return;
    if (!pvpData?.gameId || phase !== "play" || serverStatus !== "IN_PROGRESS") return;
    try {
      localStorage.setItem(`pvp_chess_${user.id}`, JSON.stringify({
        gameId: pvpData.gameId,
        status: "IN_PROGRESS"
      }));
    } catch {}
  }, [gameMode, user?.id, pvpData?.gameId, phase, serverStatus]);

  const cancelSearch = () => {
    setIsSearching(false);
    webSocketService.send('/game/cancel-match', {
      userId: user.id.toString(),
      gameType: 'CHESS',
      betAmount: parseStake(stakeInput),
      timeControlMs: timeControlMs,
      incrementMs: incrementMs
    });
  };

  const localGame = useMemo(() => {
    try {
      return fen ? new Chess(fen) : new Chess();
    } catch {
      return new Chess();
    }
  }, [fen]);

  const sideToMove = useMemo(() => {
    if (!fen) return "w";
    const parts = String(fen).split(" ");
    return parts[1] || "w";
  }, [fen]);

  const playerSideChar = useMemo(() => (playerColor === "WHITE" ? "w" : "b"), [playerColor]);
  const boardOrientation = useMemo(() => (playerColor === "BLACK" ? "black" : "white"), [playerColor]);

  const isInGame = phase === "play" && matchId && fen;
  const isGameActive = serverStatus === "IN_PROGRESS";
  const isPlayerTurn = isInGame && isGameActive && !isBusy && sideToMove === playerSideChar;

  useEffect(() => {
    whiteTimeRef.current = whiteTimeMs;
  }, [whiteTimeMs]);

  useEffect(() => {
    blackTimeRef.current = blackTimeMs;
  }, [blackTimeMs]);

  useEffect(() => {
    // PvP: timer do server broadcast mỗi 1s qua game-state, không tự đếm
    if (gameMode === "pvp") {
      lastClockTsRef.current = null;
      return;
    }

    // AI mode: tự đếm như cũ
    if (phase !== "play" || !matchId || !fen || serverStatus !== "IN_PROGRESS" || isReviewMode) {
      lastClockTsRef.current = null;
      timeoutSentRef.current = false;
      return;
    }

    if (whiteTimeRef.current === null && blackTimeRef.current === null) {
      whiteTimeRef.current = timeControlMs;
      blackTimeRef.current = timeControlMs;
      setWhiteTimeMs(timeControlMs);
      setBlackTimeMs(timeControlMs);
    }

    lastClockTsRef.current = Date.now();

    const intervalId = setInterval(() => {
      const now = Date.now();
      const last = lastClockTsRef.current || now;
      const delta = Math.max(0, now - last);
      lastClockTsRef.current = now;

      const stm = sideToMove;
      if (stm === "w") {
        const next = Math.max(0, (whiteTimeRef.current ?? 0) - delta);
        whiteTimeRef.current = next;
        setWhiteTimeMs(next);
        if (next === 0 && !timeoutSentRef.current) {
          timeoutSentRef.current = true;
          const g = new Chess(fen);
          const draw = typeof g.isInsufficientMaterial === "function" ? g.isInsufficientMaterial() : false;
          setServerStatus("FINISHED");
          setGameResult(draw ? "DRAW" : (playerSideChar === "w" ? "LOSE" : "WIN"));
          showToast(draw ? "⏰ Hết giờ! Hòa" : (playerSideChar === "w" ? "⏰ Hết giờ! Bạn thua" : "⏰ Hết giờ! Bạn thắng"), 1000);
        }
      } else {
        const next = Math.max(0, (blackTimeRef.current ?? 0) - delta);
        blackTimeRef.current = next;
        setBlackTimeMs(next);
        if (next === 0 && !timeoutSentRef.current) {
          timeoutSentRef.current = true;
          const g = new Chess(fen);
          const draw = typeof g.isInsufficientMaterial === "function" ? g.isInsufficientMaterial() : false;
          setServerStatus("FINISHED");
          setGameResult(draw ? "DRAW" : (playerSideChar === "b" ? "LOSE" : "WIN"));
          showToast(draw ? "⏰ Hết giờ! Hòa" : (playerSideChar === "b" ? "⏰ Hết giờ! Bạn thua" : "⏰ Hết giờ! Bạn thắng"), 1000);
        }
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [phase, matchId, fen, serverStatus, isReviewMode, sideToMove, gameMode, playerSideChar, timeControlMs]);

  const promotionStripSide = useMemo(() => {
    if (!pendingPromotion?.to) return "top";
    const rank = String(pendingPromotion.to).slice(1, 2);
    if (rank === "8") return boardOrientation === "white" ? "top" : "bottom";
    if (rank === "1") return boardOrientation === "white" ? "bottom" : "top";
    return "top";
  }, [pendingPromotion?.to, boardOrientation]);

  const squareStyles = useMemo(() => {
    const styles = {};
    const tokens = String(movesUci || "").trim().split(/\s+/).filter(Boolean);
    const last = tokens[tokens.length - 1];
    if (last && last.length >= 4) {
      const from = last.slice(0, 2).toLowerCase();
      const to = last.slice(2, 4).toLowerCase();
      styles[from] = { background: "rgba(255, 234, 0, 0.18)" };
      styles[to] = { background: "rgba(255, 234, 0, 0.32)" };
    }

    if (selectedSquare) {
      styles[selectedSquare] = {
        ...(styles[selectedSquare] || {}),
        background: "rgba(0, 255, 180, 0.22)",
        boxShadow: "inset 0 0 0 3px rgba(0, 255, 180, 0.55)",
      };
    }

    for (const t of legalTargets) {
      const sq = t.square;
      if (!sq) continue;
      if (t.isCapture) {
        styles[sq] = {
          ...(styles[sq] || {}),
          boxShadow: "inset 0 0 0 4px rgba(0,0,0,0.35)",
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.14) 0 30%, transparent 31%)",
        };
      } else {
        styles[sq] = {
          ...(styles[sq] || {}),
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(0,0,0,0.22) 0 16%, transparent 17%)",
        };
      }
    }
    return styles;
  }, [movesUci, selectedSquare, legalTargets]);

  const parseStake = (value) => {
    const cleaned = String(value || "").replace(/[^\d]/g, "");
    if (!cleaned) return null;
    const amount = parseInt(cleaned, 10);
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return amount;
  };

  const formatClock = (ms) => {
    const total = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const syncBalance = (balance) => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const updated = { ...parsed, balance: balance };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
      return updated;
    } catch (error) {
      console.error("Error syncing balance:", error);
      return null;
    }
  };

  const applyServerState = (data) => {
    setMatchId(data.gameId);
    setFen(data.fen);
    setServerStatus(data.status);
    setGameResult(data.gameResult);
    if (data.difficulty) setDifficulty(data.difficulty);
    if (data.playerColor) setPlayerColor(data.playerColor);
    setStakeAmount(data.stakeAmount || 0);
    setMovesUci(data.movesUci || "");
    setMoveCount(data.moveCount || 0);
    setPlayerMoveCount(data.playerMoveCount || 0);
    setCanChangeConfig(Boolean(data.canChangeConfig));
    setReviewIndex(null);
    if (typeof data.balance === "number") syncBalance(data.balance);

    const stake = data.stakeAmount || 0;
    if (data.status === "FINISHED") {
      if (data.gameResult === "WIN") {
        setResultModalData({
          title: "CHIẾN THẮNG",
          subtitle: `Ăn hên đó 😏 `,
          delta: stake,
          type: "WIN",
        });
        setShowResultModal(true);
      } else if (data.gameResult === "LOSE") {
        setResultModalData({
          title: "THẤT BẠI",
          subtitle: `Bạn quá gà 🙂‍↔️ `,
          delta: -stake,
          type: "LOSE",
        });
        setShowResultModal(true);
      } else if (data.gameResult === "DRAW") {
        setResultModalData({
          title: "HÒA",
          subtitle: `Hoàn lại ${stake.toLocaleString()} KGT (không lời/lỗ)`,
          delta: 0,
          type: "DRAW",
        });
        setShowResultModal(true);
      } else {
        setUiMessage("Trò chơi kết thúc.");
      }
    } else if (data.status === "RESIGNED") {
      setResultModalData({
        title: "RỜI PHÒNG",
        subtitle: `Bạn bị trừ -${stake.toLocaleString()} KGT theo luật rời phòng`,
        delta: -stake,
        type: "RESIGN",
      });
      setShowResultModal(true);
    } else if (data.status === "CANCELLED") {
      setUiMessage("Đã đổi cấu hình. Hoàn lại tiền cược.");
    } else {
      setUiMessage("");
    }

    if (data.status !== "IN_PROGRESS") {
      setSelectedSquare(null);
      setLegalTargets([]);
    }
  };

  const getAudioCtx = () => {
    if (audioCtxRef.current) return audioCtxRef.current;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    audioCtxRef.current = ctx;
    return ctx;
  };

  const playTone = (freq, durationMs, volume = 0.06, type = "sine") => {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = 0;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(volume, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    o.start(now);
    o.stop(now + durationMs / 1000);
  };

  const playMoveSound = (kind) => {
    if (kind === "illegal") {
      playTone(110, 120, 0.05, "sawtooth");
      return;
    }
    if (kind === "capture") {
      playTone(260, 70, 0.07, "square");
      playTone(150, 120, 0.05, "triangle");
      return;
    }
    playTone(420, 55, 0.05, "triangle");
  };

  const showToast = (message, durationMs = 1000) => {
    if (!message) return;
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, durationMs);
  };

  useEffect(() => {
    if (phase !== "play") return;
    const tokens = String(movesUci || "").trim().split(/\s+/).filter(Boolean);
    const len = tokens.length;
    const prev = lastMovesLenRef.current;
    lastMovesLenRef.current = len;
    if (!len || len <= prev) return;
    try {
      const g = new Chess();
      let lastCapture = false;
      for (const uci of tokens) {
        const from = uci.slice(0, 2).toLowerCase();
        const to = uci.slice(2, 4).toLowerCase();
        const promo = uci.length >= 5 ? uci.slice(4, 5).toLowerCase() : undefined;
        const move = g.move(promo ? { from, to, promotion: promo } : { from, to });
        lastCapture = Boolean(move?.captured);
      }
      playMoveSound(lastCapture ? "capture" : "move");
    } catch {
      return;
    }
  }, [movesUci, phase]);

  const pieceIcon = (type, color) => {
    const t = String(type || "").toLowerCase();
    const c = String(color || "").toLowerCase();
    if (c === "w") {
      if (t === "p") return "♙";
      if (t === "n") return "♘";
      if (t === "b") return "♗";
      if (t === "r") return "♖";
      if (t === "q") return "♕";
      if (t === "k") return "♔";
    } else {
      if (t === "p") return "♟";
      if (t === "n") return "♞";
      if (t === "b") return "♝";
      if (t === "r") return "♜";
      if (t === "q") return "♛";
      if (t === "k") return "♚";
    }
    return "";
  };

  useEffect(() => {
    const tokens = String(movesUci || "").trim().split(/\s+/).filter(Boolean);
    const limit = reviewIndex !== null ? reviewIndex : tokens.length;
    const activeTokens = tokens.slice(0, limit);

    if (!activeTokens.length) {
      setCapturedByPlayer([]);
      setCapturedByAi([]);
      return;
    }

    const g = new Chess();
    const capturesByW = [];
    const capturesByB = [];

    for (const uci of activeTokens) {
      const from = uci.slice(0, 2).toLowerCase();
      const to = uci.slice(2, 4).toLowerCase();
      const promo = uci.length >= 5 ? uci.slice(4, 5).toLowerCase() : undefined;
      const move = g.move(promo ? { from, to, promotion: promo } : { from, to });
      if (move?.captured) {
        const capturedColor = move.color === "w" ? "b" : "w";
        const payload = { type: move.captured, color: capturedColor };
        if (move.color === "w") capturesByW.push(payload);
        else capturesByB.push(payload);
      }
    }

    const playerSide = playerSideChar;
    const playerCaptures = playerSide === "w" ? capturesByW : capturesByB;
    const aiCaptures = playerSide === "w" ? capturesByB : capturesByW;
    setCapturedByPlayer(playerCaptures);
    setCapturedByAi(aiCaptures);
  }, [movesUci, playerSideChar, reviewIndex]);

  useEffect(() => {
    if (phase !== "setup") return;
    if (!user?.token) return;

    API.get("/chess/active")
      .then((res) => {
        if (res?.data?.active) setActiveSnapshot(res.data);
        else setActiveSnapshot(null);
        if (typeof res?.data?.balance === "number") syncBalance(res.data.balance);
      })
      .catch(() => {
        setActiveSnapshot(null);
      });
  }, [phase, user?.token]);

  const formatApiError = (e, fallback) => {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message;
      const error = e?.response?.data?.error;
      
      if (msg) return msg;
      if (error) return error;
      if (status === 404) return "Backend chưa có API Cờ Vua (/api/chess). Hãy restart backend rồi thử lại.";
      if (status === 400) return `Lỗi: ${e?.response?.data?.error || "Bad request"}`;
      if (status) return `Lỗi server (${status}). Vui lòng thử lại.`;
      const raw = String(e?.message || "");
      if (raw.toLowerCase().includes("network")) return "Không kết nối được backend. Vui lòng bật backend (port 8080) rồi thử lại.";
      return fallback;
  };

  const handleStart = async () => {
    const amount = parseStake(stakeInput);
    if (!amount) {
      setUiMessage("Vui lòng nhập mức cược hợp lệ.");
      return;
    }

    const balance = user?.balance ?? 0;

      if (amount > balance) {
        setUiMessage("Số dư không đủ để vào bàn với mức cược này.");

        setTimeout(() => {
          setUiMessage("");
        }, 1000);  

        return;
      }

    if (gameMode === 'pvp') {
      // Chế độ tạo phòng
      if (pvpSubMode === 'room') {
        setStakeAmount(amount);
        setShowRoomLobby(true);
        return;
      }
      if (!webSocketService.isConnected()) {
        setUiMessage("Đang kết nối... Vui lòng thử lại");
        return;
      }
      // ✅ Check game active trước khi tìm trận mới
      try {
        const res = await API.get('/pvp/current');
        if (res.data.hasGame && res.data.state?.gameType === 'CHESS') {
          applyChessServerState(res.data.state);
          showToast('↩️ Bạn đang có ván chưa kết thúc!', 2000);
          return;
        }
      } catch {}
      setIsSearching(true);
      setStakeAmount(amount);
      webSocketService.send('/game/match', {
        userId: user.id.toString(),
        nickname: user.nickname || user.username,
        gameType: 'chess',
        betAmount: amount,
        timeControlMs: timeControlMs,
        incrementMs: incrementMs
      });
      return;
    }

    setIsBusy(true);
    setUiMessage("");
    setReviewIndex(null);
    try {
      const res = await API.post("/chess/start", {
        stakeAmount: amount,
        difficulty: difficulty,
        playerColor: playerColor
      });
      applyServerState(res.data);
      setSelectedSquare(null);
      setLegalTargets([]);
      lastMovesLenRef.current = String(res.data?.movesUci || "").trim().split(/\s+/).filter(Boolean).length;
      setPhase("play");
    } catch (e) {
      const msg = formatApiError(e, "Không thể vào bàn, vui lòng thử lại.");
      setUiMessage(msg);
      if (String(msg).toLowerCase().includes("ván cờ đang diễn ra")) {
        API.get("/chess/active")
          .then((res) => {
            if (res?.data?.active) setActiveSnapshot(res.data);
          })
          .catch(() => {});
      }
    } finally {
      setIsBusy(false);
    }
  };
  const showMessage = (msg, duration = 1500) => {
    setUiMessage(msg);

    setTimeout(() => {
      setUiMessage("");
    }, duration);
  };
  const normalizePromotion = (p) => {
    const v = String(p || "").toLowerCase();
    if (v === "q" || v === "r" || v === "b" || v === "n") return v;
    return null;
  };

  const submitMove = (sourceSquare, targetSquare, promotion = null) => {
    if (!isPlayerTurn) return false;
    if (!sourceSquare || !targetSquare) return false;
    if (sourceSquare === targetSquare) return false;

    const prevFen = fen;
    const attempt = new Chess(prevFen);
    const movingPiece = attempt.get(sourceSquare);
    const isPawn = movingPiece?.type === "p";
    const isPromotion =
      isPawn &&
      ((movingPiece?.color === "w" && String(targetSquare).endsWith("8")) ||
        (movingPiece?.color === "b" && String(targetSquare).endsWith("1")));
    const promo = isPromotion ? normalizePromotion(promotion) : null;
    if (isPromotion && !promo) {
      setPendingPromotion({
        from: String(sourceSquare).toLowerCase(),
        to: String(targetSquare).toLowerCase(),
        color: movingPiece?.color || playerSideChar,
      });
      return false;
    }

    let move;
    try {
      move = attempt.move(
        isPromotion
          ? { from: sourceSquare, to: targetSquare, promotion: promo }
          : { from: sourceSquare, to: targetSquare }
      );
    } catch (e) {
      showToast("Nước đi không hợp lệ.");
      playMoveSound("illegal");
      return false;
    }
    if (!move) return false;

    setFen(attempt.fen());
    setIsBusy(true);
    setSelectedSquare(null);
    setLegalTargets([]);
    setPendingPromotion(null);
    setReviewIndex(null);
    playMoveSound(move.captured ? "capture" : "move");

    if (gameMode === 'pvp') {
  const uci = `${sourceSquare}${targetSquare}${promo || ""}`;
  setMovesUci(prev => prev ? `${prev} ${uci}` : uci);
  setMoveCount(prev => prev + 1);
  setPlayerMoveCount(prev => prev + 1);
  const moverSide = sideToMove;
  
  // Cập nhật bàn cờ local ngay lập tức
  const newGame = new Chess(fen);
      if (promo) {
        newGame.move({ from: sourceSquare, to: targetSquare, promotion: promo });
      } else {
        newGame.move({ from: sourceSquare, to: targetSquare });
      }
      setFen(newGame.fen());

      if (incrementMs > 0) {
        if (moverSide === "w") {
          const next = Math.max(0, Number(whiteTimeRef.current ?? timeControlMs) + incrementMs);
          whiteTimeRef.current = next;
          setWhiteTimeMs(next);
        } else {
          const next = Math.max(0, Number(blackTimeRef.current ?? timeControlMs) + incrementMs);
          blackTimeRef.current = next;
          setBlackTimeMs(next);
        }
      }
      lastClockTsRef.current = Date.now();
      
      webSocketService.send('/game/move', {
        gameId: pvpData.gameId,
        senderId: user.id.toString(),
        opponentId: pvpData.opponentId,
        move: { from: sourceSquare, to: targetSquare, promotion: promo },
        gameType: 'chess',
        newFen: newGame.fen(),  // gửi FEN mới để server lưu
        whiteTimeMs: whiteTimeRef.current,
        blackTimeMs: blackTimeRef.current
      });

      const currentMovesUci = String(movesUci || "").trim();
      const movesForServer = currentMovesUci ? `${currentMovesUci} ${uci}` : uci;

      // Kiểm tra kết thúc trận PvP
      if (newGame.isCheckmate()) {
        webSocketService.send('/game/over', {
          gameId: pvpData.gameId,
          winnerId: user.id.toString(),
          loserId: pvpData.opponentId,
          gameType: 'CHESS',
          betAmount: stakeAmount,
          reason: 'checkmate',
          moves: movesForServer,
          finalFen: newGame.fen()
        });
      } else if (newGame.isDraw() || newGame.isStalemate() || newGame.isThreefoldRepetition()) {
        webSocketService.send('/game/over', {
          gameId: pvpData.gameId,
          winnerId: 'draw',
          loserId: 'draw',
          gameType: 'CHESS',
          betAmount: stakeAmount,
          reason: 'draw',
          moves: movesForServer,
          finalFen: newGame.fen()
        });
      }

      setIsBusy(false);
      return true;
    }

    API.post(`/chess/matches/${matchId}/move`, {
      from: sourceSquare,
      to: targetSquare,
      promotion: isPromotion ? promo : null,
    })
      .then((res) => {
        applyServerState(res.data);
      })
      .catch((e) => {
        setFen(prevFen);
        showToast("Nước đi không hợp lệ.");
        playMoveSound("illegal");
      })
      .finally(() => {
        setIsBusy(false);
      });

    return true;
  };

  const onDrop = ({ sourceSquare, targetSquare }) => submitMove(sourceSquare, targetSquare);

  const computeLegalTargets = (square) => {
    if (!fen) return [];
    try {
      const g = new Chess(fen);
      const moves = g.moves({ square, verbose: true });
      return (moves || []).map((m) => ({
        square: String(m.to || "").toLowerCase(),
        isCapture: Boolean(m.captured) || String(m.flags || "").includes("c") || String(m.flags || "").includes("e"),
      }));
    } catch {
      return [];
    }
  };

  const handlePieceClick = ({ isSparePiece, piece, square }) => {
    if (isSparePiece) return;
    if (!square) return;
    if (!isPlayerTurn) return;
    if (pendingPromotion) return;
    const pt = piece?.pieceType || "";
    const ok = playerSideChar === "w" ? String(pt).startsWith("w") : String(pt).startsWith("b");
    if (!ok) return;
    const sq = String(square).toLowerCase();
    if (selectedSquare === sq) {
      setSelectedSquare(null);
      setLegalTargets([]);
      return;
    }
    setSelectedSquare(sq);
    setLegalTargets(computeLegalTargets(sq));
  };

  const handleSquareClick = ({ piece, square }) => {
    if (!square) return;
    if (!isPlayerTurn) return;
    if (pendingPromotion) return;
    const sq = String(square).toLowerCase();
    const pt = piece?.pieceType || "";
    const isOwnPiece =
      piece && (playerSideChar === "w" ? String(pt).startsWith("w") : String(pt).startsWith("b"));

    if (!selectedSquare) {
      if (isOwnPiece) {
        setSelectedSquare(sq);
        setLegalTargets(computeLegalTargets(sq));
      }
      return;
    }

    if (sq === selectedSquare) {
      setSelectedSquare(null);
      setLegalTargets([]);
      return;
    }

    const okTarget = legalTargets.some((t) => t.square === sq);
    if (okTarget) {
      if (!fen) return;
      try {
        const g = new Chess(fen);
        const moving = g.get(selectedSquare);
        const isPawn = moving?.type === "p";
        const needsPromotion =
          isPawn &&
          ((moving?.color === "w" && String(sq).endsWith("8")) ||
            (moving?.color === "b" && String(sq).endsWith("1")));
        if (needsPromotion) {
            setPendingPromotion({
              from: selectedSquare,
              to: sq,
              color: moving?.color || playerSideChar,
            });
            return;
        }
      } catch {
        return;
      }
      submitMove(selectedSquare, sq);
      return;
    }

    if (isOwnPiece) {
      setSelectedSquare(sq);
      setLegalTargets(computeLegalTargets(sq));
      return;
    }

    setSelectedSquare(null);
    setLegalTargets([]);
  };

  const handleLeave = async () => {
    if (!matchId) {
      navigate("/home");
      return;
    }

    if (gameMode === "pvp") {
      const isOpponentDisconnected = pvpDisconnectInfoRef.current?.show;
      setShowLeaveConfirm(false);
      if (!isOpponentDisconnected && serverStatus === "IN_PROGRESS") {
        // Resign: gửi lên server, chờ game-over event rồi hiện kết quả
        // KHÔNG navigate ngay - handleGameOverReceived sẽ xử lý
        try { await API.post('/pvp/resign'); } catch {}
        // Sau 5s nếu không nhận được game-over thì mới navigate
        setTimeout(() => navigate("/home"), 5000);
      } else {
        navigate("/home");
      }
      return;
    }

    if (serverStatus === "FINISHED" || gameResult !== null) {
      navigate("/home");
      return;
    }

    setIsBusy(true);
    try {
      const res = await API.post(`/chess/matches/${matchId}/leave`);
      applyServerState(res.data);
      setTimeout(() => { navigate("/home"); }, 100);
    } catch (e) {
      setUiMessage(formatApiError(e, "Không thể rời phòng."));
    } finally {
      setIsBusy(false);
      setShowLeaveConfirm(false);
    }
  };

  const leaveTableToSetup = () => {
    setShowResultModal(false);
    setResultModalData(null);
    setMatchId(null);
    setStakeAmount(0);
    setFen(null);
    setServerStatus(null);
    setGameResult(null);
    setMovesUci("");
    setMoveCount(0);
    setPlayerMoveCount(0);
    setCanChangeConfig(false);
    setUiMessage("");
    setSelectedSquare(null);
    setLegalTargets([]);
    setPendingPromotion(null);
    setPhase("setup");
  };

  const handleChangeConfig = async () => {
    if (!matchId) {
      setPhase("setup");
      return;
    }

    if (moveCount > 0) {
      setShowConfigPenaltyConfirm(true);
      return;
    }

    setIsBusy(true);
    try {
      const res = await API.post(`/chess/matches/${matchId}/cancel`);
      applyServerState(res.data);
      setMatchId(null);
      setFen(null);
      setServerStatus(null);
      setGameResult(null);
      setMovesUci("");
      setMoveCount(0);
      setPlayerMoveCount(0);
      setCanChangeConfig(false);
      setPhase("setup");
      showMessage("Đã hủy ván cờ, bạn có thể chọn cấu hình mới.");
    } catch (e) {
      setUiMessage(formatApiError(e, "Không thể đổi cấu hình lúc này."));
    } finally {
      setIsBusy(false);
    }
  };

  useEffect(() => () => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  }, []);

  return (
    <div
      className="chess-game-premium"
      style={{
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #1a1a2e 0%, #05050a 100%)",
        color: "#fff",
        padding: "15px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {toast && <div className="chess-mini-toast">{toast}</div>}

      {/* RoomLobby overlay cho Chess PvP */}
      {showRoomLobby && (
        <div style={{ width: "100%", maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.8rem" }}>
              CỜ VUA <span style={{ color: "#ffea00" }}>PVP</span>
            </h1>
          </div>
          <div className="chess-setup-card">
            <RoomLobby
              gameType="CHESS"
              betAmount={stakeAmount}
              timeControlMs={timeControlMs}
              incrementMs={incrementMs}
              userId={String(user?.id)}
              nickname={user?.nickname || user?.username}
              onMatchFound={(data) => {
                setShowRoomLobby(false);
                handleMatch(data);
              }}
              onBack={() => setShowRoomLobby(false)}
            />
          </div>
        </div>
      )}

      {isSearching && (
        <div className="searching-overlay">
          <div className="searching-card">
            <div className="searching-loader"></div>
            <h2>Đang tìm đối thủ...</h2>
            <p>Mức cược: {stakeAmount.toLocaleString()} KGT</p>
            <button className="cancel-search-btn" onClick={cancelSearch}>HỦY TÌM KIẾM</button>
          </div>
        </div>
      )}

      {pvpDisconnectInfo?.show && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 5000, background: 'rgba(20,20,35,0.95)', border: '1px solid rgba(255,165,0,0.5)',
          borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center',
          gap: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            {pvpDisconnectInfo.opponentName} mất kết nối
          </span>
          <span style={{
            background: 'rgba(255,165,0,0.2)', border: '1px solid rgba(255,165,0,0.4)',
            borderRadius: '8px', padding: '2px 10px', color: '#ffa500',
            fontWeight: 900, fontSize: '1rem', minWidth: '36px', textAlign: 'center'
          }}>
            {Math.ceil((pvpDisconnectInfo.remainingMs ?? 0) / 1000)}s
          </span>
        </div>
      )}

      {phase === "setup" ? (
        <div className="chess-setup-wrap">
          <div className="chess-header" style={{ textAlign: "center", marginBottom: "12px" }}>
            <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.8rem", marginBottom: "6px" }}>
              CỜ VUA <span className="gold" style={{ color: "#ffea00" }}>GRANDMASTER</span>
            </h1>
          </div>

          <div className="chess-setup-card">
            <div className="chess-setup-balance">
              <span className="label">SỐ DƯ HIỆN TẠI</span>
              <span className="value">{(user?.balance ?? 0).toLocaleString()} KGT</span>
            </div>

            <div className="chess-setup-grid">
              {/* AI mode: chọn độ khó + quân, không có time control */}
              {gameMode !== 'pvp' && (
                <>
                  <div className="chess-setup-section">
                      <div className="chess-setup-title">CHỌN ĐỘ KHÓ AI</div>
                      <div className="difficulty-selector" style={{ display: "flex", gap: "10px", justifyContent: "flex-start", flexWrap: "wrap" }}>
                          {["EASY", "MEDIUM", "HARD"].map((level) => (
                              <button 
                                  key={level} 
                                  className={difficulty === level ? "active" : ""} 
                                  onClick={() => setDifficulty(level)}
                                  style={{ 
                                      padding: "8px 14px", 
                                      background: difficulty === level ? "#ffea00" : "rgba(255,255,255,0.05)", 
                                      color: difficulty === level ? "#000" : "#fff", 
                                      border: "1px solid rgba(255,234,0,0.3)", 
                                      borderRadius: "999px", 
                                      fontWeight: 900, 
                                      cursor: "pointer", 
                                      textTransform: "uppercase", 
                                      fontSize: "0.8rem" 
                                  }}
                                  disabled={isBusy}
                              >
                                  {level === "EASY" ? "Dễ 🤪" : level === "MEDIUM" ? "Trung bình 🙀" : "Khó 🥶"}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="chess-setup-section">
                    <div className="chess-setup-title">CHỌN QUÂN</div>
                    <div className="difficulty-selector" style={{ display: "flex", gap: "10px", justifyContent: "flex-start", flexWrap: "wrap" }}>
                      {["WHITE", "BLACK"].map((c) => (
                        <button key={c} className={playerColor === c ? "active" : ""} onClick={() => setPlayerColor(c)}
                          style={{ padding: "8px 14px", background: playerColor === c ? "#ffea00" : "rgba(255,255,255,0.05)", color: playerColor === c ? "#000" : "#fff", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "999px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase", fontSize: "0.8rem" }}
                          disabled={isBusy}>
                          {c === "WHITE" ? "Trắng ♘" : "Đen ♞"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* PvP mode: time control */}
              {gameMode === 'pvp' && (
                <>
                  <div className="chess-setup-section">
                    <div className="chess-setup-title">THỜI GIAN MỖI BÊN</div>
                    <div className="difficulty-selector" style={{ display: "flex", gap: "10px", justifyContent: "flex-start", flexWrap: "wrap" }}>
                      {[3, 5, 10].map((min) => (
                        <button key={min} className={timeControlMs === min * 60 * 1000 ? "active" : ""} onClick={() => setTimeControlMs(min * 60 * 1000)}
                          style={{ padding: "8px 14px", background: timeControlMs === min * 60 * 1000 ? "#ffea00" : "rgba(255,255,255,0.05)", color: timeControlMs === min * 60 * 1000 ? "#000" : "#fff", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "999px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase", fontSize: "0.8rem" }}
                          disabled={isBusy}>
                          {min} PHÚT
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="chess-setup-section">
                    <div className="chess-setup-title">THỜI GIAN CỘNG MỖI NƯỚC</div>
                    <div className="difficulty-selector" style={{ display: "flex", gap: "10px", justifyContent: "flex-start", flexWrap: "wrap" }}>
                      {[0, 2, 5].map((sec) => (
                        <button key={sec} className={incrementMs === sec * 1000 ? "active" : ""} onClick={() => setIncrementMs(sec * 1000)}
                          style={{ padding: "8px 14px", background: incrementMs === sec * 1000 ? "#ffea00" : "rgba(255,255,255,0.05)", color: incrementMs === sec * 1000 ? "#000" : "#fff", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "999px", fontWeight: 900, cursor: "pointer", textTransform: "uppercase", fontSize: "0.8rem" }}
                          disabled={isBusy}>
                          +{sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div className="chess-setup-section">
                <div className="chess-setup-title">CHỌN MỨC CƯỢC (KGT)</div>
                <input className="stake-input" inputMode="numeric" value={stakeInput}
                  onChange={(e) => setStakeInput(e.target.value)} placeholder="Nhập mức cược..."
                  disabled={isBusy} style={{ padding: "10px", fontSize: "0.9rem" }} />
                <div className="stake-quick" style={{ gap: "6px", marginTop: "8px" }}>
                  {[1000, 5000, 10000, 20000, 50000, 100000].map((amt) => (
                    <button key={amt} type="button" onClick={() => setStakeInput(String(amt))} disabled={isBusy} style={{ padding: "6px", fontSize: "0.75rem" }}>
                      {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* PvP: 2 nút chọn chế độ, nằm ngang với card mức cược */}
              {gameMode === 'pvp' && (
                <div className="chess-setup-section">
                  <div className="chess-setup-title">CHỌN CHẾ ĐỘ</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button onClick={() => setPvpSubMode('matchmaking')} disabled={isBusy}
                      style={{ padding: "8px 14px", background: pvpSubMode === 'matchmaking' ? "#ffea00" : "rgba(255,255,255,0.05)", color: pvpSubMode === 'matchmaking' ? "#000" : "#fff", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "999px", fontWeight: 900, cursor: isBusy ? "not-allowed" : "pointer", fontSize: "0.8rem", textAlign: "center" }}>
                      GHÉP NGẪU NHIÊN
                    </button>
                    <button onClick={() => setPvpSubMode('room')} disabled={isBusy}
                      style={{ padding: "8px 14px", background: pvpSubMode === 'room' ? "#ffea00" : "rgba(255,255,255,0.05)", color: pvpSubMode === 'room' ? "#000" : "#fff", border: "1px solid rgba(255,234,0,0.3)", borderRadius: "999px", fontWeight: 900, cursor: isBusy ? "not-allowed" : "pointer", fontSize: "0.8rem", textAlign: "center" }}>
                      TẠO / VÀO PHÒNG
                    </button>
                  </div>
                </div>
              )}
            </div>

            {uiMessage && (
              <div className="game-result" style={{ padding: "8px", background: "rgba(255,234,0,0.08)", border: "1px solid rgba(255,234,0,0.25)", borderRadius: "12px", textAlign: "center", fontWeight: 900, color: "#ffea00", marginTop: "12px", fontSize: "0.85rem" }}>
                {uiMessage}
              </div>
            )}

            <div className="chess-setup-actions" style={{ marginTop: "12px" }}>
              <button className="btn-gold-wide" onClick={handleStart} disabled={isBusy} style={{ padding: "12px" }}>
                {isBusy ? "ĐANG VÀO BÀN..." : gameMode === 'pvp'
                  ? pvpSubMode === 'room' ? '🏠 VÀO LOBBY PHÒNG' : 'TÌM ĐỐI THỦ'
                  : "VÀO BÀN"}
              </button>
              {activeSnapshot?.active && gameMode !== 'pvp' && (
                <button className="btn-ghost-wide" onClick={() => { applyServerState(activeSnapshot); setPhase("play"); }} disabled={isBusy} style={{ padding: "12px" }}>
                  TIẾP TỤC VÁN
                </button>
              )}
              <button className="btn-ghost-wide" onClick={() => navigate("/home")} disabled={isBusy} style={{ padding: "12px" }}>
                VỀ SẢNH
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="chess-header" style={{ textAlign: "center", marginBottom: "5px", width: "100%" }}>
            <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.4rem", marginBottom: "0px", letterSpacing: "1px" }}>
              CỜ VUA <span className="gold" style={{ color: "#ffea00" }}>GRANDMASTER</span>
            </h1>
          </div>

          <div
            className="chess-game-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "250px 1fr 250px",
              gap: "20px",
              maxWidth: "1400px",
              width: "100%",
              alignItems: "start",
            }}
          >
            {/* Cột trái: Thông tin trận đấu */}
            <div className="info-column" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "-15px" }}>
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Số dư & Cược</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>SỐ DƯ HIỆN TẠI:</span>
                    <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>{(user?.balance ?? 0).toLocaleString()} KGT</span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>MỨC CƯỢC VÁN:</span>
                    <span style={{ fontWeight: 900, color: "#ffea00", fontSize: "0.85rem" }}>{stakeAmount.toLocaleString()} KGT</span>
                  </div>
                </div>
              </div>

              {/* Thông tin ván - chỉ hiện ở AI mode */}
              {gameMode !== 'pvp' && (
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Thông tin ván</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>AI ĐỘ KHÓ:</span>
                    <span style={{ fontWeight: 900, color: "#ffea00", fontSize: "0.85rem" }}>
                      {difficulty === "EASY" ? "Dễ" : difficulty === "MEDIUM" ? "Trung bình" : "Khó"}
                    </span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>BẠN CẦM QUÂN:</span>
                    <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>{playerColor === "WHITE" ? "TRẮNG (W)" : "ĐEN (B)"}</span>
                  </div>
                </div>
              </div>
              )}

              {/* Thời gian - chỉ hiện ở PvP mode */}
              {gameMode === 'pvp' && (
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Thời gian</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>CHẾ ĐỘ:</span>
                    <span style={{ fontWeight: 900, color: "#ffea00" }}>
                      {Math.round(timeControlMs / 60000)}+{Math.round(incrementMs / 1000)}
                    </span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>BẠN:</span>
                    <span style={{ fontWeight: 900, color: sideToMove === "w" ? "#ffea00" : "#fff" }}>
                      {formatClock(whiteTimeMs ?? timeControlMs)}
                    </span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>ĐỐI THỦ:</span>
                    <span style={{ fontWeight: 900, color: sideToMove === "b" ? "#ffea00" : "#fff" }}>
                      {formatClock(blackTimeMs ?? timeControlMs)}
                    </span>
                  </div>
                </div>
              </div>
              )}

              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Trạng thái</div>
                <div className="turn-indicator" style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: sideToMove === "w" ? "#fff" : "#000",
                      border: "1px solid #ffea00",
                      boxShadow: sideToMove === (playerSideChar) ? "0 0 10px #ffea00" : "none"
                    }}
                  ></span>
                  <span style={{ fontWeight: 900, fontSize: "0.85rem", color: isPlayerTurn ? "#ffea00" : "#fff" }}>
                    {serverStatus === "FINISHED" ? "KẾT THÚC" : isBusy ? "XỬ LÝ..." : isPlayerTurn ? "LƯỢT BẠN" : "CHỜ ĐỐI THỦ"}
                  </span>
                </div>
              </div>

              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "10px", textTransform: "uppercase" }}>Xem lại ván đấu</div>
                <div style={{ display: "flex", gap: "8px", justifyContent: "space-between" }}>
                  <button 
                    onClick={() => {
                      const current = reviewIndex === null ? reviewFens.length - 1 : reviewIndex;
                      if (current > 0) setReviewIndex(current - 1);
                    }}
                    disabled={reviewIndex === 0 || reviewFens.length <= 1}
                    className="btn-ghost-wide" 
                    style={{ padding: "8px", flex: 1, fontSize: "0.75rem", minWidth: "0" }}
                  >
                    ← Lùi
                  </button>
                  <button 
                    onClick={() => {
                      if (reviewIndex !== null) {
                        const next = reviewIndex + 1;
                        if (next >= reviewFens.length - 1) setReviewIndex(null);
                        else setReviewIndex(next);
                      }
                    }}
                    disabled={reviewIndex === null}
                    className="btn-ghost-wide" 
                    style={{ padding: "8px", flex: 1, fontSize: "0.75rem", minWidth: "0" }}
                  >
                    Tiến →
                  </button>
                </div>
                {reviewIndex !== null && (
                  <button 
                    onClick={() => setReviewIndex(null)}
                    className="btn-gold-wide" 
                    style={{ width: "100%", marginTop: "8px", padding: "8px", fontSize: "0.75rem" }}
                  >
                    Về hiện tại
                  </button>
                )}
                <div style={{ marginTop: "8px", fontSize: "0.6rem", opacity: 0.5, textAlign: "center", fontStyle: "italic", lineHeight: 1.2 }}>
                  *Dùng để xem lại, không dùng để đánh lại nước đi
                </div>
              </div>
            </div>

            {/* Cột giữa: Bàn cờ */}
            <div
              className="board-column"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-start",
                marginTop: "10px"
              }}
            >
              <div
                className="board-wrapper"
                style={{
                  width: "100%",
                  maxWidth: "520px",
                  background: "rgba(255,255,255,0.02)",
                  padding: "10px",
                  borderRadius: "20px",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
                  touchAction: "none",
                  position: "relative",
                }}
              >
                <div className="chessboard-host">
                  <Chessboard
                    options={{
                      id: "webbetting-chess",
                      position: currentReviewFen || fen || localGame.fen(),
                      boardOrientation: boardOrientation,
                      showNotation: true,
                      boardStyle: {
                        width: "100%",
                        height: "100%",
                        borderRadius: "16px",
                        border: "2px solid rgba(255, 234, 0, 0.22)",
                        boxShadow: "0 25px 55px rgba(0,0,0,0.65)",
                        overflow: "hidden",
                      },
                      squareStyles: squareStyles,
                      darkSquareStyle: { backgroundColor: "#b58863" },
                      lightSquareStyle: { backgroundColor: "#f0d9b5" },
                      darkSquareNotationStyle: { color: "rgba(0,0,0,0.65)", fontWeight: 900, fontSize: "0.7rem" },
                      lightSquareNotationStyle: { color: "rgba(0,0,0,0.55)", fontWeight: 900, fontSize: "0.7rem" },
                      dropSquareStyle: { boxShadow: "inset 0 0 0 4px rgba(255,234,0,0.6)" },
                      showAnimations: true,
                      animationDurationInMs: 200,
                      dragActivationDistance: 2,
                      allowAutoScroll: true,
                      allowDragging: isInGame && isGameActive && !isBusy && !isReviewMode,
                      canDragPiece: ({ isSparePiece, piece }) => {
                        if (isSparePiece) return false;
                        if (!isPlayerTurn || isReviewMode) return false;
                        const pt = piece?.pieceType || "";
                        return playerSideChar === "w" ? pt.startsWith("w") : pt.startsWith("b");
                      },
                      onPieceDrop: ({ sourceSquare, targetSquare }) =>
                        onDrop({ sourceSquare, targetSquare }),
                      onPieceClick: (args) => !isReviewMode && handlePieceClick(args),
                      onSquareClick: (args) => !isReviewMode && handleSquareClick(args),
                    }}
                  />
                </div>
                {pendingPromotion && (
                  <div className={`promo-strip promo-strip--${promotionStripSide}`}>
                    {["q", "r", "b", "n"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        className="promo-strip-btn"
                        onClick={() => {
                          const from = pendingPromotion.from;
                          const to = pendingPromotion.to;
                          setPendingPromotion(null);
                          submitMove(from, to, p);
                        }}
                        disabled={isBusy}
                      >
                        <span className="promo-strip-icon">{pieceIcon(p, pendingPromotion.color)}</span>
                        <span className="promo-strip-label">
                          {p === "q" ? "Hậu" : p === "r" ? "Xe" : p === "b" ? "Tượng" : "Mã"}
                        </span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="promo-strip-cancel"
                      onClick={() => setPendingPromotion(null)}
                      disabled={isBusy}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              {uiMessage && (
                <div className="game-result" style={{ width: "100%", maxWidth: "520px", marginTop: "10px", padding: "8px", background: "rgba(255,234,0,0.1)", border: "1px solid #ffea00", borderRadius: "8px", textAlign: "center", fontWeight: 900, color: "#ffea00", fontSize: "0.85rem" }}>
                  {uiMessage}
                </div>
              )}
            </div>

            {/* Cột phải: Sidebar */}
            <div className="chess-sidebar" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "-15px" }}>
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <h3 style={{ marginBottom: "8px", fontSize: "0.9rem", color: "#ffea00" }}>QUÂN ĐÃ ĂN</h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px" }}>
                    <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.75)", marginBottom: "6px", fontSize: "0.75rem" }}>BẠN</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", minHeight: "45px" }}>
                      {capturedByPlayer.length ? (
                        capturedByPlayer.map((p, idx) => (
                          <span key={`${p.type}-${p.color}-${idx}`} style={{ fontSize: "1.2rem", lineHeight: 1 }}>
                            {pieceIcon(p.type, p.color)}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: "0.7rem" }}>Trống</span>
                      )}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.22)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px" }}>
                    <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.75)", marginBottom: "6px", fontSize: "0.75rem" }}>AI</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", minHeight: "45px" }}>
                      {capturedByAi.length ? (
                        capturedByAi.map((p, idx) => (
                          <span key={`${p.type}-${p.color}-${idx}`} style={{ fontSize: "1.2rem", lineHeight: 1 }}>
                            {pieceIcon(p.type, p.color)}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "rgba(255,255,255,0.45)", fontWeight: 800, fontSize: "0.7rem" }}>Trống</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="history-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)", flex: "1 1 auto", display: "flex", flexDirection: "column", minHeight: "220px" }}>
                <h3 style={{ marginBottom: "8px", fontSize: "0.9rem", color: "#ffea00" }}>LỊCH SỬ (UCI)</h3>
                <div className="history-list" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px", maxHeight: "240px", overflowY: "auto", paddingRight: "5px" }}>
                  {String(movesUci || "")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((m, i) => {
                      const isWhiteMove = i % 2 === 0;
                      const isPlayerMove = (playerColor === "WHITE" && isWhiteMove) || (playerColor === "BLACK" && !isWhiteMove);
                      const isReviewingThis = reviewIndex === (i + 1);
                      return (
                        <div
                          key={`${m}-${i}`}
                          onClick={() => setReviewIndex(i + 1)}
                          style={{
                            padding: "5px 8px",
                            background: isReviewingThis ? "rgba(0, 255, 180, 0.15)" : (isPlayerMove ? "rgba(255, 234, 0, 0.1)" : "rgba(255,255,255,0.04)"),
                            border: isReviewingThis ? "1px solid rgba(0, 255, 180, 0.3)" : (isPlayerMove ? "1px solid rgba(255, 234, 0, 0.15)" : "1px solid transparent"),
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            cursor: "pointer",
                            transition: "0.2s",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <span style={{ opacity: 0.5, fontSize: "0.65rem" }}>{Math.floor(i / 2) + 1}{i % 2 === 0 ? "." : "..."}</span>
                            <span style={{ fontWeight: 800, color: isPlayerMove ? "#ffea00" : "#fff" }}>{m}</span>
                          </div>
                          <span style={{ fontSize: "0.6rem", fontWeight: 900, opacity: 0.7, color: isPlayerMove ? "#ffea00" : "rgba(255,255,255,0.4)" }}>
                            {isPlayerMove ? "BẠN" : "AI"}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div className="action-buttons" style={{ display: "flex", gap: "10px" }}>
                {serverStatus === "FINISHED" ? (
                  <>
                    <button
                      onClick={leaveTableToSetup}
                      disabled={isBusy}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        color: "#fff",
                        borderRadius: "10px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      CHƠI LẠI
                    </button>
                    <button
                      onClick={() => navigate("/home")}
                      disabled={isBusy}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "linear-gradient(135deg, #ffea00 0%, #ff9500 100%)",
                        border: "none",
                        color: "#000",
                        borderRadius: "10px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      VỀ SẢNH
                    </button>
                  </>
                ) : (
                  <>
                    {canChangeConfig && gameResult == null && (
                      <button
                        onClick={handleChangeConfig}
                        disabled={isBusy || playerMoveCount > 0}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                          borderRadius: "10px",
                          fontWeight: 900,
                          cursor: "pointer",
                          fontSize: "0.8rem",
                        }}
                      >
                        ĐỔI CẤU HÌNH
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (serverStatus === "FINISHED" || gameResult !== null) {
                          navigate("/home");
                        } else {
                          setShowLeaveConfirm(true);
                        }
                      }}
                      disabled={isBusy}
                      style={{
                        flex: 1,
                        padding: "10px",
                        background: "linear-gradient(135deg, #ffea00 0%, #ff9500 100%)",
                        border: "none",
                        color: "#000",
                        borderRadius: "10px",
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: "0.8rem",
                      }}
                    >
                      {gameMode === 'pvp' && serverStatus === 'IN_PROGRESS' ? '🏳️ ĐẦU HÀNG' : 'RỜI PHÒNG'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
                
          {showLeaveConfirm && (
            <div className="premium-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
              <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{gameMode === 'pvp' && serverStatus === 'IN_PROGRESS' ? '🏳️ ĐẦU HÀNG?' : 'RỜI PHÒNG?'}</h3>
                  <button className="btn-close-modal" onClick={() => setShowLeaveConfirm(false)}>×</button>
                </div>
                <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.8)", fontWeight: 700, lineHeight: 1.6, textAlign: "center" }}>
                  {gameMode === "pvp" && serverStatus === "IN_PROGRESS"
                    ? <>Gà dữ vậy sao 😏 </>
                    : <>Bạn sẽ bị trừ <span style={{ color: "#ffea00", fontWeight: 900 }}>{(stakeAmountRef.current || stakeAmount).toLocaleString()} KGT</span> đã cược và bị xử thua</>
                  }
                </div>
                <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
                  <button className="btn-ghost-wide" onClick={() => setShowLeaveConfirm(false)}>Ở LẠI</button>
                  <button className="btn-gold-wide" onClick={handleLeave} style={{ background: '#ff4444', color: '#fff' }}>
                    {gameMode === 'pvp' && serverStatus === 'IN_PROGRESS' ? 'ĐẦU HÀNG' : 'RỜI PHÒNG'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {showConfigPenaltyConfirm && (
            <div className="premium-modal-overlay" onClick={() => setShowConfigPenaltyConfirm(false)}>
              <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>ĐỔI CẤU HÌNH</h3>
                  <button className="btn-close-modal" onClick={() => setShowConfigPenaltyConfirm(false)}>×</button>
                </div>
                <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.8)", fontWeight: 700, lineHeight: 1.6 }}>
                  Ván đã bắt đầu. Nếu đổi cấu hình lúc này sẽ tính như rời phòng và bị trừ <span className="gold" style={{ color: "#ffea00", fontWeight: 900 }}>{stakeAmount.toLocaleString()} KGT</span>.
                </div>
                <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
                  <button className="btn-ghost-wide" onClick={() => setShowConfigPenaltyConfirm(false)}>Ở LẠI</button>
                  <button className="btn-gold-wide" onClick={handleLeave}>XÁC NHẬN</button>
                </div>
              </div>
            </div>
          )}

          {showResultModal && resultModalData && (
            <div className="premium-modal-overlay" onClick={() => setShowResultModal(false)}>
              <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h3>{resultModalData.title}</h3>
                  <button className="btn-close-modal" onClick={() => setShowResultModal(false)}>×</button>
                </div>
                <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.85)", fontWeight: 800, lineHeight: 1.6 }}>
                  <div style={{ marginBottom: "10px" }}>{resultModalData.subtitle}</div>
                  <div style={{ fontWeight: 900, color: resultModalData.delta > 0 ? "#00ff9d" : resultModalData.delta < 0 ? "#ff3b3b" : "#ffea00" }}>
                    {resultModalData.delta > 0 ? "+" : resultModalData.delta < 0 ? "-" : ""}{Math.abs(resultModalData.delta).toLocaleString()} KGT
                  </div>
                </div>
                <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
                  <button className="btn-ghost-wide" onClick={leaveTableToSetup}>
                    CHƠI LẠI
                  </button>
                  <button className="btn-gold-wide" onClick={() => { setShowResultModal(false); navigate("/home"); }}>
                    VỀ SẢNH
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* CHAT BUBBLE - chỉ hiện khi PvP */}
      {gameMode === 'pvp' && pvpData.gameId && pvpData.opponentId && (
        <ChatBubble
          gameId={pvpData.gameId}
          gameType="CHESS"
          userId={String(user?.id)}
          nickname={user?.nickname || user?.username}
          opponentId={pvpData.opponentId}
          opponentNickname={pvpData.opponentNickname}
        />
      )}
    </div>
  );
}

export default ChessGame;
