import api from './axios';

export const bidRuleApi = {
  getRules: (tid) => api.get(`/tournaments/${tid}/bid-rules`),
  updateRules: (tid, rules) => api.put(`/tournaments/${tid}/bid-rules`, rules),
};
