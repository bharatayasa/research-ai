# utils/llm_utils.py
import json
import time
import ollama
from config import OLLAMA_MODEL, RAG_CONFIG
import asyncio
from colorama import Fore, Style, init
from rag.retriever import Retriever

retriever = Retriever()

def preload_llm_model():
    print(Fore.CYAN + "🔥 Pre-loading LLM with test inference..." + Style.RESET_ALL)
    try:
        test_response = ollama.generate(model=OLLAMA_MODEL, prompt="Test")
        print(Fore.GREEN + f"✅ Model loaded successfully. Test response: {test_response['response'][:50]}..." + Style.RESET_ALL)
        return True
    except Exception as e:
        print(Fore.RED + f"❌ Model loading failed: {str(e)}" + Style.RESET_ALL)
        raise

def embed_text(self, text: str):
    """Generate embeddings using Ollama"""
    try:
        response = ollama.embeddings(
            model=RAG_CONFIG["EMBEDDING_MODEL"],
            prompt=text
        )
        print(response)
        return response["embedding"]
    except Exception as e:
        raise RuntimeError(f"Embedding generation failed: {str(e)}")

async def generate_response(prompt, websocket, conversation_history=None):
    try:
        # Prepare messages
        messages = []
        
        # Add conversation history if exists
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add RAG context
        relevant_chunks = retriever.retrieve(prompt)
        if relevant_chunks:
            messages.append({
                "role": "system",
                "content": f"Context:\n{'\n'.join(relevant_chunks)}"
            })
        
        # Add current prompt
        messages.append({"role": "user", "content": prompt})

        await websocket.send(json.dumps({"type": "status", "message": "🤖 Processing..."}))

        # Stream response
        full_response = ""
        stream = ollama.chat(
            # model=OLLAMA_MODEL,
            model=RAG_CONFIG["LLM_MODEL"],  # Gunakan model dari RAG_CONFIG
            messages=messages,
            stream=True
        )

        for chunk in stream:
            content = chunk['message']['content']
            full_response += content
            
            await websocket.send(json.dumps({
                "type": "response_chunk",
                "text": content,
                "complete": False
            }))
            await asyncio.sleep(0.05)

        await websocket.send(json.dumps({
            "type": "response_complete",
            "text": full_response,
            "complete": True
        }))

        return full_response

    except Exception as e:
        await websocket.send(json.dumps({
            "type": "error",
            "message": f"Generation Error: {str(e)}"
        }))
        raise