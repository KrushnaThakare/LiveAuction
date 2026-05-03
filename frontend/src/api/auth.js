import api from './axios';

export const authApi = {
  login:       (username, password) => api.post('/auth/login', { username, password }),
  me:          ()                   => api.get('/auth/me'),
  listUsers:   ()                   => api.get('/users'),
  createUser:  (data)               => api.post('/users', data),
  updateUser:  (id, data)           => api.put(`/users/${id}`, data),
  resetPwd:    (id, password)       => api.post(`/users/${id}/reset-password`, { password }),
  deleteUser:  (id)                 => api.delete(`/users/${id}`),
  uploadUserLogo: (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/users/${id}/logo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};
