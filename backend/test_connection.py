import socket
import cv2
import os
import sys

def check_port(ip, port):
    print(f"Checking TCP connection to {ip}:{port}...")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(3)
    try:
        s.connect((ip, port))
        print(f"✅ Port {port} is OPEN. Network path is clear.")
        s.close()
        return True
    except Exception as e:
        print(f"❌ Port {port} is CLOSED or Unreachable.")
        print(f"   Error Details: {e}")
        return False

def test_rtsp(url):
    print(f"\nAttempting RTSP Login (TCP Enforced)...")
    print(f"URL: {url}")
    os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"
    cap = cv2.VideoCapture(url, cv2.CAP_FFMPEG)
    
    if cap.isOpened():
        print("✅ RTSP Login Successful!")
        ret, frame = cap.read()
        if ret:
            print(f"✅ Frame decoding working. Image size: {frame.shape}")
        else:
            print("⚠️ Login successful, but failed to retrieve first frame (Codec issue likely).")
    else:
        print("❌ RTSP Login FAILED. (Wrong password or Stream Path)")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python test_connection.py <IP> <Username> <Password>")
        print("Example: python test_connection.py 172.16.9.44 admin mypassword")
        sys.exit(1)
        
    ip = sys.argv[1]
    user = sys.argv[2]
    password = sys.argv[3]
    
    # 1. Check Network Reachability
    if check_port(ip, 554):
        # 2. Check Authentication & Video
        url = f"rtsp://{user}:{password}@{ip}:554/Streaming/Channels/101"
        test_rtsp(url)
        
        # 3. Check Substream (Backup)
        print("\nChecking Substream (102)...")
        sub_url = f"rtsp://{user}:{password}@{ip}:554/Streaming/Channels/102"
        test_rtsp(sub_url)
    else:
        print("\n[DIAGNOSIS]")
        print("The Smart Campus server cannot reach the Camera's Video Port (554).")
        print("Even if 'ping' works, the Firewall or Router is likely blocking TCP Port 554.")
        print("Action: Contact IT Network Admin to allow traffic on TCP 554 from 172.16.5.106 to 172.16.9.x")
