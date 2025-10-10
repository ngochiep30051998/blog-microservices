# Auth Service - Shared Database Configuration

## Thay đổi sau khi chuyển sang shared database

### ✅ Hoàn thành
1. **Cấu hình Database Chung**
   - Auth-service giờ dùng chung database với user-service
   - Sử dụng `POSTGRES_*` environment variables thống nhất
   - Xóa cấu hình database riêng biệt

2. **Shared User Entity**
   - Xóa `apps/auth-service/src/entities/user.entity.ts`
   - Import User entity từ user-service: `../../../user-service/src/entities/user.entity`
   - Tránh duplicate code và đảm bảo consistency

3. **Environment Variables**
   - Dùng chung `.env` file
   - Sử dụng cùng connection parameters với user-service

### 🔧 Cấu hình hiện tại

#### Database Connection (Shared)
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('POSTGRES_HOST'),
    port: configService.get('POSTGRES_PORT'), 
    username: configService.get('POSTGRES_USER'),
    password: configService.get('POSTGRES_PASSWORD'),
    database: configService.get('POSTGRES_DB'), // Shared DB
    entities: [User], // From user-service
    synchronize: configService.get('NODE_ENV') === 'development',
    logging: configService.get('NODE_ENV') === 'development',
    ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
  }),
})
```

#### Services & Ports
- **Auth Service**: Port 3001, endpoints `/api/auth/*`
- **User Service**: Port 3000, endpoints `/api/users/*` 
- **Shared Database**: Same PostgreSQL instance

### 📋 Migration Status

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth API Migration | ✅ Complete | register/login moved to auth-service |
| Shared Database | ✅ Complete | No separate database needed |
| User Entity | ✅ Complete | Shared from user-service |
| Build Tests | ✅ Complete | Both services build successfully |
| Environment Config | ✅ Complete | Using POSTGRES_* variables |
| Documentation | ✅ Complete | Updated migration guide |

### 🚀 Benefits của Shared Database

1. **No Data Duplication**: Không cần sync user data giữa services
2. **Simpler Deployment**: Chỉ cần 1 database instance
3. **Consistency**: User data luôn nhất quán
4. **Lower Complexity**: Không cần database migration/sync mechanisms
5. **Cost Effective**: Tiết kiệm tài nguyên database

### 📝 Next Steps

1. **Test Services**:
   ```bash
   npx nx serve auth-service   # Port 3001
   npx nx serve user-service   # Port 3000
   ```

2. **Update Client Apps**: 
   - Change register endpoint: `/users/register` → `/auth/register`
   - Change login endpoint: `/users/login` → `/auth/login`

3. **API Gateway**: Update routing rules

4. **Deploy**: Both services can share same database connection string

### 🔗 Related Files
- `apps/auth-service/src/app/app.module.ts` - Database config
- `apps/auth-service/src/services/auth.service.ts` - User entity import
- `docs/auth-service-migration.md` - Complete documentation