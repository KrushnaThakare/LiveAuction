import api from './axios';

export const overlayApi = {
  getSnapshot: (tournamentId, token) => api.get(`/overlay/${tournamentId}/snapshot`, { params: token ? { token } : {} }),
  getConfig: (tournamentId, token) => api.get(`/overlay/${tournamentId}/config`, { params: token ? { token } : {} }),
};
