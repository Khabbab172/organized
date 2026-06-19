import { useRef, useState, useCallback } from 'react';
import { uploadPdfs } from '../services/api';

/* ── Icons ── */
function UploadCloudIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75z" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9z" />
    </svg>
  );
}

function XIcon({ className }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none"
      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

/* ── File status row ── */
function FileRow({ file, status }) {
  const size = (file.size / 1024).toFixed(1) + ' KB';

  const iconEl = (() => {
    if (status === 'pending') return (
      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--border-strong)', opacity: 0.5 }} />
    );
    if (status === 'uploading') return (
      <svg className="animate-spin" style={{ width: 20, height: 20, color: 'var(--accent)' }}
        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
    );
    if (status === 'done') return (
      <svg style={{ width: 20, height: 20, color: 'var(--success)' }} xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    );
    if (status === 'skipped') return (
      <svg style={{ width: 20, height: 20, color: 'var(--warning)' }} xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    );
    if (status === 'error') return (
      <svg style={{ width: 20, height: 20, color: 'var(--danger)' }} xmlns="http://www.w3.org/2000/svg"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    );
    return null;
  })();

  const labelColor = {
    pending:   'var(--text-tertiary)',
    uploading: 'var(--accent)',
    done:      'var(--success)',
    skipped:   'var(--warning)',
    error:     'var(--danger)',
  }[status] || 'var(--text-tertiary)';

  const label = {
    pending:   'Queued',
    uploading: 'Ingesting…',
    done:      'Ingested',
    skipped:   'Already up to date',
    error:     'Failed',
  }[status] || status;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 'var(--radius-md)',
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
    }}>
      <FileIcon className="shrink-0" style={{ width: 16, height: 16, color: 'var(--text-tertiary)' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{file.name}</p>
        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{size}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {iconEl}
        <span style={{ fontSize: 11, fontWeight: 600, color: labelColor }}>{label}</span>
      </div>
    </div>
  );
}

