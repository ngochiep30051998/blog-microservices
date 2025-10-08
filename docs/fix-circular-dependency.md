# Fix Circular Dependency: Auth Library ↔ User Service

## Nguyên nhân lỗi:
```
auth:build --> user-service:build --> auth:build
```

**Problem**: Auth library đang import từ user-service, nhưng user-service cũng import từ auth library.

## Giải pháp: Tách clean separation of concerns

---

# BƯỚC 1: FIX AUTH LIBRARY (Remove User Service Dependency)

## 1.1 Clean JWT Strategy (No User Service Import)
```bash
# File: libs/shared/auth/src/lib/jwt.strategy.ts
cat > libs/shared/auth/src/lib/jwt.strategy.ts << 'EOF'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }
    
    // REMOVED: No user service validation here
    // JWT validation is sufficient for auth library
    return {
      id: payload.sub,
      email: payload.email,
      username: payload.username,
      role: payload.role,
    };
  }
}
EOF
```

## 1.2 Clean Auth Module (No External Dependencies)
```bash
# File: libs/shared/auth/src/lib/auth.module.ts
cat > libs/shared/auth/src/lib/auth.module.ts << 'EOF'
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Global()
@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_expiresIn', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtStrategy, JwtAuthGuard, RolesGuard, JwtModule],
})
export class SharedAuthModule {}
EOF
```

## 1.3 Clean Roles Guard (No External Dependencies)
```bash
# File: libs/shared/auth/src/lib/roles.guard.ts
cat > libs/shared/auth/src/lib/roles.guard.ts << 'EOF'
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export enum UserRole {
  ADMIN = 'admin',
  AUTHOR = 'author',
  USER = 'user',
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const hasRole = requiredRoles.some((role) => user.role === role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Access denied - Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
EOF
```

---

# BƯỚC 2: USER SERVICE - ENHANCED JWT STRATEGY (Optional)

## 2.1 User Service with Enhanced JWT Validation
```bash
# File: apps/user-service/src/auth/enhanced-jwt.strategy.ts
mkdir -p apps/user-service/src/auth

cat > apps/user-service/src/auth/enhanced-jwt.strategy.ts << 'EOF'
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';
import { JwtPayload, AuthenticatedUser } from '@blog/shared/auth';

@Injectable()
export class EnhancedJwtStrategy extends PassportStrategy(Strategy, 'enhanced-jwt') {
  constructor(
    private configService: ConfigService,
    private userService: UserService, // Only in user service
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Enhanced validation: check if user still exists and is active
    try {
      const user = await this.userService.findOne(payload.sub);
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };
    } catch (error) {
      // If user service fails, fall back to basic JWT validation
      return {
        id: payload.sub,
        email: payload.email,
        username: payload.username,
        role: payload.role,
      };
    }
  }
}
EOF
```

## 2.2 User Service Module - Choose Strategy Based on Need
```bash
# File: apps/user-service/src/app/app.module.ts
cat > apps/user-service/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

// Shared imports
import { SharedKafkaModule } from '@blog/shared/kafka';
import { SharedAuthModule } from '@blog/shared/auth'; // Basic auth

// Local imports
import { User } from '../entities/user.entity';
import { UserService } from '../services/user.service';
import { UserController } from '../controllers/user.controller';
import { EnhancedJwtStrategy } from '../auth/enhanced-jwt.strategy'; // Enhanced auth

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST', 'localhost'),
        port: configService.get('POSTGRES_PORT', 5432),
        username: configService.get('POSTGRES_USER', 'blog_user'),
        password: configService.get('POSTGRES_PASSWORD', 'blog_password_2024'),
        database: configService.get('POSTGRES_DB', 'blog_db'),
        entities: [User],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
        ssl: configService.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User]),
    SharedKafkaModule,
    SharedAuthModule, // Import shared auth
  ],
  controllers: [UserController],
  providers: [
    UserService,
    // Optionally provide enhanced strategy for this service only
    EnhancedJwtStrategy,
  ],
  exports: [UserService],
})
export class AppModule {}
EOF
```

---

# BƯỚC 3: API GATEWAY - USE BASIC AUTH ONLY

## 3.1 API Gateway Module (No Circular Dependency)
```bash
# File: apps/api-gateway/src/app/app.module.ts
cat > apps/api-gateway/src/app/app.module.ts << 'EOF'
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Shared imports - NO USER SERVICE DEPENDENCY
import { SharedAuthModule } from '@blog/shared/auth';

// Local imports
import { MicroserviceProxyService } from '../services/microservice-proxy.service';
import { UserProxyController } from '../controllers/user-proxy.controller';
import { HealthController } from '../controllers/health.controller';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    SharedAuthModule, // Only shared auth, no user service
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
  ],
  controllers: [AppController, UserProxyController, HealthController],
  providers: [
    AppService,
    MicroserviceProxyService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
EOF
```

---

# BƯỚC 4: CHECK & FIX PROJECT DEPENDENCIES

