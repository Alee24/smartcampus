import asyncio
from app.database import engine
from sqlmodel import Session, select
from app.models import SystemConfig

async def seed_ldap_configs():
    async with Session(engine) as session:
        configs = [
            {"key": "ldap_enabled", "value": "false", "category": "auth"},
            {"key": "ldap_server_uri", "value": "ldap://ldap.example.com:389", "category": "auth"},
            {"key": "ldap_bind_dn", "value": "cn=admin,dc=example,dc=com", "category": "auth"},
            {"key": "ldap_bind_password", "value": "", "category": "auth"},
            {"key": "ldap_base_dn", "value": "ou=users,dc=example,dc=com", "category": "auth"},
        ]
        
        for cfg in configs:
            stmt = select(SystemConfig).where(SystemConfig.key == cfg["key"])
            existing = (await session.exec(stmt)).first()
            if not existing:
                session.add(SystemConfig(**cfg))
        
        await session.commit()
        print("LDAP configurations seeded.")

if __name__ == "__main__":
    asyncio.run(seed_ldap_configs())
