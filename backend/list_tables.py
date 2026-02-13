from sqlalchemy import create_engine, text

def list_tables():
    engine = create_engine("mysql+pymysql://root:@127.0.0.1:3306/gatepass")
    try:
        with engine.connect() as conn:
            print("Fetching tables...")
            res = conn.execute(text("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'gatepass'"))
            tables = [row[0] for row in res]
            print(f"Tables found: {tables}")
            return tables
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    list_tables()
