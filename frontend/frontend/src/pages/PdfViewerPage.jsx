import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import PdfViewer from '../components/PdfViewer';
import SearchResultCard from '../components/SearchResultCard';
import SearchBar from '../components/SearchBar';
import { getPdfUrl, searchPdfs } from '../services/api';

function getPaperMeta(filename) {
  if (!filename) return { label: 'Document', detail: '' };
  const name  = filename.replace(/\.pdf$/i, '');
  const parts = name.split('_');
  if (parts.length >= 4) {
    const session = parts[1];
    const type    = parts[2];
    const paper   = parts[3];
    const seasonMap = { s: 'Summer', w: 'Winter', m: 'March' };
    const typeMap   = { qp: 'Question Paper', ms: 'Mark Scheme' };
    const year   = '20' + session.slice(1);
    const season = seasonMap[session[0]] || session.toUpperCase();
    return { label: typeMap[type] || type.toUpperCase(), detail: `${season} ${year} · Paper ${paper}` };
  }
  return { label: 'Document', detail: filename };
}

/* ── Sidebar skeleton ── */
function SidebarSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] p-4"
          style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
          <div className="flex gap-3">
            <div className="skeleton w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton h-2.5 w-1/3 rounded" />
              <div className="skeleton h-3.5 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-full rounded mt-2" />
              <div className="skeleton h-2.5 w-5/6 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PdfViewerPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filename    = searchParams.get('pdf')  || '';
  const page        = parseInt(searchParams.get('page') || '1', 10);
  const searchQuery = searchParams.get('q')    || '';

  const pdfUrl = filename ? getPdfUrl(filename) : null;
  const { label, detail } = getPaperMeta(filename);

  /* ── Sidebar search state ── */
  const [sidebarResults, setSidebarResults]     = useState([]);
  const [sidebarLoading, setSidebarLoading]     = useState(false);
  const [sidebarQuery, setSidebarQuery]         = useState(searchQuery);
  const [sidebarSearched, setSidebarSearched]   = useState(!!searchQuery);
  const [sidebarError, setSidebarError]         = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarSearch = useCallback(async (query) => {
    setSidebarLoading(true);
    setSidebarError(null);
    setSidebarQuery(query);
    setSidebarSearched(true);
    try {
      const data = await searchPdfs(query);
      setSidebarResults(data);
    } catch (err) {
      setSidebarError('Search failed.');
      setSidebarResults([]);
    } finally {
      setSidebarLoading(false);
    }
  }, []);

  const handleBack = () => navigate(-1);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg)' }}>

      {/* ════════════════════════════════
          LEFT SIDEBAR
      ════════════════════════════════ */}
      <aside
        className="flex flex-col border-r shrink-0 transition-all duration-300"
        style={{
          width: sidebarCollapsed ? 0 : 340,
          minWidth: sidebarCollapsed ? 0 : 280,
          maxWidth: 400,
          background: 'var(--bg-sidebar)',
          borderColor: 'var(--border)',
          overflow: sidebarCollapsed ? 'hidden' : 'visible',
        }}
      >
        {!sidebarCollapsed && (
          <>
            {/* Sidebar header */}
            <div
              className="flex flex-col gap-3 px-4 py-3 border-b shrink-0"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
            >
              {/* Logo + back */}
              <div className="flex items-center justify-between">
                <button onClick={handleBack} className="btn-ghost" id="back-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  Search
                </button>

                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-[6px] flex items-center justify-center"
                    style={{ background: 'var(--accent)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="font-bold text-[13px]"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
                    Organized
                  </span>
                </div>
              </div>

              {/* Sidebar search bar */}
              <SearchBar
                onSearch={handleSidebarSearch}
                isLoading={sidebarLoading}
                defaultValue={searchQuery}
              />
            </div>

            {/* Results list */}
            <div className="flex-1 overflow-y-auto py-3">
              {sidebarError && (
                <p className="text-[12px] px-4 py-2" style={{ color: 'var(--danger)' }}>{sidebarError}</p>
              )}

              {sidebarLoading && <SidebarSkeleton />}

              {!sidebarLoading && sidebarSearched && sidebarResults.length === 0 && (
                <p className="text-center text-[12px] py-8" style={{ color: 'var(--text-tertiary)' }}>
                  No results found.
                </p>
              )}

              {!sidebarLoading && sidebarResults.length > 0 && (
                <div className="flex flex-col gap-2 px-3">
                  {/* Count row */}
                  <p className="text-[11px] px-1 mb-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {sidebarResults.length} result{sidebarResults.length !== 1 ? 's' : ''} for{' '}
                    <span className="font-semibold" style={{ color: 'var(--accent)' }}>"{sidebarQuery}"</span>
                  </p>
                  {sidebarResults.map((r, i) => (
                    <SearchResultCard
                      key={`${r.pdf_name}-${r.page}-${i}`}
                      result={r}
                      index={i}
                      query={sidebarQuery}
                    />
                  ))}
                </div>
              )}

              {!sidebarSearched && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 px-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                  </svg>
                  <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                    Search to find related results
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* ── Sidebar toggle ── */}
      <button
        id="sidebar-toggle-btn"
        onClick={() => setSidebarCollapsed((c) => !c)}
        title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
        className="absolute z-30 flex items-center justify-center rounded-full border shadow-md transition-all duration-200"
        style={{
          left: sidebarCollapsed ? 8 : 332,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 24, height: 24,
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none"
          viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d={sidebarCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
        </svg>
      </button>

      {/* ════════════════════════════════
          RIGHT PANEL — PDF Viewer
      ════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Panel header */}
        <div
          className="flex items-center gap-3 px-5 py-2.5 border-b shrink-0"
          style={{
            background: 'var(--bg-card)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          {/* File icon + info */}
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--accent-light)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: 'var(--accent)' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold truncate"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {detail || filename || 'No file selected'}
            </p>
            {detail && (
              <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>{filename}</p>
            )}
          </div>

          {/* Meta chips */}
          <div className="flex items-center gap-2 shrink-0">
            {page && (
              <span
                className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent-text)',
                  border: '1px solid #BFDBFE',
                }}
              >
                p.{page}
              </span>
            )}
            {searchQuery && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{
                  background: '#FEF9C3',
                  color: '#854D0E',
                  border: '1px solid #FDE68A',
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                "{searchQuery}"
              </span>
            )}
          </div>
        </div>

        {/* PDF viewer */}
        <div className="flex-1 overflow-hidden">
          {pdfUrl ? (
            <PdfViewer url={pdfUrl} initialPage={page} searchQuery={searchQuery} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--bg-secondary)' }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No PDF file specified.</p>
              <button onClick={handleBack} className="btn-primary">Return to search</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
