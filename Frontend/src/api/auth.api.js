import api from "./axios";

export const loginAdmin = (data) => {
  return api.post("/super-admin/login", data);
};

export const getProfile = () => {
  return api.get("/auth/me");
};

export const changePassword = (data) => {
  return api.patch("/auth/change-password", data);
};
