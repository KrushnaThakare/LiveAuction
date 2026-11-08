import { parseIntroStudioConfig } from '../../../utils/overlayIntroStudio';
import IntroCinematicReveal from './IntroCinematicReveal';
import IntroSportsProfile from './IntroSportsProfile';
import IntroDynamicCard from './IntroDynamicCard';
import s from './PlayerIntroPresentation.module.css';

export default function PlayerIntroPresentation({
  player,
  config,
  sessionKey,
  exiting,
  studioOverride,
  forceVisible,
}) {
  if (!player && !forceVisible) return null;

  const studio = studioOverride || parseIntroStudioConfig(config?.overlayMainIntroConfig);
  const template = studio.template || 'cinematic-reveal';
  const props = { player, config, sessionKey: sessionKey || 'intro', exiting, studioOverride: studio };

  return (
    <div
      className={`${s.root} ${exiting ? s.rootExit : s.rootEnter}`}
      aria-live="polite"
      data-template={template}
    >
      {template === 'sports-profile' && <IntroSportsProfile {...props} />}
      {template === 'dynamic-card' && <IntroDynamicCard {...props} />}
      {(template === 'cinematic-reveal' || !['sports-profile', 'dynamic-card'].includes(template)) && (
        <IntroCinematicReveal {...props} />
      )}
    </div>
  );
}
