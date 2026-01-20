import pymysql

def sync_inspect():
    print("Connecting...")
    try:
        connection = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='gatepass'
        )
        with connection.cursor() as cursor:
            cursor.execute("DESCRIBE users")
            rows = cursor.fetchall()
            print(f"{'Field':<25} {'Type':<25}")
            print("-" * 50)
            for row in rows:
                # row is tuple
                print(f"{row[0]:<25} {row[1]:<25}")
    except Exception as e:
        print(e)
    finally:
         if 'connection' in locals(): connection.close()

if __name__ == "__main__":
    sync_inspect()
