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
        print("Connected. Checking columns for 'entry_logs' table...")
        
        # 1. Add ip_address
        cursor.execute("SHOW COLUMNS FROM entry_logs LIKE 'ip_address'")
        if not cursor.fetchone():
            print("Adding 'ip_address' column...")
            cursor.execute("ALTER TABLE entry_logs ADD COLUMN ip_address VARCHAR(45) NULL") # IPv6 length
            print("Added 'ip_address'.")
        else:
            print("'ip_address' column already exists.")
            
        # 2. Add verification_image
        cursor.execute("SHOW COLUMNS FROM entry_logs LIKE 'verification_image'")
        if not cursor.fetchone():
            print("Adding 'verification_image' column...")
            cursor.execute("ALTER TABLE entry_logs ADD COLUMN verification_image VARCHAR(255) NULL")
            print("Added 'verification_image'.")
        else:
            print("'verification_image' column already exists.")

    connection.commit()
    print("Schema updated successfully.")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'connection' in locals() and connection.open:
        connection.close()
