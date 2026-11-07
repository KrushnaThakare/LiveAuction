import api from './axios';

export const broadcastApi = {
  getSettings: (tid) => api.get(`/tournaments/${tid}/broadcast/settings`),
  updateSettings: (tid, data) => api.put(`/tournaments/${tid}/broadcast/settings`, data),
  setCinematicIntroLive: (tid, enabled) => api.patch(`/tournaments/${tid}/broadcast/cinematic-intro-live`, {
    overlayCinematicIntroLive: enabled,
  }),
  triggerCountdown: (tid, seconds) => api.post(`/tournaments/${tid}/broadcast/countdown`, {
    overlayCountdownSeconds: seconds,
  }),
  uploadAudienceBackground: (tid, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/tournaments/${tid}/broadcast/audience-background`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
