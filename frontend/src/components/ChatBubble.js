import React, { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";
import webSocketService from "../services/WebSocketService";
import "../styles/ChatBubble.css";

const EMOJIS = ["😀","😂","😍","🤔","😎","😢","😡","👍","👎","🔥","💯","🎉","😱","🤣","❤️","💪","🙏","👏"];
const COOLDOWN_MS = 1500;

export default function ChatBubble({ gameId, gameType, userId, nickname, opponentId, opponentNickname }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [opponentTyping, setOpponentTyping] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState({ x: null, y: null }); // null = default bottom-right
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false); // track xem có thực sự di chuyển không
  const bubbleRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastSentRef = useRef(0);
  const typingTimerRef = useRef(null);
  const typingActiveRef = useRef(false);

  // Load history
  useEffect(() => {
    if (!gameId) return;
    API.get(`/chat/${gameId}`).then(r => setMessages(r.data)).catch(() => {});
  }, [gameId]);

  // Subscribe WebSocket
  useEffect(() => {
    if (!gameId) return;

    const chatHandler = (msg) => {
      setMessages(prev => [...prev, msg]);
      if (!open) setUnread(u => u + 1);
    };

    const typingHandler = (msg) => {
      if (msg.senderId !== userId) {
        setOpponentTyping(msg.typing);
        if (msg.typing) {
          clearTimeout(typingTimerRef.current);
          typingTimerRef.current = setTimeout(() => setOpponentTyping(false), 3000);
        }
      }
    };

    webSocketService.subscribe("chat-" + gameId, chatHandler);
    webSocketService.subscribe("typing-" + gameId, typingHandler);

    // Register STOMP topic subscriptions
    let chatSub, typingSub;
    const registerSubs = () => {
      if (webSocketService.client?.connected) {
        chatSub = webSocketService.client.subscribe(`/topic/chat/${gameId}`, (frame) => {
          try { webSocketService.notify("chat-" + gameId, JSON.parse(frame.body)); } catch {}
        });
        typingSub = webSocketService.client.subscribe(`/topic/typing/${gameId}`, (frame) => {
          try { webSocketService.notify("typing-" + gameId, JSON.parse(frame.body)); } catch {}
        });
      }
    };

    if (webSocketService.connected) registerSubs();
    // Retry sau 500ms nếu chưa connect
    const retryTimer = setTimeout(() => { if (!chatSub) registerSubs(); }, 500);

    return () => {
      clearTimeout(retryTimer);
      webSocketService.unsubscribe("chat-" + gameId, chatHandler);
      webSocketService.unsubscribe("typing-" + gameId, typingHandler);
      try { chatSub?.unsubscribe(); typingSub?.unsubscribe(); } catch {}
    };
  }, [gameId, userId]);

  // Scroll to bottom
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, opponentTyping]);

  // Clear unread on open
  useEffect(() => { if (open) setUnread(0); }, [open]);

  const sendTyping = useCallback((isTyping) => {
    if (!webSocketService.connected) return;
    webSocketService.send("/game/typing", {
      gameId, gameType, senderId: userId, senderNickname: nickname,
      opponentId, typing: isTyping
    });
  }, [gameId, gameType, userId, nickname, opponentId]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!typingActiveRef.current) {
      typingActiveRef.current = true;
      sendTyping(true);
    }
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingActiveRef.current = false;
      sendTyping(false);
    }, 2000);
  };

  const sendMessage = () => {
    const content = input.trim();
    if (!content || !webSocketService.connected) return;

    const now = Date.now();
    if (now - lastSentRef.current < COOLDOWN_MS) return; // anti-spam
    lastSentRef.current = now;

    webSocketService.send("/game/chat", {
      gameId, gameType, senderId: userId,
      senderNickname: nickname, opponentId, content
    });

    setInput("");
    setShowEmoji(false);
    typingActiveRef.current = false;
    sendTyping(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Drag logic
  const onMouseDown = (e) => {
    // Khi đang mở: chỉ drag từ header
    if (open && !e.target.closest(".chat-header")) return;
    // Khi thu lại: block input/button bên trong (nếu có)
    if (!open && e.target.closest("input")) return;

    dragMoved.current = false;
    setDragging(true);
    const rect = bubbleRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    e.preventDefault();
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const dx = Math.abs(e.clientX - (pos.x ?? 0) - dragOffset.current.x);
      const dy = Math.abs(e.clientY - (pos.y ?? 0) - dragOffset.current.y);
      if (dx > 3 || dy > 3) dragMoved.current = true;
      setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  const bubbleStyle = pos.x !== null
    ? { position: "fixed", left: pos.x, top: pos.y, bottom: "auto", right: "auto" }
    : {};

  const fmtTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  if (!gameId || !opponentId) return null; // chỉ hiện khi PvP

  return (
    <div
      ref={bubbleRef}
      className={`chat-bubble-wrap${dragging ? " dragging" : ""}`}
      style={bubbleStyle}
      onMouseDown={onMouseDown}
    >
      {/* BUBBLE BUTTON */}
      {!open && (
        <button className="chat-bubble-btn" onClick={() => { if (!dragMoved.current) setOpen(true); }}>
          💬
          {unread > 0 && <span className="chat-unread">{unread}</span>}
        </button>
      )}

      {/* CHAT BOX */}
      {open && (
        <div className="chat-box" onClick={e => e.stopPropagation()}>
          <div className="chat-header">
            <span className="chat-opponent">💬 {opponentNickname || "Đối thủ"}</span>
            <button className="chat-close" onClick={() => setOpen(false)}>−</button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">Chưa có tin nhắn nào</div>
            )}
            {messages.map((m, i) => {
              const isMine = m.senderId === userId || String(m.senderId) === String(userId);
              return (
                <div key={m.id || i} className={`chat-msg ${isMine ? "mine" : "theirs"}`}>
                  {!isMine && <span className="chat-nick">{m.senderNickname}</span>}
                  <div className="chat-bubble">{m.content}</div>
                  <span className="chat-time">{fmtTime(m.createdAt)}</span>
                </div>
              );
            })}
            {opponentTyping && (
              <div className="chat-msg theirs">
                <span className="chat-nick">{opponentNickname}</span>
                <div className="chat-bubble typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showEmoji && (
            <div className="chat-emoji-picker">
              {EMOJIS.map(e => (
                <button key={e} className="emoji-btn" onClick={() => { setInput(i => i + e); setShowEmoji(false); }}>
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="chat-input-row">
            <button className="chat-emoji-toggle" onClick={() => setShowEmoji(s => !s)}>😊</button>
            <input
              className="chat-input"
              placeholder="Nhập tin nhắn..."
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              maxLength={300}
            />
            <button className="chat-send" onClick={sendMessage} disabled={!input.trim()}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}
