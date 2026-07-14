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
  repairRoles: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/players/repair-roles`),
  update: (tournamentId, playerId, data) =>
    api.put(`/tournaments/${tournamentId}/players/${playerId}`, data),
  fetchCricHeroesStats: (tournamentId, playerId) =>
    api.post(`/tournaments/${tournamentId}/players/${playerId}/cricheroes/fetch-stats`),
  cleanInvalidCricHeroesProfiles: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/players/cricheroes/clean-invalid`),
  delete: (tournamentId, playerId) =>
    api.delete(`/tournaments/${tournamentId}/players/${playerId}`),
  retryWhatsApp: (tournamentId, playerId) =>
    api.post(`/tournaments/${tournamentId}/players/${playerId}/whatsapp/retry`),
  retryWhatsAppBulk: (tournamentId, playerIds) =>
    api.post(`/tournaments/${tournamentId}/players/whatsapp/retry`, { playerIds }),
  downloadImages: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/players/download-images`),
};
