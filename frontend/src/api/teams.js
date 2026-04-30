import api from './axios';

export const teamApi = {
  getAll: (tournamentId) => api.get(`/tournaments/${tournamentId}/teams`),
  getById: (tournamentId, teamId) =>
    api.get(`/tournaments/${tournamentId}/teams/${teamId}`),
  create: (tournamentId, data) =>
    api.post(`/tournaments/${tournamentId}/teams`, data),
  update: (tournamentId, teamId, data) =>
    api.put(`/tournaments/${tournamentId}/teams/${teamId}`, data),
  delete: (tournamentId, teamId) =>
    api.delete(`/tournaments/${tournamentId}/teams/${teamId}`),
};
