import React, { useState } from "react";
import API from "../services/api";

function Bet() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [amount, setAmount] = useState("");
  const [win, setWin] = useState(true);

  // 🔹 THÊM: Kiểm tra token
  if (!user || !user.token) {
    window.location.href = "/login";
    return null;
  }

  const handleBet = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/bet/place", {
        userId: user.id,
        amount: parseFloat(amount),
        game: "Caro",
        win,
      });
      
      alert("Kết quả: " + res.data.result + " | Số dư mới: " + res.data.balanceAfter);
      
      // 🔹 THÊM: Cập nhật số dư trong localStorage
      const updatedUser = { ...user, balance: res.data.balanceAfter };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // Reset form
      setAmount("");
      
    } catch (err) {
      alert("Đặt cược thất bại: " + (err.response?.data?.message || "Lỗi không xác định"));
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <h2>Đặt cược trò Caro</h2>
      <a href="/home" style={{ position: 'absolute', top: 20, left: 20 }}>← Quay lại</a>
      
      <form onSubmit={handleBet}>
        <input 
          placeholder="Số điểm cược" 
          value={amount}
          onChange={(e) => setAmount(e.target.value)} 
        /><br />
        <label>
          <input 
            type="checkbox" 
            checked={win} 
            onChange={() => setWin(!win)} 
          /> Thắng
        </label><br />
        <button type="submit">Đặt cược</button>
      </form>
    </div>
  );
}

export default Bet;