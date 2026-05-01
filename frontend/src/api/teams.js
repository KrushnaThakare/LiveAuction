import api from './axios';

export const teamApi = {
  getAll:  (tid)              => api.get(`/tournaments/${tid}/teams`),
  getById: (tid, teamId)      => api.get(`/tournaments/${tid}/teams/${teamId}`),
  create:  (tid, data)        => api.post(`/tournaments/${tid}/teams`, data),
  update:  (tid, teamId, data) => api.put(`/tournaments/${tid}/teams/${teamId}`, data),
  delete:  (tid, teamId)      => api.delete(`/tournaments/${tid}/teams/${teamId}`),
  uploadLogo: (tid, teamId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/tournaments/${tid}/teams/${teamId}/logo`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
