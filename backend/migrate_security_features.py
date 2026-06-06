import asyncio
from sqlalchemy import text
from app.database import engine

async def migrate_security_features():
    async with engine.begin() as conn:
        print("🔧 Migrating Security features (Incidents and Lost & Found)...")
        
        # 1. Create incident_reports table
        create_incidents = """
        CREATE TABLE IF NOT EXISTS incident_reports (
            id CHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            reporter_id CHAR(36) NOT NULL,
            status VARCHAR(50) DEFAULT 'reported',
            incident_date DATETIME NOT NULL,
            location VARCHAR(100) NOT NULL,
            severity VARCHAR(20) DEFAULT 'low',
            target_user_id CHAR(36) NULL,
            target_name_external VARCHAR(150) NULL,
            evidence_image VARCHAR(512) NULL,
            notes TEXT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_incident_status (status),
            INDEX idx_incident_severity (severity),
            INDEX idx_incident_location (location),
            FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
        )
        """
        await conn.execute(text(create_incidents))
        print("   ✓ Created 'incident_reports' table")

        # 2. Create incident_followups table
        create_followups = """
        CREATE TABLE IF NOT EXISTS incident_followups (
            id CHAR(36) PRIMARY KEY,
            incident_id CHAR(36) NOT NULL,
            followup_type VARCHAR(50) NOT NULL,
            description TEXT NOT NULL,
            officer_id CHAR(36) NOT NULL,
            timestamp DATETIME NOT NULL,
            INDEX idx_followup_type (followup_type),
            FOREIGN KEY (incident_id) REFERENCES incident_reports(id) ON DELETE CASCADE,
            FOREIGN KEY (officer_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
        await conn.execute(text(create_followups))
        print("   ✓ Created 'incident_followups' table")

        # 3. Create lost_and_found_items table
        create_lost_found = """
        CREATE TABLE IF NOT EXISTS lost_and_found_items (
            id CHAR(36) PRIMARY KEY,
            item_name VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            location_found VARCHAR(100) NOT NULL,
            date_found DATE NOT NULL,
            status VARCHAR(50) DEFAULT 'found',
            finder_name VARCHAR(150) NULL,
            claimant_name VARCHAR(150) NULL,
            claimant_id CHAR(36) NULL,
            date_claimed DATE NULL,
            image_path VARCHAR(512) NULL,
            notes TEXT NULL,
            handler_id CHAR(36) NOT NULL,
            created_at DATETIME NOT NULL,
            INDEX idx_lost_item_status (status),
            INDEX idx_lost_item_name (item_name),
            INDEX idx_lost_item_location (location_found),
            FOREIGN KEY (claimant_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (handler_id) REFERENCES users(id) ON DELETE CASCADE
        )
        """
        await conn.execute(text(create_lost_found))
        print("   ✓ Created 'lost_and_found_items' table")

        print("✅ Security Features Database Migration Complete.")

if __name__ == "__main__":
    asyncio.run(migrate_security_features())
