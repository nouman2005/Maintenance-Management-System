import api from "../api/axios";

export const addTenant = async (data) => {
  return api.post("/tenants/addTenant", data);
};

export const getTenants = async (page = 1, limit = 10) => {
  return api.get(`/tenants/getTenantsPagination?page=${page}&limit=${limit}`);
};

export const getTenantById = async (id) => {
  return api.get(`/tenants/getTenantById/${id}`);
};

export const deactivateTenant = async (id) => {
  return api.put(`/tenants/deActivateTenant/${id}`);
};
