import requests
import json

api_key = "AIzaSyDFOitpuYFGGBiDxTMpnuK4MrXL99zgp_8"
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    response = requests.get(url)
    if response.status_code == 200:
        models = response.json().get("models", [])
        for m in models:
            name = m.get("name")
            if "flash" in name.lower() or "lite" in name.lower():
                print(f"Model: {name}")
                print(f"  Input Limit: {m.get('inputTokenLimit')}")
                print(f"  Output Limit: {m.get('outputTokenLimit')}")
    else:
        print(f"Error {response.status_code}")
except Exception as e:
    print(f"Exception: {e}")
