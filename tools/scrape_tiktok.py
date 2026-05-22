import sys
import json
import yt_dlp

ydl_opts = {
    'extract_flat': True,
    'playlistend': 6,
    'quiet': True,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info('https://www.tiktok.com/@chic.outfit.vn', download=False)
        if 'entries' in info:
            entries = info['entries']
        else:
            entries = [info]
        
        videos = []
        for e in entries:
            videos.append({
                'title': e.get('title', ''),
                'view_count': e.get('view_count', 0),
                'like_count': e.get('like_count', 0),
                'comment_count': e.get('comment_count', 0),
                'repost_count': e.get('repost_count', 0),
                'thumbnail': e.get('thumbnails', [{}])[0].get('url', ''),
            })
        print(json.dumps(videos))
except Exception as e:
    print(f"Error: {e}")
