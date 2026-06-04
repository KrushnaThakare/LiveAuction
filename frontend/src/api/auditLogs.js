import api from './axios';

export const auditLogApi = {
  latest: () => api.get('/audit-logs'),
};
