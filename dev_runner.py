
import subprocess
import threading
import sys
import os
import time

def stream_output(process, prefix, color_code):
    # ANSI colors
    RESET = "\033[0m"
    COLOR = f"\033[{color_code}m"
    
    try:
        for line in iter(process.stdout.readline, ''):
            if not line: break
            print(f"{COLOR}[{prefix}]{RESET} {line.rstrip()}")
    except Exception:
        pass

def main():
    print("--- Smart Campus Single-Terminal Dev Runner ---")
    
    # 1. Kill ports 8000 and 5173 logic
    print("Cleaning up old processes...")
    # Kill Node (Frontend)
    subprocess.run("taskkill /F /IM node.exe", shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)
    
    # Kill Uvicorn (Backend) - specific filter to avoid killing self or system python
    subprocess.run("wmic process where \"CommandLine like '%uvicorn%'\" call terminate", shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

    time.sleep(1)
    
    print("Starting processes in parallel...")

    # Backend
    # Use python -u for unbuffered stdout
    backend = subprocess.Popen(
        [sys.executable, "-u", "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0"],
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    # Frontend
    frontend = subprocess.Popen(
        ["npm", "run", "dev", "--", "--host"],
        cwd="frontend",
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )

    t1 = threading.Thread(target=stream_output, args=(backend, "BACKEND", "36")) # Cyan
    t2 = threading.Thread(target=stream_output, args=(frontend, "FRONTEND", "32")) # Green
    
    t1.daemon = True
    t2.daemon = True
    t1.start()
    t2.start()

    print("Services Running! Press Ctrl+C to stop.")

    try:
        while True:
            time.sleep(0.5)
            if backend.poll() is not None:
                print("Backend exited unexpectedly.")
                break
            if frontend.poll() is not None:
                print("Frontend exited unexpectedly.")
                break
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend.terminate()
        subprocess.run("taskkill /F /IM node.exe", shell=True, stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL)

if __name__ == "__main__":
    main()
