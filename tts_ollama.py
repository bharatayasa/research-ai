import ollama
import json
import sys
import time
import os
from vosk import Model, KaldiRecognizer
import pyaudio
from colorama import Fore, Style, init
import torch

# Inisialisasi
init(autoreset=True)
os.environ["OLLAMA_KEEP_ALIVE"] = "5m"  # Pertahankan model di memory

# Konfigurasi
MODEL_NAME = "vosk-model-en-us-0.42-gigaspeech"
SAMPLE_RATE = 16000
BUFFER_SIZE = 2048
OLLAMA_MODEL = "aratan/deepseek-r1:latest"  # Gunakan versi quantized

# Cek GPU dengan detail
def check_gpu():
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(Fore.GREEN + f"✅ GPU Active: {gpu_name} ({vram:.1f}GB VRAM)" + Style.RESET_ALL)
        
        # Bersihkan VRAM sebelum memulai
        torch.cuda.empty_cache()
        return True
    
    print(Fore.YELLOW + "⚠️ Running on CPU (GPU not detected)" + Style.RESET_ALL)
    return False

# Load model Vosk
print(Fore.CYAN + "⏳ Loading speech recognition model..." + Style.RESET_ALL)
model = Model(MODEL_NAME)
recognizer = KaldiRecognizer(model, SAMPLE_RATE)

# Pre-load Ollama model
print(Fore.CYAN + "🔥 Pre-loading LLM (first run may be slower)..." + Style.RESET_ALL)
check_gpu()
ollama.chat(model=OLLAMA_MODEL, messages=[], options={
    'num_gpu': 1,
    'gpu_layers': 15,  # Optimal untuk 4GB VRAM
    'num_ctx': 1024    # Context window lebih kecil
})

def slow_print(text, color=Fore.YELLOW, delay=0.02):
    for char in text:
        sys.stdout.write(color + char)
        sys.stdout.flush()
        time.sleep(delay)
    print(Style.RESET_ALL)

def listen_and_transcribe():
    """Realtime microphone transcription"""
    mic = pyaudio.PyAudio()
    stream = mic.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=SAMPLE_RATE,
        input=True,
        frames_per_buffer=BUFFER_SIZE
    )

    print(Fore.BLUE + "\n🎤 Speak now (say 'stop' to exit)...\n" + Style.RESET_ALL)
    stream.start_stream()

    full_text = ""
    while True:
        data = stream.read(BUFFER_SIZE, exception_on_overflow=False)
        
        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())["text"]
            if result:
                print(Fore.GREEN + f"\r🗣 You said: {result}" + " "*50 + Style.RESET_ALL)
                full_text += result + " "
                stream.stop_stream()
                stream.close()
                mic.terminate()
                return full_text.strip()
        else:
            partial = json.loads(recognizer.PartialResult())["partial"]
            print(Fore.CYAN + f"\r🔍 Listening: {partial}" + " "*50, end="", flush=True)

def ask_ollama(prompt):
    """Optimized GPU inference"""
    start_time = time.time()
    
    response = ollama.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "user", "content": prompt}],
        options={
            'num_gpu': 1,
            'gpu_layers': 15,
            'num_ctx': 1024,
            'temperature': 0.7,
            'repeat_penalty': 1.1
        }
    )
    
    elapsed = time.time() - start_time
    print(Fore.MAGENTA + f"\n⏱ Response time: {elapsed:.2f}s" + Style.RESET_ALL)
    return response["message"]["content"]

# Main Execution
if __name__ == "__main__":
    try:
        # Context persistence
        conversation_history = []
        
        while True:
            user_input = listen_and_transcribe().strip().lower()
            
            if user_input in ["stop", "berhenti", "exit"]:
                print(Fore.RED + "\n🛑 Session ended" + Style.RESET_ALL)
                break
                
            print("\n" + Fore.YELLOW + "🤖 Processing..." + Style.RESET_ALL)
            
            # Add to conversation context
            conversation_history.append({"role": "user", "content": user_input})
            
            # Get response
            response = ask_ollama(user_input)
            
            # Update context
            conversation_history.append({"role": "assistant", "content": response})
            
            # Stream output
            slow_print(f"💡 AI: {response}", Fore.GREEN)
            
    except KeyboardInterrupt:
        print(Fore.RED + "\n🚨 Interrupted by user" + Style.RESET_ALL)
    except Exception as e:
        print(Fore.RED + f"\n❌ Error: {str(e)}" + Style.RESET_ALL)
    finally:
        # Cleanup
        torch.cuda.empty_cache()
        