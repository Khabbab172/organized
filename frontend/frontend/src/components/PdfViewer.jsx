import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { highlightText, clearHighlights } from '../utils/highlight';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/* ── Toolbar icon button ── */
function TBtn({ id, onClick, disabled, title, children }) {
  return (
    <button id={id} onClick={onClick} disabled={disabled} title={title} className="btn-icon">
      {children}
    </button>
  );
}

export default function PdfViewer({ url, initialPage = 1, searchQuery = '' }) {
  const [numPages, setNumPages]     = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale]           = useState(1.2);
  const [loadError, setLoadError]   = useState(null);
  const [isDocLoading, setIsDocLoading] = useState(true);
  const [matchCount, setMatchCount] = useState(null);
  const scrollRef = useRef(null);

  /* ── Highlighting ── */
  const applyHighlights = useCallback(() => {
    if (!searchQuery?.trim() || !scrollRef.current) return;
    const textLayer = scrollRef.current.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;
    clearHighlights(textLayer);
    const count = highlightText(textLayer, searchQuery);
    setMatchCount(count);
  }, [searchQuery]);

  useEffect(() => {
    const id = setTimeout(applyHighlights, 120);
    return () => clearTimeout(id);
  }, [applyHighlights, currentPage]);

  /* ── PDF events ── */
  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setIsDocLoading(false);
    setLoadError(null);
  }, []);

  const onDocumentLoadError = useCallback((err) => {
    setLoadError(err.message || 'Failed to load PDF');
    setIsDocLoading(false);
  }, []);

  const onPageRenderSuccess = useCallback(() => {
    setTimeout(applyHighlights, 80);
  }, [applyHighlights]);

  /* ── Navigation ── */
  const goToPrev = () => { setMatchCount(null); setCurrentPage((p) => Math.max(p - 1, 1)); };
  const goToNext = () => { setMatchCount(null); setCurrentPage((p) => Math.min(p + 1, numPages || 1)); };
  const zoomIn   = () => setScale((s) => Math.min(+(s + 0.2).toFixed(1), 3.0));
  const zoomOut  = () => setScale((s) => Math.max(+(s - 0.2).toFixed(1), 0.5));

  const handlePageInput = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= (numPages || 1)) {
      setMatchCount(null);
      setCurrentPage(val);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-secondary)' }}>

      {/* ── Toolbar ── */}
      <div
        className="flex items-center justify-between px-4 py-2 gap-3 shrink-0 flex-wrap border-b"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        {/* Page nav */}
        <div className="flex items-center gap-2">
          <TBtn id="pdf-prev-btn" onClick={goToPrev} disabled={currentPage <= 1 || isDocLoading} title="Previous page">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </TBtn>

          <div className="flex items-center gap-1.5">
            <input
              id="page-input"
              type="number"
              value={currentPage}
              onChange={handlePageInput}
              min={1} max={numPages || 1}
              disabled={isDocLoading}
              className="w-11 text-center rounded-[var(--radius-sm)] py-0.5 text-[12px] font-medium"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              / {numPages ?? '—'}
            </span>
          </div>

          <TBtn id="pdf-next-btn" onClick={goToNext} disabled={currentPage >= (numPages || 1) || isDocLoading} title="Next page">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </TBtn>
        </div>

        {/* Match badge */}
        {searchQuery?.trim() && matchCount !== null && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={matchCount > 0
              ? { background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }
              : { background: 'var(--bg-secondary)', color: 'var(--text-tertiary)', border: '1px solid var(--border)' }
            }
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            {matchCount > 0 ? `${matchCount} match${matchCount !== 1 ? 'es' : ''}` : 'No matches'}
          </div>
        )}

        {/* Zoom controls */}
        <div className="flex items-center gap-1.5">
          <TBtn id="zoom-out-btn" onClick={zoomOut} disabled={scale <= 0.5} title="Zoom out">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM9 11h4" />
            </svg>
          </TBtn>
          <span
            className="text-[11px] font-mono w-10 text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            {Math.round(scale * 100)}%
          </span>
          <TBtn id="zoom-in-btn" onClick={zoomIn} disabled={scale >= 3.0} title="Zoom in">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0zM11 8v6M8 11h6" />
            </svg>
          </TBtn>
        </div>
      </div>

      {/* Active query pill */}
      {searchQuery?.trim() && (
        <div
          className="flex items-center gap-2 px-4 py-2 shrink-0 border-b"
          style={{
            background: '#FEFCE8',
            borderColor: '#FDE68A',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" style={{ color: '#D97706' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <span className="text-[12px] font-medium" style={{ color: '#92400E' }}>
            Highlighting: <span className="font-semibold">"{searchQuery}"</span>
          </span>
        </div>
      )}

      {/* ── PDF canvas ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex justify-center py-8 px-6"
        style={{ background: 'var(--bg-secondary)' }}
      >
        {loadError ? (
          <div className="flex flex-col items-center justify-center gap-4 text-center py-20">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--danger-light)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: 'var(--danger)' }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--danger)' }}>Failed to load PDF</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{loadError}</p>
            </div>
          </div>
        ) : (
          <Document
            file={url}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <div className="relative w-10 h-10">
                  <div
                    className="absolute inset-0 rounded-full border-[3px] border-t-[--accent] animate-spin"
                    style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                  />
                </div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading document…</p>
              </div>
            }
          >
            <Page
              pageNumber={currentPage}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onRenderSuccess={onPageRenderSuccess}
              className="rounded-lg overflow-hidden"
              style={{ boxShadow: 'var(--shadow-lg)' }}
              loading={
                <div className="flex items-center justify-center py-10">
                  <div
                    className="w-8 h-8 rounded-full border-[3px] animate-spin"
                    style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                  />
                </div>
              }
            />
          </Document>
        )}
      </div>
    </div>
  );
}
