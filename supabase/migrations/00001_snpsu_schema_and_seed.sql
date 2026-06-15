
-- Students table
CREATE TABLE students (
  id BIGSERIAL PRIMARY KEY,
  srn TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  specialization TEXT NOT NULL,
  semester TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  classes_conducted INT NOT NULL DEFAULT 0,
  classes_attended INT NOT NULL DEFAULT 0
);

-- Internal marks table
CREATE TABLE internal_marks (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  ia1 NUMERIC(5,2) NOT NULL DEFAULT 0,
  ia2 NUMERIC(5,2) NOT NULL DEFAULT 0,
  ia3 NUMERIC(5,2) NOT NULL DEFAULT 0,
  assignments NUMERIC(5,2) NOT NULL DEFAULT 0
);

-- Notifications table
CREATE TABLE notifications (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  priority TEXT NOT NULL CHECK (priority IN ('critical','warning','info','success')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Timetable table
CREATE TABLE timetable (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  slot_time TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  room_number TEXT NOT NULL,
  instructor TEXT NOT NULL
);

-- Chat history table
CREATE TABLE chat_history (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','model')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- RLS: Edge Functions use service role key (bypasses RLS), so policies are for safety
-- Allow service role full access (default) — anon gets nothing
CREATE POLICY "No anon access students" ON students FOR ALL TO anon USING (false);
CREATE POLICY "No anon access attendance" ON attendance FOR ALL TO anon USING (false);
CREATE POLICY "No anon access internal_marks" ON internal_marks FOR ALL TO anon USING (false);
CREATE POLICY "No anon access notifications" ON notifications FOR ALL TO anon USING (false);
CREATE POLICY "No anon access timetable" ON timetable FOR ALL TO anon USING (false);
CREATE POLICY "No anon access chat_history" ON chat_history FOR ALL TO anon USING (false);

-- Seed demo student
INSERT INTO students (srn, password_hash, name, department, specialization, semester, email, phone)
VALUES ('25SUUBEAML045', 'apa@123', 'Amogh P Adhyapak',
        'Computer Science Engineering',
        'Artificial Intelligence and Machine Learning',
        '2', 'amogh.adhyapak@snpsu.edu.in', '+91 98765 43210');

-- Seed attendance
INSERT INTO attendance (student_id, subject_code, subject_name, classes_conducted, classes_attended)
SELECT id, '25CSE201', 'Mathematics', 40, 35 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE202', 'Problem Solving with C', 42, 34 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE203', 'Basic Electronics', 38, 32 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE204', 'Mechanical Engineering Systems', 40, 33 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE205', 'Renewable Energy Sources', 36, 22 FROM students WHERE srn = '25SUUBEAML045';

-- Seed internal marks
INSERT INTO internal_marks (student_id, subject_code, subject_name, ia1, ia2, ia3, assignments)
SELECT id, '25CSE201', 'Mathematics', 18, 19, 20, 5 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE202', 'Problem Solving with C', 15, 16, 14, 4.5 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE203', 'Basic Electronics', 17, 15, 18, 4 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE204', 'Mechanical Engineering Systems', 14, 15, 16, 4.8 FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, '25CSE205', 'Renewable Energy Sources', 11, 12, 10, 4 FROM students WHERE srn = '25SUUBEAML045';

-- Seed timetable
INSERT INTO timetable (student_id, day_of_week, slot_time, subject_name, room_number, instructor)
SELECT id, 'Monday',    '09:00 AM - 10:00 AM', 'Mathematics',                    'A-301', 'Dr. R. Kumar'   FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Monday',    '10:00 AM - 11:00 AM', 'Problem Solving with C',         'Lab-1', 'Prof. A. Sharma' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Monday',    '11:00 AM - 12:00 PM', 'Renewable Energy Sources',       'B-204', 'Prof. S. Niwas' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Tuesday',   '09:00 AM - 10:00 AM', 'Basic Electronics',              'C-102', 'Dr. P. Iyer'    FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Tuesday',   '10:00 AM - 11:00 AM', 'Mathematics',                    'A-301', 'Dr. R. Kumar'   FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Wednesday', '09:00 AM - 10:00 AM', 'Mechanical Engineering Systems', 'D-205', 'Prof. M. Reddy' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Wednesday', '11:00 AM - 12:00 PM', 'Problem Solving with C',         'Lab-1', 'Prof. A. Sharma' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Thursday',  '09:00 AM - 10:00 AM', 'Renewable Energy Sources',       'B-204', 'Prof. S. Niwas' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Thursday',  '10:00 AM - 11:00 AM', 'Basic Electronics',              'C-102', 'Dr. P. Iyer'    FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Friday',    '09:00 AM - 10:00 AM', 'Mathematics',                    'A-301', 'Dr. R. Kumar'   FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Friday',    '10:00 AM - 11:00 AM', 'Mechanical Engineering Systems', 'D-205', 'Prof. M. Reddy' FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'Friday',    '11:00 AM - 12:00 PM', 'Renewable Energy Sources',       'B-204', 'Prof. S. Niwas' FROM students WHERE srn = '25SUUBEAML045';

-- Seed notifications
INSERT INTO notifications (student_id, priority, title, message)
SELECT id, 'critical', 'Attendance Critical: Renewable Energy Sources',
       'Attendance at 61.11%. Attend 12 consecutive lectures to recover to 75%.'
FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'warning', 'Reactor Core Warning',
       'Academic Health Score is below optimal. Review your performance metrics.'
FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'info', 'IA Assessment Schedule',
       'IA-3 assessments are scheduled for next week across all subjects.'
FROM students WHERE srn = '25SUUBEAML045'
UNION ALL
SELECT id, 'success', 'Mathematics Performance',
       'Your Mathematics predicted score of 44/50 is tracking above nominal thresholds.'
FROM students WHERE srn = '25SUUBEAML045';
