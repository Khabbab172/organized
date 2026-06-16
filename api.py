from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import chromadb
import fitz
import re
import uuid
import google.generativeai as genai

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory: session_id → collection_name
sessions = {}

def get_collection(session_id):
    client = chromadb.PersistentClient(path="./chroma_db")
    collection_name = f"session_{session_id}"
    return client.get_or_create_collection(collection_name)

def extract_pages(pdf_bytes):
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = []
    for page_num, page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            pages.append({"page": page_num, "text": text})
    return pages

def clean_text(text):
    text = re.sub(r'\.{4,}', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        chunks.append(text[start:start + chunk_size])
        start += chunk_size - overlap
    return chunks

def get_embedding(text, api_key):
    genai.configure(api_key=api_key)
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
    )
    return result['embedding']

# ── Routes ────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/session")
def create_session():
    session_id = str(uuid.uuid4())
    sessions[session_id] = True
    return {"session_id": session_id}

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    api_key: str = Form(...)
):
    pdf_bytes = await file.read()
    pdf_name = file.filename
    pages = extract_pages(pdf_bytes)

    collection = get_collection(session_id)

    all_chunks = []
    all_metadata = []
    all_ids = []

    for page_data in pages:
        cleaned = clean_text(page_data["text"])
        chunks = chunk_text(cleaned)
        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:
                continue
            all_chunks.append(chunk)
            all_metadata.append({
                "pdf_name": pdf_name,
                "page": page_data["page"]
            })
            all_ids.append(f"{session_id}_{pdf_name}_p{page_data['page']}_c{i}")

    # Embed each chunk via Gemini
    embeddings = []
    for chunk in all_chunks:
        emb = get_embedding(chunk, api_key)
        embeddings.append(emb)

    collection.upsert(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadata
    )

    return {"status": "ok", "chunks": len(all_chunks), "pdf": pdf_name}

@app.post("/search")
async def search(body: dict):
    session_id = body["session_id"]
    query = body["query"]
    api_key = body["api_key"]
    top_k = body.get("top_k", 5)

    query_embedding = get_embedding(query, api_key)
    collection = get_collection(session_id)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=top_k
    )

    output = []
    for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
        output.append({
            "pdf_name": meta['pdf_name'],
            "page": meta['page'],
            "snippet": doc[:300]
        })

    return {"results": output}