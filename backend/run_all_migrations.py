import asyncio
import os
import sys
import subprocess

# Add current directory to path
sys.path.append(os.getcwd())

async def run_script(script_name):
    print(f"--- Running {script_name} ---")
    try:
        # Use sys.executable to ensure we use the same python interpreter
        process = await asyncio.create_subprocess_exec(
            sys.executable, script_name,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()
        if stdout:
            print(f"[OUT]: {stdout.decode(errors='replace')}")
        if stderr:
            print(f"[ERR]: {stderr.decode(errors='replace')}")
        return process.returncode == 0
    except Exception as e:
        print(f"Failed to run {script_name}: {e}")
        return False

async def main():
    migration_scripts = [
        "run_init_db.py",
        "migrate_db.py",
        "fix_db_migration.py",
        "migrate_system_config.py",
        "migrate_timetable.py",
        "migrate_user_status.py",
        "migrate_cameras.py",
        "seed_db.py",
        "diagnose_500.py"
    ]
    
    success = True
    for script in migration_scripts:
        if os.path.exists(script):
            if not await run_script(script):
                print(f"ERROR: {script} failed.")
                success = False
        else:
            print(f"INFO: Skipping {script} (not found).")
            
    if success:
        print("DONE: All migrations completed successfully.")
    else:
        print("WARNING: Some migrations failed or were skipped.")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
