import requests
import time
import os
import hashlib

MELO_URL = "http://localhost:5053"
XTTS_URL = "http://localhost:5052"

TEST_TEXTS = [
    "Xin chào VN, hôm nay là 20/10, nhiệt độ là 30%. Tôi đang dùng AI để test hệ thống.",
    "TP.HCM có 100k người tham gia sự kiện. SĐT của tôi là 0987654321.",
    "Hệ thống TTS này chạy rất nhanh, khoảng 0.5s cho một câu dài 100 ký tự."
]

def test_melo():
    print("\n--- Testing MeloTTS Studio ---")
    for i, text in enumerate(TEST_TEXTS):
        start = time.time()
        try:
            resp = requests.post(f"{MELO_URL}/tts", json={
                "text": text,
                "speaker_id": 0,
                "speed": 1.0
            }, timeout=30)
            
            elapsed = time.time() - start
            if resp.status_code == 200:
                size = len(resp.content)
                print(f"[SUCCESS] Segment {i+1}: '{text[:30]}...' -> {elapsed:.2f}s | Size: {size/1024:.1f} KB")
            else:
                print(f"[FAILED] Segment {i+1}: {resp.text}")
        except Exception as e:
            print(f"[ERROR] Connection error: {e}")

def check_health():
    try:
        resp = requests.get(f"{MELO_URL}/health", timeout=5)
        if resp.status_code == 200:
            m_health = resp.json()
            print(f"Melo Status: {m_health['status']} | Device: {m_health.get('device')}")
        else:
            print(f"Melo Error: {resp.status_code}")
    except:
        print("Melo is offline (Wait for startup).")

if __name__ == "__main__":
    print("Starting AI Voice Optimization Test...")
    check_health()
    test_melo()
