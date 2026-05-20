import api from './axios';

export const overlayApi = {
  getSnapshot: (tournamentId) => api.get(`/overlay/${tournamentId}/snapshot`),
};
