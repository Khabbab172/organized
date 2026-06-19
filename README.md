# Organized — PDF Semantic Search

Semantic search engine for PDF corpora using Gemini API, ChromaDB, and FastAPI.

## Features
- Upload multiple PDFs
- Search by topic — returns PDF name + page number
- Session-isolated vector collections

## Stack
Python 3.12.7, FastAPI, ChromaDB, Gemini Embedding API, PyMuPDF, Vite


# How to start server

## Option 1: With virtual environment (recommended)
pip install -r requirements.txt

# After activation
uvicorn main:app --reload --port 8000

## Option 2: No virtual environment
pip install -r requirements.txt

uvicorn main:app --reload --port 8000

# Frontend

cd frontend
npm install
npm run dev
