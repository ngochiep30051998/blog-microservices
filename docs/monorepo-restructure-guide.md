# Tái Cấu Trúc Folder Blog Microservices

## Cấu Trúc Thư Mục Khuyến Nghị

```
blog-microservices/                 # Root project folder
├── .env                           # Environment variables (đã có)
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── docker-compose.yml             # Infrastructure setup (đã có)
├── docker-compose.prod.yml        # Production overrides
├── README.md                      # Project documentation
├── package.json                   # Root package.json
├── nx.json                        # Nx configuration
├── tsconfig.base.json            # Base TypeScript config
├── workspace.json                # Workspace configuration
│
├── apps/                         # Microservices applications
│   ├── api-gateway/
│   ├── user-service/
│   ├── post-service/
│   ├── comment-service/
│   ├── notification-service/
│   └── analytics-service/
│
├── libs/                         # Shared libraries
│   └── shared/
│       ├── config/
│       ├── kafka/
│       ├── database/
│       ├── auth/
│       └── dto/
│
├── docker/                       # Docker configurations (đã có)
│   ├── kafka/
│   │   └── create-topics.sh
│   ├── init-scripts/
│   │   ├── init-postgres.sql
│   │   └── init-mongo.js
│   ├── monitoring/               # Monitoring configs (nếu có)
│   │   ├── prometheus.yml
│   │   └── grafana/
│   └── dockerfiles/              # Service-specific Dockerfiles
│       ├── Dockerfile.api-gateway
│       ├── Dockerfile.user-service
│       └── ...
│
├── scripts/                      # Management scripts (đã có)
│   ├── start-dev.sh
│   ├── stop-dev.sh
│   ├── health-check.sh
│   └── nx-setup.sh               # Script setup Nx trong existing folder
│
├── tools/                        # Custom build tools
├── dist/                         # Build output
└── node_modules/                 # Dependencies
```

## Bước 1: Khởi tạo Nx trong Existing Folder

Thay vì tạo workspace mới, chúng ta sẽ init Nx trong folder hiện tại:

```bash
# Di chuyển vào folder hiện tại
cd blog-microservices

# Initialize Nx trong folder hiện có
npx nx@latest init

# Cài đặt NestJS plugin
npm install -D @nrwl/nest @nrwl/node @nrwl/workspace

# Tạo nx.json config
cat > nx.json << 'EOF'
{
  "$schema": "./node_modules/nx/schemas/nx-schema.json",
  "version": 2,
  "cli": {
    "defaultCollection": "@nrwl/nest"
  },
  "defaultProject": "api-gateway",
  "generators": {
    "@nrwl/nest": {
      "application": {
        "linter": "eslint"
      },
      "library": {
        "linter": "eslint"
      }
    }
  },
  "tasksRunnerOptions": {
    "default": {
      "runner": "@nrwl/workspace/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test", "e2e"],
        "parallel": 3
      }
    }
  },
  "targetDependencies": {
    "build": [
      {
        "target": "build",
        "projects": "dependencies"
      }
    ]
  }
}
EOF

# Tạo workspace.json
cat > workspace.json << 'EOF'
{
  "version": 2,
  "projects": {}
}
EOF
```

## Bước 2: Setup Package.json Root

```bash
# Backup package.json hiện tại (nếu có)
mv package.json package.json.bak 2>/dev/null || true

# Tạo package.json mới
cat > package.json << 'EOF'
{
  "name": "blog-microservices",
  "version": "1.0.0",
  "description": "Blog microservices with NestJS and Kafka",
  "main": "index.js",
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
    "dep-graph": "nx dep-graph",
    "affected:build": "nx affected:build",
    "affected:test": "nx affected:test",
    "affected:lint": "nx affected:lint"
  },
  "keywords": ["microservices", "nestjs", "kafka", "blog"],
  "author": "Your Name",
  "license": "MIT",
  "devDependencies": {
    "@nrwl/cli": "^16.0.0",
    "@nrwl/nest": "^16.0.0",
    "@nrwl/node": "^16.0.0",
    "@nrwl/workspace": "^16.0.0",
    "@types/node": "^18.0.0",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "eslint": "^8.0.0",
    "nx": "^16.0.0",
    "typescript": "^5.0.0"
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
    "mongoose": "^7.0.0",
    "redis": "^4.6.0",
    "bcrypt": "^5.1.0",
    "passport-jwt": "^4.0.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.0.0",
    "swagger-ui-express": "^5.0.0",
    "nodemailer": "^6.9.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.0"
  }
}
EOF

# Install dependencies
npm install
```

