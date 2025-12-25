import api from "../api/axios";

export const addFlat = async (data) => {
  return api.post("/flats/addFlat", data);
};

export const getFlatsPaginated = async (page = 1, limit = 10) => {
  return api.get("/flats/paginated/list", {
    params: { page, limit },
  });
};

export const getFlatById = async (id) => {
  return api.get(`/flats/getFlatByID/${id}`);
};

export const updateFlat = async (id, data) => {
  return api.put(`/flats/updateFlat/${id}`, data);
};

export const flatDeactivate = async (id) => {
  return api.put(`/flats/flatDelete/${id}`);
};
