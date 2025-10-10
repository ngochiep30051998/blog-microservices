# Auth Service - API Migration Documentation

## Tổng quan
Document này mô tả việc chuyển 2 API `register` và `login` từ `user-service` sang `auth-service`.

## APIs đã được chuyển

### 1. Register API
- **Endpoint cũ**: `POST /api/users/register` 
- **Endpoint mới**: `POST /api/auth/register`
- **Chức năng**: Tạo tài khoản người dùng mới

### 2. Login API  
- **Endpoint cũ**: `POST /api/users/login`
- **Endpoint mới**: `POST /api/auth/login`
- **Chức năng**: Xác thực người dùng và trả về JWT token

## Thay đổi cấu trúc

### Auth Service (apps/auth-service)
**Các file mới được tạo:**
- `src/controllers/auth.controller.ts` - Authentication controller
- `src/services/auth.service.ts` - Authentication service với register/login logic

**Các file được cập nhật:**
- `src/app/app.module.ts` - Thêm TypeORM, JWT, Kafka modules (dùng chung database với user-service)
- `src/main.ts` - Thêm Swagger docs, validation, CORS

**Shared Resources:**
- Dùng chung User entity từ user-service
- Dùng chung database với user-service

### User Service (apps/user-service)
**Các thay đổi:**
- `src/controllers/user.controller.ts` - Xóa register/login endpoints
- `src/services/user.service.ts` - Xóa register/login methods và JwtService dependency

## Cấu hình Database

### Shared Database
- **Auth Service và User Service dùng chung database**
- Database: Theo `POSTGRES_DB` environment variable
- Port Auth Service: 3001 (mặc định)
- Port User Service: 3000 (mặc định) 
- Entities: User (shared từ user-service)

## Environment Variables (Shared với User Service)

```env
# Database (Shared)
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres  
POSTGRES_PASSWORD=password
POSTGRES_DB=blog_db  # Dùng chung với user-service

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Kafka
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=auth-service-client

# Service
PORT=3001  # Auth service port
NODE_ENV=development
```

## API Documentation

### Swagger Documentation
- **Auth Service**: http://localhost:3001/api/docs
- **User Service**: http://localhost:3000/api/docs (giữ nguyên)

### Request/Response Format

#### Register Request
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

#### Login Request  
```json
{
  "identifier": "user@example.com", // email hoặc username
  "password": "password123"
}
```

#### Auth Response
```json
{
  "success": true,
  "message": "Login successful", 
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "isActive": true,
      "createdAt": "2023-10-10T00:00:00.000Z"
    },
    "accessToken": "jwt-token",
    "tokenType": "Bearer", 
    "expiresIn": 86400
  }
}
```

## Kafka Events

Auth service sẽ publish các events sau:

- `user.created` - Khi user đăng ký thành công
- `user.login` - Khi user đăng nhập thành công

## Migration Checklist

- [x] Tạo auth-service với cấu trúc hoàn chỉnh
- [x] Di chuyển register/login logic sang AuthService
- [x] Cấu hình auth-service dùng chung database với user-service
- [x] Thêm Swagger documentation
- [x] Xóa register/login khỏi user-service
- [x] Test build cả 2 services
- [x] Cấu hình shared database (không cần tạo database mới)
- [ ] Update client applications để sử dụng endpoints mới
- [ ] Update API gateway routing rules
- [ ] Deploy auth-service

## Lưu ý quan trọng

1. **Shared Database**: Auth-service và User-service dùng chung database, không cần migration
2. **Client Updates**: Các frontend/mobile apps cần update endpoints  
3. **API Gateway**: Update routing từ `/users/register|login` sang `/auth/register|login`
4. **Monitoring**: Setup monitoring cho auth-service mới
5. **Security**: Đảm bảo JWT secret được configure đúng cách
6. **Entity Import**: Auth-service import User entity từ user-service (shared codebase)

## Commands hữu ích

```bash
# Build services
npx nx build auth-service
npx nx build user-service

# Run services 
npx nx serve auth-service  # Port 3001
npx nx serve user-service  # Port 3000

# Test services
curl -X POST http://localhost:3001/api/auth/register
curl -X POST http://localhost:3001/api/auth/login
```