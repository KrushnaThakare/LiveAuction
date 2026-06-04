import { useCallback, useEffect, useState } from 'react';
import { auditLogApi } from '../api/auditLogs';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { ClipboardList, RefreshCw } from 'lucide-react';

const actionLabel = (action) => String(action || '').replace(/_/g, ' ');

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditLogApi.latest();
      setLogs(res.data.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(fetchLogs, 0);
    return () => clearTimeout(id);
  }, [fetchLogs]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Logs</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Latest admin actions</p>
        </div>
        <button className="btn-secondary" onClick={fetchLogs} disabled={loading}>
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size="lg" text="Loading logs..." />
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No logs yet" description="Admin actions will appear here." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  <th className="text-left p-3">Time</th>
                  <th className="text-left p-3">User</th>
                  <th className="text-left p-3">Action</th>
                  <th className="text-left p-3">Entity</th>
                  <th className="text-left p-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td className="p-3 whitespace-nowrap" style={{ color: 'var(--color-text-secondary)' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="p-3 font-semibold" style={{ color: 'var(--color-text-primary)' }}>{log.username}</td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-lg text-xs font-black"
                        style={{ color: 'var(--color-warning)', background: 'rgba(245,158,11,0.12)' }}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="p-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {log.entityType} {log.entityId ? `#${log.entityId}` : ''}
                    </td>
                    <td className="p-3" style={{ color: 'var(--color-text-primary)' }}>{log.details || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
