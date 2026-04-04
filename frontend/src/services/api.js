import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:8080/api",
});

// 🔹 THÊM INTERCEPTOR TỰ ĐỘNG GỬI TOKEN
API.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔹 THÊM INTERCEPTOR XỬ LÝ LỖI 401
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        localStorage.removeItem("user");
        window.location.href = "/login?reason=session_expired";
      }
    }
    return Promise.reject(error);
  }
);

export default API;