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