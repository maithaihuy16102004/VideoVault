import yt_dlp
import os
import re
import json
import time
import sys
import requests
import urllib.parse
import uuid

# Fix encoding cho Windows terminal
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')
if sys.stderr.encoding != 'utf-8':
    sys.stderr.reconfigure(encoding='utf-8')

def extract_url(text):
    """Regex tìm URL bắt đầu bằng http hoặc https"""
    url_pattern = r'https?://[^\s]+'
    urls = re.findall(url_pattern, text)
    return urls[0] if urls else None

def extract_urls(text):
    """Regex tìm danh sách URL bắt đầu bằng http hoặc https"""
    url_pattern = r'https?://[^\s]+'
    return re.findall(url_pattern, text)

def is_douyin_url(url):
    """Kiểm tra xem URL có phải Douyin không"""
    return 'douyin.com' in url or 'v.douyin.com' in url

def is_tiktok_url(url):
    """Kiểm tra xem URL có phải TikTok không"""
    return 'tiktok.com' in url

def is_xhs_url(url):
    """Kiểm tra xem URL có phải Xiaohongshu không"""
    return 'xiaohongshu.com' in url or 'xhslink.com' in url

def is_bilibili_url(url):
    """Kiểm tra xem URL có phải Bilibili không"""
    return 'bilibili.com' in url or 'bilibili.tv' in url

def _extract_xhs_video_data(driver, max_height=99999):
    """Extract video URL and title from XHS __INITIAL_STATE__ data directly via JS to avoid huge JSON serialization issues."""
    try:
        current_url = driver.current_url
        import re as _re
        post_id_match = _re.search(r'/(?:item|explore|discovery/item)/([a-f0-9]+)', current_url)
        target_id = post_id_match.group(1) if post_id_match else ''

        js_script = """
            var target_id = arguments[0];
            var max_height = arguments[1];
            
            var state = window.__INITIAL_STATE__ || window.__INITIAL_SSR_STATE__;
            if (!state) return { error: 'No state found' };
            
            var noteMap = null;
            if (state.note && state.note.noteDetailMap) {
                noteMap = state.note.noteDetailMap;
            } else if (state.note && state.note.note) {
                noteMap = state.note.note;
            } else if (state.feed && state.feed.notes) {
                // Sometimes it's in feed.notes? (Unlikely for direct link but possible)
                noteMap = {};
                for (var i = 0; i < state.feed.notes.length; i++) {
                    var n = state.feed.notes[i];
                    if (n.id) noteMap[n.id] = n;
                }
            }
            if (!noteMap) {
                // Log what properties exist in state
                return { error: 'No noteMap found', state_keys: Object.keys(state) };
            }
            
            var noteData = null;
            if (target_id && noteMap[target_id]) {
                noteData = noteMap[target_id];
            } else if (noteMap['undefined']) {
                noteData = noteMap['undefined'];
            } else if (noteMap['null']) {
                noteData = noteMap['null'];
            }
            
            if (!noteData) {
                return { error: 'Target ID not found in noteMap and no undefined fallback. Post might be 404/deleted.' };
            }
            
            var note = noteData.note || noteData;
            var title = note.title || note.desc || '';
            var desc = note.desc || '';
            var tags = [];
            if (note.tagList) {
                for (var t=0; t<note.tagList.length; t++) {
                    tags.push(note.tagList[t].name || '');
                }
            }
            var video_url = '';
            var image_urls = [];
            
            if (note.video && note.video.media && note.video.media.stream) {
                var stream = note.video.media.stream;
                var codecs = ['h264', 'h265', 'av1'];
                for (var i=0; i<codecs.length; i++) {
                    var codec_streams = stream[codecs[i]];
                    if (codec_streams && codec_streams.length > 0) {
                        codec_streams.sort((a, b) => (b.height || 0) - (a.height || 0));
                        for (var j=0; j<codec_streams.length; j++) {
                            var s = codec_streams[j];
                            var h = s.height || 0;
                            if (h > max_height) continue;
                            
                            var master_url = s.masterUrl || s.master_url || '';
                            var backup_urls = s.backupUrls || s.backup_urls || [];
                            
                            if (master_url) {
                                video_url = master_url; break;
                            } else if (backup_urls && backup_urls.length > 0) {
                                video_url = backup_urls[0]; break;
                            }
                        }
                    }
                    if (video_url) break;
                }
            }
            
            if (!video_url && note.video && note.video.consumer) {
                var origin_key = note.video.consumer.originVideoKey || '';
                if (origin_key) {
                    video_url = 'https://sns-video-bd.xhscdn.com/' + origin_key;
                }
            }
            
            // Extract images 
            if (note.imageList && note.imageList.length > 0) {
                for (var i = 0; i < note.imageList.length; i++) {
                    var img = note.imageList[i];
                    var img_url = img.urlDefault || img.urlOriginal || img.url || '';
                    if (img_url) {
                        // Ensure it's a full URL
                        if (img_url.startsWith('//')) img_url = 'https:' + img_url;
                        image_urls.push(img_url);
                    }
                }
            }
            
            return { title: title, desc: desc, tags: tags, video_url: video_url, image_urls: image_urls, note_found: true };
        """
        result = driver.execute_script(js_script, target_id, max_height)
        if result:
            if 'error' in result:
                print(f"   ⚠️ JS Extractor Debug: {result}")
            return result.get('video_url'), result.get('title'), result.get('image_urls', []), result.get('desc', ''), result.get('tags', [])

            
    except Exception as e:
        print(f"   ⚠️ XHS JS Extraction error: {e}")
        
    return None, None, [], '', []

    if not video_url:
        try:
            video_url = driver.execute_script("""
                var meta = document.querySelector('meta[property="og:video"], meta[name="og:video"]');
                return meta ? meta.content : null;
            """) or None
        except: pass
    
    # Method 3: og:title for title fallback
    if not title:
        try:
            title = driver.execute_script("""
                var meta = document.querySelector('meta[property="og:title"], meta[name="og:title"]');
                return meta ? meta.content : null;
            """)
        except: pass
    
    # Method 4: DOM title selectors
    if not title:
        try:
            title = driver.execute_script("""
                var el = document.querySelector('#detail-title, .title, .note-content .title, [class*="title"]');
                return el ? el.textContent.trim() : null;
            """) or None
        except: pass
    
    return video_url, title

