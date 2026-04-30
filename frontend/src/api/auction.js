import api from './axios';

export const auctionApi = {
  getState:          (tid)             => api.get(`/tournaments/${tid}/auction/state`),
  startAuction:      (tid, playerId)   => api.post(`/tournaments/${tid}/auction/start/${playerId}`),
  startRandom:       (tid)             => api.post(`/tournaments/${tid}/auction/start-random`),
  assignBid:         (tid, teamId, customBidAmount) =>
    api.post(`/tournaments/${tid}/auction/bid`, {
      teamId,
      ...(customBidAmount != null ? { customBidAmount } : {}),
    }),
  sellPlayer:        (tid)             => api.post(`/tournaments/${tid}/auction/sell`),
  markUnsold:        (tid)             => api.post(`/tournaments/${tid}/auction/unsold`),
  stopAuction:       (tid)             => api.post(`/tournaments/${tid}/auction/stop`),
  reAuctionUnsold:   (tid)             => api.post(`/tournaments/${tid}/auction/re-auction-unsold`),
  getHistory:        (tid)             => api.get(`/tournaments/${tid}/auction/history`),
};
