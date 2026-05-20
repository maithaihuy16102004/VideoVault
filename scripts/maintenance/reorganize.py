import os
import shutil
import sys

def main():
    base_dir = r"d:\Work"
    print("=== BAT DAU TOI UU HOA CAU TRUC DU AN VIDEOVAULT ===")

    # 1. Cac duong dan thu muc can tao
    services_dir = os.path.join(base_dir, "services")
    sub_service_dir = os.path.join(services_dir, "subtitle_service")
    voice_service_dir = os.path.join(services_dir, "voice_service")
    dl_service_dir = os.path.join(services_dir, "video_downloader")
    
    dirs_to_create = [services_dir, sub_service_dir, voice_service_dir, dl_service_dir]
    
    for d in dirs_to_create:
        if not os.path.exists(d):
            os.makedirs(d)
            print(f"[OK] Da tao thu muc: {d}")
        else:
            print(f"[INFO] Thu muc da ton tai: {d}")

    # Helper function de di chuyen file an toan
    def move_file(src, dst):
        src_path = os.path.join(base_dir, src)
        dst_path = os.path.join(base_dir, dst)
        if os.path.exists(src_path):
            # Dam bao thu muc cha cua dst ton tai
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            try:
                shutil.move(src_path, dst_path)
                print(f"[SUCCESS] Da di chuyen: {src} -> {dst}")
            except Exception as e:
                print(f"[ERROR] Khong the di chuyen {src}: {e}")
        else:
            print(f"[WARN] File nguon khong ton tai (co the da di chuyen): {src}")

    # Helper de di chuyen thu muc an toan
    def move_dir(src, dst):
        src_path = os.path.join(base_dir, src)
        dst_path = os.path.join(base_dir, dst)
        if os.path.exists(src_path) and os.path.isdir(src_path):
            # Dam bao thu muc cha cua dst ton tai
            os.makedirs(os.path.dirname(dst_path), exist_ok=True)
            try:
                if os.path.exists(dst_path):
                    # Neu da ton tai thu muc dich, xoa truoc khi move hoac gop
                    shutil.rmtree(dst_path)
                shutil.move(src_path, dst_path)
                print(f"[SUCCESS] Da di chuyen thu muc: {src} -> {dst}")
            except Exception as e:
                print(f"[ERROR] Khong the di chuyen thu muc {src}: {e}")
        else:
            print(f"[WARN] Thu muc nguon khong ton tai: {src}")

    # 2. Di chuyen cac file ve subtitle_service
    move_file("subtitle_service.py", "services/subtitle_service/subtitle_service.py")
    move_file("subtitle_extractor.py", "services/subtitle_service/subtitle_extractor.py")

    # 3. Di chuyen file ve voice_service
    move_file("voice_service.py", "services/voice_service/voice_service.py")

    # 4. Di chuyen thu muc vieneu_tts_service
    move_dir("vieneu_tts_service", "services/vieneu_tts_service")

    # 5. Di chuyen cac file tai video ve video_downloader
    move_file("video_downloader.py", "services/video_downloader/video_downloader.py")
    move_file("downloader.py", "services/video_downloader/downloader.py")
    move_file("main.py", "services/video_downloader/main.py")
    move_file("selenium_driver.py", "services/video_downloader/selenium_driver.py")
    move_file("utils.py", "services/video_downloader/utils.py")

    # 6. Di chuyen bo test ve video_downloader/tests
    move_dir("tests", "services/video_downloader/tests")

    # 7. Di chuyen file test va rac vao scratch/
    move_file("test_analyze.py", "scratch/test_analyze.py")
    move_file("test_vieneu.wav", "scratch/test_vieneu.wav")

    # 8. Xoa thu muc nham -p
    p_dir = os.path.join(base_dir, "-p")
    if os.path.exists(p_dir):
        try:
            if os.path.isdir(p_dir):
                os.rmdir(p_dir) # or shutil.rmtree if not empty
                print("[SUCCESS] Da xoa thu muc nham '-p'")
        except Exception as e:
            print(f"[ERROR] Khong the xoa thu muc '-p': {e}")

    print("=== HOAN THANH DI CHUYEN FILE ===")

if __name__ == "__main__":
    main()
