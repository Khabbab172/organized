import fitz  # pymupdf
import chromadb
import re
import os
import json
import hashlib
from sentence_transformers import SentenceTransformer

# ── Setup ─────────────────────────────────────────────────────
model      = SentenceTransformer('all-MiniLM-L6-v2')
client     = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("pdfs")

PDF_FOLDER    = "./pdfs"
REGISTRY_PATH = "./ingested_registry.json"


# ── Registry helpers ───────────────────────────────────────────
def load_registry() -> dict:
    """Load the hash registry from disk (returns {} if not found)."""
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, "r") as f:
            return json.load(f)
    return {}


def save_registry(registry: dict) -> None:
    """Persist the hash registry to disk."""
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)


def file_hash(path: str) -> str:
    """Return the MD5 hex-digest of a file's contents."""
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ── PDF processing helpers ─────────────────────────────────────
def extract_pages(pdf_path: str) -> list:
    doc   = fitz.open(pdf_path)
    pages = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            pages.append({"page": page_num, "text": text})
    return pages


def clean_text(text: str) -> str:
    text = re.sub(r'\.{4,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list:
    chunks, start = [], 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks


# ── Core ingest function ───────────────────────────────────────
def ingest_pdf(pdf_path: str) -> dict:
    """
    Embed and store all chunks of *pdf_path* into ChromaDB.
    Returns a status dict: { pdf_name, chunks_stored }.
    """
    pdf_name = os.path.basename(pdf_path)
    pages    = extract_pages(pdf_path)

    all_chunks, all_metadata, all_ids = [], [], []

    for page_data in pages:
        page_num = page_data["page"]
        cleaned  = clean_text(page_data["text"])
        chunks   = chunk_text(cleaned)

        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:
                continue
            all_chunks.append(chunk)
            all_metadata.append({"pdf_name": pdf_name, "page": page_num})
            all_ids.append(f"{pdf_name}_p{page_num}_c{i}")

    if not all_chunks:
        print(f"⚠️  No usable text found in {pdf_name}")
        return {"pdf_name": pdf_name, "chunks_stored": 0}

    print(f"🔢  Embedding {len(all_chunks)} chunks from {pdf_name}…")
    embeddings = model.encode(all_chunks).tolist()

    collection.upsert(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadata,
    )
    print(f"✅  {pdf_name} → {len(all_chunks)} chunks stored")
    return {"pdf_name": pdf_name, "chunks_stored": len(all_chunks)}


# ── Batch ingest with change detection ────────────────────────
def ingest_all() -> None:
    """
    Scan PDF_FOLDER and ingest only new or changed PDFs.
    Uses an MD5 hash registry to detect changes.
    """
    registry  = load_registry()
    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.lower().endswith('.pdf')]
    print(f"📂  {len(pdf_files)} PDF(s) found in {PDF_FOLDER}")

    ingested = 0
    for pdf_file in pdf_files:
        full_path    = os.path.join(PDF_FOLDER, pdf_file)
        current_hash = file_hash(full_path)

        if registry.get(pdf_file) == current_hash:
            print(f"⏭️   Skipping (unchanged): {pdf_file}")
            continue

        print(f"📥  Ingesting: {pdf_file}")
        ingest_pdf(full_path)
        registry[pdf_file] = current_hash
        ingested += 1

    save_registry(registry)
    print(f"\n✨  Done — {ingested} new/updated PDF(s) ingested")
    print(f"📊  Total chunks in DB: {collection.count()}")


# ── Single-file ingest used by the API ────────────────────────
def ingest_single(pdf_path: str) -> dict:
    """
    Ingest one PDF file and update the registry.
    Called by the FastAPI /ingest endpoint after saving the upload.
    Returns a status dict.
    """
    registry     = load_registry()
    pdf_file     = os.path.basename(pdf_path)
    current_hash = file_hash(pdf_path)

    if registry.get(pdf_file) == current_hash:
        return {
            "pdf_name": pdf_file,
            "chunks_stored": 0,
            "skipped": True,
            "reason": "Already ingested (identical file)",
        }

    result               = ingest_pdf(pdf_path)
    registry[pdf_file]   = current_hash
    save_registry(registry)
    result["skipped"]    = False
    return result


# ── Entry point (run directly) ─────────────────────────────────
if __name__ == "__main__":
    ingest_all()