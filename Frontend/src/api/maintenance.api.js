import api from "./axios";

export const getMaintenanceSummary = () => api.get("/maintenance/summary");

export const getMaintenanceRules = () => api.get("/maintenance/rules");

export const saveMaintenanceRule = (data) => api.post("/maintenance/rules", data);

export const addMaintenanceCharge = (data) => api.post("/maintenance/charges", data);

export const addOldMaintenanceDue = (data) => api.post("/maintenance/old-dues", data);

export const getMaintenanceCharges = (page = 1, limit = 10, params = {}) =>
  api.get("/maintenance/charges", { params: { page, limit, ...params } });

export const payMaintenance = (data) => api.post("/maintenance/payments", data);

export const getMaintenanceBalances = () => api.get("/maintenance/balances");

export const updateMaintenanceBalance = (data) => api.put("/maintenance/balances", data);

export const generateMonthlyMaintenance = (data = {}) =>
  api.post("/maintenance/generate-monthly", data);

export const getMaintenanceReports = (params = {}) =>
  api.get("/maintenance/reports", { params });

export const getFlatMaintenanceDetails = (flatId) =>
  api.get(`/maintenance/flats/${flatId}`);

export const exportMaintenanceReport = (params = {}) =>
  api.get("/maintenance/reports/export", {
    params,
    responseType: "blob",
  });

export const exportFlatLedger = (flatId, format = "xlsx") =>
  api.get(`/maintenance/flats/${flatId}/export`, {
    params: { format },
    responseType: "blob",
  });

export const recalculateMaintenanceInterest = (data = {}) =>
  api.post("/maintenance/interest/recalculate", data);

export const importMaintenanceExcel = (formData) =>
  api.post("/maintenance/import", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getMaintenanceImports = () => api.get("/maintenance/imports");
