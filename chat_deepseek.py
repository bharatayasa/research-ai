import ollama
import sys
import time
from colorama import Fore, Style, init

# Inisialisasi colorama untuk Windows
init(autoreset=True)

def slow_print(text, color=Fore.WHITE, delay=0.02):
    for char in text:
        sys.stdout.write(color + char)
        sys.stdout.flush()
        time.sleep(delay)
    print(Style.RESET_ALL)  # Reset warna setelah teks selesai

def chat_with_model():
    while True:
        user_input = input(Fore.CYAN + "\nAnda: " + Style.RESET_ALL)
        if user_input.lower() in ["exit", "keluar"]:
            break
        
        response = ollama.chat(
            model="deepseek-r1:14b",
            messages=[{"role": "user", "content": user_input}]
        )
        
        print(Fore.YELLOW + "\nAI: ", end="")
        slow_print(response["message"]["content"], color=Fore.GREEN)

if __name__ == "__main__":
    chat_with_model()
