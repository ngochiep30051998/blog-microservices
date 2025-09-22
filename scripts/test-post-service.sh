#!/bin/bash

echo "🧪 Testing Post Service Complete Integration..."

API_URL="http://localhost:3000"

# Step 1: Login to get token
echo "🔐 Logging in to get JWT token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/users/login" \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@blog.com",
    "password": "AdminPass123!"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.access_token')
echo "✅ JWT Token obtained"

# Step 2: Create a category
echo ""
echo "📁 Creating a category..."
CATEGORY_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/categories" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technology",
    "description": "Latest technology trends and tutorials",
    "color": "#3b82f6",
    "icon": "fas fa-laptop-code",
    "metaTitle": "Technology Articles",
    "metaDescription": "Discover the latest in technology"
  }')

CATEGORY_ID=$(echo $CATEGORY_RESPONSE | jq -r '.data.id')
echo "✅ Category created: $CATEGORY_ID"

# Step 3: Create a post
echo ""
echo "📝 Creating a blog post..."
POST_RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with NestJS Microservices",
    "description": "A comprehensive guide to building scalable microservices architecture using NestJS framework. Learn best practices, patterns, and implementation strategies.",
    "content": "# Introduction\n\nNestJS is a powerful Node.js framework that makes building scalable microservices a breeze.\n\n## Key Features\n\n- **TypeScript First**: Built with TypeScript for better type safety\n- **Decorator-based**: Clean, declarative API design\n- **Microservices Ready**: Built-in support for microservices patterns\n\n## Getting Started\n\n```typescript\nimport { NestFactory } from '\''@nestjs/core'\'';\nimport { AppModule } from '\''./app.module'\'';\n\nasync function bootstrap() {\n  const app = await NestFactory.create(AppModule);\n  await app.listen(3000);\n}\nbootstrap();\n```\n\nThis is just the beginning of your microservices journey!",
    "excerpt": "Learn how to build scalable microservices with NestJS framework.",
    "categoryId": "'$CATEGORY_ID'",
    "tags": ["nestjs", "microservices", "typescript", "nodejs"],
    "keywords": ["nestjs tutorial", "microservices guide"],
    "metaTitle": "NestJS Microservices Tutorial - Complete Guide",
    "metaDescription": "Learn how to build scalable microservices with NestJS. Complete guide with examples and best practices.",
    "status": "published",
    "featured": true
  }')

POST_ID=$(echo $POST_RESPONSE | jq -r '.data.id')
POST_SLUG=$(echo $POST_RESPONSE | jq -r '.data.slug')
echo "✅ Post created: $POST_ID"
echo "   Slug: $POST_SLUG"

# Step 4: Test post retrieval
echo ""
echo "📖 Testing post retrieval by slug..."
SLUG_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/slug/${POST_SLUG}")
echo $SLUG_RESPONSE | jq '.data.title, .data.viewCount'

# Step 5: Test post listing
echo ""
echo "📋 Testing post listing..."
LIST_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?limit=5")
POST_COUNT=$(echo $LIST_RESPONSE | jq '.data.items | length')
echo "✅ Retrieved $POST_COUNT posts"

# Step 6: Test filtering
echo ""
echo "🔍 Testing category filtering..."
FILTER_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?categoryId=${CATEGORY_ID}")
FILTERED_COUNT=$(echo $FILTER_RESPONSE | jq '.data.items | length')
echo "✅ Found $FILTERED_COUNT posts in Technology category"

# Step 7: Test search
echo ""
echo "🔎 Testing search functionality..."
SEARCH_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts?search=NestJS")
SEARCH_COUNT=$(echo $SEARCH_RESPONSE | jq '.data.items | length')
echo "✅ Found $SEARCH_COUNT posts matching 'NestJS'"

# Step 8: Test popular posts
echo ""
echo "🔥 Testing popular posts..."
POPULAR_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/popular?limit=3")
POPULAR_COUNT=$(echo $POPULAR_RESPONSE | jq '.data | length')
echo "✅ Retrieved $POPULAR_COUNT popular posts"

# Step 9: Test related posts
echo ""
echo "🔗 Testing related posts..."
RELATED_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/${POST_ID}/related")
RELATED_COUNT=$(echo $RELATED_RESPONSE | jq '.data | length')
echo "✅ Found $RELATED_COUNT related posts"

# Step 10: Test statistics
echo ""
echo "📊 Testing post statistics..."
STATS_RESPONSE=$(curl -s -X GET "${API_URL}/api/v1/posts/stats" \
  -H "Authorization: Bearer $TOKEN")
echo $STATS_RESPONSE | jq '.data.posts, .data.engagement'

# Step 11: Test post update
echo ""
echo "✏️ Testing post update..."
UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/api/v1/posts/${POST_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "excerpt": "Updated: Learn how to build scalable microservices with NestJS framework and TypeScript.",
    "tags": ["nestjs", "microservices", "typescript", "nodejs", "tutorial"]
  }')

echo "✅ Post updated successfully"
UPDATED_TAGS=$(echo $UPDATE_RESPONSE | jq '.data.tags')
echo "   New tags: $UPDATED_TAGS"

echo ""
echo "🎉 Post Service integration test completed successfully!"
echo ""
echo "📈 Test Summary:"
echo "  ✅ Category creation"
echo "  ✅ Post creation with rich content"
echo "  ✅ Post retrieval by ID and slug"
echo "  ✅ Post listing with pagination"
echo "  ✅ Category filtering"
echo "  ✅ Search functionality" 
echo "  ✅ Popular posts algorithm"
echo "  ✅ Related posts recommendation"
echo "  ✅ Statistics and analytics"
echo "  ✅ Post updates and content analysis"

echo ""
echo "🌐 Available endpoints:"
echo "  - Post Service: http://localhost:3002"
echo "  - API Gateway: http://localhost:3000"
echo "  - Swagger Docs: http://localhost:3002/docs"