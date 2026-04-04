import React, { useState, useRef, useEffect } from "react";
import "../styles/FilterBar.css";

/**
 * FilterBar - thanh filter đồng bộ giao diện admin
 *
 * filters: [
 *   { type: "search", key: "username", placeholder: "🔍 Tìm username..." },
 *   { type: "dropdown", key: "result", label: "Kết quả", options: [{value:"", label:"Tất cả"}, ...] },
 *   { type: "date", key: "date", label: "Ngày" },
 * ]
 * values: { username: "", result: "", date: "" }
 * onChange: (key, value) => void
 * onClear: () => void
 */
export default function FilterBar({ filters = [], values = {}, onChange, onClear }) {
  const hasActive = filters.some(f => values[f.key] && values[f.key] !== "");

  return (
    <div className="filter-bar">
      {filters.map(f => {
        if (f.type === "search") return (
          <div key={f.key} className="filter-search-wrap">
            <span className="filter-search-icon">🔍</span>
            <input
              className="filter-search"
              placeholder={f.placeholder || "Tìm kiếm..."}
              value={values[f.key] || ""}
              onChange={e => onChange(f.key, e.target.value)}
            />
            {values[f.key] && (
              <button className="filter-clear-x" onClick={() => onChange(f.key, "")}>×</button>
            )}
          </div>
        );

        if (f.type === "dropdown") return (
          <DropdownFilter
            key={f.key}
            label={f.label}
            options={f.options}
            value={values[f.key] || ""}
            onChange={v => onChange(f.key, v)}
          />
        );

        if (f.type === "date") return (
          <DateFilter
            key={f.key}
            label={f.label}
            value={values[f.key] || ""}
            onChange={v => onChange(f.key, v)}
          />
        );

        return null;
      })}

      {hasActive && (
        <button className="filter-clear-all" onClick={onClear}>
          ✕ Xóa filter
        </button>
      )}
    </div>
  );
}