def download_with_selenium(url, platform='douyin', max_quality='Original', download_type='auto'):
    """
    Tải video ở CHẤT LƯỢNG GỐC bằng cách phân tích API/DOM từ trình duyệt.
    Hỗ trợ: douyin, tiktok, xiaohongshu
    """
    try:
        from selenium import webdriver
    except ImportError:
        print("❌ Cần cài Selenium: pip install selenium")
        return False

    platform_names = {
        'douyin': 'Douyin',
        'tiktok': 'TikTok',
        'xhs': 'Xiaohongshu'
    }
    name = platform_names.get(platform, 'Video')
    
    # ── Map quality plan → max resolution height ──
    quality_map = {
        '720p': 720,
        '1080p': 1080,
        '4K': 2160,
        'Original': 99999,
    }
    max_height = quality_map.get(max_quality, 99999)
    
    print(f"🌐 Đang mở trình duyệt để lấy link gốc {name}...")
    
    driver = None
    for setup_func in [_setup_edge, _setup_chrome]:
        try:
            driver = setup_func(enable_logging=True)
            break
        except:
            continue
    
    if not driver:
        print("❌ Không tìm thấy trình duyệt (Edge/Chrome).")
        return False

    try:
        driver.get(url)
        time.sleep(7 if platform != 'xhs' else 5) # Chờ load video
        
        real_url = driver.current_url
        
        # ── Platform-specific extraction ──
        xhs_video_url = None
        xhs_image_urls = []
        title = ''
        desc = ''
        tags = []
        if platform == 'xhs':
            xhs_result = _extract_xhs_video_data(driver, max_height)
            if len(xhs_result) == 5:
                xhs_video_url, xhs_title, xhs_image_urls, desc, tags = xhs_result
            elif len(xhs_result) == 3:
                xhs_video_url, xhs_title, xhs_image_urls = xhs_result
            else:
                xhs_video_url, xhs_title = xhs_result
            title = xhs_title or ''
        
        if not title or title in ['', None]:
            title = driver.title
            for suffix in [' - 抖音', ' | TikTok', ' - 小红书', ' | 小红书', ' - 你的生活方式社区', ' - 你的生活指南']:
                title = title.replace(suffix, '')
        
        title = re.sub(r'[\\/:*?"<>|]', '_', title.strip())[:80]
        if not title:
            # Extract post ID from URL as fallback
            post_id_match = re.search(r'/(?:item|explore|discovery/item)/([a-f0-9]+)', real_url)
            title = f'{platform}_{post_id_match.group(1) if post_id_match else int(time.time())}'
        
        print(f"   📹 Tiêu đề: {title}")
        
        api_video_urls = []
        dom_video_urls = []
        
        # 1. Tìm trong DOM
        try:
            dom_video_urls = driver.execute_script("""
                return Array.from(document.querySelectorAll('video')).map(v => v.src || (v.querySelector('source') && v.querySelector('source').src)).filter(src => src);
            """) or []
        except: pass
        
        # 2. Intercept API (Cho Douyin & TikTok)
        if platform in ['douyin', 'tiktok']:
            try:
                logs = driver.get_log('performance')
                video_id_match = re.search(r'/video/(\d+)', real_url)
                target_id = video_id_match.group(1) if video_id_match else None
                
                for log_entry in logs:
                    try:
                        msg = json.loads(log_entry['message'])
                        params = msg.get('message', {}).get('params', {})
                        resp_url = params.get('response', {}).get('url', '')
                        
                        # Keywords cho ByteDance (Douyin/TikTok)
                        keywords = ['aweme', 'feed', 'item/detail', 'video/auth']
                        if any(kw in resp_url for kw in keywords):
                            request_id = params.get('requestId', '')
                            body = driver.execute_cdp_cmd('Network.getResponseBody', {'requestId': request_id})
                            data = json.loads(body.get('body', '{}'))
                            
                            # Tìm video data trong JSON
                            v_data = None
                            if 'aweme_detail' in data: v_data = data['aweme_detail'].get('video')
                            elif 'itemInfo' in data: v_data = data['itemInfo'].get('itemStruct', {}).get('video')
                            elif 'aweme_list' in data:
                                for a in data['aweme_list']:
                                    if not target_id or str(a.get('aweme_id')) == target_id:
                                        v_data = a.get('video'); break
                            
                            if v_data:
                                urls = _collect_all_quality_urls(v_data, max_height)
                                api_video_urls.extend(urls)
                    except: pass
            except: pass

        # 3. RENDER_DATA (Cho Douyin & Xiaohongshu)
        render_url = None
        try:
            render_url = _extract_from_render_data(driver.page_source)
        except: pass

        # Cookies & Referer
        session_cookies = {c['name']: c['value'] for c in driver.get_cookies()}
        referer = 'https://www.tiktok.com/' if platform == 'tiktok' else \
                  'https://www.xiaohongshu.com/' if platform == 'xhs' else \
                  'https://www.douyin.com/'
        
        driver.quit()
        driver = None

        # THỬ TẢI ẢNH (NẾU DOWNLOAD_TYPE = auto, images, both)
        download_img_success = False
        if platform == 'xhs' and xhs_image_urls and download_type in ['auto', 'images', 'both']:
            # Nếu auto, chỉ tải ảnh khi không có video
            if download_type == 'auto' and (xhs_video_url or api_video_urls or render_url or dom_video_urls):
                pass
            else:
                print(f"   🖼️ Tìm thấy {len(xhs_image_urls)} ảnh. Đang tải và nén thành file zip...")
                import zipfile
                import requests
                import io
                if not os.path.exists('Downloads'):
                    os.makedirs('Downloads')
                zip_filename = f"Downloads/{title}.zip"
                try:
                    with zipfile.ZipFile(zip_filename, 'w') as zipf:
                        for idx, img_url in enumerate(xhs_image_urls):
                            headers = {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                                'Referer': 'https://www.xiaohongshu.com/'
                            }
                            resp = requests.get(img_url, headers=headers, timeout=15)
                            if resp.status_code == 200:
                                ext = 'jpg'
                                if 'image/png' in resp.headers.get('Content-Type', ''): ext = 'png'
                                elif 'image/webp' in resp.headers.get('Content-Type', ''): ext = 'webp'
                                elif 'image/gif' in resp.headers.get('Content-Type', ''): ext = 'gif'
                                zipf.writestr(f"{idx+1}.{ext}", resp.content)
                    file_size_mb = os.path.getsize(zip_filename) / (1024 * 1024)
                    print(f"\n✅ Tải ảnh thành công! ({file_size_mb:.1f} MB)")
                    print(f"   📁 File: {os.path.abspath(zip_filename)}")
                    download_img_success = True
                    if download_type == 'images':
                        return True
                except Exception as e:
                    print(f"\n❌ Lỗi tải ảnh: {e}")
                    if download_type == 'images': return False

        # THỬ TẢI VIDEO THEO THỨ TỰ ƯU TIÊN
        all_urls = list(api_video_urls)
        # XHS: __INITIAL_STATE__ video URL is most reliable
        if xhs_video_url:
            if not xhs_video_url.startswith('http'):
                xhs_video_url = 'https:' + xhs_video_url
            all_urls.insert(0, {'url': xhs_video_url, 'label': 'XHS InitialState'})
        if render_url: 
            all_urls.append({'url': render_url, 'label': 'Render Data'})
        all_urls.extend([{'url': u, 'label': 'DOM Source'} for u in dom_video_urls])

        for item in all_urls:
            url_to_dl = item['url']
            if not url_to_dl.startswith('http'): url_to_dl = 'https:' + url_to_dl
            print(f"   ⬇️ Đang thử tải chất lượng tốt nhất: {item.get('label', 'High Quality')}...")
            if _download_file(url_to_dl, title, session_cookies, referer):
                return True
        
        if download_img_success: return True
        print("❌ Không thể tải video này bằng trình duyệt.")
        return False
    finally:
        if driver: driver.quit()

