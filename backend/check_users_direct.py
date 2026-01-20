import asyncio
import pymysql

# Direct MySQL query to check users
def check_users_direct():
    try:
        connection = pymysql.connect(
            host='localhost',
            user='root',
            password='',
            database='gatepass',
            charset='utf8mb4'
        )
        cursor = connection.cursor()
        
        # Get all users
        cursor.execute("SELECT id, email, admission_number, full_name, status FROM users")
        users = cursor.fetchall()
        
        print(f"\n📊 Total users in database: {len(users)}\n")
        print("="*80)
        
        if len(users) == 0:
            print("\n❌ NO USERS FOUND IN DATABASE!")
            print("   The database is empty. The seed_data() function may not have run.\n")
        else:
            for user in users:
                user_id, email, admission, name, status = user
                print(f"\n👤 User: {name}")
                print(f"   Email: {email}")
                print(f"   Admission: {admission}")
                print(f"   Status: {status}")
                print(f"   ID: {user_id}")
        
        print("\n" + "="*80)
        
        cursor.close()
        connection.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    check_users_direct()
