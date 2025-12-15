import subprocess
import time
import webbrowser
import os
import sys

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print(f"Root Directory: {root_dir}")
    
    if not os.path.isdir(backend_dir):
        print(f"ERROR: Backend directory not found at {backend_dir}")
        return
    if not os.path.isdir(frontend_dir):
        print(f"ERROR: Frontend directory not found at {frontend_dir}")
        return

    print("Starting Backend (Uvicorn)...")
    # Start backend
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app", "--reload"],
        cwd=backend_dir,
        # stdout=subprocess.PIPE, # Uncomment to capture output if needed, but letting it flow to console is better for debug
        # stderr=subprocess.PIPE
    )
    
    print("Starting Frontend Server (HTTP)...")
    # Start frontend
    frontend_process = subprocess.Popen(
        [sys.executable, "-m", "http.server", "3000"],
        cwd=frontend_dir
    )

    print("Waiting 5 seconds for services to initialize...")
    time.sleep(5)

    if backend_process.poll() is not None:
        print("ERROR: Backend failed to start immediately.")
    if frontend_process.poll() is not None:
        print("ERROR: Frontend server failed to start immediately.")

    url = "http://localhost:3000"
    print(f"Opening {url} in browser...")
    webbrowser.open(url)

    print("\n== Lifelog Geo Demo Running ==")
    print("Mapbox Token: Check 'frontend/app.js'")
    print("Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
            # Check if processes are still alive
            if backend_process.poll() is not None:
                print("Backend process died unexpectedly!")
                break
            if frontend_process.poll() is not None:
                print("Frontend process died unexpectedly!")
                break
    except KeyboardInterrupt:
        print("\nStopping services...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Done.")

if __name__ == "__main__":
    main()