def _collect_all_quality_urls(video_data, max_height=99999):
    """
    Thu thập TẤT CẢ URL video từ video_data, sắp xếp theo resolution giảm dần.
    Trả về list of dict: [{'url': ..., 'resolution': ..., 'label': ...}, ...]
    """
    results = []
    seen_urls = set()
    
    def add_url(url, resolution, h, label):
        if url and url not in seen_urls and h <= max_height:
            seen_urls.add(url)
            results.append({'url': url, 'resolution': resolution, 'label': label})
    
    # 1. bit_rate list (chứa tất cả chất lượng, từ cao đến thấp)
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
            add_url(u, resolution, h, "{}x{} bitrate:{} gear:{}".format(w, h, bit_rate_val, gear))
    
    # 2. download_addr (chất lượng gốc cho download)
    download_addr = video_data.get('download_addr', {})
    url_list = download_addr.get('url_list', [])
    h = download_addr.get('height', 0) or 0
    w = download_addr.get('width', 0) or 0
    for u in url_list:
        add_url(u, max(h, w), h, "download_addr {}x{}".format(w, h))
    
    # 3. play_addr_265 / play_addr_h265 (H.265 codec, thường resolution cao hơn)
    for key in ['play_addr_265', 'play_addr_h265']:
        addr = video_data.get(key, {})
        if isinstance(addr, dict):
            url_list = addr.get('url_list', [])
            h = addr.get('height', 0) or 0
            w = addr.get('width', 0) or 0
            for u in url_list:
                add_url(u, max(h, w), h, "{} {}x{}".format(key, w, h))
    
    # 4. play_addr (H.264 standard)
    play_addr = video_data.get('play_addr', {})
    if isinstance(play_addr, dict):
        url_list = play_addr.get('url_list', [])
        h = play_addr.get('height', 0) or 0
        w = play_addr.get('width', 0) or 0
        for u in url_list:
            add_url(u, max(h, w), h, "play_addr {}x{}".format(w, h))
    
    # 5. play_addr_h264
    play_h264 = video_data.get('play_addr_h264', {})
    if isinstance(play_h264, dict):
        url_list = play_h264.get('url_list', [])
        h = play_h264.get('height', 0) or 0
        w = play_h264.get('width', 0) or 0
        for u in url_list:
            add_url(u, max(h, w), h, "play_addr_h264 {}x{}".format(w, h))
    
    # Sắp xếp theo resolution giảm dần
    results.sort(key=lambda x: x['resolution'], reverse=True)
    
    return results

