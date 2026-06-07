import api from './axios';

export const auditLogApi = {
  latest: ({ page = 0, size = 50, search = '' } = {}) => api.get('/audit-logs', {
    params: { page, size, search },
  }),
};
