/**
 * Browser-side image downloader.
 *
 * Google Drive images require the user to be logged in. The browser has the
 * user's Google session cookies — so we fetch images IN the browser, then
 * immediately POST the bytes to the backend for local storage.
 *
 * This is the only reliable approach without Google OAuth setup.
 */

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');

/**
 * Extract Drive file ID from any stored URL format:
 * - /api/proxy/image?id={id}
 * - https://drive.google.com/...
 * - https://lh3.googleusercontent.com/d/{id}=...
 */
function extractDriveId(url) {
  if (!url) return null;
  try {
    if (url.includes('id=')) {
      let id = url.split('id=')[1];
      if (id.includes('&')) id = id.split('&')[0];
      if (id.includes('=')) id = id.split('=')[0]; // strip =w400... suffixes
      return id.trim();
    }
    if (url.includes('/d/')) {
      return url.split('/d/')[1].split('/')[0].split('=')[0].trim();
    }
  } catch (_) {}
  return null;
}

function getDownloadUrl(id) {
  // Use drive.usercontent.google.com — Google's current download host
  return `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=t`;
}

/**
 * Fetch one image in the browser and upload it to the backend.
 * Returns the new local URL (/api/images/...) or null on failure.
 */
async function fetchAndUpload(driveId) {
  const downloadUrl = getDownloadUrl(driveId);

  // Fetch via browser (has Google session cookies)
  let blob;
  try {
    const resp = await fetch(downloadUrl, {
      credentials: 'include',          // send Google session cookies
      mode: 'cors',
      headers: { 'Accept': 'image/*,*/*' },
    });

    if (!resp.ok) return null;
    const ct = resp.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      // Still a confirm page — try alternate uc URL
      const ucResp = await fetch(
        `https://drive.google.com/uc?export=view&id=${driveId}`,
        { credentials: 'include', mode: 'cors' }
      );
      if (!ucResp.ok) return null;
      const ucCt = ucResp.headers.get('content-type') || '';
      if (ucCt.includes('text/html')) return null;
      blob = await ucResp.blob();
    } else {
      blob = await resp.blob();
    }
  } catch (_) {
    return null;
  }

  if (!blob || blob.size === 0) return null;

  // Determine extension from mime type
  const mime = blob.type || 'image/jpeg';
  const ext = mime.includes('png') ? 'png'
             : mime.includes('gif') ? 'gif'
             : mime.includes('webp') ? 'webp'
             : 'jpg';

  // POST bytes to backend
  const form = new FormData();
  form.append('image', blob, `photo.${ext}`);
  form.append('ext', ext);

  try {
    const resp = await fetch(`${API_BASE}/images/upload`, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) return null;
    const json = await resp.json();
    return json?.data || null;
  } catch (_) {
    return null;
  }
}

/**
 * Update a player's image URL in the backend.
 */
async function updatePlayerImage(tournamentId, playerId, imageUrl) {
  await fetch(`${API_BASE}/tournaments/${tournamentId}/players/${playerId}/image`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrl }),
  });
}

/**
 * Download all Drive images for a tournament in the browser and save them locally.
 * Calls onProgress(done, total, playerName) after each image.
 */
export async function downloadImagesInBrowser(tournamentId, onProgress) {
  // Get list of players that still need image download
  const resp = await fetch(`${API_BASE}/tournaments/${tournamentId}/players/image-status`);
  const json = await resp.json();
  const players = (json?.data || []).filter(p => !p.isLocal);

  const total = players.length;
  let done = 0;

  for (const player of players) {
    const driveId = extractDriveId(player.imageUrl);
    if (!driveId) {
      done++;
      onProgress?.(done, total, player.name, false);
      continue;
    }

    const localUrl = await fetchAndUpload(driveId);
    if (localUrl) {
      await updatePlayerImage(tournamentId, player.id, localUrl);
      done++;
      onProgress?.(done, total, player.name, true);
    } else {
      done++;
      onProgress?.(done, total, player.name, false);
    }
  }

  return { done, total };
}