/* ── Main Modal ── */
export default function UploadModal({ onClose }) {
  const fileInputRef  = useRef(null);
  const [files, setFiles]       = useState([]);       // File[]
  const [statuses, setStatuses] = useState({});        // { [filename]: 'pending'|'uploading'|'done'|'skipped'|'error' }
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary]   = useState(null);      // result from API
  const [error, setError]       = useState(null);

  /* ── File selection helpers ── */
  const addFiles = useCallback((newFiles) => {
    const pdfs = Array.from(newFiles).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (!pdfs.length) return;
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      const merged   = [...prev, ...pdfs.filter(f => !existing.has(f.name))];
      return merged;
    });
    setStatuses(prev => {
      const next = { ...prev };
      pdfs.forEach(f => { if (!next[f.name]) next[f.name] = 'pending'; });
      return next;
    });
  }, []);

  const removeFile = useCallback((name) => {
    setFiles(prev => prev.filter(f => f.name !== name));
    setStatuses(prev => { const n = { ...prev }; delete n[name]; return n; });
  }, []);

  /* ── Drag & drop ── */
  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  /* ── Upload ── */
  const handleUpload = async () => {
    if (!files.length || isUploading) return;
    setIsUploading(true);
    setError(null);
    setSummary(null);

    // Mark all as uploading
    setStatuses(prev => {
      const next = {};
      files.forEach(f => { next[f.name] = 'uploading'; });
      return next;
    });

    try {
      const result = await uploadPdfs(files);
      // Map per-file statuses from the API response
      const next = {};
      for (const detail of result.details) {
        next[detail.pdf_name] = detail.skipped ? 'skipped' : 'done';
      }
      setStatuses(next);
      setSummary(result);
    } catch (err) {
      setError(err.message);
      setStatuses(prev => {
        const next = {};
        Object.keys(prev).forEach(k => { next[k] = 'error'; });
        return next;
      });
    } finally {
      setIsUploading(false);
    }
  };

  const canUpload = files.length > 0 && !isUploading && !summary;

  /* ── Render ── */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 40,
          background: 'rgba(15,15,15,0.45)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.18s ease',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, pointerEvents: 'none',
      }}>
        <div
          style={{
            width: '100%', maxWidth: 520,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden',
            pointerEvents: 'all',
            animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
            /* ── Key fix: constrain height so footer is always visible ── */
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 48px)',
          }}
        >
          {/* Header — never shrinks */}
          <div style={{ flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                background: 'var(--accent-light)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <UploadCloudIcon className="w-4 h-4" style={{ color: 'var(--accent)', width: 16, height: 16 }} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-heading)', margin: 0 }}>
                  Upload PDFs
                </h2>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, marginTop: 1 }}>
                  Only new or changed files will be ingested
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <XIcon style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Body — scrolls when content overflows */}
          <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflowY: 'auto', minHeight: 0 }}>

            {/* Drop zone */}
            {!summary && (
              <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-strong)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: isDragging ? 'var(--accent-light)' : 'var(--bg-secondary)',
                  transition: 'all 0.18s ease',
                  userSelect: 'none',
                }}
              >
                <UploadCloudIcon style={{
                  width: 28, height: 28,
                  color: isDragging ? 'var(--accent)' : 'var(--text-tertiary)',
                  margin: '0 auto 8px',
                  transition: 'color 0.18s ease',
                }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Drag & drop PDFs here
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                  or <span style={{ color: 'var(--accent)', fontWeight: 600 }}>click to browse</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
                />
              </div>
            )}

            {/* File list */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
                {files.map(f => (
                  <div key={f.name} style={{ position: 'relative' }}>
                    <FileRow file={f} status={statuses[f.name] || 'pending'} />
                    {/* Remove button — only if not yet uploading/done */}
                    {!isUploading && !summary && (
                      <button
                        onClick={() => removeFile(f.name)}
                        style={{
                          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                          width: 20, height: 20, borderRadius: '50%',
                          background: 'var(--bg-hover)', border: '1px solid var(--border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', color: 'var(--text-tertiary)',
                        }}
                      >
                        <XIcon style={{ width: 10, height: 10 }} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--danger-light)', border: '1px solid #FCA5A5',
                color: 'var(--danger)', fontSize: 12,
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* Success summary */}
            {summary && (
              <div style={{
                padding: '12px 16px', borderRadius: 'var(--radius-md)',
                background: 'var(--success-light)', border: '1px solid #6EE7B7',
                fontSize: 13,
              }}>
                <p style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>
                  ✅ Upload complete
                </p>
                <p style={{ color: '#065F46', fontSize: 12, lineHeight: 1.6 }}>
                  <strong>{summary.ingested}</strong> ingested &nbsp;·&nbsp;
                  <strong>{summary.skipped}</strong> skipped (already up to date) &nbsp;·&nbsp;
                  <strong>{summary.total_chunks_in_db}</strong> total chunks in DB
                </p>
              </div>
            )}
          </div>

          {/* Footer — never shrinks, always visible */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
            padding: '12px 20px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
          }}>
            <button className="btn-ghost" onClick={onClose}>
              {summary ? 'Close' : 'Cancel'}
            </button>
            {!summary && (
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!canUpload}
                style={{ gap: 6 }}
              >
                {isUploading ? (
                  <>
                    <svg className="animate-spin" style={{ width: 14, height: 14 }}
                      xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Ingesting…
                  </>
                ) : (
                  <>
                    <UploadCloudIcon style={{ width: 14, height: 14 }} />
                    Ingest {files.length > 0 ? `${files.length} PDF${files.length > 1 ? 's' : ''}` : 'PDFs'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(12px) scale(0.98); }
                              to   { opacity: 1; transform: translateY(0)     scale(1);    } }
      `}</style>
    </>
  );
}
