import api from "./axios";

export const loginAdmin = (data) => {
  return api.post("/super-admin/login", data);
};
