import { useRef, useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import SearchBar from '../components/SearchBar';
import SearchResultCard from '../components/SearchResultCard';
import Pagination from '../components/Pagination';
import UploadModal from '../components/UploadModal';
import { searchPdfsPaginated } from '../services/api';

const PAGE_SIZE = 20;

/* ══════════════════════════════════════════════════════
   Sub-components
══════════════════════════════════════════════════════ */

function EmptyState({ hasSearched }) {
  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: 'var(--accent)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1.5"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            Search across past papers
          </h2>
          <p className="text-sm max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            Find questions and mark schemes by topic, keyword, or concept.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-1">
          {['bubble sort', 'binary search', 'pseudocode', 'SQL SELECT', 'recursion', 'stack'].map((hint) => (
            <span key={hint} className="px-3 py-1 rounded-full text-xs font-medium cursor-default"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
              {hint}
            </span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center"
        style={{ background: 'var(--bg-secondary)' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: 'var(--text-tertiary)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      </div>
      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>No results found</p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Try a different keyword or a broader term.
      </p>
    </div>
  );
}

function ErrorBanner({ message, onDismiss }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4"
      style={{ background: 'var(--danger-light)', border: '1px solid #FCA5A5', color: 'var(--danger)' }}>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="hover:opacity-70 transition-opacity font-semibold">✕</button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-[var(--radius-lg)] p-5"
      style={{ background: 'var(--bg-card)', border: '1.5px solid var(--border)' }}>
      <div className="flex gap-3.5">
        <div className="skeleton w-[38px] h-[38px] rounded-[10px] shrink-0"/>
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3 w-1/4 rounded"/>
          <div className="skeleton h-4 w-2/3 rounded"/>
          <div className="skeleton h-3 w-1/3 rounded"/>
          <div className="skeleton h-3 w-full rounded mt-3"/>
          <div className="skeleton h-3 w-5/6 rounded"/>
        </div>
      </div>
    </div>
  );
}

/* ── Relevance score badge ── */
function ScoreBadge({ score }) {
  if (score == null) return null;
  const pct  = Math.round(score * 100);
  const good = pct >= 70;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold shrink-0"
      style={
        good
          ? { background: 'var(--success-light)', color: 'var(--success)' }
          : { background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }
      }
      title={`Relevance score: ${pct}%`}
    >
      {pct}% match
    </span>
  );
}

/* ══════════════════════════════════════════════════════
   Main Page
══════════════════════════════════════════════════════ */

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const resultsRef = useRef(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const query      = searchParams.get('q')    || '';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  /* ── React Query ── */
  const {
    data,
    isFetching,
    isError,
    error,
  } = useQuery({
    queryKey:    ['search', query, currentPage],
    queryFn:     () => searchPdfsPaginated({ query, page: currentPage, pageSize: PAGE_SIZE }),
    enabled:     !!query.trim(),
    placeholderData: keepPreviousData,   // show stale data while fetching next page
  });

  const results    = data?.results     ?? [];
  const total      = data?.total       ?? 0;
  const totalPages = data?.total_pages ?? 1;

  /* ── Handlers ── */
  const handleSearch = useCallback((newQuery) => {
    setSearchParams({ q: newQuery, page: '1' });
  }, [setSearchParams]);

  const handlePageChange = useCallback((newPage) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(newPage));
      return next;
    });
    // Scroll results back to top
    resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

  const hasSearched = !!query.trim();

  /* ── Render ── */
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 border-b"
        style={{ background: 'rgba(250,250,248,0.94)', backdropFilter: 'blur(14px)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">

          {/* Logo row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
              style={{ background: 'var(--accent)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
            </div>
            <span className="font-bold text-[15px] tracking-tight"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
              Organized
            </span>

            {/* Upload button — pushed to the right */}
            <div style={{ flex: 1 }} />
            <button
              id="upload-pdfs-btn"
              className="btn-primary"
              onClick={() => setUploadOpen(true)}
              style={{ height: 32, padding: '0 14px', fontSize: 12, gap: 6 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" style={{ width: 13, height: 13 }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75z" />
              </svg>
              Upload PDFs
            </button>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isFetching} defaultValue={query} />
        </div>
      </header>

      {/* ── Scrollable Results Area ── */}
      <main ref={resultsRef} className="flex-1 max-w-4xl mx-auto w-full px-6 pt-6 pb-2">

        {/* Error */}
        {isError && (
          <ErrorBanner
            message={error?.message || 'Could not reach the server. Is the backend running?'}
            onDismiss={() => {}}
          />
        )}

        {/* Result meta row */}
        {hasSearched && !isFetching && total > 0 && (
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{total}</span>
              {' '}result{total !== 1 ? 's' : ''} for{' '}
              <span className="font-semibold" style={{ color: 'var(--accent)' }}>"{query}"</span>
              {totalPages > 1 && (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {' '}· page {currentPage} of {totalPages}
                </span>
              )}
            </p>
            <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
              </svg>
              Sorted by relevance
            </span>
          </div>
        )}

        {/* Skeletons — shown during first load AND page transitions (keepPreviousData means results still show, 
            but we overlay a faded + skeleton effect by blending opacity on the cards) */}
        {isFetching && results.length === 0 && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Results (kept visible during page transition via keepPreviousData) */}
        {results.length > 0 && (
          <div
            className="flex flex-col gap-3 transition-opacity duration-200"
            style={{ opacity: isFetching ? 0.55 : 1 }}
          >
            {results.map((result, i) => (
              <div key={`${result.pdf_name}-${result.page}-${i}`} className="relative">
                <SearchResultCard result={result} index={i} query={query} />
                {/* Relevance score overlay */}
                <div className="absolute top-3 right-10 pointer-events-none">
                  <ScoreBadge score={result.score} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Transition overlay spinner */}
        {isFetching && results.length > 0 && (
          <div className="flex justify-center py-4">
            <div className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              <svg className="animate-spin w-4 h-4" style={{ color: 'var(--accent)' }}
                xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading page {currentPage}…
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isFetching && results.length === 0 && !isError && (
          <EmptyState hasSearched={hasSearched} />
        )}
      </main>

      {/* ── Sticky Pagination Footer ── */}
      {hasSearched && (total > 0 || isFetching) && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          pageSize={PAGE_SIZE}
          onPageChange={handlePageChange}
          isLoading={isFetching}
        />
      )}

      {/* Upload Modal */}
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
