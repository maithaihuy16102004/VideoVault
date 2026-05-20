import os
import shutil

def main():
    base_dir = r"d:\Work"
    print("=== BAT DAU DON DEP THU MUC GOC VIDEOVAULT ===")

    # Helper de xoa thu muc neu ton tai
    def delete_dir(dir_name):
        dir_path = os.path.join(base_dir, dir_name)
        if os.path.exists(dir_path):
            try:
                shutil.rmtree(dir_path)
                print(f"[CLEANED] Da xoa thu muc: {dir_name}")
            except Exception as e:
                print(f"[ERROR] Khong the xoa thu muc {dir_name}: {e}")
        else:
            print(f"[INFO] Thu muc khong ton tai: {dir_name}")

    # Helper de xoa file neu ton tai
    def delete_file(file_name):
        file_path = os.path.join(base_dir, file_name)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
                print(f"[CLEANED] Da xoa file: {file_name}")
            except Exception as e:
                print(f"[ERROR] Khong the xoa file {file_name}: {e}")
        else:
            print(f"[INFO] File khong ton tai: {file_name}")

    # 1. Di chuyen video trong capcut sang scratch
    capcut_video = os.path.join(base_dir, "capcut", "0517.mp4")
    scratch_dir = os.path.join(base_dir, "scratch")
    if os.path.exists(capcut_video):
        os.makedirs(scratch_dir, exist_ok=True)
        try:
            shutil.move(capcut_video, os.path.join(scratch_dir, "0517.mp4"))
            print("[SUCCESS] Da di chuyen 0517.mp4 vao scratch/")
        except Exception as e:
            print(f"[ERROR] Khong the di chuyen 0517.mp4: {e}")

    # 2. Xoa cac thu muc tam du thua o root
    delete_dir("capcut")
    delete_dir("temp_audio")
    delete_dir("temp_stt")
    delete_dir("temp_tts")
    delete_dir("outputs")
    delete_dir("__pycache__")

    # 3. Xoa pyproject.toml cu o root
    delete_file("pyproject.toml")

    # 4. Ghi file requirements.txt hop nhat moi
    req_content = """# ==============================================================================
# VideoVault Unified Python Requirements
# Enterprise-grade AI & Media processing stack
# ==============================================================================

# --- Core Video Downloader & Scraper ---
selenium>=4.0.0
yt-dlp>=2023.12.0
requests>=2.31.0

# --- Subtitle Service (Whisper STT - Port 5050) ---
faster-whisper>=1.0.0
flask>=3.0.0
flask-cors>=4.0.0
imageio-ffmpeg>=0.4.9

# --- Voice Gateway Service (Edge TTS - Port 5051) ---
edge-tts>=6.1.8
"""
    
    try:
        with open(os.path.join(base_dir, "requirements.txt"), "w", encoding="utf-8") as f:
            f.write(req_content)
        print("[SUCCESS] Da cap nhat requirements.txt hop nhat!")
    except Exception as e:
        print(f"[ERROR] Khong the ghi requirements.txt: {e}")

    print("=== HOAN THANH DON DEP HE THONG FILE ===")

if __name__ == "__main__":
    main()
