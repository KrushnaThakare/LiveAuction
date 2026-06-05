import api from './axios';

export const auditLogApi = {
  latest: () => api.get('/audit-logs'),
  latestAuction: (tournamentId) => api.get(`/audit-logs/tournaments/${tournamentId}/auction`),
};
