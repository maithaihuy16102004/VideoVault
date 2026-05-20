import yt_dlp
import sys
import json

url = sys.argv[1]
ydl_opts = {'quiet': True, 'extract_flat': False, 'skip_download': True}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    try:
        info = ydl.extract_info(url, download=False)
        # Check if it's a video or photo/gallery
        is_video = False
        if info.get('vcodec') != 'none' and info.get('ext') in ['mp4', 'webm', 'mov']:
            is_video = True
        
        # If it's a gallery (like tiktok photo posts)
        is_gallery = False
        if 'entries' in info:
            is_gallery = True

        print(json.dumps({
            'title': info.get('title'),
            'is_video': is_video,
            'is_gallery': is_gallery,
            'thumbnail': info.get('thumbnail'),
            '_type': info.get('_type')
        }))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
