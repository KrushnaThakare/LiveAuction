import api from './axios';

export const tournamentApi = {
  getAll:     ()          => api.get('/tournaments'),
  getById:    (id)        => api.get(`/tournaments/${id}`),
  create:     (data)      => api.post('/tournaments', data),
  update:     (id, data)  => api.put(`/tournaments/${id}`, data),
  delete:     (id)        => api.delete(`/tournaments/${id}`),
  uploadLogo: (id, file)  => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/tournaments/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
