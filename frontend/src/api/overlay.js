import api from './axios';

export const overlayApi = {
  getSnapshot: (tournamentId, token, options = {}) => api.get(`/overlay/${tournamentId}/snapshot`, {
    params: {
      ...(token ? { token } : {}),
      ...(options.includePlayers ? { includePlayers: true } : {}),
    },
  }),
  getConfig: (tournamentId, token) => api.get(`/overlay/${tournamentId}/config`, { params: token ? { token } : {} }),
};
