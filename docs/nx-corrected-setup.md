# Fixed Package.json với Nx Version Mới Nhất

## 1. Package.json Corrected

```json
{
  "name": "blog-microservices",
  "version": "1.0.0",
  "description": "Blog microservices with NestJS and Kafka",
  "scripts": {
    "build": "nx build",
    "test": "nx test", 
    "lint": "nx workspace-lint && nx lint",
    "e2e": "nx e2e",
    "start:api-gateway": "nx serve api-gateway",
    "start:user-service": "nx serve user-service", 
    "start:post-service": "nx serve post-service",
    "start:comment-service": "nx serve comment-service",
    "start:notification-service": "nx serve notification-service",
    "start:analytics-service": "nx serve analytics-service",
    "build:all": "nx run-many --target=build --all --parallel",
    "test:all": "nx run-many --target=test --all --parallel",
    "lint:all": "nx run-many --target=lint --all --parallel",
    "docker:build": "docker-compose build",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down",
    "docker:logs": "docker-compose logs -f",
    "format": "nx format:write",
    "dep-graph": "nx graph",
    "affected:build": "nx affected:build",
    "affected:test": "nx affected:test",
    "affected:lint": "nx affected:lint"
  },
  "keywords": ["microservices", "nestjs", "kafka", "blog"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "@nx/eslint-plugin": "^21.0.0",
    "@nx/jest": "^21.0.0", 
    "@nx/js": "^21.0.0",
    "@nx/nest": "^21.0.0",
    "@nx/node": "^21.0.0",
    "@nx/workspace": "^21.0.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0", 
    "eslint": "^8.0.0",
    "nx": "^21.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "ts-node": "^10.0.0"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0", 
    "@nestjs/microservices": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/typeorm": "^10.0.0",
    "@nestjs/mongoose": "^10.0.0", 
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/swagger": "^7.0.0",
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "kafkajs": "^2.2.0",
    "typeorm": "^0.3.0",
    "pg": "^8.11.0",
    "@types/pg": "^8.0.0",
    "mongoose": "^7.0.0",
    "redis": "^4.6.0",
    "bcrypt": "^5.1.0",
    "@types/bcrypt": "^5.0.0",
    "passport-jwt": "^4.0.0", 
    "@types/passport-jwt": "^4.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.0.0",
    "swagger-ui-express": "^5.0.0",
    "nodemailer": "^6.9.0",
    "@types/nodemailer": "^6.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.0"
  }
}
```

## 2. Nx.json Corrected

```json
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "version": 2,
  "cli": {
    "defaultCollection": "@nx/nest"
  },
  "defaultProject": "api-gateway",
  "generators": {
    "@nx/nest": {
      "application": {
        "linter": "eslint"
      },
      "library": {
        "linter": "eslint"
      }
    }
  },
  "namedInputs": {
    "default": ["{projectRoot}/**/*", "sharedGlobals"],
    "production": [
      "default",
      "!{projectRoot}/**/?(*.)+(spec|test).[jt]s?(x)?(.snap)",
      "!{projectRoot}/tsconfig.spec.json",
      "!{projectRoot}/jest.config.[jt]s",
      "!{projectRoot}/.eslintrc.json"
    ],
    "sharedGlobals": []
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "inputs": ["production", "^production"],
      "cache": true
    },
    "test": {
      "inputs": ["default", "^production", "{workspaceRoot}/jest.preset.js"],
      "cache": true
    },
    "lint": {
      "inputs": ["default", "{workspaceRoot}/.eslintrc.json"],
      "cache": true
    }
  }
}
```

## 3. Setup Commands Corrected

### 3.1 Initialize Nx trong existing folder
```bash
# Cài đặt Nx CLI mới nhất (không cần global install)
cd blog-microservices

# Init Nx trong folder hiện tại
npx nx@latest init

# Install dependencies sau khi tạo package.json
npm install
```

### 3.2 Generate applications với @nx syntax
```bash
# Generate applications với syntax mới
nx generate @nx/nest:application api-gateway
nx generate @nx/nest:application user-service
nx generate @nx/nest:application post-service  
nx generate @nx/nest:application comment-service
nx generate @nx/nest:application notification-service
nx generate @nx/nest:application analytics-service
```

