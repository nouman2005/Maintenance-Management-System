import api from "./axios";

export const getFinanceDashboard = (params = {}) =>
  api.get("/finance/dashboard", { params });

export const getFinancialLedger = (params = {}) =>
  api.get("/finance/ledger", { params });

export const getFinanceSummary = (params = {}) =>
  api.get("/finance/summary", { params });

export const getExpenses = (page = 1, limit = 10, params = {}) =>
  api.get("/finance/expenses", { params: { page, limit, ...params } });

export const getExpenseById = (id) => api.get(`/finance/expenses/${id}`);

export const createExpense = (data) => api.post("/finance/expenses", data);

export const updateExpense = (id, data) => api.put(`/finance/expenses/${id}`, data);

export const updateExpenseStatus = (id, data) =>
  api.patch(`/finance/expenses/${id}/status`, data);

export const cancelExpense = (id, data = {}) =>
  api.post(`/finance/expenses/${id}/cancel`, data);

export const getExpenseCategories = () => api.get("/finance/expense-categories");

export const createExpenseCategory = (data) =>
  api.post("/finance/expense-categories", data);

export const updateExpenseCategory = (id, data) =>
  api.put(`/finance/expense-categories/${id}`, data);

export const updateExpenseCategoryStatus = (id, data) =>
  api.patch(`/finance/expense-categories/${id}/status`, data);

export const getVendors = () => api.get("/finance/vendors");

export const createVendor = (data) => api.post("/finance/vendors", data);

export const updateVendor = (id, data) => api.put(`/finance/vendors/${id}`, data);

export const updateVendorStatus = (id, data) =>
  api.patch(`/finance/vendors/${id}/status`, data);

export const getPaymentAccounts = () => api.get("/finance/payment-accounts");

export const createPaymentAccount = (data) =>
  api.post("/finance/payment-accounts", data);

export const updatePaymentAccount = (id, data) =>
  api.put(`/finance/payment-accounts/${id}`, data);

export const updatePaymentAccountStatus = (id, data) =>
  api.patch(`/finance/payment-accounts/${id}/status`, data);
