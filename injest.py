import fitz # pymupdf
import chromadb
import re
from sentence_transformers import SentenceTransformer

# ── Setup ─────────────────────────────────────────────────────
model = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("pdfs")

PDF_FOLDER = "./pdfs"

def extract_pages(pdf_path):
    doc = fitz.open(pdf_path)
    pages = []
    for page_num , page in enumerate(doc, start=1):
        text = page.get_text().strip()
        if text:
            pages.append({
                "page":page_num,
                "text": text
            })
    return pages

def clean_text(text):
    text = re.sub(r'\.{4,}' , ' ',text)
    text = re.sub(r'\n{3,}','\n\n' , text)

    text = text.strip()
    return text

def chunk_text(text, chunk_size=500, overlap=100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap  # += yahan
    return chunks


def ingest_pdf(pdf_path):
    import os
    pdf_name = os.path.basename(pdf_path)
    pages = extract_pages(pdf_path)

    all_chunks = []
    all_metadata = []
    all_ids = []

    for page_data in pages:
        page_num = page_data["page"]
        cleaned = clean_text(page_data["text"])
        chunks = chunk_text(cleaned)

        for i, chunk in enumerate(chunks):
            if len(chunk.strip()) < 50:
                continue
            chunk_id = f"{pdf_name}_p{page_num}_c{i}"
            all_chunks.append(chunk)
            all_metadata.append({        # all_metadat → all_metadata
                "pdf_name": pdf_name,
                "page": page_num,
            })
            all_ids.append(chunk_id)

    # Loop ke BAHAR — indentation fix
    if not all_chunks:
        print("Not found")
        return

    print(f"Embedding {len(all_chunks)} chunks...")
    embeddings = model.encode(all_chunks).tolist()

    collection.upsert(
        ids=all_ids,
        documents=all_chunks,
        embeddings=embeddings,
        metadatas=all_metadata
    )
    print(f"✅ Done — {len(all_chunks)} chunks stored")

def ingest_all():
    import os
    pdf_files = [f for f in os.listdir(PDF_FOLDER) if f.endswith('.pdf')]
    print(f"{len(pdf_files)} PDFs mile")
    for pdf_file in pdf_files:
        ingest_pdf(os.path.join(PDF_FOLDER, pdf_file))
    print(f"\nTotal chunks in DB: {collection.count()}")

ingest_all()