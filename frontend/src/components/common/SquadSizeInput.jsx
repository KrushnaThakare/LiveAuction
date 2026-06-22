import { useEffect, useState } from 'react';
import { clampSquadSize } from '../../utils/squadFormation';

export default function SquadSizeInput({ value, onChange, className = 'input mt-1' }) {
  const [draft, setDraft] = useState(String(value ?? 15));

  useEffect(() => {
    setDraft(String(value ?? 15));
  }, [value]);

  return (
    <input
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      min={5}
      max={30}
      value={draft}
      onChange={(e) => {
        const next = e.target.value.replace(/\D/g, '').slice(0, 2);
        setDraft(next);
      }}
      onBlur={() => {
        const clamped = clampSquadSize(draft);
        setDraft(String(clamped));
        onChange(clamped);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
    />
  );
}
