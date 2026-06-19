import { MessageCircle, X, ChevronRight, SkipForward } from 'lucide-react';
import { maskMobile } from '../../utils/whatsappMessaging';

export default function WhatsAppBulkModal({
  queue = [],
  currentIndex = 0,
  sentIds,
  onMarkSentAndNext,
  onSkip,
  onClose,
}) {
  if (!queue.length) return null;

  const current = queue[currentIndex];
  const doneCount = queue.filter(item => sentIds.has(Number(item.playerId))).length;

  if (!current) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
        <div className="card p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-bold mb-2">All done</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Marked {doneCount} of {queue.length} players.
          </p>
          <button type="button" className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const isSent = sentIds.has(Number(current.playerId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="card p-5 max-w-lg w-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
              WhatsApp queue · {currentIndex + 1} / {queue.length}
            </div>
            <h2 className="text-xl font-bold mt-1">{current.playerName}</h2>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {current.teamName || 'Team'} · {maskMobile(current.mobile)}
            </p>
          </div>
          <button type="button" className="btn-secondary !p-2" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <pre
          className="text-sm rounded-lg p-3 mb-4 whitespace-pre-wrap"
          style={{ backgroundColor: 'var(--color-surface-2)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}
        >
          {current.message}
        </pre>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-primary"
            disabled={!current.url}
            onClick={() => current.url && window.open(current.url, '_blank', 'noopener,noreferrer')}
          >
            <MessageCircle size={16} /> Open WhatsApp
          </button>
          <button type="button" className="btn-secondary" onClick={() => onMarkSentAndNext(current.playerId)}>
            <ChevronRight size={16} /> {isSent ? 'Next' : 'Mark sent & next'}
          </button>
          <button type="button" className="btn-secondary" onClick={onSkip}>
            <SkipForward size={16} /> Skip
          </button>
        </div>

        <p className="text-xs mt-4" style={{ color: 'var(--color-text-secondary)' }}>
          Tap <strong>Open WhatsApp</strong>, send the message in WhatsApp, then return here and click <strong>Mark sent &amp; next</strong>.
          {doneCount > 0 && ` · ${doneCount} marked sent`}
        </p>
      </div>
    </div>
  );
}
