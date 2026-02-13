import pymysql

def force_rebuild():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            charset='utf8mb4'
        )
        conn.autocommit(True)
        with conn.cursor() as cursor:
            print("Dropping database 'gatepass_v2'...")
            try:
                cursor.execute("DROP DATABASE IF EXISTS gatepass_v2")
                print("Database dropped.")
            except Exception as e:
                print(f"Error dropping database: {e}")
            
            print("Creating database 'gatepass_v2'...")
            cursor.execute("CREATE DATABASE gatepass_v2")
            print("Database created.")
            
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    force_rebuild()
