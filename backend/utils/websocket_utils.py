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
from rag.vector_db import VectorDB  # Import at top level

class ConnectionHandler:
    def __init__(self):
        self.vector_db = VectorDB()  # Initialize once

    async def handle_connection(self, websocket, path=None):
        client_ip = websocket.remote_address[0]
        client_port = websocket.remote_address[1]
        conversation_history = []
        
        try:
            await self._send_connection_message(websocket, client_ip, client_port)
            
            while True:
                message = await asyncio.wait_for(websocket.recv(), timeout=400)
                await self._log_received_message(client_ip, client_port, message)
                
                try:
                    data = json.loads(message)
                    await self._process_message(data, websocket, conversation_history)
                except json.JSONDecodeError:
                    await self._send_error(websocket, "Invalid JSON format")
                    continue

        except websockets.exceptions.ConnectionClosed:
            await self._handle_disconnection(client_ip, client_port, "Client disconnected")
        except asyncio.TimeoutError:
            await self._handle_disconnection(client_ip, client_port, "Connection timeout")
        except Exception as e:
            await self._handle_error(websocket, client_ip, client_port, e)
        finally:
            await self._cleanup_resources(client_ip, client_port)

            handler = ConnectionHandler()
            return handler.handle_connection

    async def _process_message(self, data, websocket, conversation_history):
        """Route messages to appropriate handlers"""
        action_handlers = {
            'start_listening': self._handle_listening,
            'send_text': self._handle_text,
            'upload_file': self._handle_file_upload,
            'exit': lambda *args: None  # No-op for exit
        }
        
        handler = action_handlers.get(data.get('action'))
        if not handler:
            await self._send_error(websocket, "Invalid action specified")
            return
            
        await handler(data, websocket, conversation_history)

    async def _handle_listening(self, data, websocket, conversation_history):
        """Handle voice input"""
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
            return True  # Signal to break loop
        
        conversation_history.append({"role": "user", "content": user_input})
        ai_response = await generate_response(\
            user_input, 
            websocket, 
            conversation_history
        )
        print(f"AI Response: {ai_response}")
        return False

    async def _handle_text(self, data, websocket, conversation_history):
        """Handle text input"""
        user_input = data['text'].strip()
        if not user_input:
            await self._send_error(websocket, "Empty text input")
            return
            
        conversation_history.append({"role": "user", "content": user_input})
        ai_response = await generate_response(
            user_input, 
            websocket, 
            conversation_history
        )
        print(f"AI Response: {ai_response}")

    async def _handle_file_upload(self, data, websocket, conversation_history):
        """Handle file upload for RAG"""
        try:
            if 'file_data' not in data or 'filename' not in data:
                raise ValueError("Missing file data or filename")
                
            file_bytes = bytes(data['file_data'])
            filename = data['filename']
            
            chunk_count = self.vector_db.add_document(file_bytes, filename)
            
            await websocket.send(json.dumps({
                "type": "file_uploaded",
                "message": f"File processed into {chunk_count} chunks",
                "filename": filename,
                "status": "success"
            }))
        except Exception as e:
            await self._send_error(websocket, f"File processing failed: {str(e)}")

    # Helper methods
    async def _send_connection_message(self, websocket, ip, port):
        """Send initial connection message"""
        print(Fore.GREEN + f"[{get_current_time()}] 🟢 Client connected - IP: {ip}:{port}" + Style.RESET_ALL)
        await websocket.send(json.dumps({
            "type": "status",
            "message": "Connected to AI assistant server",
            "status": "connected"
        }))

    async def _log_received_message(self, ip, port, message):
        """Log incoming messages"""
        print(Fore.CYAN + f"[{get_current_time()}] 📥 Received message from {ip}:{port}" + Style.RESET_ALL)
        print(f"Raw message: {message[:200]}...")  # Log truncated message

    async def _send_error(self, websocket, message):
        """Send error message to client"""
        await websocket.send(json.dumps({
            "type": "error",
            "message": message,
            "status": "error"
        }))

    async def _handle_disconnection(self, ip, port, reason):
        """Handle clean disconnection"""
        print(Fore.YELLOW + f"[{get_current_time()}] 🔴 {reason} - IP: {ip}:{port}" + Style.RESET_ALL)

    async def _handle_error(self, websocket, ip, port, error):
        """Handle unexpected errors"""
        print(Fore.RED + f"[{get_current_time()}] ❌ Error: {str(error)}" + Style.RESET_ALL)
        await self._send_error(websocket, f"Server Error: {str(error)}")

    async def _cleanup_resources(self, ip, port):
        """Clean up GPU and other resources"""
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect()
        gc.collect()
        print(Fore.YELLOW + f"[{get_current_time()}] ⚠️ Connection closed - IP: {ip}:{port}" + Style.RESET_ALL)

# Factory function for easy usage
def get_connection_handler():
    return ConnectionHandler().handle_connection