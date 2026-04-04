import React, { useState } from "react";
import api from "../services/api";

export default function Register() {
  const [form, setForm] = useState({ username: "", password: "", nickname: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      setMessage("Đăng ký thành công!");
    } catch (err) {
      setMessage("Lỗi: " + err.response?.data || "Không thể đăng ký.");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h2>Đăng ký tài khoản</h2>
      <form onSubmit={handleSubmit}>
        <input name="username" placeholder="Username" onChange={handleChange} /><br />
        <input name="password" placeholder="Password" type="password" onChange={handleChange} /><br />
        <input name="nickname" placeholder="Nickname" onChange={handleChange} /><br />
        <button type="submit">Đăng ký</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
