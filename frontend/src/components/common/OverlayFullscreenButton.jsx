import { useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

export default function OverlayFullscreenButton() {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handleChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await document.documentElement.requestFullscreen();
  };

  return (
    <button
      type="button"
      className="overlay-fullscreen-button"
      onClick={toggleFullscreen}
      title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
    >
      {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
      <span>{fullscreen ? 'Exit' : 'Fullscreen'}</span>
    </button>
  );
}
