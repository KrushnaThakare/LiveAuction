import api from './axios';

export const broadcastApi = {
  getSettings: (tid) => api.get(`/tournaments/${tid}/broadcast/settings`),
  updateSettings: (tid, data) => api.put(`/tournaments/${tid}/broadcast/settings`, data),
  setCinematicIntroLive: (tid, enabled) => api.patch(`/tournaments/${tid}/broadcast/cinematic-intro-live`, {
    overlayCinematicIntroLive: enabled,
  }),
};
