import { defaultCategoryRules } from '../../utils/categoryQuotas';

export default function CategoryQuotasEditor({ enabled, config, onEnabledChange, onConfigChange }) {
  const categories = config?.categories?.length ? config.categories : defaultCategoryRules();

  const patchRule = (index, patch) => {
    const next = categories.map((r, i) => (i === index ? { ...r, ...patch } : r));
    onConfigChange({ ...config, categories: next });
  };

  const addRule = () => {
    onConfigChange({
      ...config,
      categories: [...categories, { key: '', label: '', minPerTeam: 0, maxPerTeam: 0, reserveBasePrice: 0 }],
    });
  };

  const removeRule = (index) => {
    onConfigChange({ ...config, categories: categories.filter((_, i) => i !== index) });
  };

  return (
    <div className="rounded-xl p-4 space-y-3"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
      <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onEnabledChange(e.target.checked)}
        />
        Category squad quotas (min/max per team)
      </label>
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Off by default. When enabled, teams are restricted by category counts and reserved purse for mandatory picks.
        Players need a <strong>Category</strong> column in Excel or on Add Player.
      </p>

      {enabled && (
        <>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={config?.strictMandatoryFirst !== false}
              onChange={(e) => onConfigChange({ ...config, strictMandatoryFirst: e.target.checked })}
            />
            Block bids on optional categories until mandatory minimums are met
          </label>

          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: 'var(--color-text-secondary)' }}>
                  <th className="text-left py-1 pr-2">Key</th>
                  <th className="text-left py-1 pr-2">Label</th>
                  <th className="text-left py-1 pr-2">Min</th>
                  <th className="text-left py-1 pr-2">Max</th>
                  <th className="text-left py-1 pr-2">Reserve ₹</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {categories.map((rule, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input className="input !py-1 !text-xs" value={rule.key}
                        placeholder="A+"
                        onChange={(e) => patchRule(i, { key: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input className="input !py-1 !text-xs" value={rule.label}
                        onChange={(e) => patchRule(i, { label: e.target.value })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" className="input !py-1 !text-xs w-16" value={rule.minPerTeam}
                        onChange={(e) => patchRule(i, { minPerTeam: Number(e.target.value) })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" className="input !py-1 !text-xs w-16" value={rule.maxPerTeam}
                        onChange={(e) => patchRule(i, { maxPerTeam: Number(e.target.value) })} />
                    </td>
                    <td className="py-1 pr-2">
                      <input type="number" min="0" className="input !py-1 !text-xs w-20" value={rule.reserveBasePrice}
                        onChange={(e) => patchRule(i, { reserveBasePrice: Number(e.target.value) })} />
                    </td>
                    <td className="py-1">
                      <button type="button" className="text-xs" style={{ color: 'var(--color-danger)' }}
                        onClick={() => removeRule(i)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="btn-secondary text-xs" onClick={addRule}>Add category</button>
        </>
      )}
    </div>
  );
}