def _extract_from_render_data(page_source):
    """Trích xuất video URL từ RENDER_DATA trong HTML source"""
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

def _download_file(video_url, title, cookies, referer='https://www.douyin.com/'):
    """Tải file video về thư mục Downloads - tối ưu băng thông tối đa"""
    if not os.path.exists('Downloads'):
        os.makedirs('Downloads')
    
    session = requests.Session()
    # Mount adapter với pool connections lớn hơn
    adapter = requests.adapters.HTTPAdapter(
        pool_connections=10,
        pool_maxsize=10,
        max_retries=3
    )
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    
    for name, value in cookies.items():
        session.cookies.set(name, value)
    
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': referer,
        'Accept': '*/*',
        'Accept-Encoding': 'identity',  # Không nén để tải nhanh hơn
        'Connection': 'keep-alive',
    })
    
    try:
        resp = session.get(video_url, stream=True, timeout=120)
        if resp.status_code == 200:
            unique_id = str(uuid.uuid4())[:8]
            filename = 'Downloads/{}_{}.mp4'.format(title, unique_id)
            total = int(resp.headers.get('content-length', 0))
            downloaded = 0
            last_pct = -5  # Chỉ in mỗi 5% để giảm I/O overhead
            
            with open(filename, 'wb') as f:
                # Chunk 1MB thay vì 64KB → giảm syscall 16 lần
                for chunk in resp.iter_content(chunk_size=1048576):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if downloaded > 524288000: # Giới hạn 500MB
                        raise Exception("Kích thước video vượt quá 500MB!")
                    if total > 0:
                        pct = downloaded * 100 // total
                        if pct >= last_pct + 5 or pct == 100:
                            mb_done = downloaded / (1024 * 1024)
                            mb_total = total / (1024 * 1024)
                            print('   📊 Tiến trình: {}% ({:.1f}/{:.1f} MB)'.format(pct, mb_done, mb_total), flush=True)
                            last_pct = pct
            
            file_size = os.path.getsize(filename) / (1024 * 1024)
            print('\n\n✅ Tải thành công! ({:.1f} MB)'.format(file_size))
            print('   📁 File: {}'.format(os.path.abspath(filename)))
            return True
        else:
            return False
    except:
        return False

