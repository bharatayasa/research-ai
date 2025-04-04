# utils/audio_utils.py
import json
import pyaudio
from vosk import Model, KaldiRecognizer
from config import MODEL_NAME, SAMPLE_RATE, BUFFER_SIZE

# Load model Vosk
model = Model(MODEL_NAME)
recognizer = KaldiRecognizer(model, SAMPLE_RATE)

def initialize_audio():
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
    return mic, stream

async def transcribe_audio(websocket):
    mic, stream = initialize_audio()
    full_text = ""
    silence_counter = 0
    last_partial = ""
    
    try:
        stream.start_stream()
        
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