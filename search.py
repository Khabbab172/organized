import chromadb
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
client = chromadb.PersistentClient(path="./chroma_db")
collection = client.get_or_create_collection("pdfs")

def search(query , top_k=5):
    query_embedding = model.encode([query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k
    )

    print(f"\nResults for: '{query}'\n")
    for i, (doc, meta) in enumerate(zip(results['documents'][0], results['metadatas'][0])):
        print(f"Result {i+1}")
        print(f"  PDF  : {meta['pdf_name']}")
        print(f"  Page : {meta['page']}")
        print(f"  Text : {doc[:150]}...")
        print()

# Test karo
search("REPEAT UNTIL loop")