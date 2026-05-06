# Healthcare CRM Dashboard

A full-stack healthcare CRM for clinic operations. It includes JWT authentication, role-based API access, patient management, appointment scheduling, medical history notes, invoicing, demo payment recording, receipts, and analytics summaries.

## Features

### Application
- Patient create, edit, delete, search, and detail view
- Medical history notes per patient
- Appointment create, edit, complete, cancel, and delete
- Invoice create, edit, delete, payment recording, and receipt view
- Analytics summaries for patients, appointments, and monthly revenue
- Login/logout with JWT
- Admin user management for admin, doctor, and patient accounts
- Role-based API restrictions

### Roles
- `admin`: full access, including billing and user management
- `doctor`: patients, appointments, records, and analytics
- `patient`: authenticated account role reserved for future patient portal access

## Tech Stack

### Backend
- Laravel 11
- PHP 8.2+
- MySQL 8
- JWT auth with `tymon/jwt-auth`
- PHPUnit feature tests

### Frontend
- React 18
- Vite
- Axios
- Lucide React icons
- Vitest API client tests

### DevOps
- Docker Compose
- GitHub Actions CI

## Quick Start

```bash
docker compose up -d --build
```

The Laravel container installs dependencies, prepares `.env`, runs migrations, seeds data, and starts the API.

Open:
- Frontend: http://localhost:3000
- API health: http://localhost:8000/api

Seed login:

```text
admin@healthcrm.test
password123
```

Other seeded account:

```text
doctor@healthcrm.test
password123
```

## Manual Setup

### Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Testing

Backend:

```bash
docker compose exec laravel php artisan test
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

## API Endpoints

### Authentication

```text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/register        admin only
```

### Users

```text
GET    /api/users              admin only
POST   /api/users              admin only
PUT    /api/users/{id}         admin only
DELETE /api/users/{id}         admin only
```

### Patients and Records

```text
GET    /api/patients
POST   /api/patients
GET    /api/patients/{id}
PUT    /api/patients/{id}
DELETE /api/patients/{id}
GET    /api/patients/{id}/history
POST   /api/patients/{id}/history
```

### Appointments

```text
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/{id}
PUT    /api/appointments/{id}
DELETE /api/appointments/{id}
GET    /api/appointments/search
```

### Billing

```text
GET    /api/patients/{id}/invoices
POST   /api/patients/{id}/invoices
PUT    /api/invoices/{id}
DELETE /api/invoices/{id}
POST   /api/payments
GET    /api/payments/{id}
POST   /api/payments/{id}/receipt
```

### Analytics

```text
GET /api/analytics/dashboard
GET /api/analytics/patients
GET /api/analytics/revenue
GET /api/analytics/appointments
```

## Database Tables

- `users`
- `patients`
- `medical_histories`
- `appointments`
- `invoices`
- `payments`
- `roles`
- `permissions`
- `permission_role`

## Notes

- Payments are recorded as a local demo workflow. Real Stripe checkout/payment intent integration is the main remaining production payment task.
- Do not commit generated logs from `backend/storage/logs`.
- The frontend intentionally uses simple tables and summary cards instead of chart-heavy analytics.

## License

MIT License - see [LICENSE](LICENSE).

## Author

Rahul Anilkumar
- LinkedIn: [linkedin.com/in/anilkumar-rahul](https://www.linkedin.com/in/anilkumar-rahul/)
- Email: rahulanilpunalur@gmail.com
