import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_support_tickets():
    async with engine.begin() as conn:
        print("🔧 Migrating Support Tickets...")
        
        create_tickets = """
        CREATE TABLE IF NOT EXISTS support_tickets (
            id CHAR(36) PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            contact VARCHAR(150) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'Pending',
            admin_response TEXT NULL,
            created_at DATETIME NOT NULL,
            updated_at DATETIME NOT NULL,
            INDEX idx_support_ticket_status (status),
            INDEX idx_support_ticket_name (name)
        )
        """
        await conn.execute(text(create_tickets))
        print("   ✓ Created 'support_tickets' table")
        print("✅ Support Tickets Migration Complete.")

if __name__ == "__main__":
    asyncio.run(migrate_support_tickets())
