/**
 * Converts any Google Drive share URL to a direct-view URL.
 * Same logic as the backend GoogleDriveUtil — confirmed working formula.
 *
 * Output: https://drive.google.com/uc?export=view&id={fileId}
 */
export function driveImg(url) {
  if (!url) return null;

  // Already converted or not a Drive URL
  if (!url.includes('drive.google.com')) return url;

  try {
    let fileId = '';

    if (url.includes('/d/')) {
      fileId = url.split('/d/')[1].split('/')[0];
    } else if (url.includes('id=')) {
      fileId = url.split('id=')[1];
      if (fileId.includes('&')) fileId = fileId.split('&')[0];
    }

    if (fileId) {
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  } catch (_) {
    // fall through
  }

  return url;
}
