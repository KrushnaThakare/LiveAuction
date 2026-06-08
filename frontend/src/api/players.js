import api from './axios';

export const playerApi = {
  getAll: (tournamentId, status) => {
    const params = status ? { status } : {};
    return api.get(`/tournaments/${tournamentId}/players`, { params });
  },
  getById: (tournamentId, playerId) =>
    api.get(`/tournaments/${tournamentId}/players/${playerId}`),
  create: (tournamentId, data) =>
    api.post(`/tournaments/${tournamentId}/players`, data),
  upload: (tournamentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/tournaments/${tournamentId}/players/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (tournamentId, playerId, data) =>
    api.put(`/tournaments/${tournamentId}/players/${playerId}`, data),
  fetchCricHeroesStats: (tournamentId, playerId) =>
    api.post(`/tournaments/${tournamentId}/players/${playerId}/cricheroes/fetch-stats`),
  cleanInvalidCricHeroesProfiles: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/players/cricheroes/clean-invalid`),
  delete: (tournamentId, playerId) =>
    api.delete(`/tournaments/${tournamentId}/players/${playerId}`),
  downloadImages: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/players/download-images`),
};
