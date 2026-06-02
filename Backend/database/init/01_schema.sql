CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- USERS

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    email VARCHAR(255) UNIQUE NOT NULL,

    password_hash TEXT NOT NULL,

    role VARCHAR(20) NOT NULL,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CAMERAS

CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    device_code VARCHAR(50) UNIQUE NOT NULL,

    stream_url TEXT,

    status VARCHAR(20) DEFAULT 'OFFLINE',

    last_seen TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLASSROOMS

CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    camera_id UUID UNIQUE REFERENCES cameras(id),

    name VARCHAR(50) NOT NULL,

    grade VARCHAR(20),

    academic_year VARCHAR(20),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STUDENTS

CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    classroom_id UUID REFERENCES classrooms(id),

    nis VARCHAR(50) UNIQUE,

    name VARCHAR(100) NOT NULL,

    photo_url TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ATTENDANCE

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID REFERENCES students(id),

    date DATE NOT NULL,

    status VARCHAR(20) NOT NULL,

    confidence FLOAT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLASSROOM SESSION

CREATE TABLE classroom_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    classroom_id UUID REFERENCES classrooms(id),

    teacher_name VARCHAR(100),

    subject VARCHAR(100),

    start_time TIMESTAMP NOT NULL,

    end_time TIMESTAMP
);

-- CLASSROOM METRICS

CREATE TABLE classroom_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID REFERENCES classroom_sessions(id),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    attendance_count INTEGER DEFAULT 0,

    active_students INTEGER DEFAULT 0,

    raised_hands INTEGER DEFAULT 0,

    engagement_score FLOAT DEFAULT 0
);

-- STUDENT METRICS

CREATE TABLE student_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    student_id UUID REFERENCES students(id),

    session_id UUID REFERENCES classroom_sessions(id),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    attention_score FLOAT DEFAULT 0,

    participation_score FLOAT DEFAULT 0,

    engagement_score FLOAT DEFAULT 0
);

-- DETECTIONS

CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID REFERENCES classroom_sessions(id),

    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    detection_type VARCHAR(50),

    confidence FLOAT,

    metadata JSONB
);

-- SNAPSHOTS

CREATE TABLE snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    session_id UUID REFERENCES classroom_sessions(id),

    image_url TEXT,

    event_type VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);