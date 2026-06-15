import api from "./axios";

export const sendSocietyRegistrationRequest = (data) => {
  return api.post("/society/register-request", data);
};

export const getSocietyRegistrationRequests = (status = "pending") => {
  return api.get(`/society/registration-requests?status=${status}`);
};

export const approveSocietyRegistrationRequest = (id) => {
  return api.patch(`/society/registration-requests/${id}/approve`);
};

export const rejectSocietyRegistrationRequest = (id, rejection_reason) => {
  return api.patch(`/society/registration-requests/${id}/reject`, {
    rejection_reason,
  });
};

export const getSocieties = (page = 1, limit = 10) => {
  return api.get(`/society?page=${page}&limit=${limit}`);
};

export const getSocietyById = (id) => {
  return api.get(`/society/${id}`);
};

export const deactivateSociety = (id) => {
  return api.delete(`/society/${id}`);
};
