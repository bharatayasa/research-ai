# utils/llm_utils.py
import json
import time
import ollama
from config import OLLAMA_MODEL
import asyncio
from colorama import Fore, Style, init

def preload_llm_model():
    print(Fore.CYAN + "🔥 Pre-loading LLM with test inference..." + Style.RESET_ALL)
    try:
        test_response = ollama.generate(model=OLLAMA_MODEL, prompt="Test")
        print(Fore.GREEN + f"✅ Model loaded successfully. Test response: {test_response['response'][:50]}..." + Style.RESET_ALL)
        return True
    except Exception as e:
        print(Fore.RED + f"❌ Model loading failed: {str(e)}" + Style.RESET_ALL)
        raise

async def generate_response(prompt, websocket):
    try:
        if not prompt or len(prompt.strip()) == 0:
            await websocket.send(json.dumps({
                "type": "error",
                "message": "Empty prompt received"
            }))
            return ""

        await websocket.send(json.dumps({"type": "status", "message": "🤖 Processing..."}))
        
        start_time = time.time()
        full_response = ""
        chunk_delay = 0.05 
        
        try:
            stream = ollama.chat(
                model=OLLAMA_MODEL,
                messages=[{"role": "user", "content": prompt}],
                stream=True
            )
            
            for chunk in stream:
                if time.time() - start_time > 240:
                    raise TimeoutError("LLM response timeout")
                
                content = chunk['message']['content']
                full_response += content
                
                for word in content:
                    await websocket.send(json.dumps({
                        "type": "response_chunk",
                        "text": word,
                        "complete": False
                    }))
                    await asyncio.sleep(chunk_delay)

        except ollama.ResponseError as e:
            await websocket.send(json.dumps({
                "type": "error",
                "message": f"LLM Error: {e.error}"
            }))
            raise
        
        await websocket.send(json.dumps({
            "type": "response_complete",
            "text": full_response,
            "complete": True
        }))
        
        elapsed = time.time() - start_time
        await websocket.send(json.dumps({
            "type": "status",
            "message": f"⏱ Response time: {elapsed:.2f}s"
        }))
        
        return full_response
        
    except Exception as e:
        await websocket.send(json.dumps({
            "type": "error",
            "message": f"Generation Error: {str(e)}"
        }))
        raise