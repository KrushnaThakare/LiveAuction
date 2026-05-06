export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
      {Icon && (
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 relative"
          style={{
            background: 'var(--gradient-card)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-md)',
          }}>
          <Icon size={36} style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }} />
          {/* Subtle glow */}
          <div className="absolute inset-0 rounded-3xl"
            style={{ background: 'radial-gradient(circle at center, var(--color-primary-glow) 0%, transparent 70%)', opacity: 0.3 }} />
        </div>
      )}
      <h3 className="text-lg font-black mb-2" style={{ color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
