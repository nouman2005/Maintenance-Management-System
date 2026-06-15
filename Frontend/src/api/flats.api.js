import api from "./axios";

export const addFlat = (data) => api.post("/flats", data);

export const getFlatsPaginated = (page = 1, limit = 10, params = {}) =>
  api.get("/flats", {
    params: { page, limit, ...params },
  });

export const getFlatById = (id) => api.get(`/flats/${id}`);

export const updateFlat = (id, data) => api.put(`/flats/${id}`, data);

export const flatDeactivate = (id) => api.delete(`/flats/${id}`);
