import api from './axios';

export const playerApi = {
  getAll: (tournamentId, status) => {
    const params = status ? { status } : {};
    return api.get(`/tournaments/${tournamentId}/players`, { params });
  },
  getById: (tournamentId, playerId) =>
    api.get(`/tournaments/${tournamentId}/players/${playerId}`),
  upload: (tournamentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tournaments/${tournamentId}/players/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (tournamentId, playerId, data) =>
    api.put(`/tournaments/${tournamentId}/players/${playerId}`, data),
  delete: (tournamentId, playerId) =>
    api.delete(`/tournaments/${tournamentId}/players/${playerId}`),
};
