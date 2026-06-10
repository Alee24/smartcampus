# Riara ERP - Student API Integration Guide

This guide describes the recommended approach for fetching student details from the Riara ERP system.

---

## Recommended Approach: Use the Middleware API

Do **not** connect to Dynamics OData directly. Instead, use the normalized endpoints exposed by the ICT integration/middleware API.

### 1. Student Profile (Identity & Programme)

Retrieve normalized student registration and demographic details.

* **Endpoint:** `GET /api/erp/dynamics/students/{admission_number}/profile`
* **Example:** `GET http://<ict-server>:3000/api/erp/dynamics/students/24zad109733/profile`

**Response Example:**
```json
{
  "success": true,
  "admission_number": "24zad109733",
  "service": "StudentCard",
  "profile": {
    "admission_number": "24ZAD109733",
    "full_name": "Bushira Bashir Barre",
    "firstname": "Bushira",
    "middlename": "Bashir",
    "lastname": "Barre",
    "phone_number": "724048710",
    "email": "bbarre9733@stu.riarauniversity.ac.ke",
    "status": "Current",
    "program": "BCS",
    "date_registered": "2024-08-19",
    "gender": "Female",
    "id_number": null,
    "year_of_study": null,
    "raw": { "...full Dynamics row..." }
  },
  "correlation_id": "..."
}
```

> [!TIP]
> Use the fields directly under the `profile` object. Ignore `raw` unless you require extra Dynamics-specific properties.

---

### 2. Student Units (Current Semester Registrations)

Retrieve units/courses registered for the current or a specific semester.

* **Endpoint:** `GET /api/erp/dynamics/students/{admission_number}/units?semester=2026%20TRIMESTER%202`

Alternatively, fetch the compact version (which includes Moodle shortnames):
* **Endpoint:** `GET /api/erp/dynamics/students/{admission_number}/units/current-semester/compact?refresh=true`

**Compact Unit Fields:**
`unit_code`, `unit_name`, `course_shortname`, `unit_class_code`, `section_source`, `grades`, `attendance`, etc.

---

### 3. Raw ERP Row (Fallback)

If you need the exact, unmapped Dynamics row:

* **Endpoint:** `GET /api/erp/dynamics/students/{admission_number}`
* **Description:** Returns the full Dynamics `StudentCard` row under the `data` key.

---

### 4. Search and Utility Endpoints

| Need | Endpoint |
|------|----------|
| All current students | `GET /api/erp/dynamics/current-students?status=Current` |
| Recent registrations | `GET /api/erp/dynamics/registrations/current-recent?days=7` |
| Health check | `GET /api/erp/dynamics/health` |

---

## Integration Steps

### Step 1: Get Network Access
Ensure your server is authorized to reach the integration API (coordinate with ICT to check if VPN/LAN or specific hosted URLs are needed, and to confirm auth requirements).

### Step 2: Test with Profile Lookup
Verify connectivity using a simple `curl` request:
```bash
curl "http://<host>/api/erp/dynamics/students/24zad109733/profile"
```
*Note: Admission numbers are case-insensitive (`24zad109733` or `24ZAD109733` will both work).*

### Step 3: Map Required Fields

Map the fields from our API to your system:

| Target Field | Middleware API Source |
|--------------|-----------------------|
| Admission No | `profile.admission_number` |
| Name         | `profile.full_name` |
| Email        | `profile.email` |
| Phone        | `profile.phone_number` |
| Programme    | `profile.program` |
| Status       | `profile.status` |
| Gender       | `profile.gender` |

### Step 4: Fetch Units (Optional)
If your flow requires registered courses, perform a secondary call to the student units endpoint.

### Step 5: Handle Errors

Handle non-200 HTTP statuses properly:

| HTTP Status | Meaning |
|-------------|---------|
| **404** | Student not found in ERP |
| **502** | Dynamics unreachable / timeout |
| **503** | Dynamics configuration missing on server |

The error response payload contains a `code`, `message`, and `correlation_id` for tracking and support.

### Step 6: Implement Caching
To minimize overhead on the ERP:
- Profile and units responses are cached (e.g. Redis for ~30 min).
- If you need immediate fresh data after an ERP change, append `?refresh=true` to the units endpoint.
- Do not query the ERP on every page load; cache the response locally in your application.

---

## Direct OData Access (Not Recommended)

If you bypass the middleware, you must query Dynamics OData directly:
```http
GET {DYNAMICS_BASE_URL}/ODataV4/Company('RIARA%20LIVE')/StudentCard?$filter=Student_No eq '24zad109733'
```

**Challenges with Direct Access (Solved by the Middleware):**
1. Inconsistent naming conventions (e.g., `E_Mail`, `Phone_No`, `No` vs `Admission_No`).
2. VPN, NTLM, or Basic Authentication handling.
3. Lack of normalized JSON schemas.
4. Latency and slow response times.

---

## Minimal Code Example (JavaScript/Fetch)

```javascript
const ICT_API_BASE = "http://<ict-server>:3000";
const admission = "24zad109733";

async function fetchStudentProfile() {
  try {
    const res = await fetch(`${ICT_API_BASE}/api/erp/dynamics/students/${admission}/profile`, {
      headers: {
        "Accept": "application/json",
        "X-Correlation-ID": `client-sys-${Date.now()}` // optional request correlation tracking
      }
    });

    if (!res.ok) {
      console.error(`Error fetching student: ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data.success && data.profile) {
      const student = data.profile;
      console.log(`Loaded student: ${student.full_name} (${student.program})`);
      return student;
    }
  } catch (error) {
    console.error("Failed to connect to ERP middleware API:", error);
  }
  return null;
}
```

---

## Quick Summary
> To fetch a student from Riara ERP, query:
> **`GET /api/erp/dynamics/students/{admission_number}/profile`**
> on the integration server. This returns normalized JSON (name, email, phone, program, status). To check enrolled units, call:
> **`GET /api/erp/dynamics/students/{admission_number}/units`**.
