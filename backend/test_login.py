import requests

# Test login endpoint
def test_login():
    url = "http://127.0.0.1:8000/api/token"
    
    # Try with mettoalex@gmail.com
    print("\n🔐 Testing login with mettoalex@gmail.com...")
    data = {
        "username": "mettoalex@gmail.com",
        "password": "Digital2025"
    }
    
    response = requests.post(url, data=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}\n")
    
    # Try with ADMIN001
    print("🔐 Testing login with ADMIN001...")
    data2 = {
        "username": "ADMIN001",
        "password": "Digital2025"
    }
    
    response2 = requests.post(url, data=data2)
    print(f"Status Code: {response2.status_code}")
    print(f"Response: {response2.text}\n")
    
    # Try with admin@smartcampus.edu
    print("🔐 Testing login with admin@smartcampus.edu...")
    data3 = {
        "username": "admin@smartcampus.edu",
        "password": "Admin123!"
    }
    
    response3 = requests.post(url, data=data3)
    print(f"Status Code: {response3.status_code}")
    print(f"Response: {response3.text}\n")

if __name__ == "__main__":
    test_login()
