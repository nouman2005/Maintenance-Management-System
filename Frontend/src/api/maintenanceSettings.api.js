import api from "./axios";

export const addMaintenanceSetting = (data) =>
  api.post("/maintenance-settings", data);

export const getMaintenanceSettings = (page = 1, limit = 10, params = {}) =>
  api.get("/maintenance-settings", {
    params: { page, limit, ...params },
  });

export const updateMaintenanceSetting = (id, data) =>
  api.patch(`/maintenance-settings/${id}`, data);

export const deleteMaintenanceSetting = (id) =>
  api.delete(`/maintenance-settings/${id}`);
