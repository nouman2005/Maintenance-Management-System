import api from "./axios";

export const addTenant = (data) => api.post("/tenants", data);

export const getTenants = (page = 1, limit = 10, params = {}) =>
  api.get("/tenants", {
    params: { page, limit, ...params },
  });

export const getTenantById = (id) => api.get(`/tenants/${id}`);

export const deactivateTenant = (id) => api.delete(`/tenants/${id}`);
