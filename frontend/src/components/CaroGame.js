import React, { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useLocation } from 'react-router-dom';
import CaroBoard from './CaroBoard';
import CaroBetPanel from './CaroBetPanel';
import ChatBubble from './ChatBubble';
import { getAIMove } from '../utils/caroAI';
import { checkWin, checkDraw } from '../utils/caroWinDetection';
import CaroService from '../services/caroService'; 
import API from "../services/api";
import { parseMoves } from '../utils/moveParser';
import '../styles/CaroGame.css';
import '../styles/ChessGame.css';
import '../styles/board.css';
import { saveGameToLocal, loadGameFromLocal, clearAutoSave } from '../utils/gameStorage';
import webSocketService from '../services/WebSocketService';
import { caroSounds, useBgMusic } from '../hooks/useSoundEngine';

const CaroGame = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const gameMode = queryParams.get('mode') || 'ai'; // 'ai' hoặc 'pvp'

  // Nhạc nền Caro
  useBgMusic('caro');

  const [boardSize, setBoardSize] = useState(50);
  const [lastMove, setLastMove] = useState({ row: -1, col: -1, type: null });
  const [moves, setMoves] = useState([]);
  const [winningCells, setWinningCells] = useState([]);
  const [topToast, setTopToast] = useState(null);
  const topToastTimerRef = useRef(null);
  const pvpDataRef = useRef({ gameId: null, opponentId: null, opponentNickname: null, role: null });
  const caroViewportRef = useRef(null);
  const caroBoardRef = useRef(null);
  // Khởi tạo betAmountRef từ localStorage để tránh 0 sau refresh
  const betAmountRef = useRef(0);
  // Đọc betAmount từ localStorage ngay khi mount
  if (betAmountRef.current === 0) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('pvp_bet_')) {
          const val = parseInt(localStorage.getItem(key) || '0', 10);
          if (val > 0) { betAmountRef.current = val; break; }
        }
      }
    } catch {}
  }
  // Ref để autoSave không bị stale closure
  const gameStateRef = useRef(null);
  const movesRef = useRef([]);
  const resignedRef = useRef(false); // flag block beforeunload save khi đã đầu hàng

  // PvP State
  const [isSearching, setIsSearching] = useState(false);
  const [pvpData, setPvpData] = useState({
    gameId: null,
    opponentId: null,
    opponentNickname: null,
    role: null, // 'PLAYER_1' (X) hoặc 'PLAYER_2' (O)
  });
 
  const [gameState, setGameState] = useState({
    board: Array(50).fill().map(() => Array(50).fill('')),
    isPlayerTurn: true,
    isGameOver: false,
    currentPlayer: 'X',
    betAmount: 0,
    aiMode: 'Easy',
    winner: null,
    gameStarted: false
  });

  const showTopToast = (message, durationMs = 1000) => {
    if (!message) return;
    if (topToastTimerRef.current) clearTimeout(topToastTimerRef.current);
    setTopToast(message);
    topToastTimerRef.current = setTimeout(() => {
      setTopToast(null);
      topToastTimerRef.current = null;
    }, durationMs);
  };
  
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [gameResult, setGameResult] = useState({ 
    show: false, 
    message: '', 
    type: '' 
  });
  const [showResultModal, setShowResultModal] = useState(false);
  const [resultModalData, setResultModalData] = useState(null);


  const autoSaveGame = (currentMoves) => {
    if (!gameState.gameStarted || gameState.isGameOver) return;
    if (!currentMoves || currentMoves.length === 0) return;
    
    const moveString = currentMoves.map(move => 
      `${move.row},${move.col},${move.player}${move.isWinningMove ? ',win' : ''}`
    ).join(';');
    
    saveGameToLocal({
      moves: moveString,
      betAmount: gameState.betAmount,
      aiMode: gameState.aiMode,
      boardSize: 50,
      isPlayerTurn: gameState.isPlayerTurn,
      playerSymbol: gameState.playerSymbol,
      currentMoveCount: currentMoves.length
    });
  };

  // ⭐ Phục hồi game khi vào - đọc ngay khi khởi tạo, không cần useEffect
  const [savedSnapshot, setSavedSnapshot] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'pvp') return null;
      const autoSave = loadGameFromLocal();
      return (autoSave?.moves) ? autoSave : null;
    } catch { return null; }
  });

  // ⭐ Cảnh báo khi thoát - PvP KHÔNG xử thua khi refresh/back
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameMode === 'pvp') return;
      if (resignedRef.current) return; // đã đầu hàng → không save
      const gs = gameStateRef.current;
      const mv = movesRef.current;
      if (gs?.gameStarted && !gs?.isGameOver && gs?.aiGameId) {
        const moveString = (mv || []).map(m =>
          `${m.row},${m.col},${m.player}${m.isWinningMove ? ',win' : ''}`
        ).join(';');
        saveGameToLocal({
          moves: moveString,
          betAmount: gs.betAmount,
          aiMode: gs.aiMode,
          boardSize: 50,
          isPlayerTurn: gs.isPlayerTurn,
          currentMoveCount: (mv || []).length,
          aiGameId: gs.aiGameId,
          playerSymbol: gs.playerSymbol,
        });
        // KHÔNG set e.returnValue - không hiện dialog xác nhận
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameMode]);

  const resumeSavedGame = () => {
    // Cho phép resume kể cả khi chưa có nước đi (moves rỗng)
    if (!savedSnapshot?.aiGameId && !savedSnapshot?.moves) return;
    try {
      const savedMoves = savedSnapshot.moves ? parseMoves(savedSnapshot.moves) : [];
      const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
      savedMoves.forEach(move => {
        if (move && move.row !== undefined && move.col !== undefined) {
          newBoard[move.row][move.col] = move.player;
        }
      });
      setMoves(savedMoves);
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameStarted: true,
        betAmount: savedSnapshot.betAmount || 0,
        aiMode: savedSnapshot.aiMode || 'Easy',
        playerSymbol: savedSnapshot.playerSymbol || 'X',
        isPlayerTurn: savedSnapshot.isPlayerTurn !== undefined ? savedSnapshot.isPlayerTurn : true,
        isGameOver: false,
        winner: null,
        aiGameId: savedSnapshot.aiGameId || null,
      }));
      setSavedSnapshot(null);
      clearAutoSave();
    } catch (e) {
      clearAutoSave();
      setSavedSnapshot(null);
    }
  };

  // ✅ Save khi component unmount (bấm back trong React Router)
  useEffect(() => {
    return () => {
      if (gameMode === 'pvp') return;
      if (resignedRef.current) return; // đã đầu hàng → không save
      const gs = gameStateRef.current;
      const mv = movesRef.current;
      // Save kể cả khi chưa có nước đi (game mới bắt đầu)
      if (gs?.gameStarted && !gs?.isGameOver && gs?.aiGameId) {
        const moveString = (mv || []).map(m =>
          `${m.row},${m.col},${m.player}${m.isWinningMove ? ',win' : ''}`
        ).join(';');
        saveGameToLocal({
          moves: moveString,
          betAmount: gs.betAmount,
          aiMode: gs.aiMode,
          boardSize: 50,
          isPlayerTurn: gs.isPlayerTurn,
          currentMoveCount: (mv || []).length,
          aiGameId: gs.aiGameId,
          playerSymbol: gs.playerSymbol,
        });
      }
    };
  }, [gameMode]); // cleanup chạy khi unmount


  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData) {
      window.location.href = '/login';
      return;
    }
    setUser(userData);
    setBalance(userData.balance);
  }, []);

  // ✅ AI mode: check server active game khi load trang (giống Chess)
  useEffect(() => {
    if (gameMode === 'pvp' || !user?.id) return;
    API.get('/caro/active')
      .then(res => {
        if (res.data.active) {
          // Có game đang active trên server - merge với localStorage snapshot
          const serverGame = res.data;
          const localSnap = loadGameFromLocal();
          // Ưu tiên moves từ localStorage (có thể mới hơn), gameId từ server
          const snap = {
            betAmount: serverGame.betAmount || localSnap?.betAmount || 0,
            aiMode: serverGame.difficulty || localSnap?.aiMode || 'Easy',
            aiGameId: serverGame.gameId,
            moves: localSnap?.moves || '',
            isPlayerTurn: localSnap?.isPlayerTurn !== undefined ? localSnap.isPlayerTurn : true,
            currentMoveCount: localSnap?.currentMoveCount || 0,
            playerSymbol: localSnap?.playerSymbol || serverGame.playerSymbol || 'X',
          };
          setSavedSnapshot(snap);
          // Cập nhật balance từ server
          setBalance(res.data.balance);
          const userData = JSON.parse(localStorage.getItem('user'));
          if (userData) {
            const updated = { ...userData, balance: res.data.balance };
            localStorage.setItem('user', JSON.stringify(updated));
            setUser(updated);
          }
        }
      })
      .catch(() => {});
  }, [gameMode, user?.id]); // eslint-disable-line

  // ✅ Khi vào PvP mode: gọi server check game đang active ngay lập tức
  useEffect(() => {
    if (gameMode !== 'pvp' || !user?.id || gameState.gameStarted) return;
    checkAndRestoreCurrentGame();
  }, [gameMode, user?.id]); // eslint-disable-line

  const refreshBalanceFromServer = async () => {
    try {
      const userData = JSON.parse(localStorage.getItem("user"));
      const res = await API.get(`/users/${userData.id}`);
      const latestBalance = res.data.balance;
      setBalance(latestBalance);
      const updatedUser = { ...userData, balance: latestBalance };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.error("❌ Lỗi refresh balance:", error);
    }
  };

  

  const applyServerGameState = useCallback((s) => {
    if (!s || !user) return;
    const myId = String(user.id);
    const isP1 = myId === String(s.player1Id);
    const mySymbol = isP1 ? 'X' : 'O';
    const isMyTurn = myId === String(s.currentTurn);

    // Rebuild board từ moves - player1 luôn là X (đi trước), player2 là O
    const newBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(''));
    const parsedMoves = [];
    if (s.moves) {
      s.moves.split(';').filter(Boolean).forEach((m, idx) => {
        const parts = m.split(',');
        if (parts.length >= 2) {
          const row = parseInt(parts[0]);
          const col = parseInt(parts[1]);
          // Tính player từ index: move 0,2,4... = X (PLAYER_1), 1,3,5... = O (PLAYER_2)
          const player = parts[2] || (idx % 2 === 0 ? 'X' : 'O');
          if (!isNaN(row) && !isNaN(col)) {
            newBoard[row][col] = player;
            parsedMoves.push({ row, col, player, isWinningMove: parts[3] === 'win', moveNumber: idx + 1 });
          }
        }
      });
    }

    setPvpData(prev => ({
      ...prev,
      gameId: s.gameId,
      opponentId: isP1 ? s.player2Id : s.player1Id,
      opponentNickname: isP1 ? s.player2Nickname : s.player1Nickname,
      role: isP1 ? 'PLAYER_1' : 'PLAYER_2',
    }));

    setMoves(parsedMoves);
    const restoredBetAmount = s.betAmount || (() => {
      // Fallback: đọc từ localStorage nếu server không trả về
      try { return parseInt(localStorage.getItem(`pvp_bet_${s.gameId}`) || '0', 10) || 0; } catch { return 0; }
    })();
    betAmountRef.current = restoredBetAmount;
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      gameStarted: true,
      isGameOver: s.status === 'FINISHED',
      isPlayerTurn: isMyTurn,
      betAmount: restoredBetAmount,
    }));

    // ✅ Timer từ server - dùng thẳng, server broadcast mỗi 1s
    const myTimeMs = isP1 ? s.timePlayer1Ms : s.timePlayer2Ms;
    const opponentTimeMs = isP1 ? s.timePlayer2Ms : s.timePlayer1Ms;
    if (s.timePlayer1Ms != null) {
      setServerTimers({ myTimeMs, opponentTimeMs, serverTimestamp: s.serverTimestamp });
    }

    if (s.status === 'DISCONNECTED') {
      showTopToast('⚠️ Đối thủ mất kết nối, đang chờ...', 3000);
    }  
  }, [user, boardSize]);


  // ✅ Gọi /api/pvp/current để check và restore game đang active
  const checkAndRestoreCurrentGame = useCallback(async () => {
    try {
      const res = await API.get('/pvp/current');
      if (!res.data.hasGame) return false;
      const s = res.data.state;
      if (s.gameType !== 'CARO') return false;
      applyServerGameState(s);
      return true;
    } catch {
      return false;
    }
  }, [applyServerGameState]);
  // Server timer state
  const [serverTimers, setServerTimers] = useState({ myTimeMs: null, opponentTimeMs: null, serverTimestamp: null });

  useEffect(() => {
    const handleStorageChange = () => {
      const userData = JSON.parse(localStorage.getItem("user"));
      if (userData) {
        setBalance(userData.balance);
        setUser(userData);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // WebSocket Handlers
  const handleMatch = useCallback((data) => {
    console.log('Match Event Received in CaroGame:', data);
    
    if (data.gameType?.toLowerCase() !== 'caro') return;

    // Xử lý lỗi không đủ tiền
    if (data.gameId === 'ERROR_INSUFFICIENT_BALANCE') {
      setIsSearching(false);
      showTopToast('❌ Không đủ số dư để tham gia trận này!', 3000);
      return;
    }

    // ✅ FIX: dùng startTransition để React xử lý state update này
    startTransition(() => {
      setIsSearching(false);
      setPvpData({
        gameId: data.gameId,
        opponentId: data.opponentId,
        opponentNickname: data.opponentNickname,
        role: data.role,
      });

      const isFirstPlayer = data.role === 'PLAYER_1';
      const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
      betAmountRef.current = data.betAmount || 0;
      // Lưu betAmount vào localStorage để restore sau refresh
      try { localStorage.setItem(`pvp_bet_${data.gameId}`, String(data.betAmount || 0)); } catch {}
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameStarted: true,
        isGameOver: false,
        winner: null,
        isPlayerTurn: isFirstPlayer,
        currentPlayer: isFirstPlayer ? 'X' : 'O',
        betAmount: data.betAmount,
      }));
      
      setMoves([]);
      setWinningCells([]);
      setLastMove({ row: -1, col: -1, type: null });
    });
    // Refresh balance vì backend đã trừ tiền khi match
    refreshBalanceFromServer();
  }, [boardSize]);

  const handleGameEnd = async (winner, finalBoard, winCells = [], finalMoves = moves) => {
      console.log('🎯 [DEBUG handleGameEnd] START ====================');
      console.log('   Winner:', winner);
      console.log('   Final moves count:', finalMoves.length);
      console.log('   Winning cells count:', winCells?.length || 0);
      
      // Debug moves chi tiết
      console.log('📋 [DEBUG] Final moves:');
      finalMoves.forEach((m, i) => {
        const isWinning = m.isWinningMove ? '🏆' : '';
        console.log(`   #${i+1}: ${m.player}(${m.row},${m.col}) ${isWinning}`);
      });
      
      let message = '';
      let resultType = '';
      let gameResultStr = '';
      let winAmount = 0;
      let newBalance = balance;
      
      // Tính balance
      if (winner === 'player') {
        winAmount = gameState.betAmount * 2;
        newBalance = balance + winAmount;
        message = `🎉 May mắn đó !`;
        resultType = 'player';
        gameResultStr = 'WIN';
        caroSounds.win();
      } else if (winner === 'ai') {
        winAmount = 0;
        newBalance = balance;
        message = `🤖 Quá gàaa`;
        resultType = 'ai';
        gameResultStr = 'LOSE';
        caroSounds.lose();
      } else {
        winAmount = gameState.betAmount;
        newBalance = balance + winAmount;
        message = '🤝 Draw! Bet returned';
        resultType = 'draw';
        gameResultStr = 'DRAW';
        caroSounds.draw();
      }

      console.log('💰 [DEBUG] Balance:', {
        old: balance,
        new: newBalance,
        bet: gameState.betAmount,
        win: winAmount
      });
      
      // Cập nhật balance cục bộ
      setBalance(newBalance);
      
      // ⭐ QUAN TRỌNG: Tạo move string với định dạng đúng
      const moveString = finalMoves.map(move => 
        `${move.row},${move.col},${move.player}${move.isWinningMove ? ',win' : ''}`
      ).join(';');
      
      console.log('💾 [DEBUG] Move string generated:');
      console.log('   Length:', moveString.split(';').length);
      console.log('   Format sample:', moveString.substring(0, 50) + (moveString.length > 50 ? '...' : ''));
      
      // Debug winning moves
      const winningMoves = finalMoves.filter(m => m.isWinningMove);
      console.log('🏆 [DEBUG] Winning moves in finalMoves:', winningMoves.length);
      winningMoves.forEach((m, i) => {
        console.log(`   Winning move ${i+1}: ${m.player} at (${m.row},${m.col})`);
      });
      
      // 3. Nếu là PVP, gửi kết quả lên Server qua WebSocket
      if (gameMode === 'pvp') {
        let winnerId = 'draw';
        if (winner === 'player') winnerId = user.id;
        else if (winner === 'ai') winnerId = pvpData.opponentId;

        webSocketService.send('/game/over', {
          gameId: pvpData.gameId,
          winnerId: winnerId,
          loserId: winnerId === user.id ? pvpData.opponentId : (winnerId === 'draw' ? 'draw' : user.id),
          gameType: 'CARO',
          betAmount: gameState.betAmount,
          reason: winner === 'draw' ? 'draw' : '5-in-a-row'
        });
        
        console.log('🏁 [DEBUG] PvP Game Over sent to server');
        return; // Không lưu vào API history ở đây vì Server sẽ xử lý
      }

      // 4. Lưu kết quả game AI qua backend (backend tính balance)
      try {
        // Dùng ref để tránh stale closure
        const aiGameId = gameStateRef.current?.aiGameId || gameState.aiGameId;
        if (aiGameId) {
          const res = await API.post(`/caro/matches/${aiGameId}/finish`, {
            result: gameResultStr,
            moves: moveString
          });
          const newBalanceFromServer = res.data.balance;
          setBalance(newBalanceFromServer);
          const updatedUser = { ...user, balance: newBalanceFromServer };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          window.dispatchEvent(new Event('storage'));
        } else {
          console.warn('⚠️ aiGameId not found - balance not updated on server');
        }
      } catch (error) {
        console.error('❌ Failed to finish game:', error);
      }

      // Cập nhật UI
      setGameState(prev => ({
          ...prev,
          board: finalBoard,
          isGameOver: true,
          winner
      }));

      // Hiện modal kết quả giống Chess
      setResultModalData({
        title: winner === 'player' ? '🏆 CHIẾN THẮNG' : winner === 'draw' ? 'HÒA' : 'THẤT BẠI',
        subtitle: message,
        delta: winner === 'player' ? winAmount : winner === 'draw' ? 0 : -gameState.betAmount,
        type: winner === 'player' ? 'WIN' : winner === 'draw' ? 'DRAW' : 'LOSE',
      });
      setShowResultModal(true);

      // Giữ winningCells hiển thị
      if (winCells.length >= 5) {
        setWinningCells(winCells);
        setTimeout(() => setWinningCells([]), 3000);
      }
      
      console.log('✅ [DEBUG handleGameEnd] END ====================');
    };
  const handleMoveReceived = useCallback((data) => {
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;

    const { row, col } = data.move;
    const opponentPlayer = currentPvpData.role === 'PLAYER_1' ? 'O' : 'X';
    
    setGameState(prev => {
      const newBoard = prev.board.map(r => [...r]);
      newBoard[row][col] = opponentPlayer;
      
      setLastMove({ row, col, type: 'ai' }); // 'ai' here means opponent
      caroSounds.opponentMove();
      
      const newMove = {
        row,
        col,
        player: opponentPlayer,
        isWinningMove: false,
        moveNumber: moves.length + 1
      };

      const winCells = checkWin(newBoard, row, col, opponentPlayer);
      if (winCells && winCells.length >= 5) {
        newMove.isWinningMove = true;
        const finalMoves = [...moves, newMove];
        setMoves(finalMoves);
        setWinningCells(winCells);
        showTopToast('🏁 Đang xử lý kết quả...', 1000);
        return { ...prev, board: newBoard, isGameOver: true };
      }

      const updatedMoves = [...moves, newMove];
      setMoves(updatedMoves);

      if (checkDraw(newBoard)) {
        showTopToast('🏁 Đang xử lý kết quả...', 1000);
        return { ...prev, board: newBoard, isGameOver: true };
      }

      return {
        ...prev,
        board: newBoard,
        isPlayerTurn: true
      };
    });
  }, [pvpData, moves]);

  const handleGameOverReceived = useCallback((data) => {
    console.log('🏁 Received PvP Game Over:', data);
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;

    disconnectInfoRef.current = null;
    setDisconnectInfo(null);
    const result = String(data.result || "").toUpperCase();
    const bet = Number(data.betAmount || gameState.betAmount || 0);
    // Xóa betAmount cache khi game kết thúc
    try {
      const gId = pvpDataRef.current?.gameId;
      if (gId) localStorage.removeItem(`pvp_bet_${gId}`);
    } catch {}
    const reason = String(data.reason || "");
    const isDisconnectWin = reason === "disconnect_timeout" && result === "WIN";

    if (typeof data.myBalanceAfter === "number") {
      const updatedUser = { ...user, balance: data.myBalanceAfter };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setBalance(data.myBalanceAfter);
      window.dispatchEvent(new Event('storage'));
    }

    const type = result === "WIN" ? "player" : result === "DRAW" ? "draw" : "ai";
    const isResign = reason === "resign" && result === "LOSE";
    const msg =
      result === "WIN"
        ? isDisconnectWin
          ? `Đối thủ bỏ cuộc!`
          : reason === "resign"
          ? `Đối thủ quá gà nên đã đầu hàng!`
          : `🎉 Chúc mừng bạn!`
        : result === "DRAW"
        ? `🤝 Hòa! Không đổi KGT`
        : isResign
        ? `🏳️ Quá nhục! `
        : `💀 Bạn đã thất bại!`;

    setGameState(prev => ({ ...prev, isGameOver: true, winner: type }));

    // Hiện modal kết quả giống Chess
    setResultModalData({
      title: result === "WIN" ? '🏆 CHIẾN THẮNG' : result === "DRAW" ? 'HÒA' : 'THẤT BẠI',
      subtitle: msg,
      delta: result === "WIN" ? bet * 2 : result === "DRAW" ? 0 : -bet,
      type: result === "WIN" ? 'WIN' : result === "DRAW" ? 'DRAW' : 'LOSE',
    });
    setShowResultModal(true);
    showTopToast(msg, 3000);
    if (isResign) {
      setTimeout(() => { window.location.href = '/home'; }, 4000);
    }
  }, [pvpData, user, gameState.betAmount]);
  // Handler cho server-authoritative game state (reconnect, disconnect, timer sync)
  const handleGameState = useCallback((data) => {
    if (!data || !data.gameId) return;
    const currentPvpData = pvpDataRef.current;
    if (currentPvpData.gameId && data.gameId !== currentPvpData.gameId) return;

    // Cập nhật timer từ server
    if (data.timePlayer1Ms != null && user?.id) {
      const myId = String(user.id);
      const isP1 = myId === String(data.player1Id);
      const myTimeMs = isP1 ? data.timePlayer1Ms : data.timePlayer2Ms;
      const opponentTimeMs = isP1 ? data.timePlayer2Ms : data.timePlayer1Ms;
      setServerTimers({ myTimeMs, opponentTimeMs, serverTimestamp: data.serverTimestamp });
    }

    const myId = String(user?.id);

    if (data.status === 'DISCONNECTED' && data.disconnectedPlayerId) {
      const isOpponentDisconnected = data.disconnectedPlayerId !== myId;
      if (isOpponentDisconnected) {
        const remaining = Math.max(0, data.reconnectRemainingMs ?? 0);
        const info = {
          show: true,
          remainingMs: remaining,
          opponentName: currentPvpData.opponentNickname || 'Đối thủ'
        };
        disconnectInfoRef.current = info;
        setDisconnectInfo(info);
      }
    } else if (data.status === 'IN_PROGRESS') {
      if (disconnectInfoRef.current?.show) {
        disconnectInfoRef.current = null;
        setDisconnectInfo(null);
        showTopToast(`✅ ${currentPvpData.opponentNickname || 'Đối thủ'} đã quay lại!`, 2000);
      }
    }

    applyServerGameState(data);
  }, [user?.id, applyServerGameState]);

  const handleMatchRef = useRef(handleMatch);
  const handleMoveReceivedRef = useRef(handleMoveReceived);
  const handleGameOverReceivedRef = useRef(handleGameOverReceived);
  const handleGameStateRef = useRef(handleGameState);
  // Stable wrapper functions - tạo 1 lần duy nhất, không bao giờ thay đổi
  const stableMatchHandlerRef = useRef(null);
  const stableMoveHandlerRef = useRef(null);
  const stableGameOverHandlerRef = useRef(null);
  const stableGameStateHandlerRef = useRef(null);
  // Khởi tạo stable handlers ngay lập tức (không trong useEffect)
  if (!stableMatchHandlerRef.current) {
    stableMatchHandlerRef.current = (data) => handleMatchRef.current(data);
    stableMoveHandlerRef.current = (data) => handleMoveReceivedRef.current(data);
    stableGameOverHandlerRef.current = (data) => handleGameOverReceivedRef.current(data);
    stableGameStateHandlerRef.current = (data) => handleGameStateRef.current(data);
  }
  useEffect(() => { pvpDataRef.current = pvpData; }, [pvpData]);
  useEffect(() => { betAmountRef.current = gameState.betAmount; }, [gameState.betAmount]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { movesRef.current = moves; }, [moves]);
  useEffect(() => { handleMoveReceivedRef.current = handleMoveReceived; }, [handleMoveReceived]);
  useEffect(() => { handleGameOverReceivedRef.current = handleGameOverReceived; }, [handleGameOverReceived]);
  useEffect(() => { handleGameStateRef.current = handleGameState; }, [handleGameState]);
  useEffect(() => {
        if (gameMode !== 'pvp' || !user?.id) return;
        
        console.log('Initiating WebSocket connection for PvP Caro...');

        // Subscribe stable handlers (chỉ 1 lần vì handlers không đổi)
        webSocketService.subscribe('match', stableMatchHandlerRef.current);
        webSocketService.subscribe('move', stableMoveHandlerRef.current);
        webSocketService.subscribe('game-over', stableGameOverHandlerRef.current);
        webSocketService.subscribe('game-state', stableGameStateHandlerRef.current);

        webSocketService.connect(user.id.toString(), () => {
            console.log('WebSocket connected in CaroGame, subscribing to events...');
            // Sau khi connect, gọi server để check game đang active
            if (gameMode === 'pvp' && !gameState.gameStarted) {
              checkAndRestoreCurrentGame().then(restored => {
                if (restored) {
                  console.log('✅ Restored active PvP game from server');
                  // Gửi reconnect signal để server resume timer
                  // gameId sẽ được lấy từ applyServerGameState → pvpData
                }
              });
            }
        });

        return () => {
            console.log('Unsubscribing from WebSocket events in CaroGame');
            webSocketService.unsubscribe('match', stableMatchHandlerRef.current);
            webSocketService.unsubscribe('move', stableMoveHandlerRef.current);
            webSocketService.unsubscribe('game-over', stableGameOverHandlerRef.current);
            webSocketService.unsubscribe('game-state', stableGameStateHandlerRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameMode, user?.id]);

  const cancelSearch = () => {
    setIsSearching(false);
    webSocketService.send('/game/cancel-match', {
      userId: user.id,
      gameType: 'CARO',
      betAmount: gameState.betAmount
    });
  };

  // Xử lý đặt cược  
  const handleBetPlaced = async (betAmount, aiMode, playerSymbol = 'X', matchData = null) => {
      // Nếu được gọi từ RoomLobby với matchData sẵn → apply trực tiếp
      if (matchData && matchData.gameId) {
        handleMatch(matchData);
        return;
      }

      if (betAmount > balance) {
          alert('Số dư không đủ!');
          return;
      }

      if (gameMode === 'pvp') {
          try {
            const res = await API.get('/pvp/current');
            if (res.data.hasGame && res.data.state?.gameType === 'CARO') {
              applyServerGameState(res.data.state);
              showTopToast('↩️ Bạn đang có ván chưa kết thúc!', 2000);
              return;
            }
          } catch {}
          setIsSearching(true);
          setGameState(prev => ({ ...prev, betAmount }));
          webSocketService.send('/game/match', {
              userId: user.id,
              nickname: user.nickname,
              gameType: 'CARO',
              betAmount: betAmount
          });
          return;
      }

      // AI mode: gọi backend để trừ tiền và tạo game record
      try {
        const res = await API.post('/caro/start', { betAmount, aiMode, playerSymbol });
        const gameId = res.data.gameId;
        const newBalance = res.data.balance;

        // Cập nhật balance từ server
        setBalance(newBalance);
        const updatedUser = { ...user, balance: newBalance };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('storage'));

        const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
        const isPlayerFirst = playerSymbol === 'X';

        setGameState(prev => ({
            ...prev,
            board: newBoard,
            betAmount,
            aiMode,
            gameStarted: true,
            isGameOver: false,
            winner: null,
            isPlayerTurn: isPlayerFirst,
            playerSymbol,
            aiGameId: gameId, // lưu gameId để gọi finish/abandon
        }));

        setLastMove({ row: -1, col: -1, type: null });
        setMoves([]);
        setWinningCells([]);

        if (!isPlayerFirst) {
          const emptyBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
          const center = Math.floor(boardSize / 2);
          emptyBoard[center][center] = 'X';
          const firstMove = { row: center, col: center, player: 'X', isWinningMove: false, moveNumber: 1 };
          setMoves([firstMove]);
          setLastMove({ row: center, col: center, type: 'ai' });
          setGameState(prev => ({ ...prev, board: emptyBoard, isPlayerTurn: true }));
        }
      } catch (e) {
        alert(e.response?.data?.error || 'Không thể bắt đầu ván. Vui lòng thử lại.');
      }
  };

  const handleCellClick = (row, col) => {
    if (!gameState.gameStarted || gameState.isGameOver || !gameState.isPlayerTurn) {
      return;
    }
    
    const newBoard = gameState.board.map(r => [...r]);
    if (newBoard[row][col] !== '') return;

    caroSounds.place(); // âm thanh đặt quân
    if (newBoard[row][col] !== '') return;
    
    const playerSymbol = pvpData.role === 'PLAYER_1' ? 'X' : (gameMode === 'pvp' ? 'O' : (gameState.playerSymbol || 'X'));
    newBoard[row][col] = playerSymbol;
    setLastMove({ row, col, type: 'player' });
    
    const newMove = { 
      row, 
      col, 
      player: playerSymbol, 
      isWinningMove: false,
      moveNumber: moves.length + 1 
    };

    if (gameMode === 'pvp') {
      webSocketService.send('/game/move', {
        gameId: pvpData.gameId,
        senderId: String(user.id),
        opponentId: pvpData.opponentId,
        move: { row, col },
        gameType: 'CARO'
      });
    }
    
    const winCells = checkWin(newBoard, row, col, playerSymbol);
    
    if (winCells && winCells.length >= 5) {
      newMove.isWinningMove = true;
      const finalMoves = [...moves, newMove];
      setMoves(finalMoves);
      setWinningCells(winCells);
      if (gameMode === 'pvp') {
        const moveString = finalMoves.map(move => 
          `${move.row},${move.col},${move.player}${move.isWinningMove ? ',win' : ''}`
        ).join(';');
        setGameState(prev => ({ ...prev, board: newBoard, isGameOver: true }));
        showTopToast('🏁 Đang xử lý kết quả...', 1000);
        webSocketService.send('/game/over', {
          gameId: pvpData.gameId,
          winnerId: user.id,
          loserId: pvpData.opponentId,
          gameType: 'CARO',
          betAmount: gameState.betAmount,
          reason: '5-in-a-row',
          moves: moveString
        });
      } else {
        handleGameEnd('player', newBoard, winCells, finalMoves);
      }
      return;
    }
    
    const updatedMoves = [...moves, newMove];
    setMoves(updatedMoves);
    
    if (checkDraw(newBoard)) {
      if (gameMode === 'pvp') {
        const moveString = updatedMoves.map(move => 
          `${move.row},${move.col},${move.player}${move.isWinningMove ? ',win' : ''}`
        ).join(';');
        setGameState(prev => ({ ...prev, board: newBoard, isGameOver: true }));
        showTopToast('🏁 Đang xử lý kết quả...', 1000);
        webSocketService.send('/game/over', {
          gameId: pvpData.gameId,
          winnerId: 'draw',
          loserId: 'draw',
          gameType: 'CARO',
          betAmount: gameState.betAmount,
          reason: 'draw',
          moves: moveString
        });
      } else {
        handleGameEnd('draw', newBoard, [], updatedMoves);
      }
      return;
    }
    
    setGameState(prev => ({
      ...prev,
      board: newBoard,
      isPlayerTurn: false
    }));
    
    if (gameMode === 'ai') {
      setTimeout(() => makeAIMove(newBoard, updatedMoves), 100);
    }
  };

  // ⭐ FIX: AI move cũng thêm isWinningMove
  const makeAIMove = (currentBoard, currentMoves) => {
    requestAnimationFrame(() => {
      const aiMove = getAIMove(currentBoard, gameState.aiMode);
      
      if (aiMove.row === -1) {
        handleGameEnd('draw', currentBoard, [], currentMoves);
        return;
      }
      
      const newBoard = currentBoard.map(row => [...row]);
      // AI dùng symbol ngược với player
      const aiSymbol = gameState.playerSymbol === 'X' ? 'O' : 'X';
      newBoard[aiMove.row][aiMove.col] = aiSymbol;
      setLastMove({ row: aiMove.row, col: aiMove.col, type: 'ai' });
      
      const newAIMove = { 
        row: aiMove.row, 
        col: aiMove.col, 
        player: aiSymbol, 
        isWinningMove: false,
        moveNumber: currentMoves.length + 1 
      };
      
      const winCells = checkWin(newBoard, aiMove.row, aiMove.col, aiSymbol);
      
      if (winCells && winCells.length >= 5) {
        console.log('🎯 [DEBUG] AI WINS! Winning cells:', winCells);
        
        const winningMove = {
          ...newAIMove,
          isWinningMove: true,
          winCells: winCells
        };
        
        const finalMoves = [...currentMoves, winningMove];
        setMoves(finalMoves);
        setWinningCells(winCells);
        
        handleGameEnd('ai', newBoard, winCells, finalMoves);
        return;
      }
      
      const updatedMoves = [...currentMoves, newAIMove];
      setMoves(updatedMoves);
      
      console.log('🔍 [DEBUG AI Move] Added move:', newAIMove);
      console.log('   Total moves now:', updatedMoves.length);
      
      if (checkDraw(newBoard)) {
        handleGameEnd('draw', newBoard, [], updatedMoves);
        return;
      }
      
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        isPlayerTurn: true
      }));
    });
  };
 

  const updateUserBalance = async (newBalance) => {
    if (user) {
        try {
            console.log('🔹 [DEBUG] Starting balance update...');
            console.log('   - Current balance:', balance);
            console.log('   - New balance to set:', newBalance);
            console.log('   - User ID:', user.id);
            
            const updatedUser = { ...user, balance: newBalance };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            setBalance(newBalance);
            
            console.log('✅ [DEBUG] Local storage updated to:', newBalance);
            
            window.dispatchEvent(new Event('storage'));
            
            try {
                console.log('🔹 [DEBUG] Calling server API...');
                console.log('   - Endpoint:', `/users/${user.id}/balance`);
                console.log('   - Payload:', { balance: newBalance });
                
                const response = await API.put(`/users/${user.id}/balance`, { balance: newBalance });
                
                console.log('✅ [DEBUG] Server response received');
                console.log('   - Status:', response.status);
                console.log('   - Server returned balance:', response.data.balance);
                
                if (response.data.balance !== newBalance) {
                    console.warn('⚠️ [DEBUG] SERVER BALANCE MISMATCH!');
                    
                    const serverUpdatedUser = { ...user, balance: response.data.balance };
                    localStorage.setItem('user', JSON.stringify(serverUpdatedUser));
                    setUser(serverUpdatedUser);
                    setBalance(response.data.balance);
                    window.dispatchEvent(new Event('storage'));
                }
                
            } catch (serverError) {
                console.error('❌ [DEBUG] Server update failed:');
                await refreshBalanceFromServer();
            }
        } catch (error) {
            console.error('❌ [DEBUG] General update error:', error);
        }
    }
  };

  const continueGame = async () => {
    if (balance < gameState.betAmount) {
      alert('Số dư không đủ để chơi tiếp! Vui lòng đặt cược mới.');
      return;
    }

    // Gọi backend để trừ tiền và tạo game record mới
    try {
      const res = await API.post('/caro/start', {
        betAmount: gameState.betAmount,
        aiMode: gameState.aiMode,
        playerSymbol: gameState.playerSymbol || 'X'
      });
      const newGameId = res.data.gameId;
      const newBalance = res.data.balance;

      setBalance(newBalance);
      const updatedUser = { ...user, balance: newBalance };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      window.dispatchEvent(new Event('storage'));

      const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
      const isPlayerFirst = (gameState.playerSymbol || 'X') === 'X';
      const center = Math.floor(boardSize / 2);

      if (!isPlayerFirst) {
        newBoard[center][center] = 'X';
        const firstMove = { row: center, col: center, player: 'X', isWinningMove: false, moveNumber: 1 };
        setMoves([firstMove]);
        setLastMove({ row: center, col: center, type: 'ai' });
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          isPlayerTurn: true,
          isGameOver: false,
          winner: null,
          gameStarted: true,
          aiGameId: newGameId,
        }));
      } else {
        setMoves([]);
        setLastMove({ row: -1, col: -1, type: null });
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          isPlayerTurn: true,
          isGameOver: false,
          winner: null,
          gameStarted: true,
          aiGameId: newGameId,
        }));
      }
      setWinningCells([]);
      setShowResultModal(false);
    } catch (e) {
      alert(e.response?.data?.error || 'Không thể bắt đầu ván mới. Vui lòng thử lại.');
    }
  };

  const resetGame = () => {
    const newBoard = Array(boardSize).fill().map(() => Array(boardSize).fill(''));
    setGameState({
      board: newBoard,
      isPlayerTurn: true,
      isGameOver: false,
      currentPlayer: 'X',
      betAmount: 0,
      aiMode: 'Easy',
      winner: null,
      gameStarted: false
    });
    setLastMove({ row: -1, col: -1, type: null });
    setMoves([]);
    setWinningCells([]);
  };

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false); // AI mode resign confirm
  const [disconnectInfo, setDisconnectInfo] = useState(null);
  const disconnectInfoRef = useRef(null);

  const backToHome = () => {
    if (gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver) {
      // PvP đang chơi → hiện resign confirm
      setShowResignConfirm(true);
    } else {
      // AI mode hoặc game đã kết thúc → về home thẳng, giữ nguyên ván
      window.location.href = '/home';
    }
  };

  // Đầu hàng - xử lý cả AI và PvP
  const handleResignConfirm = async () => {
    setShowResignConfirm(false);
    if (gameMode === 'pvp') {
      if (disconnectInfoRef.current?.show) {
        window.location.href = '/home';
        return;
      }
      try { await API.post('/pvp/resign'); } catch {}
      setTimeout(() => { window.location.href = '/home'; }, 5000);
    } else {
      // AI mode - giống Chess: gọi backend abandon trước
      const gs = gameStateRef.current;
      resignedRef.current = true;
      clearAutoSave();
      setSavedSnapshot(null);
      gameStateRef.current = { ...gameStateRef.current, gameStarted: false, isGameOver: true };
      setGameState(prev => ({ ...prev, isGameOver: true, gameStarted: false }));

      // Gọi backend abandon để server đánh dấu game kết thúc (giống Chess /leave)
      if (gs?.aiGameId) {
        try {
          await API.post(`/caro/matches/${gs.aiGameId}/abandon`);
        } catch (e) {
          console.error('Abandon failed:', e);
        }
      }

      setGameResult({ show: true, message: `🏳️ Bạn đã đầu hàng. Mất ${(gs?.betAmount || 0).toLocaleString()} KGT`, type: 'ai' });
      setTimeout(() => {
        setGameResult({ show: false, message: '', type: '' });
        window.location.href = '/home';
      }, 3000);
    }
  };

  const handleLeave = async () => {
    if (gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver) {
      if (disconnectInfoRef.current?.show) {
        // Đối thủ đang disconnect → chỉ về home
        window.location.href = '/home';
        return;
      }
      // Resign: gửi lên server, chờ game-over event hiện thông báo rồi tự navigate
      try {
        await API.post('/pvp/resign');
      } catch {}
      // Fallback: nếu 5s không nhận game-over thì navigate
      setTimeout(() => { window.location.href = '/home'; }, 5000);
      return;
    }
    window.location.href = '/home';
  };

  const resetViewport = () => {
    const viewport = caroViewportRef.current || document.querySelector('.caro-board-viewport');
    if (viewport) {
      const boardElement = viewport.firstChild;
      if (boardElement) {
        const centerScrollLeft = (boardElement.scrollWidth - viewport.clientWidth) / 2;
        const centerScrollTop = (boardElement.scrollHeight - viewport.clientHeight) / 2;
        viewport.scrollTo({ left: centerScrollLeft, top: centerScrollTop, behavior: 'smooth' });
      }
    }
  };

  const closeGameResult = () => {
    setGameResult({ show: false, message: '', type: '' });
  };

  return (
    <div className="caro-game chess-game-premium">
      {topToast && <div className="top-toast">{topToast}</div>}

      {gameState.gameStarted && (
        <div className="chess-header" style={{ textAlign: "center", marginBottom: "5px", width: "100%" }}>
          <h1 style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: "1.4rem", marginBottom: "0px", letterSpacing: "1px" }}>
            CỜ CA<span style={{ color: "#ffea00" }}>RO</span>
          </h1>
        </div>
      )}

      {isSearching && (
        <div className="searching-overlay">
          <div className="searching-card">
            <div className="searching-loader"></div>
            <h2>Đang tìm đối thủ...</h2>
            <p>{'Mức cược: ' + gameState.betAmount.toLocaleString() + ' KGT'}</p>
            <button className="cancel-search-btn" onClick={cancelSearch}>HỦY TÌM KIẾM</button>
          </div>
        </div>
      )}

      {disconnectInfo?.show && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 5000, background: 'rgba(20,20,35,0.95)', border: '1px solid rgba(255,165,0,0.5)',
          borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center',
          gap: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          whiteSpace: 'nowrap'
        }}>
          <span style={{ fontSize: '1.1rem' }}>⚠️</span>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>
            {disconnectInfo.opponentName} mất kết nối
          </span>
          <span style={{
            background: 'rgba(255,165,0,0.2)', border: '1px solid rgba(255,165,0,0.4)',
            borderRadius: '8px', padding: '2px 10px', color: '#ffa500',
            fontWeight: 900, fontSize: '1rem', minWidth: '36px', textAlign: 'center'
          }}>
            {Math.ceil((disconnectInfo.remainingMs ?? 0) / 1000)}s
          </span>
        </div>
      )}

      {!gameState.gameStarted ? (
        <CaroBetPanel 
          onBetPlaced={handleBetPlaced}
          balance={balance}
          gameMode={gameMode}
          onNavigateHome={() => window.location.href = '/home'}
          savedSnapshot={savedSnapshot}
          onResume={resumeSavedGame}
          onDiscardSave={async () => {
            try {
              const snap = savedSnapshot;
              if (snap?.aiGameId) {
                const res = await API.post(`/caro/matches/${snap.aiGameId}/abandon`);
                const newBal = res.data.balance;
                const userData = JSON.parse(localStorage.getItem('user'));
                if (userData) {
                  const updated = { ...userData, balance: newBal };
                  localStorage.setItem('user', JSON.stringify(updated));
                  setBalance(newBal);
                  setUser(updated);
                  window.dispatchEvent(new Event('storage'));
                }
              }
            } catch {}
            clearAutoSave();
            setSavedSnapshot(null);
          }}
        />
      ) : (
        <div className="caro-game-layout">
          {/* Cột trái */}
          <div className="caro-sidebar-left">

            {/* Nút quay lại */}
            <button
              onClick={backToHome}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.8)",
                padding: "10px 14px",
                borderRadius: "12px",
                fontWeight: 900,
                cursor: "pointer",
                fontSize: "0.8rem",
                textAlign: "left",
                transition: "0.2s",
                width: "100%",
              }}
            >
              {gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver ? '🏳️ Đầu hàng' : '← Quay lại'}
            </button>

            {/* Số dư & Cược */}
            <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Số dư & Cược</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>SỐ DƯ HIỆN TẠI:</span>
                  <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>{balance.toLocaleString()} KGT</span>
                </div>
                <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>MỨC CƯỢC VÁN:</span>
                  <span style={{ fontWeight: 900, color: "#ffea00", fontSize: "0.85rem" }}>
                    {(betAmountRef.current || gameState.betAmount || 0).toLocaleString()} KGT
                  </span>
                </div>
              </div>
            </div>

            {/* Thông tin ván - chỉ AI */}
            {gameMode !== 'pvp' && (
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Thông tin ván</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>ĐỘ KHÓ AI:</span>
                    <span style={{ fontWeight: 900, color: "#ffea00", fontSize: "0.85rem" }}>{gameState.aiMode}</span>
                  </div>
                  <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>BẠN CẦM QUÂN:</span>
                    <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>
                      {gameState.playerSymbol === 'X'
                        ? <span style={{ color: "#ff3b3b" }}>✕ (Đi trước)</span>
                        : <span style={{ color: "#00ffff" }}>○ (Đi sau)</span>}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PvP: đối thủ */}
            {gameMode === 'pvp' && (
              <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Đối thủ</div>
                <div style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>{pvpData.opponentNickname || '...'}</div>
                <div style={{ fontSize: "0.7rem", opacity: 0.6, marginTop: "6px" }}>
                  {pvpData.role === 'PLAYER_1' ? 'Bạn: X | Đối thủ: O' : 'Bạn: O | Đối thủ: X'}
                </div>
              </div>
            )}

            {/* Trạng thái */}
            <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Trạng thái</div>
              <div className="turn-indicator" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                  background: gameState.isPlayerTurn ? "#00ff9d" : "#aaa",
                  boxShadow: gameState.isPlayerTurn ? "0 0 10px #00ff9d" : "none",
                  border: "1px solid rgba(255,255,255,0.2)",
                }} />
                <span style={{ fontWeight: 900, fontSize: "0.85rem", color: gameState.isGameOver ? "#ffea00" : gameState.isPlayerTurn ? "#00ff9d" : "#aaa" }}>
                  {gameState.isGameOver ? "KẾT THÚC" : gameState.isPlayerTurn ? "LƯỢT BẠN" : (gameMode === 'pvp' ? "CHỜ ĐỐI THỦ" : "AI ĐANG NGHĨ...")}
                </span>
              </div>
            </div>

            {/* Tiến trình */}
            <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "8px", textTransform: "uppercase" }}>Tiến trình</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>SỐ NƯỚC ĐI:</span>
                <span style={{ fontWeight: 900, color: "#fff", fontSize: "0.85rem" }}>{moves.length}</span>
              </div>
              {lastMove.row !== -1 && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                  <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>NƯỚC GẦN NHẤT:</span>
                  <span style={{ fontWeight: 900, color: "#ffea00", fontSize: "0.78rem" }}>
                    ({lastMove.row + 1}, {lastMove.col + 1})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Bàn cờ giữa */}
          <div className="caro-board-center">
            <div className="board-wrapper" style={{
              background: "rgba(255,255,255,0.02)",
              padding: "6px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
              touchAction: "none",
              position: "relative",
              boxSizing: "border-box",
              display: "inline-block",
            }}>
              <CaroBoard
                board={gameState.board}
                onCellClick={handleCellClick}
                disabled={!gameState.isPlayerTurn || gameState.isGameOver}
                boardSize={boardSize}
                lastMove={lastMove}
                winningCells={winningCells}
                mode="play"
                viewportRef={caroViewportRef}
                ref={caroBoardRef}
              />
            </div>
          </div>

          {/* Cột phải */}
          <div className="caro-sidebar-right">

            {/* Điều hướng bàn cờ */}
            <div className="status-card" style={{ background: "rgba(255,255,255,0.03)", padding: "14px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: 900, color: "rgba(255,255,255,0.4)", fontSize: "0.7rem", marginBottom: "10px", textTransform: "uppercase" }}>Điều hướng</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button className="btn-ghost-wide" onClick={() => caroBoardRef.current?.scrollToCenter()} style={{ padding: "10px", fontSize: "0.8rem" }}>
                  🎯 Về trung tâm
                </button>
                <button className="btn-ghost-wide" onClick={() => caroBoardRef.current?.scrollToLastMove()} style={{ padding: "10px", fontSize: "0.8rem" }}>
                  🔍 Nước gần nhất
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="action-buttons" style={{ display: "flex", gap: "10px", flexDirection: "column" }}>
              {gameState.isGameOver ? (
                gameMode === 'ai' ? (
                  <>
                    <button className="btn-gold-wide" onClick={continueGame} style={{ padding: "10px", fontSize: "0.8rem" }}>🎮 Chơi tiếp</button>
                    <button className="btn-ghost-wide" onClick={resetGame} style={{ padding: "10px", fontSize: "0.8rem" }}>💰 Đặt cược mới</button>
                    <button className="btn-ghost-wide" onClick={() => window.location.href = '/home'} style={{ padding: "10px", fontSize: "0.8rem" }}>🏠 Về sảnh</button>
                  </>
                ) : (
                  <>
                    <button className="btn-ghost-wide" onClick={() => window.location.href = '/home'} style={{ padding: "10px", fontSize: "0.8rem" }}>🔄 Chơi lại</button>
                    <button className="btn-gold-wide" onClick={() => window.location.href = '/home'} style={{ padding: "10px", fontSize: "0.8rem" }}>🏠 Về sảnh</button>
                  </>
                )
              ) : (
                <button
                  onClick={() => setShowResignConfirm(true)}
                  style={{ padding: "10px", background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", color: "#ff6b6b", borderRadius: "10px", fontWeight: 900, cursor: "pointer", transition: "0.2s", fontSize: "0.8rem", width: "100%" }}
                >
                  🏳️ Đầu hàng
                </button>
              )}
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
              {gameMode === 'ai' ? (
                <>
                  <button className="btn-ghost-wide" onClick={() => { setShowResultModal(false); continueGame(); }}>CHƠI TIẾP</button>
                  <button className="btn-ghost-wide" onClick={() => { setShowResultModal(false); resetGame(); }}>ĐẶT CƯỢC MỚI</button>
                </>
              ) : (
                <button className="btn-ghost-wide" onClick={() => { setShowResultModal(false); window.location.href = '/home'; }}>CHƠI LẠI</button>
              )}
              <button className="btn-gold-wide" onClick={() => { setShowResultModal(false); window.location.href = '/home'; }}>VỀ SẢNH</button>
            </div>
          </div>
        </div>
      )}

      {showLeaveConfirm && (
        <div className="premium-modal-overlay" onClick={() => setShowLeaveConfirm(false)}>
          <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver ? '🏳️ ĐẦU HÀNG?' : 'RỜI PHÒNG?'}</h3>
              <button className="btn-close-modal" onClick={() => setShowLeaveConfirm(false)}>×</button>
            </div>
            <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.8)", fontWeight: 700, lineHeight: 1.6, textAlign: 'center' }}>
              {gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver
                ? `Bạn sẽ bị xử thua và mất ${(betAmountRef.current || gameState.betAmount).toLocaleString()} KGT. Xác nhận đầu hàng?`
                : 'Ván game chưa kết thúc. Bạn có chắc muốn thoát?'}
            </div>
            <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
              <button className="btn-ghost-wide" onClick={() => setShowLeaveConfirm(false)} style={{ flex: 1 }}>Ở LẠI</button>
              <button className="btn-gold-wide" onClick={handleLeave} style={{ flex: 1, background: '#ff4444', color: '#fff' }}>
                {gameMode === 'pvp' && gameState.gameStarted && !gameState.isGameOver ? 'ĐẦU HÀNG' : 'RỜI PHÒNG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirm đầu hàng AI mode */}
      {showResignConfirm && (
        <div className="premium-modal-overlay" onClick={() => setShowResignConfirm(false)}>
          <div className="premium-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏳️ ĐẦU HÀNG?</h3>
              <button className="btn-close-modal" onClick={() => setShowResignConfirm(false)}>×</button>
            </div>
            <div style={{ padding: "22px 30px", color: "rgba(255,255,255,0.8)", fontWeight: 700, lineHeight: 1.6, textAlign: 'center' }}>
              {gameMode === 'pvp'
                ? <>Bạn sẽ bị xử thua và mất <span style={{ color: '#ffea00' }}>{(betAmountRef.current || gameState.betAmount).toLocaleString()} KGT</span>. Xác nhận đầu hàng?</>
                : <>Bạn sẽ thua ván này. Tiền cược <span style={{ color: '#ffea00' }}>{(betAmountRef.current || gameState.betAmount).toLocaleString()} KGT</span> sẽ không được hoàn lại.</>
              }
            </div>
            <div style={{ padding: "0 30px 25px", display: "flex", gap: "12px" }}>
              <button className="btn-ghost-wide" onClick={() => setShowResignConfirm(false)} style={{ flex: 1 }}>Ở LẠI</button>
              <button className="btn-gold-wide" onClick={handleResignConfirm} style={{ flex: 1, background: '#ff4444', color: '#fff' }}>ĐẦU HÀNG</button>
            </div>
          </div>
        </div>
      )}

      {/* CHAT BUBBLE - chỉ hiện khi PvP */}
      {gameMode === 'pvp' && pvpData.gameId && pvpData.opponentId && (() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return (
          <ChatBubble
            gameId={pvpData.gameId}
            gameType="CARO"
            userId={String(user.id)}
            nickname={user.nickname || user.username}
            opponentId={pvpData.opponentId}
            opponentNickname={pvpData.opponentNickname}
          />
        );
      })()}
    </div>
  );
};

export default CaroGame;
