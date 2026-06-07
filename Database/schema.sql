-- ============================================
-- URBAN HARVEST HUB - COMPLETE DATABASE SCHEMA
-- ============================================
-- Author: Sumudu Sayane
-- Course: Web Application Development
-- Task: 2 & 3 - PWA with REST API and Database Integration
-- Date: June 2026
-- ============================================

-- ============================================
-- 1. DROP EXISTING TABLES (Clean start)
-- Order matters due to foreign key constraints
-- ============================================

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS user_activities;
DROP TABLE IF EXISTS event_bookings;
DROP TABLE IF EXISTS user_saved_events;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS events;

-- ============================================
-- 2. CREATE DATABASE
-- ============================================

CREATE DATABASE IF NOT EXISTS urban_harvest;
USE urban_harvest;

-- ============================================
-- 3. EVENTS TABLE (Main content table)
-- Stores all events, workshops, and products
-- ============================================

CREATE TABLE events (
    -- Primary Key
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique event identifier',
    
    -- Basic Event Information
    title VARCHAR(255) NOT NULL COMMENT 'Event/workshop/product title',
    description TEXT NOT NULL COMMENT 'Detailed description of the event',
    
    -- Category: Limited to 3 types for filtering
    category ENUM('workshop', 'event', 'product') NOT NULL COMMENT 'Type: workshop, event, or product',
    
    -- Media
    image_url VARCHAR(500) COMMENT 'URL to event image (Unsplash or custom)',
    
    -- Location Data (for geolocation features)
    location_lat DECIMAL(10,8) COMMENT 'Latitude for mapping',
    location_lng DECIMAL(11,8) COMMENT 'Longitude for mapping',
    
    -- Scheduling
    date DATE NOT NULL COMMENT 'Event date (YYYY-MM-DD)',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    
    -- Indexes for performance optimization
    INDEX idx_category (category) COMMENT 'Fast category filtering',
    INDEX idx_date (date) COMMENT 'Fast date sorting',
    INDEX idx_location (location_lat, location_lng) COMMENT 'Fast geolocation queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Main events/workshops/products table';

-- ============================================
-- 4. USERS TABLE (Authentication & Profiles)
-- Supports JWT authentication and admin roles
-- ============================================

CREATE TABLE users (
    -- Primary Key
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique user identifier',
    
    -- Authentication Fields
    email VARCHAR(255) UNIQUE NOT NULL COMMENT 'User email (used for login)',
    password_hash VARCHAR(255) NOT NULL COMMENT 'Bcrypt hashed password',
    
    -- Profile Information
    name VARCHAR(255) NOT NULL COMMENT 'User display name',
    avatar VARCHAR(500) COMMENT 'Profile picture URL',
    
    -- Role Management (for admin panel)
    is_admin BOOLEAN DEFAULT FALSE COMMENT 'Admin privileges flag',
    
    -- Preferences (JSON for flexibility)
    preferences JSON COMMENT 'User preferences (notifications, etc.)',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Account creation date',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last profile update',
    
    -- Indexes
    INDEX idx_email (email) COMMENT 'Fast login lookups',
    INDEX idx_is_admin (is_admin) COMMENT 'Fast admin queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User accounts for authentication';

-- ============================================
-- 5. USER SAVED EVENTS (Many-to-Many relationship)
-- Allows users to bookmark/favorite events
-- ============================================

CREATE TABLE user_saved_events (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique saved event identifier',
    user_id INT NOT NULL COMMENT 'Reference to user who saved',
    event_id INT NOT NULL COMMENT 'Reference to saved event',
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When user saved the event',
    
    -- Foreign key constraints (CASCADE deletes for data integrity)
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE COMMENT 'Delete saves if user deleted',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE COMMENT 'Delete saves if event deleted',
    
    -- Ensure a user can only save an event once
    UNIQUE KEY unique_user_event (user_id, event_id) COMMENT 'Prevents duplicate saves',
    
    -- Index for performance
    INDEX idx_user (user_id) COMMENT 'Fast user saved events lookup',
    INDEX idx_event (event_id) COMMENT 'Fast event saved by lookup'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User bookmarked/favorite events';

-- ============================================
-- 6. EVENT BOOKINGS TABLE
-- Tracks user event registrations and ticket purchases
-- ============================================

CREATE TABLE event_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique booking identifier',
    user_id INT NOT NULL COMMENT 'User who booked the event',
    event_id INT NOT NULL COMMENT 'Event being booked',
    booking_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When booking was made',
    
    -- Booking Status (for future cancellation features)
    status ENUM('confirmed', 'cancelled', 'pending') DEFAULT 'confirmed' COMMENT 'Booking status',
    
    -- Ticket Management
    tickets INT DEFAULT 1 COMMENT 'Number of tickets booked',
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE COMMENT 'Delete bookings if user deleted',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE COMMENT 'Delete bookings if event deleted',
    
    -- Prevent double booking same event by same user
    UNIQUE KEY unique_booking (user_id, event_id) COMMENT 'Prevents duplicate bookings',
    
    -- Indexes for performance
    INDEX idx_user (user_id) COMMENT 'Fast user bookings lookup',
    INDEX idx_event (event_id) COMMENT 'Fast event bookings lookup',
    INDEX idx_status (status) COMMENT 'Fast status filtering'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Event registrations and bookings';

-- ============================================
-- 7. USER ACTIVITIES TABLE (Audit Log)
-- Tracks user actions for analytics and debugging
-- ============================================

CREATE TABLE user_activities (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique activity identifier',
    user_id INT NOT NULL COMMENT 'User who performed action',
    
    -- Activity Types (matching frontend actions)
    action_type ENUM(
        'view', 'save', 'unsave', 'login', 'logout', 
        'register', 'booking', 'cancel_booking', 'create', 
        'update', 'delete'
    ) NOT NULL COMMENT 'Type of user action',
    
    -- Related entity (if applicable)
    event_id INT NULL COMMENT 'Related event ID (if action involves event)',
    
    -- Additional context (JSON for flexibility)
    details JSON COMMENT 'Additional action details (tickets, etc.)',
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When action occurred',
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE COMMENT 'Delete activities if user deleted',
    
    -- Indexes for performance
    INDEX idx_user (user_id) COMMENT 'Fast user activity lookup',
    INDEX idx_action (action_type) COMMENT 'Fast action type filtering',
    INDEX idx_created (created_at) COMMENT 'Fast date range queries'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Audit log of user actions';

-- ============================================
-- 8. USER SETTINGS TABLE
-- Stores user preferences (theme, notifications, language)
-- ============================================

CREATE TABLE user_settings (
    user_id INT PRIMARY KEY COMMENT 'Reference to user (1-to-1 relationship)',
    
    -- Appearance Preferences
    theme ENUM('light', 'dark') DEFAULT 'light' COMMENT 'UI theme preference',
    
    -- Notification Preferences
    notifications_enabled BOOLEAN DEFAULT TRUE COMMENT 'Push notifications toggle',
    
    -- Language Preference (for i18n/multilingual support)
    language VARCHAR(10) DEFAULT 'en' COMMENT 'Language code (en, es, fr)',
    
    -- Timestamp
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last settings update',
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE COMMENT 'Delete settings if user deleted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User preferences and settings';

-- ============================================
-- 9. USER NOTIFICATIONS TABLE
-- Stores push notifications for users
-- ============================================

CREATE TABLE user_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT 'Unique notification identifier',
    user_id INT NOT NULL COMMENT 'Target user',
    title VARCHAR(255) NOT NULL COMMENT 'Notification title',
    message TEXT NOT NULL COMMENT 'Notification body',
    
    -- Read status tracking
    is_read BOOLEAN DEFAULT FALSE COMMENT 'Whether user has seen notification',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When notification was sent',
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE COMMENT 'Delete notifications if user deleted',
    
    -- Indexes for performance
    INDEX idx_user (user_id) COMMENT 'Fast user notifications lookup',
    INDEX idx_unread (user_id, is_read) COMMENT 'Fast unread notifications lookup'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='User push notifications';

-- ============================================
-- 10. STORED PROCEDURES (For complex operations)
-- ============================================

DELIMITER //

-- Procedure: Get events near a location
CREATE PROCEDURE GetNearbyEvents(
    IN p_lat DECIMAL(10,8),
    IN p_lng DECIMAL(11,8),
    IN p_radius_km INT
)
BEGIN
    -- Haversine formula for distance calculation
    SELECT *, 
        (6371 * ACOS(
            COS(RADIANS(p_lat)) * COS(RADIANS(location_lat)) * 
            COS(RADIANS(location_lng) - RADIANS(p_lng)) + 
            SIN(RADIANS(p_lat)) * SIN(RADIANS(location_lat))
        )) AS distance_km
    FROM events
    WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL
    HAVING distance_km <= p_radius_km
    ORDER BY distance_km ASC;
END //

-- Procedure: Get user statistics
CREATE PROCEDURE GetUserStats(IN p_user_id INT)
BEGIN
    SELECT 
        (SELECT COUNT(*) FROM user_saved_events WHERE user_id = p_user_id) AS saved_count,
        (SELECT COUNT(*) FROM event_bookings WHERE user_id = p_user_id AND status = 'confirmed') AS bookings_count,
        (SELECT COUNT(*) FROM user_activities WHERE user_id = p_user_id) AS activities_count,
        (SELECT DATEDIFF(NOW(), created_at) FROM users WHERE id = p_user_id) AS days_member;
END //

-- Procedure: Clean old activities (keep last 90 days)
CREATE PROCEDURE CleanOldActivities()
BEGIN
    DELETE FROM user_activities 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
END //

DELIMITER ;

-- ============================================
-- 11. TRIGGERS (For automatic actions)
-- ============================================

DELIMITER //

-- Trigger: Log event creation
CREATE TRIGGER after_event_insert
AFTER INSERT ON events
FOR EACH ROW
BEGIN
    INSERT INTO user_activities (user_id, action_type, event_id, details)
    VALUES (1, 'create', NEW.id, JSON_OBJECT('title', NEW.title, 'category', NEW.category));
END //

-- Trigger: Log booking creation
CREATE TRIGGER after_booking_insert
AFTER INSERT ON event_bookings
FOR EACH ROW
BEGIN
    INSERT INTO user_activities (user_id, action_type, event_id, details)
    VALUES (NEW.user_id, 'booking', NEW.event_id, JSON_OBJECT('tickets', NEW.tickets));
END //

-- Trigger: Create default settings for new users
CREATE TRIGGER after_user_insert
AFTER INSERT ON users
FOR EACH ROW
BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
END //

DELIMITER ;

-- ============================================
-- 12. SAMPLE DATA (For testing and demonstration)
-- ============================================

-- Insert sample events
INSERT INTO events (title, description, category, image_url, date, location_lat, location_lng) VALUES
('Organic Gardening Workshop', 'Learn sustainable farming techniques including composting, soil management, and natural pest control. Perfect for beginners!', 'workshop', 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800', CURDATE() + INTERVAL 30 DAY, 7.1388, 79.9036),
('Farmers Market Day', 'Join local farmers and artisans for fresh produce, handmade crafts, and live music. Support your local community!', 'event', 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=800', CURDATE() + INTERVAL 45 DAY, 6.9271, 79.8612),
('Composting 101', 'Turn kitchen waste into black gold for your garden. Learn vermicomposting and traditional methods.', 'workshop', 'https://images.unsplash.com/photo-1535241749838-299277b6305f?w=800', CURDATE() + INTERVAL 60 DAY, 7.2906, 80.6337),
('Sustainable Product Fair', 'Discover eco-friendly products from local makers. Everything from reusable bags to natural skincare.', 'product', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', CURDATE() + INTERVAL 20 DAY, 6.9966, 79.9086),
('Urban Beekeeping Workshop', 'Learn about bees and how to keep them in the city. Includes safety equipment demo.', 'workshop', 'https://images.unsplash.com/photo-1511207538754-e8555f2bc187?w=800', CURDATE() + INTERVAL 75 DAY, 7.1388, 79.9036),
('Zero Waste Living Seminar', 'Practical tips to reduce household waste. Bring your own cup for free tea!', 'event', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', CURDATE() + INTERVAL 15 DAY, 6.9271, 79.8612),
('Bamboo Product Launch', 'Eco-friendly bamboo alternatives for everyday use', 'product', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800', CURDATE() + INTERVAL 10 DAY, 7.2906, 80.6337),
('Community Cleanup Day', 'Join us to clean the local park. Gloves and bags provided.', 'event', 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800', CURDATE() + INTERVAL 5 DAY, 6.9966, 79.9086),
('Permaculture Design Course', 'Learn sustainable land management and food forest design', 'workshop', 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=800', CURDATE() + INTERVAL 90 DAY, 7.1388, 79.9036),
('Solar Energy Workshop', 'How to install and maintain home solar panels', 'workshop', 'https://images.unsplash.com/photo-1535241749838-299277b6305f?w=800', CURDATE() + INTERVAL 120 DAY, 6.9271, 79.8612);

-- Insert sample users (password hashes are placeholders)
-- Use the app's registration to create real users with proper bcrypt hashes
INSERT INTO users (email, password_hash, name, is_admin) VALUES 
('admin1@gmail.com', '$2b$10$EIXjF5UeFvq7XqLqLqLqLqLqLqLqLqLqLqLq', 'Admin User', 1),
('demo@example.com', '$2b$10$EIXjF5UeFvq7XqLqLqLqLqLqLqLqLqLqLqLq', 'Demo User', 0)
ON DUPLICATE KEY UPDATE is_admin = VALUES(is_admin);

-- Insert sample saved events (for demo user)
INSERT IGNORE INTO user_saved_events (user_id, event_id) 
SELECT u.id, e.id FROM users u, events e 
WHERE u.email = 'demo@example.com' AND e.id IN (1, 3, 5) 
LIMIT 3;

-- Insert sample bookings (for demo user)
INSERT IGNORE INTO event_bookings (user_id, event_id, tickets) 
SELECT u.id, e.id, 2 FROM users u, events e 
WHERE u.email = 'demo@example.com' AND e.id = 2 
LIMIT 1;

-- ============================================
-- 13. VERIFICATION QUERIES
-- Run these to confirm setup
-- ============================================

-- Check all tables created
SHOW TABLES;

-- Check events count
SELECT COUNT(*) AS total_events FROM events;

-- Check sample data
SELECT id, title, category, date FROM events LIMIT 5;

-- Check users
SELECT id, email, name, is_admin FROM users;

-- Check relationships
SELECT 
    u.name AS user,
    e.title AS saved_event
FROM user_saved_events us
JOIN users u ON us.user_id = u.id
JOIN events e ON us.event_id = e.id;

-- ============================================
-- 14. DATABASE MAINTENANCE QUERIES
-- Useful for ongoing management
-- ============================================

-- Get storage size
SELECT 
    table_name AS 'Table',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'urban_harvest'
ORDER BY (data_length + index_length) DESC;

-- Get activity statistics
SELECT 
    action_type,
    COUNT(*) as count,
    DATE(created_at) as date
FROM user_activities
GROUP BY action_type, DATE(created_at)
ORDER BY date DESC;

-- ============================================
-- 15. CLEANUP (Optional - for resetting database)
-- WARNING: This will delete ALL data
-- ============================================

-- Uncomment to completely reset database
-- DROP DATABASE IF EXISTS urban_harvest;
-- CREATE DATABASE urban_harvest;
-- USE urban_harvest;

-- ============================================
-- SCHEMA COMPLETE
-- ============================================
SELECT 'Urban Harvest Hub Database Schema Created Successfully!' AS Status;
SELECT 'Total Tables: 8' AS Info;
SELECT 'Total Events: ' || (SELECT COUNT(*) FROM events) AS Events;
SELECT 'Total Users: ' || (SELECT COUNT(*) FROM users) AS Users;