CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TEACHERS
CREATE TABLE teachers (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    nis VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) CHECK (role IN ('teacher', 'principal')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CAMERAS
CREATE TABLE cameras (
    id UUID PRIMARY KEY,
    device_code VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ONLINE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CLASSROOMS
CREATE TABLE classrooms (
    id UUID PRIMARY KEY,
    camera_id UUID REFERENCES cameras(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- STUDENTS
CREATE TABLE students (
    id UUID PRIMARY KEY,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    nis VARCHAR(50) UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SESSIONS
CREATE TABLE classroom_sessions (
    id UUID PRIMARY KEY,
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
    subject VARCHAR(100),
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ONGOING'
);

CREATE TABLE frame_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,    
    image_filepath TEXT
);

-- METRICS
CREATE TABLE classroom_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active_students INTEGER DEFAULT 0,
    focus_percentage FLOAT DEFAULT 0,
    using_phone_count INTEGER DEFAULT 0,
    raised_hand_count INTEGER DEFAULT 0
);

-- MAPPING POSISI (Seating)
CREATE TABLE session_seatings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    pos_x INTEGER NOT NULL,
    pos_y INTEGER NOT NULL,
    attendance_status VARCHAR(20) DEFAULT 'PRESENT',
    UNIQUE(session_id, student_id)
);

CREATE TABLE student_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES classroom_sessions(id) ON DELETE CASCADE,
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    focus_score FLOAT DEFAULT 0,
    distracted_score FLOAT DEFAULT 0,
    raised_hand_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);