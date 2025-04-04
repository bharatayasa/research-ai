# utils/websocket_utils.py
import json
import asyncio
import websockets
from colorama import Fore, Style
from datetime import datetime
import torch
import gc
from .audio_utils import transcribe_audio
from .llm_utils import generate_response
from .general_utils import get_current_time

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
            message = await asyncio.wait_for(websocket.recv(), timeout=400)
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
                print(f"AI Response: {ai_response}")

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