# utils/general_utils.py
from colorama import Fore, Style
from datetime import datetime
import torch

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