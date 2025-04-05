from rag.vector_db import VectorDB

class Retriever:
    def __init__(self):
        self.vector_db = VectorDB()
    
    def retrieve(self, query: str, k: int = 3):
        query_embedding = self.vector_db.embed_text(query)
        results = self.vector_db.collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
        return results["documents"][0]