## Bước 3: Setup TypeScript Base Config

```bash
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
      "@blog/shared/interfaces": ["libs/shared/interfaces/src/index.ts"]
    }
  },
  "exclude": ["node_modules", "tmp", "dist", "docker"]
}
EOF
```

## Bước 4: Tạo Script Setup Tự Động

```bash
# File: scripts/nx-setup.sh
cat > scripts/nx-setup.sh << 'EOF'
#!/bin/bash

echo "🚀 Setting up Nx workspace in existing folder..."

# Create folder structure
echo "📁 Creating folder structure..."
mkdir -p apps libs/{shared/{config,kafka,database,auth,dto,interfaces},user,post,comment} tools

# Generate applications
echo "🔧 Generating applications..."
nx generate @nrwl/nest:application api-gateway --frontendProject=false
nx generate @nrwl/nest:application user-service --frontendProject=false  
nx generate @nrwl/nest:application post-service --frontendProject=false
nx generate @nrwl/nest:application comment-service --frontendProject=false
nx generate @nrwl/nest:application notification-service --frontendProject=false
nx generate @nrwl/nest:application analytics-service --frontendProject=false

# Generate shared libraries
echo "📚 Generating shared libraries..."
nx generate @nrwl/nest:library shared/config
nx generate @nrwl/nest:library shared/kafka  
nx generate @nrwl/nest:library shared/database
nx generate @nrwl/nest:library shared/auth
nx generate @nrwl/nest:library shared/dto
nx generate @nrwl/nest:library shared/interfaces

echo "✅ Nx workspace setup completed!"
echo "📊 View dependency graph: npm run dep-graph"
echo "🔨 Build all: npm run build:all"
echo "🧪 Test all: npm run test:all"
EOF

chmod +x scripts/nx-setup.sh
```

## Bước 5: Cập Nhật Docker Compose

Bạn cần thêm services cho các microservices vào docker-compose.yml hiện tại:

```yaml
# Thêm vào cuối docker-compose.yml hiện tại
  # =================
  # MICROSERVICES
  # =================
  api-gateway:
    build:
      context: .
      dockerfile: docker/dockerfiles/Dockerfile.api-gateway
    ports:
      - "${API_GATEWAY_PORT}:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - KAFKA_BROKERS=kafka:29092
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      kafka:
        condition: service_healthy
      postgres:
        condition: service_healthy
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    command: npm run start:api-gateway

  user-service:
    build:
      context: .
      dockerfile: docker/dockerfiles/Dockerfile.user-service
    ports:
      - "${USER_SERVICE_PORT}:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}
      - KAFKA_BROKERS=kafka:29092
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      kafka:
        condition: service_healthy
      postgres:
        condition: service_healthy
    volumes:
      - .:/usr/src/app
      - /usr/src/app/node_modules
    command: npm run start:user-service
```

## Bước 6: Chạy Setup

```bash
# 1. Chạy script setup Nx
./scripts/nx-setup.sh

# 2. Verify setup
npm run build:all

# 3. View project structure
nx list

# 4. Test dependency graph  
npm run dep-graph

# 5. Start development
npm run docker:up
npm run start:api-gateway
```

## Lợi Ích Của Cách Tiếp Cận Này

✅ **Tái sử dụng infrastructure**: Docker configs đã setup sẵn  
✅ **Consistent environment**: Dev/prod environments giống nhau  
✅ **Single repository**: Dễ quản lý, sync, và CI/CD  
✅ **Nx benefits**: Code sharing, build optimization, dependency graph  
✅ **Infrastructure as Code**: Tất cả configs version controlled  

Cách này giúp bạn tận dụng được setup infrastructure sẵn có và có một monorepo hoàn chỉnh, professional!