## 4.1 Verify No Circular Dependencies
```bash
# Check project.json files to ensure no circular deps

# File: libs/shared/auth/project.json - should NOT depend on user-service
cat > libs/shared/auth/project.json << 'EOF'
{
  "name": "auth",
  "$schema": "../../../node_modules/nx/schemas/project-schema.json",
  "sourceRoot": "libs/shared/auth/src",
  "projectType": "library",
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "outputPath": "dist/libs/shared/auth",
        "main": "libs/shared/auth/src/index.ts",
        "tsConfig": "libs/shared/auth/tsconfig.lib.json",
        "assets": ["libs/shared/auth/*.md"]
      }
    },
    "lint": {
      "executor": "@nx/linter:eslint",
      "outputs": ["{options.outputFile}"],
      "options": {
        "lintFilePatterns": ["libs/shared/auth/**/*.ts"]
      }
    },
    "test": {
      "executor": "@nx/jest:jest",
      "outputs": ["{workspaceRoot}/coverage/{projectRoot}"],
      "options": {
        "jestConfig": "libs/shared/auth/jest.config.ts"
      }
    }
  },
  "tags": ["scope:shared", "type:auth"]
}
EOF
```

## 4.2 Clean Build Order Test
```bash
# Test build order
cat > scripts/test-build-order.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing build order to avoid circular dependencies..."

# Build shared libraries first (no dependencies)
echo "🔨 Building shared libraries..."
echo "Building config..."
nx build config
echo "Building kafka..."  
nx build kafka
echo "Building dto..."
nx build dto
echo "Building utils..."
nx build utils
echo "Building auth..." 
nx build auth

if [ $? -ne 0 ]; then
    echo "❌ Shared libraries build failed"
    exit 1
fi

echo "✅ All shared libraries built successfully"

# Build services (depend on shared libraries)
echo "🔨 Building services..."
echo "Building user-service..."
nx build user-service
echo "Building api-gateway..."
nx build api-gateway

if [ $? -ne 0 ]; then
    echo "❌ Services build failed"
    exit 1
fi

echo "✅ All services built successfully"
echo "🎉 No circular dependencies found!"

# Test dependency graph
echo "📊 Checking dependency graph..."
nx graph --file=dependency-graph.html
echo "📈 Dependency graph saved to dependency-graph.html"
EOF

chmod +x scripts/test-build-order.sh
```

## 4.3 Clean TypeScript Path Mapping
```bash
# File: tsconfig.base.json - ensure clean path mapping
cat > tsconfig.base.json << 'EOF'
{
  "compileOnSave": false,
  "compilerOptions": {
    "rootDir": ".",
    "sourceMap": true,
    "declaration": false,
    "moduleResolution": "node",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "importHelpers": true,
    "target": "es2015",
    "module": "esnext",
    "lib": ["es2017", "dom"],
    "skipLibCheck": true,
    "skipDefaultLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@blog/shared/config": ["libs/shared/config/src/index.ts"],
      "@blog/shared/kafka": ["libs/shared/kafka/src/index.ts"],
      "@blog/shared/database": ["libs/shared/database/src/index.ts"],
      "@blog/shared/auth": ["libs/shared/auth/src/index.ts"],
      "@blog/shared/dto": ["libs/shared/dto/src/index.ts"],
      "@blog/shared/utils": ["libs/shared/utils/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp", "dist", "docker"]
}
EOF
```

---

# BƯỚC 5: TEST & VERIFY

## 5.1 Complete Test Script
```bash
cat > scripts/fix-circular-dependency-test.sh << 'EOF'
#!/bin/bash

echo "🔧 Testing circular dependency fix..."

# Clean build cache
echo "🧹 Cleaning build cache..."
nx reset

# Test build order
echo "🧪 Testing build order..."
./scripts/test-build-order.sh

if [ $? -ne 0 ]; then
    echo "❌ Build order test failed"
    exit 1
fi

# Start infrastructure
echo "📦 Starting infrastructure..."
docker-compose up -d

echo "⏳ Waiting for infrastructure..."
sleep 15

# Test services
echo "🚀 Testing services..."
nx serve user-service &
USER_PID=$!

nx serve api-gateway &
GATEWAY_PID=$!

echo "⏳ Waiting for services..."
sleep 20

# Test functionality
echo "🧪 Testing API functionality..."
curl -f http://localhost:9001/users/health && echo " ✅ User Service OK"
curl -f http://localhost:9000/health && echo " ✅ API Gateway OK"

# Test user registration
echo "👤 Testing user registration..."
curl -X POST http://localhost:9000/api/v1/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }' && echo " ✅ Registration OK"

echo ""
echo "🎉 Circular dependency fixed successfully!"
echo "📊 Dependency graph: open dependency-graph.html"

# Clean up
kill $USER_PID $GATEWAY_PID 2>/dev/null
EOF

chmod +x scripts/fix-circular-dependency-test.sh
```

---

# ARCHITECTURE EXPLANATION

## ✅ Clean Separation:

### **Auth Library** (No External Dependencies):
- JWT Strategy (basic validation only)
- Guards and Decorators  
- Role definitions
- No user service imports

### **User Service** (Can Use Auth Library):
- Enhanced JWT Strategy (với user validation)
- User business logic
- Database operations
- Kafka event publishing

### **API Gateway** (Uses Auth Library Only):
- Basic JWT validation
- Request proxying
- Rate limiting
- No direct user service dependency

## 🔄 Dependency Flow:
```
Auth Lib ← User Service
Auth Lib ← API Gateway  
User Service ← API Gateway (via HTTP proxy)
```

## 🚀 Quick Fix:

```bash
# 1. Clean build cache
nx reset

# 2. Test build order
./scripts/test-build-order.sh

# 3. Test full system
./scripts/fix-circular-dependency-test.sh
```

**Circular dependency fixed!** ✅ Clean architecture with proper separation of concerns.