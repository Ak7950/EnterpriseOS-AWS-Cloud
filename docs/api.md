# API Reference

The API is served beneath /api. Except for login, the routes below require an Authorization: Bearer <JWT> header. Successful responses use a JSON success envelope; errors include a message and an error code.

## Authentication and profile

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | /api/auth/login | Public | Validate email/password and return a JWT, user profile, and first-login password-change indicator. |
| POST | /api/auth/change-password | Authenticated | Change the initial password; requires the current password and a new password of at least 12 characters. |
| GET | /api/me | Authenticated | Return the current user's profile and department. |
| GET | /api/dashboard | Authenticated | Return organization-scoped summary counts, task status totals, and recent tasks. |

## Organization and workforce

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/employees | Admin, Super Admin, Manager | List searchable employee records; managers are limited to their direct reports and themselves. |
| POST | /api/employees | Admin, Super Admin | Create an employee with a unique one-time initial password; only its hash is stored. |
| GET | /api/departments | Authenticated | List departments and active employee counts for the current organization. |
| POST | /api/departments | Admin, Super Admin | Create a department. |
| GET | /api/team-members | Admin, Super Admin, Manager | List organization users for admins or direct reports/self for managers. |

## Attendance and leave

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | /api/attendance/clock-in | Authenticated | Create today's attendance record; a duplicate daily record returns 409. |
| POST | /api/attendance/clock-out | Authenticated | Close the authenticated user's open attendance record for today. |
| GET | /api/attendance?limit=&search= | Authenticated | Search and list attendance records within the caller's permitted scope. |
| GET | /api/leaves | Authenticated | List leave requests within the caller's permitted scope. |
| POST | /api/leaves | Authenticated | Submit a leave request with type, date range, and reason; overlapping pending/approved requests are rejected. |
| PUT | /api/leaves/:id/decision | Admin, Super Admin, Manager | Approve or reject a pending leave request; managers can decide only for their direct reports. |

## Projects and delivery

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/projects | Authenticated | List projects within role-based scope. |
| POST | /api/projects | Admin, Super Admin, Manager | Create a project. |
| GET | /api/tasks | Authenticated | List tasks within role-based scope. |
| POST | /api/tasks | Admin, Super Admin, Manager | Create a task after validating project and assignee organization boundaries. |
| PUT | /api/tasks/:id/status | Assignee, project manager, Admin, Super Admin | Update a task to an allowed workflow status. |

Supported task statuses are BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, TESTING, and DONE.

## Performance, notifications, and governance

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| GET | /api/performance | Authenticated | List performance-review records within role-based scope. |
| GET | /api/notifications | Authenticated | List the current user's recent notifications. |
| PUT | /api/notifications/read-all | Authenticated | Mark the current user's notifications as read. |
| GET | /api/audit-logs | Admin, Super Admin | Retrieve recent audit activity for the organization. |

## Common errors

| HTTP status | Error code examples | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR, NO_ACTIVE_ATTENDANCE | Invalid request or operation state. |
| 401 | UNAUTHENTICATED, INVALID_TOKEN, INVALID_CREDENTIALS | Missing or invalid authentication. |
| 403 | FORBIDDEN, PASSWORD_CHANGE_REQUIRED | The authenticated user is not permitted to proceed. |
| 404 | NOT_FOUND | Resource or API route was not found. |
| 409 | CONFLICT, DUPLICATE_ATTENDANCE, OVERLAPPING_LEAVE | Request conflicts with existing data. |
| 429 | RATE_LIMITED | Login attempt limit reached. |
| 500 | INTERNAL_ERROR | Unexpected server error. |

This reference summarizes the implemented routes; it is not an OpenAPI/Swagger specification.
