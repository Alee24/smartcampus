import requests

def test_login():
    url = "http://localhost:8000/api/token"
    payload = {
        "username": "mettoalex@gmail.com",
        "password": "Digital2025"
    }
    
    print(f"Attempting POST to {url}...")
    try:
        response = requests.post(url, data=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response Body: {response.text}")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_login()
