# Cek di Python
import torch
print(torch.cuda.is_available())  # Harus True
print(torch.version.cuda)  # Harus menampilkan versi CUDA
import torch

print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"CUDA version: {torch.version.cuda}")