def _setup_edge(enable_logging=False):
    """Khởi tạo Edge headless"""
    from selenium import webdriver
    from selenium.webdriver.edge.options import Options
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--mute-audio')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
    if enable_logging:
        options.set_capability('ms:loggingPrefs', {'performance': 'ALL'})
    return webdriver.Edge(options=options)

def _setup_chrome(enable_logging=False):
    """Khởi tạo Chrome headless"""
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    options = Options()
    options.add_argument('--headless=new')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--mute-audio')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36')
    if enable_logging:
        options.set_capability('goog:loggingPrefs', {'performance': 'ALL'})
    return webdriver.Chrome(options=options)

def download_with_ytdlp(url, max_quality='Original'):
    """Tải video bằng yt-dlp - TỐI ƯU BĂNG THÔNG & GIỚI HẠN CHẤT LƯỢNG THEO GÓI"""
    
    # ── Map quality plan → max resolution height ──
    quality_map = {
        '720p': 720,
        '1080p': 1080,
        '4K': 2160,
        'Original': 99999,  # Không giới hạn
    }
    max_height = quality_map.get(max_quality, 99999)
    
    print(f"   🔍 Đang phân tích chất lượng tốt nhất (tối đa: {max_quality})...")
    
    # ── Build format string theo plan ──
    if max_height < 99999:
        # Giới hạn resolution: chỉ lấy video có height <= max_height
        fmt = f'bestvideo[height<={max_height}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={max_height}]+bestaudio/best[height<={max_height}]/best'
    else:
        # Original: lấy chất lượng cao nhất tuyệt đối
        fmt = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
    
    opts = {
        # === CHẤT LƯỢNG THEO GÓI ===
        'format': fmt,
        'format_sort': [
            f'res:{max_height}', 'vcodec:h265', 'vcodec:h264',
            'acodec:aac', 'ext:mp4', 'filesize',
        ],
        'merge_output_format': 'mp4',  # Luôn merge thành MP4

        # === TỐI ƯU BĂNG THÔNG ===
        'max_filesize': 524288000,         # Giới hạn 500MB theo yêu cầu
        'http_chunk_size': 10485760,       # Chunk 10MB lách throttle
        'concurrent_fragment_downloads': 4, # Tải 4 fragment song song
        'buffersize': 1048576,             # Buffer 1MB
        'socket_timeout': 60,
        'retries': 10,
        'fragment_retries': 10,
        'retry_sleep_functions': {'http': lambda n: 2 ** n},  # Exponential backoff
        'extractor_retries': 5,

        # === OUTPUT & MISC ===
        'outtmpl': 'Downloads/%(title)s.%(ext)s',
        'noplaylist': True,
        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'nocheckcertificate': True,
        'quiet': True,
        'no_warnings': True,
        'prefer_free_formats': False,  # Ưu tiên chất lượng hơn format mở
        'postprocessor_args': {
            'ffmpeg': ['-c', 'copy'],  # Không re-encode, giữ nguyên codec gốc
        },
    }
    
    last_pct = [-5]  # Mutable để dùng trong closure
    def ytdlp_hook(d):
        if d['status'] == 'downloading':
            pct_str = d.get('_percent_str', '')
            match = re.search(r'(\d+\.?\d*)%', pct_str)
            if match:
                pct = int(float(match.group(1)))
                if pct >= last_pct[0] + 3 or pct >= 99:
                    print(f'   📊 Tiến trình: {pct}%', flush=True)
                    last_pct[0] = pct

    opts['progress_hooks'] = [ytdlp_hook]

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            mp4_filename = os.path.splitext(filename)[0] + '.mp4'
            final_file = mp4_filename if os.path.exists(mp4_filename) else filename
            file_size_mb = 0
            if os.path.exists(final_file):
                file_size_mb = os.path.getsize(final_file) / (1024 * 1024)
            print(f"\n✅ Tải thành công! ({file_size_mb:.1f} MB)")
            print(f"   📁 File: {os.path.abspath(final_file)}")
            return True
    except Exception as e:
        print(f"\n❌ Lỗi yt-dlp: {e}")
        return False

