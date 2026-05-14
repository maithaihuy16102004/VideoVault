#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
CLI tool for downloading videos and live streams from various platforms.

Features:
- Extracts video URLs from arbitrary text.
- Supports Douyin, TikTok, Xiaohongshu, Bilibili, YouTube, Facebook, etc.
- Tries high‑quality download via Selenium first, falls back to yt‑dlp.
- Handles live streams: starts downloading from the beginning and continues
  until the user interrupts (Ctrl+C) or the stream ends.
- Shows loading progress and empty state when no URL is found.
- Handles errors gracefully with try/catch.
"""

import sys
from downloader import download_live_stream

def print_banner():
    banner = """
========================================
   CÔNG CỤ TẢI VIDEO (YT-DLP)  
========================================
Hỗ trợ: YouTube, Douyin, TikTok, Xiaohongshu, Bilibili, Facebook, v.v.
📌 Tối ưu: Douyin (Chất lượng gốc), TikTok, Xiaohongshu, Bilibili
Bạn có thể dán cả đoạn văn bản — chương trình sẽ tự tìm link.
Gõ 'exit' hoặc 'quit' để thoát.
"""
    print(banner)

def main():
    print_banner()
    while True:
        try:
            link = input("\n🔗 Nhập link video: ").strip()
            if not link:
                print("⚠️ Vui lòng nhập một đường dẫn hợp lệ.")
                continue
            if link.lower() in ('exit', 'quit'):
                print("👋 Tạm biệt!")
                break
            download_live_stream(link)
        except KeyboardInterrupt:
            print("\n👋 Đã dừng chương trình.")
            break
        except Exception as e:
            print(f"⚠️ Lỗi: {e}")

if __name__ == "__main__":
    main()