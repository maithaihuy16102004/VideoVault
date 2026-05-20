"""
=================================================================
🧪 TEST SCRIPT: So sánh tải video Douyin qua 4 gói Subscription
=================================================================
Script này mô phỏng 4 user thuộc 4 gói khác nhau (Free, Starter, Pro, Business)
và tải cùng 1 video Douyin để so sánh chất lượng & dung lượng file.
"""
import sys, os, time, shutil, subprocess, json

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from video_downloader import download_video

# ── CONFIG ──
TEST_URL = "https://v.douyin.com/KlekxGdUpig/"
PLANS = [
    {"name": "Free",     "quality": "720p",     "color": "🟢"},
    {"name": "Starter",  "quality": "1080p",    "color": "🔵"},
    {"name": "Pro",      "quality": "4K",       "color": "🟣"},
    {"name": "Business", "quality": "Original", "color": "🟡"},
]
RESULTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "plan_comparison")

def get_video_info(filepath):
    """Dùng ffprobe để lấy resolution và bitrate thực tế của file"""
    try:
        cmd = [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_streams", "-show_format", filepath
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        data = json.loads(result.stdout)
        
        for stream in data.get("streams", []):
            if stream.get("codec_type") == "video":
                w = stream.get("width", "?")
                h = stream.get("height", "?")
                bitrate = stream.get("bit_rate", data.get("format", {}).get("bit_rate", "?"))
                codec = stream.get("codec_name", "?")
                duration = float(data.get("format", {}).get("duration", 0))
                return {
                    "width": w, "height": h,
                    "bitrate_kbps": int(int(bitrate) / 1000) if str(bitrate).isdigit() else "?",
                    "codec": codec,
                    "duration_s": round(duration, 1)
                }
    except Exception as e:
        print(f"   ⚠️ ffprobe không khả dụng: {e}")
    return None

def test_plan(plan):
    """Tải video cho 1 gói cụ thể"""
    plan_dir = os.path.join(RESULTS_DIR, plan["name"].lower())
    
    # Xóa sạch thư mục Downloads cũ để test
    dl_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "Downloads")
    if os.path.exists(dl_dir):
        for f in os.listdir(dl_dir):
            try: os.remove(os.path.join(dl_dir, f))
            except: pass
    
    print(f"\n{'='*60}")
    print(f"{plan['color']} GÓI {plan['name'].upper()} — Giới hạn: {plan['quality']}")
    print(f"{'='*60}")
    
    start = time.time()
    download_video(TEST_URL, plan["quality"])
    elapsed = round(time.time() - start, 1)
    
    # Tìm file vừa tải
    if not os.path.exists(dl_dir):
        return {"plan": plan["name"], "error": "No Downloads dir"}
    
    files = [f for f in os.listdir(dl_dir) if os.path.isfile(os.path.join(dl_dir, f))]
    if not files:
        return {"plan": plan["name"], "error": "No file downloaded"}
    
    filepath = os.path.join(dl_dir, files[0])
    size_mb = round(os.path.getsize(filepath) / (1024 * 1024), 2)
    
    # Copy file sang thư mục so sánh
    os.makedirs(plan_dir, exist_ok=True)
    dest = os.path.join(plan_dir, f"{plan['name'].lower()}_{plan['quality']}_{files[0]}")
    shutil.copy2(filepath, dest)
    
    # Lấy thông tin video thực tế
    info = get_video_info(filepath)
    
    result = {
        "plan": plan["name"],
        "quality_cap": plan["quality"],
        "file": files[0],
        "size_mb": size_mb,
        "time_s": elapsed,
        "saved_to": dest,
    }
    if info:
        result["actual_resolution"] = f"{info['width']}x{info['height']}"
        result["bitrate_kbps"] = info["bitrate_kbps"]
        result["codec"] = info["codec"]
        result["duration_s"] = info["duration_s"]
    
    return result


def main():
    print("🧪 BẮT ĐẦU TEST SO SÁNH CHẤT LƯỢNG THEO GÓI SUBSCRIPTION")
    print(f"🔗 Video test: {TEST_URL}")
    print(f"📂 Kết quả lưu tại: {RESULTS_DIR}\n")
    
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results = []
    
    for plan in PLANS:
        try:
            r = test_plan(plan)
            results.append(r)
        except Exception as e:
            results.append({"plan": plan["name"], "error": str(e)})
    
    # ── IN BẢNG SO SÁNH ──
    print("\n\n" + "=" * 80)
    print("📊 BẢNG SO SÁNH KẾT QUẢ TẢI VIDEO THEO GÓI SUBSCRIPTION")
    print("=" * 80)
    print(f"{'Gói':<12} {'Giới hạn':<10} {'Resolution thực':<16} {'Dung lượng':<12} {'Bitrate':<10} {'Codec':<8} {'Thời gian':<10}")
    print("-" * 80)
    
    for r in results:
        if "error" in r:
            print(f"{r['plan']:<12} {'ERROR':<10} {r['error']}")
        else:
            res = r.get('actual_resolution', '?')
            size = f"{r['size_mb']} MB"
            br = f"{r.get('bitrate_kbps', '?')} kbps"
            codec = r.get('codec', '?')
            t = f"{r['time_s']}s"
            print(f"{r['plan']:<12} {r['quality_cap']:<10} {res:<16} {size:<12} {br:<10} {codec:<8} {t:<10}")
    
    print("-" * 80)
    
    # ── GHI KẾT QUẢ RA FILE ──
    report_path = os.path.join(RESULTS_DIR, "comparison_report.json")
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\n📄 Report JSON: {report_path}")
    
    # ── KIỂM TRA LOGIC ──
    print("\n🔍 KIỂM TRA NGHIỆP VỤ:")
    for r in results:
        if "error" in r:
            print(f"   ❌ {r['plan']}: {r['error']}")
            continue
        
        actual_h = int(r.get('actual_resolution', '0x0').split('x')[1])
        cap_map = {"720p": 720, "1080p": 1080, "4K": 2160, "Original": 99999}
        cap_h = cap_map.get(r['quality_cap'], 99999)
        
        if actual_h <= cap_h:
            print(f"   ✅ {r['plan']}: Resolution {r['actual_resolution']} ≤ {r['quality_cap']} cap → PASS")
        else:
            print(f"   ❌ {r['plan']}: Resolution {r['actual_resolution']} > {r['quality_cap']} cap → FAIL")

if __name__ == "__main__":
    main()
