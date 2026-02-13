import pymysql

# Connection details: root:@127.0.0.1:3306/gatepass_db
try:
    print("Connecting to database...")
    connection = pymysql.connect(
        host='127.0.0.1',
        user='root',
        password='',
        database='gatepass_db',
        port=3306
    )
    
    with connection.cursor() as cursor:
        print("Connected. Checking columns for 'event_visitors' table...")
        
        # 1. Add email
        cursor.execute("SHOW COLUMNS FROM event_visitors LIKE 'email'")
        if not cursor.fetchone():
            print("Adding 'email' column...")
            cursor.execute("ALTER TABLE event_visitors ADD COLUMN email VARCHAR(255) NULL")
            print("Added 'email'.")
        else:
            print("'email' column already exists.")
            
        # 2. Add status
        cursor.execute("SHOW COLUMNS FROM event_visitors LIKE 'status'")
        if not cursor.fetchone():
            print("Adding 'status' column...")
            cursor.execute("ALTER TABLE event_visitors ADD COLUMN status VARCHAR(50) DEFAULT 'pre_registered'")
            print("Added 'status'.")
        else:
            print("'status' column already exists.")

    connection.commit()
    print("Schema updated successfully.")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
