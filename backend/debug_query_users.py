import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

async def main():
    db_url = "mysql+aiomysql://gatepass_user:user_password@localhost:3307/gatepass_v2"
    engine = create_async_engine(db_url)
    async with engine.begin() as conn:
        res = await conn.execute(text('SELECT id, admission_number, full_name, profile_image FROM users LIMIT 10;'))
        for r in res.fetchall():
            print(r)

if __name__ == '__main__':
    asyncio.run(main())
