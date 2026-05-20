"""Test XHS photo extraction via requests fast path."""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, r'd:\Work')
from video_downloader import extract_photos_from_post

url = "https://www.xiaohongshu.com/discovery/item/6a049b60000000003700e759?source=webshare&xhsshare=pc_web&xsec_token=ABs4tiqp6w4olKMxBbZBBaBO0fSh_1A9jyL9jP-DIL0Qg=&xsec_source=pc_share"

print("Extracting XHS photos via requests...")
result = extract_photos_from_post(url, platform='xhs')
print(f"Title: {result.get('title', '?')}")
print(f"Photos found: {result.get('photoCount', 0)}")
for i, p in enumerate(result.get('photos', []), 1):
    print(f"  #{i}: {p[:120]}...")
print(f"Likes: {result.get('likes')}, Comments: {result.get('comments')}")
if result.get('error'):
    print(f"ERROR: {result['error']}")
