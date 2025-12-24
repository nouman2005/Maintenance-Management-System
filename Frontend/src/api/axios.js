import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // 👈 backend base url
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔐 Request Interceptor (token auto attach)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ❌ Response Interceptor (auto logout on 401)
// api.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem("token");
//       window.location.href = "/login";
//     }
//     return Promise.reject(error);
//   }
// );

export default api;
