"""Utility functions for video_downloader."""

import re
import json
import urllib.parse
from typing import List, Dict, Any

def extract_url(text: str) -> str | None:
    """Regex tìm URL bắt đầu bằng http hoặc https."""
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, text)
    return urls[0] if urls else None

def is_douyin_url(url: str) -> bool:
    return 'douyin.com' in url or 'v.douyin.com' in url

def is_tiktok_url(url: str) -> bool:
    return 'tiktok.com' in url

def is_xhs_url(url: str) -> bool:
    return 'xiaohongshu.com' in url or 'xhslink.com' in url

def is_bilibili_url(url: str) -> bool:
    return 'bilibili.com' in url or 'bilibili.tv' in url

def _collect_all_quality_urls(video_data: Dict[str, Any]) -> List[Dict[str, str]]:
    """Thu thập TẤT CẢ URL video từ video_data, sắp xếp theo resolution giảm dần."""
    results = []
    seen_urls = set()

    def add_url(url: str, resolution: int, label: str) -> None:
        if url and url not in seen_urls:
            seen_urls.add(url)
            results.append({'url': url, 'resolution': resolution, 'label': label})

    # 1. bit_rate list
    bit_rates = video_data.get('bit_rate', [])
    for br in bit_rates:
        play_addr = br.get('play_addr', {})
        h = play_addr.get('height', 0) or 0
        w = play_addr.get('width', 0) or 0
        resolution = max(h, w)
        url_list = play_addr.get('url_list', [])
        bit_rate_val = br.get('bit_rate', '?')
        gear = br.get('gear_name', br.get('quality_type', ''))

        for u in url_list:
            add_url(u, resolution, f"{w}x{h} bitrate:{bit_rate_val} gear:{gear}")

    # 2. download_addr
    download_addr = video_data.get('download_addr', {})
    url_list = download_addr.get('url_list', [])
    h = download_addr.get('height', 0) or 0
    w = download_addr.get('width', 0) or 0
    for u in url_list:
        add_url(u, max(h, w), f"download_addr {w}x{h}")

    # 3. play_addr_265 / play_addr_h265
    for key in ['play_addr_265', 'play_addr_h265']:
        addr = video_data.get(key, {})
        if isinstance(addr, dict):
            url_list = addr.get('url_list', [])
            h = addr.get('height', 0) or 0
            w = addr.get('width', 0) or 0
            for u in url_list:
                add_url(u, max(h, w), f"{key} {w}x{h}")

    # 4. play_addr (H.264 standard)
    play_addr = video_data.get('play_addr', {})
    if isinstance(play_addr, dict):
        url_list = play_addr.get('url_list', [])
        h = play_addr.get('height', 0) or 0
        w = play_addr.get('width', 0) or 0
        for u in url_list:
            add_url(u, max(h, w), f"play_addr {w}x{h}")

    # 5. play_addr_h264
    play_h264 = video_data.get('play_addr_h264', {})
    if isinstance(play_h264, dict):
        url_list = play_h264.get('url_list', [])
        h = play_h264.get('height', 0) or 0
        w = play_h264.get('width', 0) or 0
        for u in url_list:
            add_url(u, max(h, w), f"play_addr_h264 {w}x{h}")

    # Sort by resolution descending
    results.sort(key=lambda x: x['resolution'], reverse=True)
    return results

def _extract_from_render_data(page_source: str) -> str | None:
    """Trích xuất video URL từ RENDER_DATA trong HTML source."""
    render_data = re.findall(r'<script id="RENDER_DATA"[^>]*>([^<]+)</script>', page_source)
    if render_data:
        decoded = urllib.parse.unquote(render_data[0])

        play_api = re.findall(r'"playApi"\s*:\s*"([^"]+)"', decoded)
        if play_api:
            url = play_api[0].replace('\\u002F', '/')
            if not url.startswith('http'):
                url = 'https:' + url
            return url

        mp4_urls = re.findall(r'(https?://[^"\\]*\.mp4[^"\\]*)', decoded)
        if mp4_urls:
            return mp4_urls[0]

    return None