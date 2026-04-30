import api from './axios';

export const auctionApi = {
  getState: (tournamentId) =>
    api.get(`/tournaments/${tournamentId}/auction/state`),
  startAuction: (tournamentId, playerId) =>
    api.post(`/tournaments/${tournamentId}/auction/start/${playerId}`),
  placeBid: (tournamentId, teamId) =>
    api.post(`/tournaments/${tournamentId}/auction/bid`, { teamId }),
  sellPlayer: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/auction/sell`),
  markUnsold: (tournamentId) =>
    api.post(`/tournaments/${tournamentId}/auction/unsold`),
  getHistory: (tournamentId) =>
    api.get(`/tournaments/${tournamentId}/auction/history`),
};
