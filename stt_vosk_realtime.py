import os
from vosk import Model, KaldiRecognizer
import pyaudio
import json
import chat_deepseek
import ollama

MODEL_NAME = "vosk-model-en-us-0.42-gigaspeech"
SAMPLE_RATE = 16000

base_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_dir, MODEL_NAME)

if not os.path.exists(model_path):
    print(f"[ERROR] Model not found at: {model_path}")
    print("Please ensure:")
    print(f"1. Folder '{MODEL_NAME}' exists in the same directory as this script")
    print("2. It contains the complete model files (am/, conf/, graph/, etc.)")
    print("3. The folder is properly extracted from the ZIP file")
    exit(1)

try:
    model = Model(model_path)
    recognizer = KaldiRecognizer(model, SAMPLE_RATE)
    
    mic = pyaudio.PyAudio()
    stream = mic.open(
        rate=SAMPLE_RATE,
        channels=1,
        format=pyaudio.paInt16,
        input=True,
        frames_per_buffer=2048  # Buffer lebih kecil agar lebih responsif
    )

    print("Speak now (press Ctrl+C to stop)...")

    while True:
        data = stream.read(2048, exception_on_overflow=False)

        if recognizer.AcceptWaveform(data):
            result = json.loads(recognizer.Result())
            print(f"\nFinal: {result.get('text', '')}")  # Output kalimat lengkap

        else:
            partial = json.loads(recognizer.PartialResult())
            print(f"\rLive: {partial.get('partial', '')}", end="", flush=True)  # Tampilkan teks real-time
            # pemanggilan model deep seek 

except Exception as e:
    print(f"Error: {str(e)}")
    print("Possible solutions:")
    print("- Reinstall pyaudio: pip install pyaudio")
    print("- Try a different microphone")
    print("- Use a smaller model")
