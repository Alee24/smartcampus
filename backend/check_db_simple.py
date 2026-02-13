import pymysql
import os

def check_db():
    print("Checking MySQL Connection...")
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='gatepass_v2',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        print("SUCCESS: Connected to 'gatepass_v2'")
        
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            print(f"Tables found ({len(tables)}):")
            for t in tables:
                print(f" - {list(t.values())[0]}")
                
            # Check Admin
            print("\nChecking Admin User...")
            cursor.execute("SELECT id, email, admission_number, role_id FROM users WHERE email='mettoalex@gmail.com'")
            user = cursor.fetchone()
            if user:
                print(f"FOUND ADMIN: {user}")
            else:
                print("ADMIN NOT FOUND in 'users' table.")
                
        conn.close()
        
    except pymysql.err.OperationalError as e:
        print(f"OPERATIONAL ERROR: {e}")
        if e.args[0] == 1049:
            print("Database 'gatepass_v2' does not exist.")
    except Exception as e:
        print(f"CONNECTION FAILED: {e}")

if __name__ == "__main__":
    check_db()
