import pymysql

def check():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='gatepass'
        )
        with conn.cursor() as cursor:
            cursor.execute("SELECT count(*) FROM users")
            count = cursor.fetchone()[0]
            print(f"Total Users Count (Sync): {count}")
            
            cursor.execute("SELECT full_name, role_id, id FROM users")
            rows = cursor.fetchall()
            print("Users:")
            for r in rows:
                print(f" - {r[0]} (ID: {r[2]})")
                
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check()
