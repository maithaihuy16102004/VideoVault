"""Core downloader logic for video Downloader."""

import os
import sys
import time
import json
import re
import requests
from typing import List, Dict, Any, Optional

from utils import (
    extract_url,
    is_douyin_url,
    is_tiktok_url,
    is_xhs_url,
    is_bilibili_url,
    _collect_all_quality_urls,
    _extract_from_render_data,
)
from selenium_driver import _setup_edge, _setup_chrome

# --------------------------------------------------------------------------- #
# Helper functions
# --------------------------------------------------------------------------- #
def _setup_driver(enable_logging: bool = False):
    """
    Attempt to create a WebDriver (Edge or Chrome).

    Returns:
        webdriver.Remote: The driver instance if successful, otherwise None.
    """
    for setup_func in (_setup_edge, _setup_chrome):
        try:
            return setup_func(enable_logging=enable_logging)
        except Exception as e:
            print(f"⚠️  Khởi tạo driver thất bại: {e}")
            continue
    return None


def _safe_get_logs(driver):
    """
    Safely retrieve performance logs from the driver.

    Returns:
        list: List of log entries or empty list on failure.
    """
    try:
        return driver.get_log('performance')
    except Exception:
        return []


def _collect_urls_from_driver(driver) -> List[Dict[str, str]]:
    """
    Extract video URLs from the browser DOM and API responses.

    Returns:
        list of dict: Each dict contains 'url', 'resolution', and 'label'.
    """
    api_video_urls: List[Dict[str, str]] = []
    dom_video_urls: List[str] = []

    # 1. Extract from DOM
    try:
        dom_video_urls = driver.execute_script(
            """
            return Array.from(document.querySelectorAll('video'))
                .map(v => v.src || (v.querySelector('source') && v.querySelector('source').src))
                .filter(src => src);
            """
        ) or []
    except Exception:
        pass

    # 2. Intercept API (Douyin & TikTok)
    try:
        current_url = driver.current_url
        if not current_url:
            raise ValueError("Driver URL is empty")
        video_id_match = re.search(r'/video/(\d+)', current_url)
        target_id = video_id_match.group(1) if video_id_match else None

        logs = _safe_get_logs(driver)
        for log_entry in logs:
            try:
                msg = json.loads(log_entry['message'])
                params = msg.get('message', {}).get('params', {})
                resp_url = params.get('response', {}).get('url', '')

                # Keywords for ByteDance (Douyin/TikTok)
                keywords = ['aweme', 'feed', 'item/detail', 'video/auth']
                if any(kw in resp_url for kw in keywords):
                    request_id = params.get('requestId', '')
                    body = driver.execute_cdp_cmd('Network.getResponseBody', {'requestId': request_id})
                    data = json.loads(body.get('body', '{}'))

                    v_data = None
                    if 'aweme_detail' in data:
                        v_data = data['aweme_detail'].get('video')
                    elif 'itemInfo' in data:
                        v_data = data['itemInfo'].get('itemStruct', {}).get('video')
                    elif 'aweme_list' in data:
                        if target_id:
                            for a in data['aweme_list']:
                                if str(a.get('aweme_id')) == target_id:
                                    v_data = a.get('video')
                                    break
                        else:
                            v_data = data['aweme_list'][0].get('video') if data['aweme_list'] else None

                    if v_data:
                        api_video_urls.extend(_collect_all_quality_urls(v_data))
            except Exception:
                continue
    except Exception as e:
        print(f"⚠️  Lỗi khi xử lý API logs: {e}")

    # 3. Extract from RENDER_DATA (Douyin & Xiaohongshu)
    render_url: Optional[str] = None
    try:
        render_url = _extract_from_render_data(driver.page_source)
    except Exception as e:
        print(f"⚠️  Lỗi khi trích xuất từ RENDER_DATA: {e}")

    # Build final list
    all_urls = [
        {'url': u, 'label': 'DOM Source'} for u in dom_video_urls
    ] + ([{'url': render_url, 'label': 'Render Data'}] if render_url else [])
    return all_urls