def scrape_account_videos(username, platform='douyin', limit=50):
    """
    Quet danh sach video moi nhat tu trang profile cua mot tai khoan.
    Tra ve dict: {username, nickname, avatar, followers, likes, videoCount, videos: [...]}
    Video da duoc sap xep tu moi nhat -> cu nhat (theo thu tu platform hien thi).
    """
    driver = None
    for setup_func in [_setup_edge, _setup_chrome]:
        try:
            driver = setup_func(enable_logging=False)
            break
        except:
            continue

    if not driver:
        return {"error": "Khong tim thay trinh duyet (Edge/Chrome)."}

    try:
        clean_name = username.lstrip('@')
        if platform == 'tiktok':
            profile_url = f'https://www.tiktok.com/@{clean_name}'
        elif platform == 'douyin':
            profile_url = f'https://www.douyin.com/user/{clean_name}' if len(clean_name) > 20 else f'https://www.douyin.com/search/{clean_name}?type=user'
        else:
            profile_url = f'https://www.tiktok.com/@{clean_name}'

        driver.get(profile_url)
        time.sleep(12)

        # Extract account info
        account_info = driver.execute_script(
            "const r = { nickname: '', avatar: '', followers: '0', likes: '0' };"
            "const h1 = document.querySelector('h1[data-e2e=\"user-subtitle\"], h2[data-e2e=\"user-subtitle\"], h1, .user-name, .nickname');"
            "if (h1) r.nickname = h1.textContent.trim();"
            "const av = document.querySelector('[data-e2e=\"user-avatar\"] img, img[class*=\"Avatar\"], .avatar img');"
            "if (av) r.avatar = av.src || '';"
            "const fc = document.querySelector('[data-e2e=\"followers-count\"]');"
            "if (fc) r.followers = fc.textContent.trim();"
            "const lc = document.querySelector('[data-e2e=\"likes-count\"]');"
            "if (lc) r.likes = lc.textContent.trim();"
            "if (!r.followers || r.followers === '0') {"
            "  const s = document.querySelectorAll('.user-info span, .count-item span');"
            "  if (s.length >= 1) r.followers = s[0].textContent.trim();"
            "  if (s.length >= 2) r.likes = s[1].textContent.trim();"
            "}"
            "return r;"
        ) or {}

        # Scroll to load more videos (more aggressive)
        scroll_count = max(5, limit // 4)
        for _ in range(scroll_count):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2)

        # Extract video list - use simple JS to get all links first
        all_links = driver.execute_script(
            "var r = []; var s = new Set();"
            "document.querySelectorAll('a').forEach(function(a) {"
            "  var h = a.href || '';"
            "  if (h.indexOf('/video/') >= 0 && !s.has(h)) { s.add(h); r.push(h); }"
            "}); return r;"
        ) or []

        # Build video objects in Python (more reliable than complex JS)
        import re as _re
        videos_raw = []
        for idx, href in enumerate(all_links):
            vid_match = _re.search(r'/video/(\d+)', href)
            videos_raw.append({
                "videoId": vid_match.group(1) if vid_match else f"v-{idx}",
                "url": href,
                "title": f"Video #{idx + 1}",
                "thumbnailUrl": "",
                "views": "0",
                "likes": "0",
                "author": f"@{clean_name}",
                "duration": 0,
                "platform": platform
            })

        driver.quit()
        driver = None
        videos_raw = videos_raw[:limit]

        return {
            "username": clean_name,
            "nickname": account_info.get('nickname', clean_name),
            "avatar": account_info.get('avatar', ''),
            "followers": account_info.get('followers', '0'),
            "likes": account_info.get('likes', '0'),
            "videoCount": len(videos_raw),
            "videos": videos_raw
        }
    except Exception as e:
        return {"error": str(e), "username": username, "videos": []}
    finally:
        if driver:
            try: driver.quit()
            except: pass


