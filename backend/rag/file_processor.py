# rag/file_processor.py
import os
from pathlib import Path
import PyPDF2
from docx import Document
from config import RAG_CONFIG

class FileProcessor:
    @staticmethod
    def allowed_file(filename):
        return Path(filename).suffix.lower() in RAG_CONFIG["ALLOWED_EXTENSIONS"]

    @staticmethod
    def save_file(file_bytes, filename):
        upload_path = os.path.join(RAG_CONFIG["UPLOAD_FOLDER"], filename)
        with open(upload_path, 'wb') as f:
            f.write(file_bytes)
        return upload_path

    @staticmethod
    def extract_text(filepath):
        ext = Path(filepath).suffix.lower()
        
        if ext == '.pdf':
            with open(filepath, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = "\n".join([page.extract_text() for page in reader.pages])
                print(".pdf loaded")
        elif ext == '.docx':
            doc = Document(filepath)
            text = "\n".join([para.text for para in doc.paragraphs])
            print(".docx loaded")
            
        else:  # .txt, .md
            with open(filepath, 'r', encoding='utf-8') as f:
                text = f.read()
                print(".xtx loaded")
                
        return text

    @staticmethod
    def chunk_text(text, chunk_size=1000):
        words = text.split()
        chunks = [' '.join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)]
        return chunks