# rag/vector_db.py
from chromadb import PersistentClient
import ollama
from config import RAG_CONFIG
import uuid

class VectorDB:
    def __init__(self):
        self.client = PersistentClient(path=RAG_CONFIG["VECTOR_DB_PATH"])
        self.collection = self.client.get_or_create_collection("rag_docs")
    
    def embed_text(self, text: str):
        """Generate text embeddings using Ollama"""
        try:
            response = ollama.embeddings(
                model=RAG_CONFIG["EMBEDDING_MODEL"],
                prompt=text
            )
            return response["embedding"]
        except Exception as e:
            raise RuntimeError(f"Embedding generation failed: {str(e)}")
    
    def add_document(self, text: str, metadata: dict = None):
        """Add document to vector database"""
        embedding = self.embed_text(text)
        doc_id = str(uuid.uuid4())
        self.collection.add(
            ids=[doc_id],
            embeddings=[embedding],
            documents=[text],
            metadatas=[metadata] if metadata else None
        )
        return doc_id
    
    def query(self, text: str, top_k: int = 3):
        """Query similar documents"""
        query_embedding = self.embed_text(text)
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        return results