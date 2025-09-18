// Tạo database và collections cho Comment Service
db = db.getSiblingDB('blog_comments');

// Tạo user cho comment service
db.createUser({
  user: 'comment_service_user',
  pwd: 'comment_service_pass_2024',
  roles: [
    {
      role: 'readWrite',
      db: 'blog_comments'
    }
  ]
});

// Tạo collections với indexes
db.createCollection('comments');
db.comments.createIndex({ "postId": 1 });
db.comments.createIndex({ "parentId": 1 });
db.comments.createIndex({ "authorId": 1 });
db.comments.createIndex({ "createdAt": -1 });

// Tạo collection cho moderation
db.createCollection('comment_moderation');
db.comment_moderation.createIndex({ "commentId": 1 });
db.comment_moderation.createIndex({ "status": 1 });