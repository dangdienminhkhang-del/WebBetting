import React, { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";
import "../styles/ChatBubble.css";

const STORAGE_KEY = "ai_chat_history";
const MAX_HISTORY = 50;
const EMOJIS = ["😀","😂","😍","🤔","😎","😢","😡","👍","👎","🔥","💯","🎉","😱","🤣","❤️","💪","🙏","👏"];

const loadHistory = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
};

const saveHistory = (msgs) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-MAX_HISTORY))); }
  catch {}
};

export default function AiChatWidget({ autoOpen = false }) {
  const [open, setOpen] = useState(autoOpen);
  const [messages, setMessages] = useState(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [unread, setUnread] = useState(0);
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const bubbleRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("openAiChat", handler);
    return () => window.removeEventListener("openAiChat", handler);
  }, []);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => { saveHistory(messages); }, [messages]);

  const sendMessage = useCallback(async () => {
    const content = input.trim();
    if (!content || loading) return;

    const userMsg = { role: "user", content, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setShowEmoji(false);
    setLoading(true);

    try {
      const res = await API.post("/chat/ai", { message: content });
      const aiMsg = { role: "ai", content: res.data.reply, id: Date.now() + 1 };
      setMessages(prev => [...prev, aiMsg]);
      if (!open) setUnread(u => u + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: "ai", content: "Xin lỗi, mình đang bận xíu. Thử lại sau nhé! 🙏", id: Date.now() + 1
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, open]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Drag
  const onMouseDown = (e) => {
    if (open && !e.target.closest(".chat-header")) return;
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
      dragMoved.current = true;
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

  return (
    <div
      ref={bubbleRef}
      className={`chat-bubble-wrap${dragging ? " dragging" : ""}`}
      style={{ ...bubbleStyle, bottom: pos.x === null ? "28px" : undefined, right: pos.x === null ? "100px" : undefined }}
      onMouseDown={onMouseDown}
    >
      {/* BUBBLE */}
      {!open && (
        <button className="chat-bubble-btn ai-bubble-btn" onClick={() => { if (!dragMoved.current) setOpen(true); }}>
          🤖
          {unread > 0 && <span className="chat-unread">{unread}</span>}
        </button>
      )}

      {/* CHAT BOX */}
      {open && (
        <div className="chat-box" onClick={e => e.stopPropagation()}>
          <div className="chat-header">
            <span className="chat-opponent">🤖 AI Assistant</span>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {messages.length > 0 && (
                <button
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.3)", fontSize: "0.7rem", cursor: "pointer", padding: "2px 6px" }}
                  onClick={() => { setMessages([]); localStorage.removeItem(STORAGE_KEY); }}
                  title="Xóa lịch sử"
                >🗑️</button>
              )}
              <button className="chat-close" onClick={() => setOpen(false)}>−</button>
            </div>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <div style={{ fontSize: "2rem", marginBottom: "8px" }}>🤖</div>
                Sao đó em?
              </div>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.role === "user" ? "mine" : "theirs"}`}>
                {m.role === "ai" && <span className="chat-nick">🤖 AI</span>}
                <div className="chat-bubble">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg theirs">
                <span className="chat-nick">🤖 AI</span>
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
            <button className="chat-emoji-toggle" onClick={() => setShowEmoji(s => !s)} disabled={loading}>😊</button>
            <input
              className="chat-input"
              placeholder={loading ? "AI đang trả lời..." : "Nhập tin nhắn..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={500}
            />
            <button className="chat-send" onClick={sendMessage} disabled={!input.trim() || loading}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}
