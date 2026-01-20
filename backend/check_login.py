import requests
import sys

try:
    print("Attempting Login via Requests...")
    # requests sends `application/x-www-form-urlencoded` by default when `data` is a dict
    resp = requests.post(
        "http://127.0.0.1:8000/api/token",
        data={"username": "mettoalex@gmail.com", "password": "Digital2025"}
    )
    print(f"Status: {resp.status_code}")
    print(f"Content: {resp.text}")
except Exception as e:
    print(f"Error: {e}")