def scrape_hashtag_videos(hashtag, platform='douyin', limit=50):
    """
    Quet danh sach video trending theo hashtag.
    Su dung trang search thay vi tag page (tag page block headless).
    Tra ve dict: {hashtag, viewCount, videoCount, videos: [...]}
    """
    driver = None
    for setup_func in [_setup_edge, _setup_chrome]:
        try:
            driver = setup_func(enable_logging=False)
            break
        except:
            continue

    if not driver:
        return {"error": "Khong tim thay trinh duyet (Edge/Chrome)."}

    try:
        clean_tag = hashtag.lstrip('#')
        if platform == 'tiktok':
            tag_url = f'https://www.tiktok.com/search/video?q=%23{clean_tag}'
        elif platform == 'douyin':
            tag_url = f'https://www.douyin.com/search/{clean_tag}?type=video'
        else:
            tag_url = f'https://www.tiktok.com/search/video?q=%23{clean_tag}'

        driver.get(tag_url)
        time.sleep(10)

        # Check for TikTok error page (headless blocks hashtag/search pages)
        body_text = driver.execute_script("return document.body.innerText.substring(0, 500);") or ''
        if 'Something went wrong' in body_text or 'verify' in body_text.lower():
            driver.quit()
            driver = None
            return {
                "hashtag": clean_tag,
                "viewCount": "0",
                "videoCount": 0,
                "videos": [],
                "warning": "TikTok blocks hashtag/search pages for headless browsers. Try using Douyin platform instead, or use Account scraping which works reliably."
            }

        # Scroll to load more (adaptive)
        scroll_count = max(5, limit // 5)
        for _ in range(scroll_count):
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight)")
            time.sleep(2)

        # Extract view count
        view_count = driver.execute_script(
            "const el = document.querySelector('[data-e2e=\"challenge-vvcount\"], .hashtag-count, h2');"
            "return el ? el.textContent.trim() : '0';"
        ) or '0'

        # Extract video links with simple JS
        all_links = driver.execute_script(
            "var r = []; var s = new Set();"
            "document.querySelectorAll('a').forEach(function(a) {"
            "  var h = a.href || '';"
            "  if (h.indexOf('/video/') >= 0 && !s.has(h)) { s.add(h); r.push(h); }"
            "}); return r;"
        ) or []

        # Build video objects in Python
        import re as _re
        videos_raw = []
        for idx, href in enumerate(all_links):
            vid_match = _re.search(r'/video/(\d+)', href)
            author_match = _re.search(r'@([^/]+)', href)
            videos_raw.append({
                "videoId": vid_match.group(1) if vid_match else f"v-{idx}",
                "url": href,
                "title": f"Video #{idx + 1}",
                "thumbnailUrl": "",
                "views": "0",
                "likes": "0",
                "author": f"@{author_match.group(1)}" if author_match else "@unknown",
                "duration": 0,
                "platform": platform
            })

        driver.quit()
        driver = None
        videos_raw = videos_raw[:limit]

        return {
            "hashtag": clean_tag,
            "viewCount": view_count,
            "videoCount": len(videos_raw),
            "videos": videos_raw
        }
    except Exception as e:
        return {"error": str(e), "hashtag": hashtag, "videos": []}
    finally:
        if driver:
            try: driver.quit()
            except: pass

def extract_post_info(input_text):
    """
    Trích xuất thông tin title, description, tags từ URL cho mode info.
    Sử dụng yt-dlp để lấy info nhanh, nếu không được thử request cơ bản.
    """
    urls = extract_urls(input_text)
    if not urls:
        return {"error": "Không tìm thấy URL hợp lệ."}
    
    url = urls[0]
    result = {"title": "", "description": "", "tags": [], "platform": "unknown"}
    
    if is_douyin_url(url): result["platform"] = "douyin"
    elif is_tiktok_url(url): result["platform"] = "tiktok"
    elif is_xhs_url(url): result["platform"] = "xhs"
    
    # Try yt-dlp first
    try:
        opts = {'quiet': True, 'no_warnings': True, 'ignoreerrors': True}
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if info:
                result["title"] = info.get("title", "")
                result["description"] = info.get("description", "")
                result["tags"] = info.get("tags", [])
                if result["title"] or result["description"]:
                    return result
    except:
        pass
        
    # Fallback to selenium for XHS or others
    driver = None
    for setup_func in [_setup_edge, _setup_chrome]:
        try:
            driver = setup_func(enable_logging=False)
            break
        except:
            continue
            
    if driver:
        try:
            driver.get(url)
            time.sleep(5)
            if result["platform"] == 'xhs':
                xhs_res = _extract_xhs_video_data(driver)
                if len(xhs_res) == 5:
                    _, title, _, desc, tags = xhs_res
                    result["title"] = title or ""
                    result["description"] = desc or ""
                    result["tags"] = tags or []
            else:
                result["title"] = driver.title
        finally:
            driver.quit()
        return result
        
    return {"error": "Không thể trích xuất thông tin từ URL này."}

