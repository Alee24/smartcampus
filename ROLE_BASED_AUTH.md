# Role-Based Authentication & Dashboard Routing

## Overview
This document describes the role-based authentication system implemented in the Smart Campus application. The system automatically routes users to appropriate dashboards based on their assigned roles.

## Supported Roles

### 1. **Student**
- **Default Dashboard**: Student Dashboard (`student-dashboard`)
- **Access**: Limited to student-specific features
- **Features**:
  - Today's class schedule
  - Attendance tracking
  - Personal statistics
  - Timetable view

### 2. **Admin**
- **Default Dashboard**: Admin Dashboard (`dashboard`)
- **Access**: Full system access
- **Features**:
  - All management tools
  - User management
  - System settings
  - Analytics

### 3. **Security**
- **Default Dashboard**: Gates Dashboard (`gates-dashboard`)
- **Access**: Security and gate management
- **Features**:
  - Gate control
  - Entry logs
  - Security alerts
  - Visitor management

### 4. **Lecturer**
- **Default Dashboard**: Live Classes (`live`)
- **Access**: Teaching and course management
- **Features**:
  - Live class management
  - Attendance marking
  - Course reports
  - Timetable management

## Implementation Details

### Backend Changes

#### 1. Login Endpoint (`/api/token`)
**File**: `backend/app/main.py`

The login endpoint now returns comprehensive user information:

```python
{
    "access_token": "...",
    "token_type": "bearer",
    "user": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com",
        "admission_number": "STD001",
        "role": "student",  # Role name from database
        "profile_image": "url_or_null"
    }
}
```

**Key Changes**:
- Added user object to response
- Includes role from `user.role.name`
- Returns profile image for UI display

### Frontend Changes

#### 1. Login Component (`Login.tsx`)
**Stores user data in localStorage**:
- `token` - JWT access token
- `userRole` - User's role (student, admin, etc.)
- `userName` - Full name
- `userEmail` - Email or admission number
- `userImage` - Profile picture URL

#### 2. App Component (`App.tsx`)

**Role-Based Initialization**:
```typescript
// Load role from localStorage
const userRole = localStorage.getItem('userRole') || 'student'

// Set initial dashboard based on role
const getInitialTab = () => {
    switch(userRole.toLowerCase()) {
        case 'student': return 'student-dashboard'
        case 'admin': return 'dashboard'
        case 'security': return 'gates-dashboard'
        case 'lecturer': return 'live'
        default: return 'dashboard'
    }
}
```

**Role-Based Menu Configuration**:
```typescript
'Student': {
    'student-dashboard': true,
    'attendance': true,
    'timetable': true,
    'dashboard': false,  // Hide admin dashboard
    'users': false,      // Hide user management
    // ... other restricted features
}
```

## User Flow

### 1. Login Process
```
User enters credentials
    ↓
Backend validates & returns user + role
    ↓
Frontend stores: token, role, name, email, image
    ↓
App initializes with role-based dashboard
    ↓
Menu items filtered by role permissions
```

### 2. Dashboard Routing

**Student Login**:
```
Login → Student Dashboard
- Shows today's classes
- Personal attendance stats
- Recent attendance records
```

**Admin Login**:
```
Login → Admin Dashboard
- System overview
- Management tools
- Analytics
```

**Security Login**:
```
Login → Gates Dashboard
- Gate status
- Entry logs
- Security alerts
```

**Lecturer Login**:
```
Login → Live Classes
- Active sessions
- Attendance marking
- Class management
```

## Menu Visibility Rules

Each role has a configuration object that controls menu visibility:

```typescript
{
    'menu-item-id': boolean  // true = visible, false = hidden
}
```

**Example - Student Role**:
- ✅ Student Dashboard
- ✅ Attendance
- ✅ Timetable
- ❌ User Management
- ❌ Settings
- ❌ Integrations

## API Endpoints

### Student-Specific Endpoints
- `GET /api/students/my-classes/today` - Today's schedule
- `GET /api/students/my-attendance/recent` - Recent attendance
- `GET /api/students/my-stats` - Attendance statistics

### Role Validation
All protected endpoints use the `get_current_user` dependency which validates the JWT token and returns the authenticated user with their role.

## Security Features

### 1. Token-Based Authentication
- JWT tokens stored in localStorage
- Tokens include user identifier in payload
- Automatic session validation on app load

### 2. Role-Based Access Control (RBAC)
- Menu items filtered by role
- Dashboard routing based on role
- API endpoints can check user role

### 3. Session Management
- Automatic token validation on mount
- Logout clears all localStorage data
- Invalid tokens redirect to login

## Testing Role-Based Access

### Test Accounts
Use the configured test account:
- **Email**: `mettoalex@gmail.com`
- **Password**: `Digital2025`

### Switching Roles
To test different roles:
1. Login with account
2. Check `localStorage.userRole` in browser console
3. Manually change role in database if needed
4. Logout and login again

### Manual Role Override (Development Only)
```javascript
// In browser console
localStorage.setItem('userRole', 'student')
location.reload()
```

## Adding New Roles

### 1. Database
Add new role to `roles` table:
```sql
INSERT INTO roles (id, name, description) 
VALUES (uuid_generate_v4(), 'new_role', 'Description');
```

### 2. Frontend Routing
Update `getInitialTab()` in `App.tsx`:
```typescript
case 'new_role': return 'new-role-dashboard'
```

### 3. Menu Configuration
Add role config in `getDefaultConfig()`:
```typescript
'NewRole': {
    'dashboard': false,
    'new-role-dashboard': true,
    // ... other permissions
}
```

### 4. Create Dashboard Component
Create `NewRoleDashboard.tsx` and add route in `App.tsx`:
```typescript
{activeTab === 'new-role-dashboard' && <NewRoleDashboard />}
```

## Troubleshooting

### Issue: User sees wrong dashboard
**Solution**: Check `localStorage.userRole` matches database role

### Issue: Menu items not showing
**Solution**: Verify role configuration in `getDefaultConfig()`

### Issue: Login returns no role
**Solution**: Ensure user has role assigned in database

### Issue: Session expires immediately
**Solution**: Check JWT secret and token expiration settings

## Best Practices

1. **Always validate role on backend** - Never trust client-side role
2. **Use role from JWT token** - Don't rely solely on localStorage
3. **Implement role hierarchy** - Admin should have access to all features
4. **Log role changes** - Track when user roles are modified
5. **Clear localStorage on logout** - Prevent stale data

## Future Enhancements

- [ ] Role hierarchy (admin inherits all permissions)
- [ ] Dynamic permission system (beyond role-based)
- [ ] Multi-role support (user can have multiple roles)
- [ ] Role-based API middleware
- [ ] Audit log for role changes
- [ ] Permission caching for performance

## Related Files

### Backend
- `backend/app/main.py` - Login endpoint
- `backend/app/models.py` - User & Role models
- `backend/app/auth.py` - Authentication utilities

### Frontend
- `frontend/src/App.tsx` - Main app with routing
- `frontend/src/Login.tsx` - Login component
- `frontend/src/StudentDashboard.tsx` - Student dashboard
- `frontend/src/GatesDashboard.tsx` - Security dashboard

## Support

For issues or questions about role-based authentication:
1. Check this documentation
2. Review browser console for errors
3. Verify database role assignments
4. Check API responses in Network tab
