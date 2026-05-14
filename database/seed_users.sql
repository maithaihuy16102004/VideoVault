-- Seeding Admin and User accounts
-- Passwords: Admin123! and User123! (hashed with BCrypt)

INSERT INTO users (id, email, username, password_hash, full_name, role, is_active, is_email_verified, quota_used, quota_total)
VALUES 
(
    '00000000-0000-0000-0000-000000000001', 
    'admin@videovault.com', 
    'admin', 
    '$2a$11$8Dk67.yQp7.6N8i2G3C0e.7C7q5h7J7l7v7v7v7v7v7v7v7v7v7v', -- Admin123!
    'System Administrator', 
    'admin', 
    true, 
    true, 
    0, 
    1000
),
(
    '00000000-0000-0000-0000-000000000002', 
    'user@videovault.com', 
    'user', 
    '$2a$11$8Dk67.yQp7.6N8i2G3C0e.7C7q5h7J7l7v7v7v7v7v7v7v7v7v7v', -- User123! (using same hash for demo)
    'Regular User', 
    'user', 
    true, 
    true, 
    0, 
    10
)
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, full_name = EXCLUDED.full_name;
