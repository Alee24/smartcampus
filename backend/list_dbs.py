import pymysql

def list_dbs():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            charset='utf8mb4'
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW DATABASES")
            dbs = cursor.fetchall()
            for db in dbs:
                print(f"DB: {db[0]}")
        conn.close()
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    list_dbs()
