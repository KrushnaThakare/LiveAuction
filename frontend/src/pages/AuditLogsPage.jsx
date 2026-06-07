import { useCallback, useEffect, useState } from 'react';
import { auditLogApi } from '../api/auditLogs';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { ChevronLeft, ChevronRight, ClipboardList, RefreshCw, Search } from 'lucide-react';

const actionLabel = (action) => String(action || '').replace(/_/g, ' ');
const PAGE_SIZE = 50;

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pageInfo, setPageInfo] = useState({ page: 0, totalPages: 0, totalElements: 0, first: true, last: true });
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (nextPage = 0, nextSearch = '') => {
    setLoading(true);
    try {
      const res = await auditLogApi.latest({ page: nextPage, size: PAGE_SIZE, search: nextSearch });
      const data = res.data.data || {};
      setLogs(data.content || []);
      setPageInfo({
        page: data.page || 0,
        totalPages: data.totalPages || 0,
        totalElements: data.totalElements || 0,
        first: data.first ?? true,
        last: data.last ?? true,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => fetchLogs(0, ''), 0);
    return () => clearTimeout(id);
  }, [fetchLogs]);

  const submitSearch = (e) => {
    e.preventDefault();
    const nextSearch = searchInput.trim();
    setSearch(nextSearch);
    setPage(0);
    fetchLogs(0, nextSearch);
  };

  const goToPage = (nextPage) => {
    const safePage = Math.max(0, nextPage);
    setPage(safePage);
    fetchLogs(safePage, search);
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(0);
    fetchLogs(0, '');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Logs</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Latest 50 records per page. Search player logs by name or ID.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={submitSearch} className="flex items-center gap-2">
            <input
              className="input min-w-[220px]"
              placeholder="Search name, #ID, action..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button className="btn-primary" type="submit" disabled={loading}>
              <Search size={15} />
              Search
            </button>
          </form>
          {search && (
            <button className="btn-secondary" onClick={clearSearch} disabled={loading}>
              Clear
            </button>
          )}
          <button className="btn-secondary" onClick={() => fetchLogs(page, search)} disabled={loading}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-sm"
        style={{ color: 'var(--color-text-secondary)' }}>
        <span>
          Showing page {pageInfo.totalPages ? pageInfo.page + 1 : 0} of {pageInfo.totalPages}
          {' '}({pageInfo.totalElements} logs)
        </span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" onClick={() => goToPage(pageInfo.page - 1)} disabled={loading || pageInfo.first}>
            <ChevronLeft size={15} />
            Previous
          </button>
          <button className="btn-secondary" onClick={() => goToPage(pageInfo.page + 1)} disabled={loading || pageInfo.last}>
            Next
            <ChevronRight size={15} />
          </button>
        </div>
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
                  <th className="text-left p-3">Tournament</th>
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
                      {log.tournamentId ? `#${log.tournamentId}` : '-'}
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
