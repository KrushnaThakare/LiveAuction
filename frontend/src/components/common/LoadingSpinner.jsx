export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'w-5 h-5 border-2', md: 'w-9 h-9 border-2', lg: 'w-12 h-12 border-[3px]' };
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizes[size]} rounded-full animate-spin`}
        style={{
          borderColor: 'var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          boxShadow: '0 0 12px var(--color-primary-glow)',
        }}
      />
      {text && (
        <p className="text-xs font-medium animate-pulse"
          style={{ color: 'var(--color-text-secondary)' }}>{text}</p>
      )}
    </div>
  );
}
