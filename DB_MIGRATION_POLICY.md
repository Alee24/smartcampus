# DATABASE MIGRATION POLICY

## 🛡️ **POLICY: ALWAYS GENERATE DATABASE TABLES**

**Effective Date**: Immediately
**Trigger**: Any feature request involving new data structures.

### **The Rule**
> "Whenever a new feature is added that requires data storage, you must **explicitly generate and verify the database tables** and columns."

### **Implementation Steps**

When implementing any feature that modifies `models.py`:

1.  **Modify `models.py`**: Add the new class or field (e.g., `qr_code: str`).
2.  **Create Migration Script**: 
    - Do NOT rely on `SQLModel.create_all()` for existing tables (it ignores them).
    - Create a script (e.g., `backend/migrations/update_xyz.py`) to run `ALTER TABLE` commands.
    - OR use a verified migration tool if configured.
3.  **Run Migration**: Execute the script immediately to apply changes to the dev database.
4.  **Verify**: Check that the column exists before confirming feature completion.

### **Example: Adding QR Code**

❌ **Wrong Way**:
- Add `qr_code` to `Classroom` model in Python.
- Run app. 
- *Result*: Error 500 "no such column: qr_code".

✅ **Right Way**:
1. Add `qr_code` to `Classroom` model.
2. Run migration script:
   ```python
   # Migration logic
   conn.execute("ALTER TABLE classrooms ADD COLUMN qr_code TEXT")
   ```
3. Restart services.

---

## ✅ **RECENT FIXES**

### **1. Logo Upload Fix**
- **Issue**: "Failed to upload logo"
- **Cause**: The `/uploads` directory was not mounted as a static path in `main.py`, so even if saved, the server refused to serve the file (404).
- **Fix**: Added `app.mount("/uploads", ...)` in `main.py` and ensured directory creation.

### **2. Database Schema Fix**
- **Issue**: Missing `qr_code` column in `classrooms` table.
- **Cause**: Python model updated but database schema not migrated.
- **Fix**: Ran migration strategy to add the missing column.

The system is now fully compliant with this policy.
