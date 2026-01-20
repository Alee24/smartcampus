import pymysql
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def update_admin_user():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',
            database='gatepass',
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        
        # Hash the password
        hashed_password = pwd_context.hash("Digital2025")
        
        # Update the existing user to use mettoalex@gmail.com
        update_query = """
        UPDATE users 
        SET email = %s, 
            full_name = %s,
            first_name = %s,
            last_name = %s,
            hashed_password = %s
        WHERE admission_number = %s
        """
        
        cursor.execute(update_query, (
            "mettoalex@gmail.com",
            "Alex Metto",
            "Alex",
            "Metto",
            hashed_password,
            "ADMIN001"
        ))
        
        connection.commit()
        
        print("\n" + "="*70)
        print("✅ ADMIN USER UPDATED SUCCESSFULLY!")
        print("="*70)
        print("\n🔑 ADMIN CREDENTIALS:")
        print(f"   Email:     mettoalex@gmail.com")
        print(f"   Password:  Digital2025")
        print(f"\n   OR")
        print(f"\n   Admission: ADMIN001")
        print(f"   Password:  Digital2025")
        print("\n" + "="*70 + "\n")
        
        # Verify the update
        cursor.execute("SELECT email, full_name, admission_number FROM users WHERE admission_number = 'ADMIN001'")
        result = cursor.fetchone()
        if result:
            print(f"✅ Verified: {result[1]} ({result[0]}) - {result[2]}\n")
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}\n")

if __name__ == "__main__":
    update_admin_user()
