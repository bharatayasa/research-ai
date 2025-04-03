import asyncio
import websockets
import json
import ollama
import torch
from vosk import Model, KaldiRecognizer
import pyaudio
from colorama import Fore, Style, init
import os
import time
from datetime import datetime
import gc
from tts_ollama import slow_print

# Inisialisasi
init(autoreset=True)
os.environ["OLLAMA_KEEP_ALIVE"] = "5m"

# Konfigurasi
MODEL_NAME = "vosk-model-en-us-0.42-gigaspeech"
SAMPLE_RATE = 16000
BUFFER_SIZE = 2048
# OLLAMA_MODEL = "mistral:latest"
# OLLAMA_MODEL = "deepseek-r1:14b"
OLLAMA_MODEL = "phi4:latest"
WS_PORT = 8765

# Load model Vosk
print(Fore.CYAN + "⏳ Loading speech recognition model..." + Style.RESET_ALL)
model = Model(MODEL_NAME)
recognizer = KaldiRecognizer(model, SAMPLE_RATE)

# Pre-load Ollama model
print(Fore.CYAN + "🔥 Pre-loading LLM with test inference..." + Style.RESET_ALL)
try:
    test_response = ollama.generate(model=OLLAMA_MODEL, prompt="Test")
    print(Fore.GREEN + f"✅ Model loaded successfully. Test response: {test_response['response'][:50]}..." + Style.RESET_ALL)
except Exception as e:
    print(Fore.RED + f"❌ Model loading failed: {str(e)}" + Style.RESET_ALL)
    raise

def get_current_time():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

def check_gpu():
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(Fore.GREEN + f"✅ GPU Active: {gpu_name} ({vram:.1f}GB VRAM)" + Style.RESET_ALL)
        torch.cuda.empty_cache()
        return True
    print(Fore.YELLOW + "⚠️ Running on CPU (GPU not detected)" + Style.RESET_ALL)
    return False

async def transcribe_audio(websocket):
    mic = pyaudio.PyAudio()
    stream = mic.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=BUFFER_SIZE,
        input_device_index=None,
        start=False
    )

    try:
        stream.start_stream()
        full_text = ""
        silence_counter = 0
        last_partial = ""
        
        while True:
            try:
                data = stream.read(BUFFER_SIZE, exception_on_overflow=False)
                
                if recognizer.AcceptWaveform(data):
                    result = json.loads(recognizer.Result()).get("text", "")
                    if result:
                        full_text += result + " "
                        await websocket.send(json.dumps({
                            "type": "transcription", 
                            "text": result,
                            "full_text": full_text.strip()
                        }))
                        silence_counter = 0
                        
                        if any(stop_word in result.lower() for stop_word in ["stop", "exit", "berhenti"]):
                            break
                else:
                    partial = json.loads(recognizer.PartialResult()).get("partial", "")
                    if partial and partial != last_partial:
                        await websocket.send(json.dumps({
                            "type": "partial_transcription",
                            "text": partial
                        }))
                        last_partial = partial
                        silence_counter = 0
                    else:
                        silence_counter += 1
                        
                if silence_counter > 25:
                    break
                    
            except IOError as e:
                if e.errno == pyaudio.paInputOverflowed:
                    continue
                raise
                
    finally:
        stream.stop_stream()
        stream.close()
        mic.terminate()
    return full_text.strip()

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

async def handle_connection(websocket, path=None):
    client_ip = websocket.remote_address[0]
    client_port = websocket.remote_address[1]
    
    try:
        print(Fore.GREEN + f"[{get_current_time()}] 🟢 Client connected - IP: {client_ip}:{client_port}" + Style.RESET_ALL)
        await websocket.send(json.dumps({
            "type": "status",
            "message": "Connected to AI assistant server"
        }))
        
        conversation_history = []
        
        while True:
            message = await asyncio.wait_for(websocket.recv(), timeout=300)
            print(Fore.CYAN + f"[{get_current_time()}] 📥 Received message from {client_ip}:{client_port}" + Style.RESET_ALL)
            
            data = json.loads(message)
            print(f"Received data: {data}")

            if data['action'] == 'start_listening':
                await websocket.send(json.dumps({
                    "type": "status",
                    "message": "Starting voice recognition..."
                }))
                user_input = await transcribe_audio(websocket)

                print(f"Audio input: {user_input}")

                if user_input.lower() in ["stop", "berhenti", "exit"]:
                    await websocket.send(json.dumps({
                        "type": "status",
                        "message": "🛑 Session ended"
                    }))
                    break
                
                conversation_history.append({"role": "user", "content": user_input})
                ai_response = await generate_response(user_input, websocket)
                print (slow_print(f"AI Response: {ai_response}", Fore.GREEN))

            elif data['action'] == 'send_text':
                user_input = data['text'].strip()
                if not user_input:
                    await websocket.send(json.dumps({
                        "type": "error",
                        "message": "Empty text input"
                    }))
                    continue
                
                conversation_history.append({"role": "user", "content": user_input})
                ai_response = await generate_response(user_input, websocket)
                print(f"AI Response: {ai_response}")
                
            elif data['action'] == 'exit':
                break
                
    except websockets.exceptions.ConnectionClosed:
        print(Fore.YELLOW + f"[{get_current_time()}] 🔴 Client disconnected - IP: {client_ip}:{client_port}" + Style.RESET_ALL)
    except asyncio.TimeoutError:
        print(Fore.RED + f"[{get_current_time()}] ⏰ Connection timeout - IP: {client_ip}:{client_port}" + Style.RESET_ALL)
    except Exception as e:
        print(Fore.RED + f"[{get_current_time()}] ❌ Error: {str(e)}" + Style.RESET_ALL)
        await websocket.send(json.dumps({
            "type": "error",
            "message": f"Server Error: {str(e)}"
        }))
    finally:
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        gc.collect()
        print(Fore.YELLOW + f"[{get_current_time()}] ⚠️ Connection closed - IP: {client_ip}:{client_port}" + Style.RESET_ALL)

async def main():
    check_gpu()
    print(Fore.GREEN + f"[{get_current_time()}] 🚀 WebSocket server running on ws://localhost:{WS_PORT}" + Style.RESET_ALL)
    async with websockets.serve(
        handle_connection,
        "0.0.0.0",
        WS_PORT,
        ping_interval=30,
        ping_timeout=90,
        close_timeout=10,
        max_size=2**24  # 16MB
    ):
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())