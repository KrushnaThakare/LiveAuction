import api from './axios';

export const overlayApi = {
  getSnapshot: (tournamentId, token, options = {}) => api.get(`/overlay/${tournamentId}/snapshot`, {
    params: {
      ...(token ? { token } : {}),
      ...(options.includePlayers ? { includePlayers: true } : {}),
      ...(options.studio ? { studio: true } : {}),
    },
  }),
  getConfig: (tournamentId, token) => api.get(`/overlay/${tournamentId}/config`, { params: token ? { token } : {} }),
  getTopSold: (tournamentId, token, limit = 5) => api.get(`/overlay/${tournamentId}/top-sold`, {
    params: {
      limit,
      ...(token ? { token } : {}),
    },
  }),
};