def _download_file(
    video_url: str,
    title: str,
    cookies: Dict[str, str],
    referer: str = 'https://www.douyin.com/',
) -> bool:
    """
    Download a single video file.

    Args:
        video_url: Direct URL to the video file.
        title: Title used for the output filename (without extension).
        cookies: Cookie dictionary for authenticated requests.
        referer: HTTP Referer header value.

    Returns:
        bool: True on success, False on failure.
    """
    if not os.path.exists('Downloads'):
        os.makedirs('Downloads')

    session = requests.Session()
    for name, value in cookies.items():
        session.cookies.set(name, value)

    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': referer,
    })

    try:
        resp = session.get(video_url, stream=True, timeout=60)
        if resp.status_code == 200:
            filename = os.path.join('Downloads', f'{title}.mp4')
            total = int(resp.headers.get('content-length', 0))
            downloaded = 0

            with open(filename, 'wb') as f:
                for chunk in resp.iter_content(chunk_size=65536):
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded * 100 // total
                        mb_done = downloaded / (1024 * 1024)
                        mb_total = total / (1024 * 1024)
                        print(f'\r   📊 Tiến trình: {pct}% ({mb_done:.1f}/{mb_total:.1f} MB)', end='', flush=True)

            file_size = os.path.getsize(filename) / (1024 * 1024)
            print(f'\n\n✅ Tải thành công! ({file_size:.1f} MB)\n   📁 File: {os.path.abspath(filename)}')
            return True
        else:
            print(f'❌ Response status: {resp.status_code}')
            return False
    except Exception as e:
        print(f'❌ Lỗi khi tải {video_url}: {e}')
        return False


# --------------------------------------------------------------------------- #
# Public downloader functions
# --------------------------------------------------------------------------- #
def download_with_selenium(url: str, platform: str = 'douyin') -> bool:
    """
    Download video using a headless browser (Selenium).

    The function follows these steps:
        1. Initializes Edge or Chrome driver.
        2. Loads the target URL and waits for video content.
        3. Extracts the page title and cleans it for filename usage.
        4. Collects potential video sources from DOM, API logs, and RENDER_DATA.
        5. Attempts to download each source in order of quality.
        6. Falls back to `download_with_ytdlp` if no source succeeds.

    Args:
        url: Direct video page URL.
        platform: Target platform identifier (douyin, tiktok, xhs).

    Returns:
        bool: True if a video was successfully saved, False otherwise.
    """
    try:
        driver = _setup_driver(enable_logging=True)
        if not driver:
            # Fallback directly to yt-dlp if no browser can be started
            print("⚠️  Không thể khởi tạo trình duyệt, chuyển sang yt-dlp.")
            return False

        print(f"🌐 Đang mở trình duyệt để lấy link gốc {platform}...")
        driver.get(url)
        # Wait for video to load – adjust based on platform
        wait_time = 7 if platform != 'xhs' else 5
        time.sleep(wait_time)

        # Extract title and clean it
        title = driver.title
        for suffix in [' - 抖音', ' | TikTok', ' - 小红书', ' | 小红shu']:
            title = title.replace(suffix, '')
        title = re.sub(r'[\\/:*?"<>|]', '_', title.strip())[:80]
        if not title:
            title = f'{platform}_video_{int(time.time())}'

        print(f"   📹 Tiêu đề: {title}")

        # Collect all possible video URLs
        all_urls = _collect_urls_from_driver(driver)

        # Try each URL until one succeeds
        for item in all_urls:
            url_to_dl = item['url']
            if not url_to_dl.startswith('http'):
                url_to_dl = 'https:' + url_to_dl
            print(f"   ⬇️ Đang thử tải chất lượng tốt nhất: {item.get('label', 'High Quality')}...")
            # Retrieve cookies for the request
            cookies = {c['name']: c['value'] for c in driver.get_cookies()}
            referer = (
                'https://www.tiktok.com/' if platform == 'tiktok' else
                'https://www.xiaohongshu.com/' if platform == 'xhs' else
                'https://www.douyin.com/'
            )
            if _download_file(url_to_dl, title, cookies, referer):
                driver.quit()
                return True

        print("❌ Không thể tải video này bằng trình duyệt.")
        driver.quit()
        return False

    except Exception as e:
        print(f"❌ Lỗi không mong muốn: {e}")
        try:
            driver.quit()
        except Exception:
            pass
        # If any unexpected error occurs, fall back to yt-dlp
        print("⚠️  Đã xảy ra lỗi, chuyển sang yt-dlp để thử tải lại.")
        return False


