import { useNavigate } from 'react-router-dom';

/* ── Helpers ───────────────────────────────────────── */

function getPaperMeta(filename) {
  const name = filename.replace(/\.pdf$/i, '');
  const parts = name.split('_');
  if (parts.length >= 4) {
    const session = parts[1];
    const type    = parts[2];
    const paper   = parts[3];
    const seasonMap = { s: 'Summer', w: 'Winter', m: 'March' };
    const typeMap   = { qp: 'Question Paper', ms: 'Mark Scheme' };
    const year   = '20' + session.slice(1);
    const season = seasonMap[session[0]] || session.toUpperCase();
    return {
      label: typeMap[type] || type.toUpperCase(),
      detail: `${season} ${year} · Paper ${paper}`,
      isMS: type === 'ms',
    };
  }
  return { label: 'Document', detail: filename, isMS: false };
}

function highlightSnippet(text, query) {
  if (!query?.trim()) return text;
  const parts = text.split(new RegExp(`(${escapeRegex(query.trim())})`, 'gi'));
  return parts.map((part, i) =>
    i % 2 === 1
      ? <mark key={i} style={{ background: 'var(--highlight-search)', borderRadius: 3, padding: '0 2px' }}>{part}</mark>
      : part
  );
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* ── Sub-components ────────────────────────────────── */

function PaperIcon({ isMS }) {
  return (
    <div
      className="flex items-center justify-center shrink-0 rounded-[10px]"
      style={{
        width: 38, height: 38,
        background: isMS ? 'var(--success-light)' : 'var(--accent-light)',
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg"
        className="w-[18px] h-[18px]"
        style={{ color: isMS ? 'var(--success)' : 'var(--accent)' }}
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    </div>
  );
}

/* ── Main Component ────────────────────────────────── */

export default function SearchResultCard({ result, index, query = '' }) {
  const navigate = useNavigate();
  const { label, detail, isMS } = getPaperMeta(result.pdf_name);

  const handleClick = () => {
    const params = new URLSearchParams({
      pdf:  result.pdf_name,
      page: String(result.page),
    });
    if (query.trim()) params.set('q', query.trim());
    navigate(`/viewer?${params.toString()}`);
  };

  return (
    <button
      id={`result-card-${index}`}
      onClick={handleClick}
      className="result-card group"
    >
      <div className="flex items-start gap-3.5">
        <PaperIcon isMS={isMS} />

        <div className="flex-1 min-w-0">
          {/* Row 1: badge + page */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span
              className={`badge ${isMS ? 'badge-green' : 'badge-blue'}`}
            >
              {label}
            </span>
            <span
              className="flex items-center gap-1 text-[11px] font-medium shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              p.{result.page}
            </span>
          </div>

          {/* Row 2: paper detail label */}
          <p
            className="text-[13px] font-semibold truncate mb-0.5 transition-colors group-hover:text-[--accent]"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-heading)' }}
          >
            {detail}
          </p>

          {/* Row 3: filename */}
          <p className="text-[11px] truncate mb-2.5" style={{ color: 'var(--text-tertiary)' }}>
            {result.pdf_name}
          </p>

          {/* Row 4: snippet with inline highlights */}
          <p
            className="text-[12.5px] leading-relaxed line-clamp-3"
            style={{ color: 'var(--text-secondary)' }}
          >
            {highlightSnippet(result.snippet, query)}
          </p>
        </div>

        {/* Arrow */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5 shrink-0 mt-1 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--text-tertiary)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}