def download_video(input_text, max_quality='Original', download_type='auto'):
    """
    Xử lý link đầu vào (hỗ trợ cả text chứa link), tải bằng Selenium (chất lượng gốc)
    Nếu thất bại sẽ tự động fallback sang yt-dlp.
    """
    urls = extract_urls(input_text)
    if not urls:
        raise Exception("Không tìm thấy đường dẫn (URL) hợp lệ trong nội dung bạn nhập.")
    
    if not os.path.exists('Downloads'):
        os.makedirs('Downloads')

    for url in urls:
        print(f"\n🚀 Đang xử lý: {url}")
        print(f"   📐 Chất lượng tối đa: {max_quality}")
        
        try:
            success = False
            if is_douyin_url(url):
                success = download_with_selenium(url, 'douyin', max_quality, download_type)
                if not success and download_type != 'images': success = download_with_ytdlp(url, max_quality)
            elif is_tiktok_url(url):
                success = download_with_selenium(url, 'tiktok', max_quality, download_type)
                if not success and download_type != 'images': success = download_with_ytdlp(url, max_quality)
            elif is_xhs_url(url):
                success = download_with_selenium(url, 'xhs', max_quality, download_type)
                if not success and download_type != 'images': success = download_with_ytdlp(url, max_quality)
            elif is_bilibili_url(url):
                print("   📺 Đang xử lý video Bilibili...")
                success = download_with_ytdlp(url, max_quality)
            else:
                success = download_with_ytdlp(url, max_quality)
                
            if not success:
                raise Exception("Không thể tải video từ URL này. (Video có thể không tồn tại, bị ẩn, hoặc là bài đăng dạng ảnh)")
        except Exception as e:
            print(f"\n❌ Có lỗi xảy ra với url {url}: {e}")
            raise e

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="VideoVault Downloader CLI")
    parser.add_argument("--url", help="Video URL to download")
    parser.add_argument("--quality", default="Original", help="Max quality: 720p, 1080p, 4K, Original")
    parser.add_argument("--json", action="store_true", help="Output result as JSON")
    parser.add_argument("--mode", default="download", choices=['download', 'account', 'hashtag', 'info'],
                        help="Mode: download (default), account (scrape account), hashtag (scrape hashtag), info")
    parser.add_argument("--download-type", default="auto", choices=['auto', 'video', 'images', 'both'], help="Type of media to download")
    parser.add_argument("--username", help="Username for account scraping mode")
    parser.add_argument("--hashtag", help="Hashtag for hashtag scraping mode")
    parser.add_argument("--platform", default="douyin", help="Platform: douyin, tiktok, xhs")
    parser.add_argument("--limit", type=int, default=50, help="Max videos to scrape")
    args = parser.parse_args()

    # ── Account scraping mode ──
    if args.mode == 'account':
        if not args.username:
            print(json.dumps({"error": "--username is required for account mode"}))
            sys.exit(1)
        result = scrape_account_videos(args.username, args.platform, args.limit)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if 'error' not in result else 1)

    # ── Hashtag scraping mode ──
    if args.mode == 'hashtag':
        if not args.hashtag:
            print(json.dumps({"error": "--hashtag is required for hashtag mode"}))
            sys.exit(1)
        result = scrape_hashtag_videos(args.hashtag, args.platform, args.limit)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if 'error' not in result else 1)

    # ── Info mode ──
    if args.mode == 'info':
        if not args.url:
            print(json.dumps({"error": "--url is required for info mode"}))
            sys.exit(1)
        result = extract_post_info(args.url)
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0 if 'error' not in result else 1)

    # ── Download mode ──
    if args.url:
        try:
            download_video(args.url, args.quality, args.download_type)
            if args.json:
                print(json.dumps({"success": True, "url": args.url}))
            sys.exit(0)
        except Exception as e:
            if args.json:
                print(json.dumps({"success": False, "error": str(e)}))
            else:
                print("❌ Error: {}".format(e))
            sys.exit(1)

    print("========================================")
    print("   CÔNG CỤ TẢI VIDEO (YT-DLP)   ")
    print("========================================")
    while True:
        try:
            link = input("\n🔗 Nhập link video: ").strip()
            if link.lower() in ['exit', 'quit']:
                break
            if link:
                download_video(link)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print("⚠️ Lỗi: {}".format(e))

