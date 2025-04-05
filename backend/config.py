# config.py
import os

# Konfigurasi
MODEL_NAME = "vosk-model-en-us-0.42-gigaspeech"
SAMPLE_RATE = 16000
BUFFER_SIZE = 2048
OLLAMA_MODEL = "phi4:latest"
WS_PORT = 8765

# Inisialisasi environment
os.environ["OLLAMA_KEEP_ALIVE"] = "5m"

RAG_CONFIG = {
    "EMBEDDING_MODEL": "nomic-embed-text",
    "LLM_MODEL": OLLAMA_MODEL,
    "VECTOR_DB_PATH": "./data/vector_db",
    "UPLOAD_FOLDER": "./data/uploads",
    "ALLOWED_EXTENSIONS": {'.txt', '.pdf', '.docx', '.md'}
}

# Buat folder jika belum ada
os.makedirs(RAG_CONFIG["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(RAG_CONFIG["VECTOR_DB_PATH"], exist_ok=True)