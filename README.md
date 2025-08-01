# NestJS API Boilerplate

A comprehensive, production-ready NestJS API boilerplate with authentication, authorization, database integration, file upload, email services, payment gateways, and more.

## 🚀 Features

### Core Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens, RBAC with CASL
- **Database**: PostgreSQL with Prisma ORM, migrations, connection pooling
- **Caching**: Redis integration with TTL and pattern-based operations
- **File Storage**: Multi-provider support (Local, AWS S3, Cloudinary)
- **Email Services**: Multi-provider email (SMTP, Mailjet, SendGrid, AWS SES)
- **Payment Gateways**: Paystack, Flutterwave, Fincra, Stripe, PayPal support
- **API Documentation**: Swagger/OpenAPI with authentication
- **Validation**: Input validation with class-validator
- **Error Handling**: Global exception filters with structured responses
- **Rate Limiting**: Redis-based rate limiting with custom decorators
- **Audit Logging**: Automatic audit trail for operations
- **Health Checks**: Comprehensive health monitoring
- **Testing**: Unit and E2E testing setup with Jest

### Architecture

- **Clean Architecture**: Organized in Common, Core, and Shared modules
- **Modular Design**: Feature-based module organization
- **SOLID Principles**: Well-structured, maintainable codebase
- **Generic Models**: Easily adaptable to different use cases

## 🛠 Quick Start

### Prerequisites

- Node.js (v18+)
- Docker & Docker Compose
- PostgreSQL (if not using Docker)
- Redis (if not using Docker)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd asfaar-api
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

Edit `.env` with your configuration values.

### 4. Database Setup

#### Option A: Using Docker Compose (Recommended)

```bash
# Start all services (PostgreSQL, Redis, API)
docker-compose -f docker-compose.dev.yaml up -d

# Or start just the databases
docker-compose -f docker-compose.dev.yaml up -d postgres redis
```

#### Option B: Local Database

```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Optional: Seed the database
npm run db:seed
```

### 5. Start the Application

#### Development Mode

```bash
# If using Docker for the API
docker-compose -f docker-compose.dev.yaml up api

# Or run locally (requires local PostgreSQL & Redis)
npm run start:dev
```

The API will be available at:

- **API**: http://localhost:3000
- **Swagger Documentation**: http://localhost:3000/api/docs
- **Database Admin (Adminer)**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🐳 Docker Deployment

### Development Environment

```bash
# Full development stack with database management tools
docker-compose -f docker-compose.dev.yaml up -d
```

### Production Environment

```bash
# Production-optimized setup
docker-compose up -d
```

### Local Development (Host Network)

```bash
# For local development with host networking
docker-compose -f docker-compose.local.yaml up -d
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 📊 Database Management

### Prisma Commands

```bash
# Generate Prisma client
npx prisma generate

# Create and apply migrations
npx prisma migrate dev

# Deploy migrations (production)
npx prisma migrate deploy

# Reset database
npx prisma migrate reset

# Open Prisma Studio
npx prisma studio
```

### Database Seeding

```bash
npm run db:seed
```

## 🔧 Configuration

### Environment Variables

Key environment variables to configure:

```env
# Application
NODE_ENV=development
API_PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/database
REDIS_URL=redis://:password@localhost:6379

# Security
JWT_SECRET=your-jwt-secret
BCRYPT_SALT_ROUNDS=12

# Email (choose one provider)
MAIL_HOST=smtp.gmail.com
MAILJET_API_KEY=your-mailjet-key
SENDGRID_API_KEY=your-sendgrid-key

# File Storage (choose one)
STORAGE_TYPE=local
AWS_S3_BUCKET_NAME=your-bucket
CLOUDINARY_CLOUD_NAME=your-cloud

# Payment Gateways
PAYSTACK_SECRET_KEY=your-paystack-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-key
STRIPE_SECRET_KEY=your-stripe-key
```

## 📁 Project Structure

```
src/
├── common/           # Common utilities and shared code
├── core/            # Core application infrastructure
├── shared/          # Shared services and components
├── modules/         # Feature modules
│   ├── auth/        # Authentication & authorization
│   ├── user/        # User management
│   ├── mail/        # Email services
│   ├── audit/       # Audit logging
│   └── ...
├── providers/       # External service providers
│   ├── prisma/      # Database provider
│   ├── redis/       # Cache provider
│   └── ...
├── config/          # Configuration files
├── constants/       # Application constants
├── decorators/      # Custom decorators
├── filters/         # Exception filters
├── interceptors/    # Custom interceptors
├── pipes/           # Custom pipes
└── tests/           # Test files
```

## 🔌 API Endpoints

### Authentication

- `POST /api/v1/auth/sign-up` - User registration
- `POST /api/v1/auth/sign-in` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### User Management

- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `GET /api/v1/users` - List users (admin)
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user

### Address Management

- `GET /api/v1/addresses` - Get user addresses
- `POST /api/v1/addresses` - Create new address
- `GET /api/v1/addresses/:id` - Get address by ID
- `PUT /api/v1/addresses/:id` - Update address
- `DELETE /api/v1/addresses/:id` - Delete address
- `GET /api/v1/addresses/default` - Get default address
- `POST /api/v1/addresses/:id/set-default` - Set as default
- `POST /api/v1/addresses/:id/verify` - Verify address
- `GET /api/v1/addresses/search?q=term` - Search addresses

### Dynamic Forms (Form Templates)

#### Form Template Management

- `GET /api/v1/forms` - List all form templates (with pagination)
- `POST /api/v1/forms` - Create new form template
- `GET /api/v1/forms/:id` - Get form template by ID
- `PUT /api/v1/forms/:id` - Update form template
- `DELETE /api/v1/forms/:id` - Delete form template
- `POST /api/v1/forms/:id/duplicate` - Duplicate form template
- `GET /api/v1/forms/:id/analytics` - Get form analytics

#### Form Builder APIs

- `POST /api/v1/forms/:id/sections` - Add section to form
- `PUT /api/v1/forms/sections/:id` - Update form section
- `DELETE /api/v1/forms/sections/:id` - Delete form section
- `POST /api/v1/forms/sections/:id/groups` - Add group to section
- `PUT /api/v1/forms/groups/:id` - Update input group
- `DELETE /api/v1/forms/groups/:id` - Delete input group
- `POST /api/v1/forms/groups/:id/fields` - Add field to group
- `PUT /api/v1/forms/fields/:id` - Update form field
- `DELETE /api/v1/forms/fields/:id` - Delete form field

### Health Check

- `GET /api/v1/health` - Application health status

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@example.com or create an issue in the repository.
