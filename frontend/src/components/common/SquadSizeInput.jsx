import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { clampSquadSize, MAX_SQUAD_SIZE, MIN_SQUAD_SIZE } from '../../utils/squadFormation';

function isIncompletePrefix(draft) {
  return draft.length === 1 && (draft === '1' || draft === '2' || draft === '3');
}

export default forwardRef(function SquadSizeInput({ value, onChange, className = 'input mt-1' }, ref) {
  const [draft, setDraft] = useState(String(value ?? 15));

  useEffect(() => {
    setDraft(String(value ?? 15));
  }, [value]);

  const commit = () => {
    if (isIncompletePrefix(draft)) {
      const restored = clampSquadSize(value);
      setDraft(String(restored));
      onChange(restored);
      return restored;
    }
    const clamped = clampSquadSize(draft);
    setDraft(String(clamped));
    onChange(clamped);
    return clamped;
  };

  useImperativeHandle(ref, () => ({ commit }), [draft, onChange, value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={`Squad size between ${MIN_SQUAD_SIZE} and ${MAX_SQUAD_SIZE}`}
      value={draft}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDraft(next);
        if (next.length === 2) {
          const clamped = clampSquadSize(next);
          setDraft(String(clamped));
          onChange(clamped);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
});
