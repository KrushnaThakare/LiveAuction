/**
 * Image status checker.
 * Drive images load directly in <img> tags when the user is logged into Google.
 * This utility checks which players have image URLs set.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

export async function downloadImagesInBrowser(tournamentId, onProgress) {
  // Get image status from backend
  const resp = await fetch(`${API_BASE}/tournaments/${tournamentId}/players/image-status`);
  const json = await resp.json();
  const players = json?.data || [];
  const total = players.length;

  // Images render directly via <img> — just report status
  onProgress?.(total, total, 'Done', true);
  return { done: total, total };
}