def download_with_ytdlp(url: str) -> None:
    """
    Download video using yt-dlp with the best available quality.

    This function prints success/failure messages but does not return a value.
    It is used as a fallback when Selenium-based extraction fails.

    Args:
        url: Direct video page URL.
    """
    print("   🔍 Đang phân tích chất lượng tốt nhất bằng yt-dlp...")
    opts = {
        'format': 'bestvideo+bestaudio/best',
        'format_sort': ['res:4000', 'res:2160', 'res:1080', 'vcodec:h265', 'vcodec:h264', 'ext:mp4'],
        'outtmpl': 'Downloads/%(title)s.%(ext)s',
        'noplaylist': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'socket_timeout': 30,
        'retries': 5,
        'nocheckcertificate': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        import yt_dlp

        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        print("\n✅ Tải thành công!")
    except Exception as e:
        print(f"\n❌ Lỗi: {e}")


def download_live_stream(url: str) -> None:
    """
    Download a live stream from the given URL, starting from the beginning.
    The download continues until the user interrupts with Ctrl+C or the stream ends.
    The resulting file is saved in the Downloads folder with a timestamped title.

    Args:
        url: Direct live stream URL.
    """
    print(f"🔗 Đang tải livestream từ: {url}")
    opts = {
        'format': 'bestvideo+bestaudio/best',
        'live_from_start': True,
        'outtmpl': 'Downloads/%(title)s_live_%(upload_date)s.mp4',
        'noplaylist': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'socket_timeout': 30,
        'retries': 5,
        'nocheckcertificate': True,
        'quiet': True,
        'no_warnings': True,
    }

    try:
        import yt_dlp

        # yt-dlp will keep downloading until interrupted or stream ends
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([url])
        print("\n✅ Livestream download completed!")
    except KeyboardInterrupt:
        print("\n🛑 Livestream download interrupted by user.")
    except Exception as e:
        print(f"\n❌ Lỗi khi tải livestream: {e}")


def download_video(input_text: str) -> None:
    """
    Main entry point: extract a video URL from the given text and start downloading.

    This function orchestrates platform detection, initial download attempts,
    and fallback mechanisms.

    Args:
        input_text: Arbitrary text that may contain a video URL.
    """
    url = extract_url(input_text)
    if not url:
        print("\n❌ Không tìm thấy link video hợp lệ trong đoạn văn bản bạn nhập.")
        return

    print(f"\n🚀 Đang xử lý: {url}")

    try:
        if is_douyin_url(url):
            success = download_with_selenium(url, 'douyin')
            if not success:
                download_with_ytdlp(url)
        elif is_tiktok_url(url):
            success = download_with_selenium(url, 'tiktok')
            if not success:
                download_with_ytdlp(url)
        elif is_xhs_url(url):
            success = download_with_selenium(url, 'xhs')
            if not success:
                download_with_ytdlp(url)
        elif is_bilibili_url(url):
            print("   📺 Đang xử lý video Bilibili chất lượng cao...")
            download_with_ytdlp(url)
        else:
            download_with_ytdlp(url)
    except Exception as e:
        print(f"\n❌ Có lỗi xảy ra: {e}")