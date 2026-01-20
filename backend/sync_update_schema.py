import pymysql
import os

def sync_update():
    print("Connecting to DB...")
    # URL: mysql+aiomysql://root:@127.0.0.1:3306/gatepass
    try:
        connection = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='gatepass',
            cursorclass=pymysql.cursors.DictCursor
        )
    except Exception as e:
        print(f"Connection failed: {e}")
        return

    try:
        with connection.cursor() as cursor:
            # Check profile_image
            try:
                cursor.execute("SELECT profile_image FROM users LIMIT 1")
                print("✓ profile_image exists")
            except Exception as e:
                print(f"! profile_image missing ({e}). Adding...")
                cursor.execute("ALTER TABLE users ADD COLUMN profile_image VARCHAR(512)")
                print("✓ Added profile_image")
            
            # Check admission_date
            try:
                cursor.execute("SELECT admission_date FROM users LIMIT 1")
                print("✓ admission_date exists")
            except Exception as e:
                print(f"! admission_date missing ({e}). Adding...")
                cursor.execute("ALTER TABLE users ADD COLUMN admission_date DATE")
                print("✓ Added admission_date")
                
            # Check expiry_date
            try:
                cursor.execute("SELECT expiry_date FROM users LIMIT 1")
                print("✓ expiry_date exists")
            except Exception as e:
                print(f"! expiry_date missing ({e}). Adding...")
                cursor.execute("ALTER TABLE users ADD COLUMN expiry_date DATE")
                print("✓ Added expiry_date")
                
        connection.commit()
    finally:
        connection.close()
    print("Done")

if __name__ == "__main__":
    sync_update()
