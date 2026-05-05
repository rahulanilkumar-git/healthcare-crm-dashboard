# 🏥 Healthcare CRM Dashboard

A production-grade healthcare management system with patient tracking, appointment scheduling, payment processing, and analytics dashboard.

## 📋 Features

### Core Features
- **Patient Management**: Create, update, and manage patient records with medical history
- **Appointment Scheduling**: Book, reschedule, and manage patient appointments
- **Payment Processing**: Integrate Stripe for secure online payments and invoicing
- **Analytics Dashboard**: Real-time dashboards showing patient metrics, revenue, and appointment trends
- **User Authentication**: Secure JWT-based authentication
- **Role-Based Access**: Admin, Doctor, and Patient roles with permission management

### Technical Features
- RESTful API architecture
- Docker containerization
- CI/CD pipeline with GitHub Actions
- Comprehensive error handling
- Database migrations and seeding
- API rate limiting
- Pagination support

## 🛠️ Tech Stack

### Backend
- **Framework**: Laravel 11
- **Language**: PHP 8.1+
- **Database**: MySQL 8.0+
- **Authentication**: JWT (tymon/jwt-auth)
- **Payment**: Stripe API
- **Task Queue**: Laravel Queue

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **State Management**: Redux Toolkit
- **API Client**: Axios
- **UI Components**: Material-UI / Tailwind CSS
- **Charts**: Chart.js

### DevOps
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions
- **Version Control**: Git

## 📦 Installation

### Quick Start with Docker

```bash
git clone https://github.com/rahulanilkumar-git/healthcare-crm-dashboard.git
cd healthcare-crm-dashboard

docker-compose up -d

docker-compose exec laravel php artisan migrate --seed

# Frontend: http://localhost:3000
# API: http://localhost:8000/api
```

### Manual Setup

#### Backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate --seed
php artisan serve
```

#### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 🚀 API Endpoints

### Authentication
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
```

### Patients
```
GET    /api/patients
POST   /api/patients
GET    /api/patients/{id}
PUT    /api/patients/{id}
DELETE /api/patients/{id}
GET    /api/patients/{id}/history
```

### Appointments
```
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/{id}
PUT    /api/appointments/{id}
DELETE /api/appointments/{id}
GET    /api/appointments/search
```

### Payments
```
POST   /api/payments
GET    /api/payments/{id}
POST   /api/payments/{id}/receipt
GET    /api/patients/{id}/invoices
```

### Analytics
```
GET    /api/analytics/dashboard
GET    /api/analytics/patients
GET    /api/analytics/revenue
GET    /api/analytics/appointments
```

## 📊 Database Schema

- `users` - User accounts
- `patients` - Patient information
- `medical_histories` - Medical records
- `appointments` - Appointment bookings
- `payments` - Payment transactions
- `invoices` - Patient invoices
- `roles` - User roles
- `permissions` - Role permissions

## 🧪 Testing

```bash
cd backend
php artisan test

cd frontend
npm test
```

## 🔐 Security Features

✅ JWT token-based authentication  
✅ CORS protection  
✅ SQL injection prevention  
✅ XSS protection  
✅ CSRF token validation  
✅ Rate limiting  
✅ Password hashing (bcrypt)  
✅ Stripe PCI compliance  

## 🚀 Deployment

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 📚 Documentation

- [API Routes](./API_ROUTES.md)
- [Contributing Guide](./CONTRIBUTING.md)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 👥 Author

**Rahul Anilkumar**
- LinkedIn: [linkedin.com/in/anilkumar-rahul](https://www.linkedin.com/in/anilkumar-rahul/)
- Email: rahulanilpunalur@gmail.com

---

**Version**: 1.0.0 | **Status**: Active Development ✅