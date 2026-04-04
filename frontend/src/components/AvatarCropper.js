import React, { useState, useRef, useEffect, useCallback } from "react";
import "../styles/AvatarCropper.css";

function AvatarCropper({ imageSrc, onConfirm, onCancel }) {
  const canvasRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState(300);
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const drag = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });

  // Tính canvas size theo màn hình
  useEffect(() => {
    const size = Math.min(300, window.innerWidth * 0.82);
    setCanvasSize(size);
  }, []);

  // Load ảnh → scale vừa khung
  useEffect(() => {
    if (!canvasSize) return;
    const img = new Image();
    img.onload = () => {
      const ratio = Math.max(canvasSize / img.width, canvasSize / img.height);
      setScale(ratio);
      setImgSize({ w: img.width, h: img.height });
      setOffset({ x: 0, y: 0 });
    };
    img.src = imageSrc;
  }, [imageSrc, canvasSize]);

  // Vẽ canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgSize.w || !canvasSize) return;
    const S = canvasSize;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, S, S);
      ctx.save();
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
      ctx.clip();
      const w = imgSize.w * scale;
      const h = imgSize.h * scale;
      const x = S / 2 - w / 2 + offset.x;
      const y = S / 2 - h / 2 + offset.y;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      // viền vàng
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,204,0,0.85)";
      ctx.lineWidth = 3;
      ctx.stroke();
    };
    img.src = imageSrc;
  }, [imageSrc, scale, offset, imgSize, canvasSize]);

  useEffect(() => { draw(); }, [draw]);

  // --- Mouse ---
  const onMouseDown = (e) => {
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMouseMove = (e) => {
    if (!drag.current.active) return;
    setOffset({ x: drag.current.ox + e.clientX - drag.current.startX, y: drag.current.oy + e.clientY - drag.current.startY });
  };
  const stopDrag = () => { drag.current.active = false; };

  // --- Touch (preventDefault để không scroll trang) ---
  const onTouchStart = (e) => {
    e.preventDefault();
    const t = e.touches[0];
    drag.current = { active: true, startX: t.clientX, startY: t.clientY, ox: offset.x, oy: offset.y };
  };
  const onTouchMove = (e) => {
    e.preventDefault();
    if (!drag.current.active) return;
    const t = e.touches[0];
    setOffset({ x: drag.current.ox + t.clientX - drag.current.startX, y: drag.current.oy + t.clientY - drag.current.startY });
  };

  // Xuất ảnh crop 200x200
  const handleConfirm = () => {
    const S = canvasSize;
    const OUT = 200;
    const ratio = OUT / S;
    const out = document.createElement("canvas");
    out.width = OUT; out.height = OUT;
    const ctx = out.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
      ctx.clip();
      const w = imgSize.w * scale * ratio;
      const h = imgSize.h * scale * ratio;
      const x = OUT / 2 - (imgSize.w * scale / 2 - offset.x) * ratio;
      const y = OUT / 2 - (imgSize.h * scale / 2 - offset.y) * ratio;
      ctx.drawImage(img, x, y, w, h);
      ctx.restore();
      onConfirm(out.toDataURL("image/jpeg", 0.85));
    };
    img.src = imageSrc;
  };

  return (
    <div className="cropper-overlay" onClick={onCancel}>
      <div className="cropper-card" onClick={e => e.stopPropagation()}>
        <div className="cropper-title">✂️ Chỉnh sửa ảnh đại diện</div>
        <p className="cropper-hint">Kéo ảnh để căn chỉnh · Thanh trượt để zoom</p>

        <canvas
          ref={canvasRef}
          width={canvasSize}
          height={canvasSize}
          className="cropper-canvas"
          style={{ width: canvasSize, height: canvasSize, cursor: "grab", touchAction: "none" }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={stopDrag}
          onMouseLeave={stopDrag}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={stopDrag}
        />

        <div className="cropper-zoom-row">
          <span>🔍</span>
          <input
            type="range"
            min={0.3}
            max={5}
            step={0.01}
            value={scale}
            onChange={e => setScale(parseFloat(e.target.value))}
            className="cropper-slider"
          />
          <span>🔎</span>
        </div>

        <div className="cropper-actions">
          <button className="cropper-btn cancel" onClick={onCancel}>Hủy</button>
          <button className="cropper-btn confirm" onClick={handleConfirm}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCropper;
