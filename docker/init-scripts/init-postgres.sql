-- Tạo database cho các services
CREATE DATABASE blog_users;
CREATE DATABASE blog_posts;

-- Tạo user riêng cho mỗi service
CREATE USER user_service_db WITH PASSWORD 'user_service_pass_2024';
CREATE USER post_service_db WITH PASSWORD 'post_service_pass_2024';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE blog_users TO user_service_db;
GRANT ALL PRIVILEGES ON DATABASE blog_posts TO post_service_db;

-- Enable UUID extension
\c blog_users;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c blog_posts;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";