/** Parse tournament categoryQuotasConfig JSON (backend canonical). */
export function parseCategoryQuotaConfig(raw) {
  if (!raw) {
    return { strictMandatoryFirst: true, categories: [] };
  }
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      strictMandatoryFirst: parsed.strictMandatoryFirst !== false,
      categories: Array.isArray(parsed.categories) ? parsed.categories.map(normalizeRule) : [],
    };
  } catch {
    return { strictMandatoryFirst: true, categories: [] };
  }
}

export function serializeCategoryQuotaConfig(config) {
  const payload = {
    strictMandatoryFirst: config?.strictMandatoryFirst !== false,
    categories: (config?.categories || []).map(normalizeRule).filter((r) => r.key),
  };
  return JSON.stringify(payload);
}

function normalizeRule(r) {
  return {
    key: String(r?.key || '').trim(),
    label: String(r?.label || r?.key || '').trim(),
    minPerTeam: Math.max(0, Number(r?.minPerTeam) || 0),
    maxPerTeam: Math.max(0, Number(r?.maxPerTeam) || 0),
    reserveBasePrice: Math.max(0, Number(r?.reserveBasePrice) || 0),
  };
}

export function defaultCategoryRules() {
  return [
    { key: 'A+', label: 'A+', minPerTeam: 3, maxPerTeam: 3, reserveBasePrice: 5000 },
    { key: 'A', label: 'A', minPerTeam: 0, maxPerTeam: 20, reserveBasePrice: 2000 },
    { key: 'C', label: 'C', minPerTeam: 0, maxPerTeam: 20, reserveBasePrice: 1000 },
  ];
}