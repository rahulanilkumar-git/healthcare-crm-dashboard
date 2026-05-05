# API Routes

Base URL: `http://localhost:8000/api`

Demo credentials after seeding:

- Email: `admin@healthcrm.test`
- Password: `password123`

## Authentication

| Method | Path | Description |
| --- | --- | --- |
| POST | `/auth/register` | Create a user and return a JWT |
| POST | `/auth/login` | Authenticate and return a JWT |
| POST | `/auth/logout` | Invalidate the current JWT |
| POST | `/auth/refresh` | Refresh the current JWT |
| GET | `/auth/me` | Return the authenticated user |

## Patients

| Method | Path | Description |
| --- | --- | --- |
| GET | `/patients` | Paginated patient list |
| POST | `/patients` | Create a patient |
| GET | `/patients/{id}` | Patient detail with history, appointments, and invoices |
| PUT | `/patients/{id}` | Update a patient |
| DELETE | `/patients/{id}` | Delete a patient |
| GET | `/patients/{id}/history` | Medical history for a patient |

## Appointments

| Method | Path | Description |
| --- | --- | --- |
| GET | `/appointments` | Paginated appointment list |
| POST | `/appointments` | Create an appointment |
| GET | `/appointments/{id}` | Appointment detail |
| PUT | `/appointments/{id}` | Update an appointment |
| DELETE | `/appointments/{id}` | Delete an appointment |
| GET | `/appointments/search?q=avery` | Search appointments by patient name |

## Payments and Invoices

| Method | Path | Description |
| --- | --- | --- |
| POST | `/payments` | Record a demo payment |
| GET | `/payments/{id}` | Payment detail |
| POST | `/payments/{id}/receipt` | Generate receipt payload |
| GET | `/patients/{id}/invoices` | Patient invoices and payments |

## Analytics

| Method | Path | Description |
| --- | --- | --- |
| GET | `/analytics/dashboard` | Dashboard totals and upcoming visits |
| GET | `/analytics/patients` | Patient counts by status |
| GET | `/analytics/revenue` | Monthly paid revenue |
| GET | `/analytics/appointments` | Appointment counts by status |
