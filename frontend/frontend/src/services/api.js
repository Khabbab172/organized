const BASE_URL = 'http://127.0.0.1:8080';

// ── Legacy: sidebar/simple search (POST, returns flat array) ─────────────────
export async function searchPdfs(query, topK = 8) {
  const response = await fetch(`${BASE_URL}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, top_k: topK }),
  });
  if (!response.ok) throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return data.results || [];
}

// ── Paginated search (GET, returns { results, total, page, page_size, total_pages }) ──
export async function searchPdfsPaginated({ query, page = 1, pageSize = 20 }) {
  const params = new URLSearchParams({
    q:         query,
    page:      String(page),
    page_size: String(pageSize),
  });
  const response = await fetch(`${BASE_URL}/search?${params}`);
  if (!response.ok) throw new Error(`Search failed: ${response.status} ${response.statusText}`);
  return response.json(); // { results, total, page, page_size, total_pages }
}

export function getPdfUrl(filename) {
  return `${BASE_URL}/pdfs/${encodeURIComponent(filename)}`;
}

// ── Upload & ingest one or more PDFs ─────────────────────────────────────────
export async function uploadPdfs(files) {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  const response = await fetch(`${BASE_URL}/ingest`, {
    method: 'POST',
    body: formData,
    // Note: do NOT set Content-Type — browser sets it automatically with boundary
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Upload failed: ${response.status} ${response.statusText}`);
  }
  return response.json(); // { ingested, skipped, details, total_chunks_in_db }
}
