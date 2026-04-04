import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Register from "./components/Register";
import Home from "./components/Home";
import Bet from "./components/Bet";
import CaroGame from "./components/CaroGame";
import TaiXiu from "./components/TaiXiu";
import TaiXiuUpgraded from './components/TaiXiuUpgraded';
import Leaderboard from "./components/Leaderboard";
import Profile from "./components/Profile";
import "./styles/casino-theme.css";
import History from './components/History';
import ProtectedRoute from './components/ProtectedRoute';
import TaiXiuLottie from './components/TaiXiuLottie';
import CaroReplay from './components/CaroReplay';
import LandingPage from './components/LandingPage';
import ChessGame from './components/ChessGame';
import AdminDashboard from './components/AdminDashboard';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api';

function App() {
  // Ping backend khi có người đang xem tab, dừng khi tab bị ẩn
  useEffect(() => {
    let interval = null;

    const ping = () => fetch(`${API_BASE}/health`).catch(() => {});

    const startPing = () => {
      if (interval) return;
      ping(); // gọi ngay
      interval = setInterval(ping, 4 * 60 * 1000); // mỗi 4 phút
    };

    const stopPing = () => {
      clearInterval(interval);
      interval = null;
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') startPing();
      else stopPing();
    };

    // Bắt đầu ngay nếu tab đang active
    if (document.visibilityState === 'visible') startPing();

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopPing();
    };
  }, []);

  return (
      <Router>
        <Routes> 
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
          } />
          <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
          } /> 
          <Route path="/caro" element={<ProtectedRoute><CaroGame /></ProtectedRoute>} /> 
          <Route path="/bet" element={<Bet />} />
          <Route path="/taixiu-lottie" element={<TaiXiuLottie />} />
          <Route path="/taixiu" element={<TaiXiu/>} />
          <Route path="/taixiu-upgraded" element={<ProtectedRoute><TaiXiuUpgraded /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/chess" element={<ProtectedRoute><ChessGame /></ProtectedRoute>} />
          <Route path="/caro/replay/:gameId" element={<ProtectedRoute><CaroReplay /></ProtectedRoute>} 
          />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        </Routes>
        
      </Router>
    );
  }

  export default App;