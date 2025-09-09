-- Create test user for DocSafe
INSERT INTO users (
    username, 
    email, 
    password_hash, 
    is_active, 
    is_verified, 
    role, 
    created_at, 
    updated_at,
    full_name
) VALUES (
    'rahumana', 
    'rahumana@test.com', 
    '$2b$12$2dww9cAOl4YOETXRzhgZeurLXqSAxHK.179vjRIvUnaFxmvPugb5q', 
    true, 
    true, 
    'user', 
    NOW(), 
    NOW(),
    'Test User'
) ON CONFLICT (username) DO NOTHING;

-- Check if user was created
SELECT username, email, is_active, role FROM users WHERE username = 'rahumana';