### 3.3 Generate shared libraries
```bash
# Generate shared libraries
nx generate @nx/nest:library shared-config --directory=libs/shared/config
nx generate @nx/nest:library shared-kafka --directory=libs/shared/kafka
nx generate @nx/nest:library shared-database --directory=libs/shared/database
nx generate @nx/nest:library shared-auth --directory=libs/shared/auth
nx generate @nx/nest:library shared-dto --directory=libs/shared/dto
```

## 4. Script Setup Tự Động Corrected

```bash
# File: scripts/nx-setup-corrected.sh
cat > scripts/nx-setup-corrected.sh << 'EOF'
#!/bin/bash

echo "🚀 Setting up Nx workspace with correct syntax..."

# Initialize Nx in existing folder 
npx nx@latest init

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating applications..."
nx generate @nx/nest:application api-gateway --no-interactive
nx generate @nx/nest:application user-service --no-interactive
nx generate @nx/nest:application post-service --no-interactive
nx generate @nx/nest:application comment-service --no-interactive
nx generate @nx/nest:application notification-service --no-interactive
nx generate @nx/nest:application analytics-service --no-interactive

echo "📚 Generating shared libraries..."
nx generate @nx/nest:library shared-config --directory=libs/shared/config --no-interactive
nx generate @nx/nest:library shared-kafka --directory=libs/shared/kafka --no-interactive
nx generate @nx/nest:library shared-database --directory=libs/shared/database --no-interactive
nx generate @nx/nest:library shared-auth --directory=libs/shared/auth --no-interactive
nx generate @nx/nest:library shared-dto --directory=libs/shared/dto --no-interactive

echo "✅ Nx workspace setup completed successfully!"
echo "📊 View dependency graph: npm run dep-graph"
echo "🔨 Build all: npm run build:all"
echo "🧪 Test all: npm run test:all"

# Install additional microservices dependencies
echo "📦 Installing microservices dependencies..."
npm install @nestjs/microservices kafkajs @nestjs/typeorm typeorm pg @nestjs/mongoose mongoose @nestjs/jwt @nestjs/passport passport-jwt bcrypt @nestjs/swagger helmet express-rate-limit @nestjs/websockets @nestjs/platform-socket.io nodemailer redis

echo "🎉 All setup completed! Ready to start development."
EOF

chmod +x scripts/nx-setup-corrected.sh
```

## 5. Workspace.json Template (Optional - Nx 21+ auto-generates project.json)

```json
{
  "version": 2,
  "projects": {
    "api-gateway": "apps/api-gateway",
    "user-service": "apps/user-service",
    "post-service": "apps/post-service", 
    "comment-service": "apps/comment-service",
    "notification-service": "apps/notification-service",
    "analytics-service": "apps/analytics-service",
    "shared-config": "libs/shared/config",
    "shared-kafka": "libs/shared/kafka",
    "shared-database": "libs/shared/database", 
    "shared-auth": "libs/shared/auth",
    "shared-dto": "libs/shared/dto"
  }
}
```

## 6. Verification Steps

```bash
# 1. Chạy corrected setup script
./scripts/nx-setup-corrected.sh

# 2. Verify Nx installation
nx --version

# 3. Check project list
nx show projects

# 4. Test build
nx build api-gateway

# 5. View dependency graph
nx graph

# 6. Run all tests
nx run-many --target=test --all

# 7. Check affected projects
nx show projects --affected
```

## Key Changes từ @nrwl sang @nx:

✅ **@nrwl/cli** → **nx** (global CLI)  
✅ **@nrwl/nest** → **@nx/nest**  
✅ **@nrwl/workspace** → **@nx/workspace**  
✅ **@nrwl/node** → **@nx/node**  
✅ Version 21.x.x thay vì 16.x.x  

Sau khi setup với syntax đúng, bạn sẽ có monorepo hoàn chỉnh với Nx 21+ và tất cả dependencies được cập nhật!