# main.py
import asyncio
import websockets
from colorama import init
from config import WS_PORT
from utils.general_utils import check_gpu, get_current_time
from utils.llm_utils import preload_llm_model
# from utils.websocket_utils import handle_connection
from utils.websocket_utils import get_connection_handler

# Initialize colorama
init(autoreset=True)

async def main():
    check_gpu()
    preload_llm_model()
    
    print(f"[{get_current_time()}] 🚀 WebSocket server running on ws://localhost:{WS_PORT}")
    async with websockets.serve(
        get_connection_handler(),
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