import React, { useState } from "react";
import api from "../services/api";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data));
      setMessage("Đăng nhập thành công!");
    } catch (err) {
      setMessage("Sai tài khoản hoặc mật khẩu!");
    }
  };
  //NTDSharevbHSY7O
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h2>Đăng nhập</h2>
      <form onSubmit={handleSubmit}>
        <input name="username" placeholder="Username" onChange={handleChange} /><br />
        <input name="password" placeholder="Password" type="password" onChange={handleChange} /><br />
        <button type="submit">Đăng nhập</button>
      </form>
      <p>{message}</p>
    </div>
  );
}
