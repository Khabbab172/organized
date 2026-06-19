/**
 * Premium Shadcn-inspired Pagination component.
 * Uses design-system CSS tokens from index.css.
 *
 * Props:
 *   currentPage   number   1-based
 *   totalPages    number
 *   total         number   total result count
 *   pageSize      number
 *   onPageChange  (page: number) => void
 *   isLoading     boolean
 */

const MAX_VISIBLE = 7;  // max page buttons shown (including ellipses)

function getPageRange(current, total) {
  if (total <= MAX_VISIBLE) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 2;
  const left  = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);
  const pages = [1];

  if (left > 2)  pages.push('...');
  for (let p = left; p <= right; p++) pages.push(p);
  if (right < total - 1) pages.push('...');
  pages.push(total);

  return pages;
}

/* ── Sub-components ── */

function PBtn({ onClick, disabled, active, children, title, wide = false }) {
  const base = `
    inline-flex items-center justify-center h-8 min-w-[32px] rounded-[var(--radius-sm)]
    text-[12.5px] font-medium select-none transition-all duration-150 border
  `;

  const variant = active
    ? 'border-[--accent] bg-[--accent] text-white shadow-sm'
    : disabled
      ? 'border-transparent bg-transparent text-[--text-tertiary] cursor-not-allowed'
      : 'border-[--border] bg-[--bg-card] text-[--text-secondary] hover:border-[--accent] hover:text-[--accent] hover:bg-[--accent-light] cursor-pointer';

  return (
    <button
      onClick={!disabled ? onClick : undefined}
      disabled={disabled}
      title={title}
      className={`${base} ${variant} ${wide ? 'px-3' : 'px-1'}`}
      style={active ? { background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff' } : {}}
    >
      {children}
    </button>
  );
}

function Ellipsis() {
  return (
    <span
      className="inline-flex items-center justify-center h-8 w-8 text-[12.5px]"
      style={{ color: 'var(--text-tertiary)' }}
    >
      ···
    </span>
  );
}

/* ── Main Pagination Component ── */

export default function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
  isLoading = false,
}) {
  if (totalPages <= 1 && !isLoading) return null;

  const pages   = getPageRange(currentPage, totalPages);
  const start   = (currentPage - 1) * pageSize + 1;
  const end     = Math.min(currentPage * pageSize, total);

  return (
    <div
      className="sticky bottom-0 z-10 border-t"
      style={{
        background: 'rgba(250,250,248,0.96)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
      }}
    >
      <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">

        {/* Left: result range info */}
        <p className="text-[12px] shrink-0" style={{ color: 'var(--text-secondary)' }}>
          {isLoading ? (
            <span className="inline-flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
              <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Loading…
            </span>
          ) : (
            <>
              Showing <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{start}–{end}</span>
              {' '}of{' '}
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{total}</span>
              {' '}results
            </>
          )}
        </p>

        {/* Center: page buttons */}
        <nav
          className="flex items-center gap-1"
          aria-label="Pagination"
          role="navigation"
        >
          {/* Prev */}
          <PBtn
            id="pagination-prev"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            title="Previous page"
            wide
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            Prev
          </PBtn>

          {/* Page numbers */}
          {pages.map((p, i) =>
            p === '...'
              ? <Ellipsis key={`ellipsis-${i}`} />
              : (
                <PBtn
                  key={p}
                  id={`pagination-page-${p}`}
                  onClick={() => onPageChange(p)}
                  active={p === currentPage}
                  disabled={isLoading}
                  title={`Page ${p}`}
                >
                  {p}
                </PBtn>
              )
          )}

          {/* Next */}
          <PBtn
            id="pagination-next"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            title="Next page"
            wide
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/>
            </svg>
          </PBtn>
        </nav>

        {/* Right: page jump */}
        <div className="flex items-center gap-2 shrink-0 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
          <span>Go to</span>
          <input
            id="pagination-jump"
            type="number"
            min={1}
            max={totalPages}
            defaultValue={currentPage}
            key={currentPage}   /* reset on external change */
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const val = parseInt(e.currentTarget.value, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) onPageChange(val);
              }
            }}
            disabled={isLoading}
            className="w-12 text-center rounded-[var(--radius-sm)] py-1 text-[12px] font-medium"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <span style={{ color: 'var(--text-tertiary)' }}>/ {totalPages}</span>
        </div>
      </div>
    </div>
  );
}
