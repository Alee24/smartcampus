import asyncio
import os
import sys
import subprocess

# Add current directory to path
sys.path.append(os.getcwd())

def log(msg):
    print(msg)

async def run_script(script_name):
    """Runs a python script using the current python interpreter."""
    log(f"--- Running {script_name} ---")
    try:
        # Run as a separate process to ensure clean environment for each migration
        process = await asyncio.create_subprocess_exec(
            sys.executable, script_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        
        if stdout:
            print(f"[OUT]: {stdout.decode().strip()}")
        if stderr:
            print(f"[ERR]: {stderr.decode().strip()}")
            
        if process.returncode == 0:
            return True
        else:
            log(f"[ERROR] {script_name} failed with exit code {process.returncode}")
            return False
    except Exception as e:
        log(f"[ERROR] Error running {script_name}: {e}")
        return False

async def main():
    scripts = [
        "run_init_db.py",
        "migrate_db.py",
        "fix_db_migration.py",
        "migrate_system_config.py",
        "migrate_timetable.py",
        "migrate_user_status.py",
        "migrate_cameras.py",
        "migrate_fleet.py",
        "migrate_asset_department.py",
        "migrate_security_features.py",
        "seed_db.py",
        "diagnose_500.py"
    ]
    
    success = True
    for script in scripts:
        if not os.path.exists(script):
            log(f"INFO: Skipping {script} (not found).")
            continue
            
        if not await run_script(script):
            # We continue even if one fails, but track the overall success
            success = False
            
    if success:
        log("DONE: All migrations completed successfully.")
    else:
        log("DONE: Some migrations failed. Check logs above.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        # ProactorEventLoopPolicy is required for create_subprocess_exec on Windows
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    asyncio.run(main())
