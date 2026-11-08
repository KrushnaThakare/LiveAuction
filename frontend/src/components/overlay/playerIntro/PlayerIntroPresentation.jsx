import { parseIntroStudioConfig, INTRO_PLACEMENTS } from '../../../utils/overlayIntroStudio';
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
  embedded = false,
}) {
  if (!player && !forceVisible) return null;

  const studio = studioOverride || parseIntroStudioConfig(config?.overlayMainIntroConfig);
  const template = studio.template || 'cinematic-reveal';
  const placement = studio.placement || 'center';
  const placementKnown = INTRO_PLACEMENTS.some((p) => p.id === placement);
  const placementClass = placementKnown ? s[`pos_${placement.replace(/-/g, '_')}`] : s.pos_center;
  const props = { player, config, sessionKey: sessionKey || 'intro', exiting, studioOverride: studio };

  return (
    <div
      className={`${embedded ? s.rootEmbedded : s.root} ${placementClass} ${exiting ? s.rootExit : s.rootEnter}`}
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