function DropdownFilter({ label, options = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="filter-dropdown-wrap" ref={ref}>
      <button
        className={`filter-dropdown-btn ${value ? "active" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <span className="filter-dropdown-label">{label}</span>
        <span className="filter-dropdown-value">{selected?.label}</span>
        <span className="filter-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="filter-dropdown-menu">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`filter-dropdown-item ${value === opt.value ? "selected" : ""}`}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.icon && <span className="item-icon">{opt.icon}</span>}
              {opt.label}
              {value === opt.value && <span className="item-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DateFilter({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [dragStart, setDragStart] = useState(null);   // dateStr đang kéo từ
  const [hoverDate, setHoverDate] = useState(null);   // dateStr đang hover khi kéo
  const [isDragging, setIsDragging] = useState(false);
  const ref = useRef(null);

  // Parse value: "2024-01-01" hoặc "2024-01-01|2024-01-05"
  const parseValue = (v) => {
    if (!v) return { from: null, to: null };
    const parts = v.split("|");
    return { from: parts[0] || null, to: parts[1] || null };
  };

  const { from: selFrom, to: selTo } = parseValue(value);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setIsDragging(false); setDragStart(null); } };
    document.addEventListener("mousedown", h);
    const up = () => { if (isDragging && dragStart && hoverDate) { commitRange(dragStart, hoverDate); } setIsDragging(false); setDragStart(null); };
    document.addEventListener("mouseup", up);
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("mouseup", up); };
  }, [isDragging, dragStart, hoverDate]);

  const commitRange = (a, b) => {
    const sorted = [a, b].sort();
    if (sorted[0] === sorted[1]) onChange(sorted[0]);
    else onChange(sorted[0] + "|" + sorted[1]);
  };

  const handleDayMouseDown = (dateStr) => {
    setIsDragging(true);
    setDragStart(dateStr);
    setHoverDate(dateStr);
  };

  const handleDayMouseEnter = (dateStr) => {
    if (isDragging) setHoverDate(dateStr);
  };

  const handleDayClick = (dateStr) => {
    if (!isDragging) {
      // Click đơn: toggle chọn ngày
      if (selFrom === dateStr && !selTo) { onChange(""); return; }
      onChange(dateStr);
    }
  };

  const isInRange = (dateStr) => {
    const lo = isDragging ? [dragStart, hoverDate].sort()[0] : selFrom;
    const hi = isDragging ? [dragStart, hoverDate].sort()[1] : selTo;
    if (!lo) return false;
    if (!hi) return dateStr === lo;
    return dateStr >= lo && dateStr <= hi;
  };

  const isRangeStart = (dateStr) => {
    const lo = isDragging ? [dragStart, hoverDate].sort()[0] : selFrom;
    return dateStr === lo;
  };

  const isRangeEnd = (dateStr) => {
    const hi = isDragging ? [dragStart, hoverDate].sort()[1] : (selTo || selFrom);
    return dateStr === hi;
  };

  const MONTHS = ["Tháng 1","Tháng 2","Tháng 3","Tháng 4","Tháng 5","Tháng 6","Tháng 7","Tháng 8","Tháng 9","Tháng 10","Tháng 11","Tháng 12"];
  const DAYS = ["CN","T2","T3","T4","T5","T6","T7"];
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toDateStr = (d) => `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y-1); } else setViewMonth(m => m-1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y+1); } else setViewMonth(m => m+1); };

  const displayLabel = () => {
    if (!value) return "Tất cả ngày";
    if (selFrom && selTo) return `${new Date(selFrom+"T00:00:00").toLocaleDateString("vi-VN")} → ${new Date(selTo+"T00:00:00").toLocaleDateString("vi-VN")}`;
    if (selFrom) return new Date(selFrom+"T00:00:00").toLocaleDateString("vi-VN");
    return "Tất cả ngày";
  };

  return (
    <div className="filter-dropdown-wrap" ref={ref}>
      <button className={`filter-dropdown-btn ${value ? "active" : ""}`} onClick={() => setOpen(o => !o)}>
        <span className="filter-dropdown-label">📅 {label}</span>
        <span className="filter-dropdown-value">{displayLabel()}</span>
        <span className="filter-dropdown-arrow">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="filter-calendar-menu" onMouseLeave={() => { if (isDragging) setHoverDate(dragStart); }}>
          <div className="cal-header">
            <button className="cal-nav" onClick={prevMonth}>‹</button>
            <span className="cal-title">{MONTHS[viewMonth]} {viewYear}</span>
            <button className="cal-nav" onClick={nextMonth}>›</button>
          </div>

          {(selFrom || selTo) && (
            <div className="cal-range-display">
              {selFrom && <span className="cal-range-tag">{new Date(selFrom+"T00:00:00").toLocaleDateString("vi-VN")}</span>}
              {selTo && <><span className="cal-range-arrow">→</span><span className="cal-range-tag">{new Date(selTo+"T00:00:00").toLocaleDateString("vi-VN")}</span></>}
            </div>
          )}

          <div className="cal-grid" style={{ userSelect: "none" }}>
            {DAYS.map(d => <div key={d} className="cal-day-label">{d}</div>)}
            {cells.map((d, i) => {
              if (!d) return <div key={`e-${i}`} />;
              const ds = toDateStr(d);
              const inRange = isInRange(ds);
              const start = isRangeStart(ds);
              const end = isRangeEnd(ds);
              const isToday = ds === todayStr;
              return (
                <button
                  key={ds}
                  className={[
                    "cal-day",
                    inRange ? "in-range" : "",
                    start ? "range-start" : "",
                    end ? "range-end" : "",
                    isToday ? "today" : "",
                  ].filter(Boolean).join(" ")}
                  onMouseDown={() => handleDayMouseDown(ds)}
                  onMouseEnter={() => handleDayMouseEnter(ds)}
                  onClick={() => handleDayClick(ds)}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="cal-footer">
            <button className="cal-quick" onClick={() => { onChange(todayStr); }}>Hôm nay</button>
            <button className="cal-quick" onClick={() => {
              const d = new Date(); d.setDate(d.getDate() - 6);
              const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              onChange(from + "|" + todayStr);
            }}>7 ngày qua</button>
            <button className="cal-quick" onClick={() => {
              const d = new Date(); d.setDate(d.getDate() - 29);
              const from = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
              onChange(from + "|" + todayStr);
            }}>30 ngày</button>
            {value && <button className="filter-date-clear" onClick={() => onChange("")}>✕ Xóa</button>}
          </div>
        </div>
      )}
    </div>
  );
}
