"""Try XHS via requests (server-side rendered share page)."""
import sys, re, json, requests
sys.stdout.reconfigure(encoding='utf-8')

url = "https://www.xiaohongshu.com/discovery/item/6a049b60000000003700e759?source=webshare&xhsshare=pc_web&xsec_token=ABs4tiqp6w4olKMxBbZBBaBO0fSh_1A9jyL9jP-DIL0Qg=&xsec_source=pc_share"

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
}

resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
print(f"Status: {resp.status_code}")
print(f"Final URL: {resp.url}")
print(f"Content length: {len(resp.text)}")

page = resp.text

# Check for __INITIAL_STATE__
initial_match = re.search(r'window\.__INITIAL_STATE__\s*=\s*', page)
print(f"__INITIAL_STATE__ found: {bool(initial_match)}")

# Try og:image
og_images = re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', page)
print(f"og:image: {len(og_images)}")
for u in og_images:
    print(f"  {u[:200]}")

# Try finding image URLs in the source
all_img_patterns = [
    r'(https?://sns-img[^\s"\'\\<>]+)',
    r'(https?://ci\.xiaohongshu\.com/[^\s"\'\\<>]+)',
    r'"urlDefault"\s*:\s*"([^"]+)"',
    r'"urlPre"\s*:\s*"([^"]+)"',
    r'"url"\s*:\s*"(https?://[^"]*(?:xhscdn|xiaohongshu|sns-img)[^"]*)"',
]
for pattern in all_img_patterns:
    matches = re.findall(pattern, page)
    if matches:
        print(f"\nPattern '{pattern[:50]}...': {len(matches)} matches")
        seen = set()
        for m in matches[:5]:
            if m not in seen:
                seen.add(m)
                print(f"  {m[:200]}")

# Also try /explore/ URL via requests
note_id = "6a049b60000000003700e759"
explore_url = f"https://www.xiaohongshu.com/explore/{note_id}"
resp2 = requests.get(explore_url, headers=headers, timeout=15, allow_redirects=True)
print(f"\n--- /explore/ URL ---")
print(f"Status: {resp2.status_code}")
# Check for images
og2 = re.findall(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\'](https?://[^"\']+)["\']', resp2.text)
print(f"og:image: {len(og2)}")
for u in og2:
    print(f"  {u[:200]}")
    
# Check for imageList in explore page
il2 = re.findall(r'"urlDefault"\s*:\s*"([^"]+)"', resp2.text)
print(f"urlDefault: {len(il2)}")
for u in il2[:5]:
    print(f"  {u[:200]}")
