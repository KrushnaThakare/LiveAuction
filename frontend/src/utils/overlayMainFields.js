const DEFAULT_MAIN_FIELDS = {
  basePrice: true,
  role: true,
  playerId: true,
  detailSlots: true,
  teamBlock: true,
  bidIncrement: true,
  currentBid: true,
};

export function parseMainOverlayFields(raw) {
  if (!raw) return { ...DEFAULT_MAIN_FIELDS };
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...DEFAULT_MAIN_FIELDS, ...parsed };
  } catch {
    return { ...DEFAULT_MAIN_FIELDS };
  }
}

export function serializeMainOverlayFields(fields) {
  return JSON.stringify({ ...DEFAULT_MAIN_FIELDS, ...fields });
}

export const MAIN_OVERLAY_LAYOUTS = [
  { id: 'modern-3d-sports', label: 'Modern 3D Sports (Gold & Navy)', description: 'Premium metallic lower third with hex photo and gold bid highlight.' },
  { id: 'clean-premium-tv', label: 'Clean Premium (TV broadcast)', description: 'Circular photo, gradient bar, professional sports TV look.' },
  { id: 'dynamic-electric', label: 'Dynamic Broadcast (Electric Blue)', description: 'Cyan neon angular frame — energetic esports broadcast.' },
  { id: 'classic', label: 'Classic (center photo, side stats)', description: 'Default OBS layout — player center, bid panel right.' },
  { id: 'hpl-lower-third', label: 'Lower third (HPL-style bar)', description: 'Wide bottom bar, photo left, name center, bid right — like IPL/HPL graphics.' },
  { id: 'ipl-broadcast', label: 'IPL broadcast bar', description: 'Neon lower third with sold price held on screen after hammer.' },
  { id: 'compact-strip', label: 'Compact strip', description: 'Thin bottom bar; good for small YouTube frame.' },
  { id: 'split-wide', label: 'Split wide', description: 'Player left half, bid + team right half.' },
  { id: 'minimal', label: 'Minimal', description: 'Name + bid only; hides extras.' },
];
