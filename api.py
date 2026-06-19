from fastapi import FastAPI, Request, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
import chromadb
from sentence_transformers import SentenceTransformer
import math
import os
import shutil
from injest import ingest_single

app = FastAPI()

# CORS — allow React frontend on any port
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model    = SentenceTransformer('all-MiniLM-L6-v2')
client   = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("pdfs")
PDFS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs")

# ── Legacy POST endpoint (kept for backward-compatibility) ────────────────────
class SearchRequest(BaseModel):
    query: str
    top_k: int = 8

@app.post("/search")
def search_post(req: SearchRequest):
    query_embedding = model.encode([req.query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(req.top_k, collection.count() or 1),
    )
    output = []
    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        output.append({
            "pdf_name": meta["pdf_name"],
            "page":     meta["page"],
            "snippet":  doc[:300],
            "score":    round(1 - distance, 4),   # cosine similarity (0–1, higher = better)
        })
    return {"results": output}


# ── Paginated GET endpoint ────────────────────────────────────────────────────
MAX_FETCH = 200   # upper cap on how many chromadb results we retrieve

@app.get("/search")
def search_get(
    q:         str = Query(...,  min_length=1, description="Search query"),
    page:      int = Query(1,    ge=1,         description="1-based page number"),
    page_size: int = Query(20,   ge=1, le=100, description="Results per page"),
):
    # 1. Determine how many results chromadb has available
    total_in_db = collection.count() or 1
    fetch_n     = min(MAX_FETCH, total_in_db)

    # 2. Semantic search — fetch up to MAX_FETCH results
    query_embedding = model.encode([q]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=fetch_n,
    )

    # 3. Build full sorted list (chromadb already returns by ascending distance)
    all_results = []
    for doc, meta, distance in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        all_results.append({
            "pdf_name": meta["pdf_name"],
            "page":     meta["page"],
            "snippet":  doc[:300],
            "score":    round(1 - distance, 4),   # cosine similarity
        })

    # already sorted by relevance (chromadb returns nearest-first → highest score first)
    total        = len(all_results)
    total_pages  = max(1, math.ceil(total / page_size))
    page         = min(page, total_pages)            # clamp to valid range
    start        = (page - 1) * page_size
    end          = start + page_size
    page_results = all_results[start:end]

    return {
        "results":     page_results,
        "total":       total,
        "page":        page,
        "page_size":   page_size,
        "total_pages": total_pages,
    }


@app.get("/")
def root():
    return {"status": "ok", "chunks": collection.count()}


# ── PDF Upload & Ingest ───────────────────────────────────────────────────────
@app.post("/ingest")
async def ingest_upload(files: list[UploadFile] = File(...)):
    """
    Accept one or more PDF file uploads, save them to ./pdfs,
    then ingest only new/changed files using the hash registry.
    """
    results = []
    for upload in files:
        # Validate mime type
        if not upload.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"'{upload.filename}' is not a PDF file.",
            )

        dest_path = os.path.join(PDFS_DIR, upload.filename)

        # Save uploaded file to disk
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)

        # Ingest (skip if identical hash already registered)
        result = ingest_single(dest_path)
        results.append(result)

    return {
        "ingested": len([r for r in results if not r.get("skipped")]),
        "skipped":  len([r for r in results if r.get("skipped")]),
        "details":  results,
        "total_chunks_in_db": collection.count(),
    }


# ── List indexed PDFs ─────────────────────────────────────────────────────────
@app.get("/pdfs/list")
def list_pdfs():
    """Return a list of PDF filenames currently in the pdfs folder."""
    files = sorted(
        f for f in os.listdir(PDFS_DIR) if f.lower().endswith(".pdf")
    )
    return {"pdfs": files, "count": len(files)}


# ── Static PDF serving ────────────────────────────────────────────────────────

@app.get("/pdfs/{filename:path}")
def serve_pdf(filename: str):
    safe_path = os.path.realpath(os.path.join(PDFS_DIR, filename))
    if not safe_path.startswith(os.path.realpath(PDFS_DIR)):
        return JSONResponse(status_code=403, content={"error": "Forbidden"})
    if not os.path.isfile(safe_path):
        return JSONResponse(status_code=404, content={"error": "PDF not found"})
    return FileResponse(safe_path, media_type="application/pdf")