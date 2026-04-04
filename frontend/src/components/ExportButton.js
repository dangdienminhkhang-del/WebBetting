import React, { useState, useRef, useEffect } from "react";
import API from "../services/api";

/**
 * ExportButton - dropdown xuất CSV / Excel
 *
 * Props:
 *   endpoint   : string  - e.g. "/admin/export/users"
 *   params     : object  - filter params hiện tại (keyword, active, ...)
 *   currentPageData : array - data trang hiện tại để xuất trang
 *   csvHeaders : string[] - tên cột cho xuất trang hiện tại
 *   csvRow     : fn(item) => string[] - map item → mảng giá trị
 *   filename   : string  - tên file không có đuôi
 */
export default function ExportButton({
  endpoint,
  params = {},
  currentPageData = [],
  csvHeaders = [],
  csvRow = () => [],
  filename = "export",
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(null); // "all-csv" | "all-xlsx" | "page-csv" | "page-xlsx"
  const ref = useRef(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Xuất tất cả - gọi backend, download blob
  const exportAll = async (format) => {
    const key = `all-${format}`;
    setLoading(key);
    setOpen(false);
    try {
      const res = await API.get(endpoint, {
        params: { ...params, format },
        responseType: "blob",
      });
      triggerDownload(res.data, `${filename}.${format}`);
    } catch (e) {
      alert("Xuất thất bại, vui lòng thử lại.");
    } finally {
      setLoading(null);
    }
  };

  // Xuất trang hiện tại - build file ở frontend
  const exportPage = (format) => {
    setOpen(false);
    if (!currentPageData.length) return alert("Không có dữ liệu để xuất.");

    if (format === "csv") {
      const lines = [csvHeaders.join(","), ...currentPageData.map(item => csvRow(item).join(","))];
      const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
      triggerDownload(blob, `${filename}_trang_hien_tai.csv`);
    } else {
      // xlsx trang hiện tại → gọi backend với ids
      const ids = currentPageData.map(u => u.id).join(",");
      exportAll_withIds(ids, format);
    }
  };

  const exportAll_withIds = async (ids, format) => {
    setLoading(`page-${format}`);
    try {
      const res = await API.get(endpoint, {
        params: { ...params, format, ids },
        responseType: "blob",
      });
      triggerDownload(res.data, `${filename}_trang_hien_tai.${format}`);
    } catch {
      alert("Xuất thất bại.");
    } finally {
      setLoading(null);
    }
  };

  const triggerDownload = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = loading !== null;

  return (
    <div className="export-btn-wrap" ref={ref}>
      <button
        className="btn-export-trigger"
        onClick={() => setOpen(o => !o)}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="export-spinner" />
        ) : (
          <>📤 Xuất dữ liệu <span className="export-arrow">{open ? "▲" : "▼"}</span></>
        )}
      </button>

      {open && (
        <div className="export-dropdown">
          <div className="export-group-label">Xuất tất cả</div>
          <button className="export-item csv" onClick={() => exportAll("csv")}>
            <span>📄</span> CSV (tất cả)
          </button>
          <button className="export-item xlsx" onClick={() => exportAll("xlsx")}>
            <span>📊</span> Excel (tất cả)
          </button>

          <div className="export-divider" />

          <div className="export-group-label">Xuất trang hiện tại ({currentPageData.length} dòng)</div>
          <button className="export-item csv" onClick={() => exportPage("csv")}>
            <span>📄</span> CSV (trang này)
          </button>
          <button className="export-item xlsx" onClick={() => exportPage("xlsx")}>
            <span>📊</span> Excel (trang này)
          </button>
        </div>
      )}
    </div>
  );
}
