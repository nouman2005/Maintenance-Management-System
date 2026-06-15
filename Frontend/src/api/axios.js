import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
});

let refreshRequest = null;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status !== 401 ||
      originalRequest?._retry ||
      originalRequest?.url?.includes("/auth/refresh-token")
    ) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refreshToken");

    if (!refreshToken) {
      localStorage.clear();
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;

      refreshRequest =
        refreshRequest ||
        api.post("/auth/refresh-token", { refreshToken }).finally(() => {
          refreshRequest = null;
        });

      const { data } = await refreshRequest;
      const newAccessToken = data.accessToken;

      localStorage.setItem("accessToken", newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      localStorage.clear();
      return Promise.reject(refreshError);
    }
  }
);

export default api;
