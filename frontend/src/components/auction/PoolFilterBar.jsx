import { useMemo } from 'react';
import { Filter } from 'lucide-react';
import {
  POOL_FILTER_ALL,
  applyPoolFilter,
  collectPoolFilterColumns,
  distinctValuesForColumn,
  isPoolFilterActive,
} from '../../utils/playerPoolFilter';

export default function PoolFilterBar({
  availablePlayers,
  unsoldPlayers = [],
  poolFilterColumn,
  poolFilterValue,
  onPoolFilterColumnChange,
  onPoolFilterValueChange,
  categoryQuotasOn,
  compact = false,
}) {
  const playersForColumnScan = useMemo(
    () => [...availablePlayers, ...unsoldPlayers],
    [availablePlayers, unsoldPlayers],
  );

  const extraColumns = useMemo(
    () => collectPoolFilterColumns(playersForColumnScan, { includePlayerCategory: categoryQuotasOn }),
    [playersForColumnScan, categoryQuotasOn],
  );

  const valueOptions = useMemo(
    () => distinctValuesForColumn(availablePlayers, poolFilterColumn, { categoryQuotasOn }),
    [availablePlayers, poolFilterColumn, categoryQuotasOn],
  );

  const filterActive = isPoolFilterActive(poolFilterColumn, poolFilterValue);
  const poolFiltered = useMemo(
    () => applyPoolFilter(availablePlayers, poolFilterColumn, poolFilterValue, { categoryQuotasOn }),
    [availablePlayers, poolFilterColumn, poolFilterValue, categoryQuotasOn],
  );

  if (extraColumns.length === 0) return null;

  const clearPoolFilter = () => {
    onPoolFilterColumnChange('');
    onPoolFilterValueChange(POOL_FILTER_ALL);
  };

  return (
    <div
      className={`rounded-xl flex flex-col gap-2 ${compact ? 'px-3 py-2 mx-4 mb-2' : 'p-3'}`}
      style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide"
        style={{ color: 'var(--color-text-secondary)' }}>
        <Filter size={14} />
        Pool filter
        {filterActive && (
          <span className="font-semibold normal-case tracking-normal px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(59,130,246,0.12)', color: 'var(--color-primary)' }}>
            {poolFilterColumn} = {poolFilterValue} · {poolFiltered.length} match
          </span>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <label className="flex-1 min-w-0 text-xs">
          <span className="block mb-1 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Column</span>
          <select
            className="input text-sm w-full"
            value={poolFilterColumn}
            onChange={(e) => {
              onPoolFilterColumnChange(e.target.value);
              onPoolFilterValueChange(POOL_FILTER_ALL);
            }}
          >
            <option value="">All players (no filter)</option>
            {extraColumns.map((col) => (
              <option key={col.key} value={col.label}>{col.label}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 min-w-0 text-xs">
          <span className="block mb-1 font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Value</span>
          <select
            className="input text-sm w-full"
            disabled={!poolFilterColumn}
            value={poolFilterValue}
            onChange={(e) => onPoolFilterValueChange(e.target.value)}
          >
            <option value={POOL_FILTER_ALL}>— select value —</option>
            {valueOptions.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </label>
        {filterActive && (
          <button type="button" className="btn-secondary text-sm whitespace-nowrap" onClick={clearPoolFilter}>
            Clear filter
          </button>
        )}
      </div>
      {!compact && (
        <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
          Random pick and player lists use only matching players until you clear the filter.
        </p>
      )}
    </div>
  );
}