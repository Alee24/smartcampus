import pymysql

def check_tables():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            user='root',
            password='',
            database='gatepass_v2',
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            for t in tables:
                table_name = list(t.values())[0]
                try:
                    cursor.execute(f"SELECT COUNT(*) FROM `{table_name}`")
                    count = cursor.fetchone()
                    print(f"OK: {table_name} ({count})")
                except Exception as e:
                    print(f"FAILED: {table_name} - {e}")
        conn.close()
    except Exception as e:
        print(f"GLOBAL ERROR: {e}")

if __name__ == "__main__":
    check_tables()
