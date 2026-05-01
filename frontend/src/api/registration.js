import api from './axios';

export const registrationApi = {
  // Form builder (admin)
  getForm:        (tid)          => api.get(`/tournaments/${tid}/registration/form`),
  getSettings:    (tid)          => api.get(`/tournaments/${tid}/registration/settings`),
  updateSettings: (tid, data)    => api.put(`/tournaments/${tid}/registration/settings`, data),
  uploadBanner:   (tid, file)    => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/tournaments/${tid}/registration/banner`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  createSection:  (tid, data)    => api.post(`/tournaments/${tid}/registration/sections`, data),
  updateSection:  (tid, sid, d)  => api.put(`/tournaments/${tid}/registration/sections/${sid}`, d),
  deleteSection:  (tid, sid)     => api.delete(`/tournaments/${tid}/registration/sections/${sid}`),
  addField:       (tid, data)    => api.post(`/tournaments/${tid}/registration/fields`, data),
  updateField:    (tid, fid, d)  => api.put(`/tournaments/${tid}/registration/fields/${fid}`, d),
  deleteField:    (tid, fid)     => api.delete(`/tournaments/${tid}/registration/fields/${fid}`),

  // Submissions
  submit: (tid, formData, playerName, mobile, photo) => {
    const fd = new FormData();
    fd.append('formData', JSON.stringify(formData));
    if (playerName) fd.append('playerName', playerName);
    if (mobile)     fd.append('mobile', mobile);
    if (photo)      fd.append('photo', photo);
    return api.post(`/registration/${tid}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getRegistrations: (tid)             => api.get(`/registration/${tid}`),
  importOne:        (tid, rid, body)  => api.post(`/registration/${tid}/import/${rid}`, body),
  importAll:        (tid, basePrice)  => api.post(`/registration/${tid}/import-all`, { basePrice }),
  deleteReg:        (tid, rid)        => api.delete(`/registration/${tid}/${rid}`),
};
