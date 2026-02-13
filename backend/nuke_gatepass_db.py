from sqlalchemy import create_engine, text

def nuke_v2():
    print("Nuking gatepass_db...")
    engine = create_engine("mysql+pymysql://root:@127.0.0.1:3306/")
    try:
        with engine.connect() as conn:
            conn.execute(text("DROP DATABASE IF EXISTS gatepass_db"))
            print("Dropped gatepass_db.")
            conn.execute(text("CREATE DATABASE gatepass_db"))
            print("Recreated gatepass_db.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    nuke_v2()
