"""User management database operations."""

import sqlite3
from datetime import datetime
from typing import List, Dict, Optional

class UserDB:
    def __init__(self, db_path: str = "email_tracking.db"):
        self.db_path = db_path
        self.init_database()

    def get_connection(self):
        """Get database connection."""
        return sqlite3.connect(self.db_path)

    def init_database(self):
        """Initialize database with user and meeting-related tables."""
        conn = self.get_connection()
        cursor = conn.cursor()

        # Create users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user',
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Create meetings table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                transcript TEXT,
                analysis_result TEXT,  -- JSON string
                created_by INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')

        # Create meeting_participants table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meeting_participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT DEFAULT 'participant',  -- 'participant', 'organizer'
                joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id),
                FOREIGN KEY (user_id) REFERENCES users (id),
                UNIQUE(meeting_id, user_id)
            )
        ''')

        # Create tasks table (extracted from meeting analysis)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER NOT NULL,
                assigned_to INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                due_date TIMESTAMP,
                status TEXT DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id),
                FOREIGN KEY (assigned_to) REFERENCES users (id)
            )
        ''')

        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_meetings_created_by ON meetings (created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants (meeting_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants (user_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_meeting ON tasks (meeting_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks (assigned_to)')

        conn.commit()
        conn.close()

    def create_user(self, user_data: Dict) -> Optional[int]:
        """Create a new user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, role, is_active)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                user_data['username'],
                user_data['email'],
                user_data['password'],  # Should already be hashed
                user_data['full_name'],
                user_data.get('role', 'user'),
                user_data.get('is_active', True)
            ))

            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return user_id
        except sqlite3.IntegrityError:
            return None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None

    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, is_active, created_at
                FROM users WHERE username = ? AND is_active = 1
            ''', (username,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'password_hash': row[3],
                    'full_name': row[4],
                    'role': row[5],
                    'is_active': row[6],
                    'created_at': row[7]
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, is_active, created_at
                FROM users WHERE email = ? AND is_active = 1
            ''', (email,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'email': row[2],
                    'password_hash': row[3],
                    'full_name': row[4],
                    'role': row[5],
                    'is_active': row[6],
                    'created_at': row[7]
                }
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

    def get_all_users(self) -> List[Dict]:
        """Get all users."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, full_name, role, is_active, created_at
                FROM users WHERE is_active = 1
                ORDER BY created_at DESC
            ''')

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'username': row[1],
                'email': row[2],
                'full_name': row[3],
                'role': row[4],
                'is_active': row[5],
                'created_at': row[6]
            } for row in rows]
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []

    def create_meeting(self, meeting_data: Dict, creator_id: int) -> Optional[int]:
        """Create a new meeting."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO meetings (title, description, transcript, analysis_result, created_by)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                meeting_data['title'],
                meeting_data.get('description', ''),
                meeting_data.get('transcript', ''),
                meeting_data.get('analysis_result', ''),
                creator_id
            ))

            meeting_id = cursor.lastrowid
            
            # Add creator as organizer
            cursor.execute('''
                INSERT INTO meeting_participants (meeting_id, user_id, role)
                VALUES (?, ?, 'organizer')
            ''', (meeting_id, creator_id))

            conn.commit()
            conn.close()
            return meeting_id
        except Exception as e:
            print(f"Error creating meeting: {e}")
            return None

    def add_meeting_participant(self, meeting_id: int, user_id: int, role: str = 'participant') -> bool:
        """Add a participant to a meeting."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR IGNORE INTO meeting_participants (meeting_id, user_id, role)
                VALUES (?, ?, ?)
            ''', (meeting_id, user_id, role))

            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error adding meeting participant: {e}")
            return False

    def get_user_meetings(self, user_id: int) -> List[Dict]:
        """Get all meetings for a user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT m.id, m.title, m.description, m.created_at, mp.role, u.full_name as creator
                FROM meetings m
                JOIN meeting_participants mp ON m.id = mp.meeting_id
                JOIN users u ON m.created_by = u.id
                WHERE mp.user_id = ?
                ORDER BY m.created_at DESC
            ''', (user_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'created_at': row[3],
                'user_role': row[4],
                'creator': row[5]
            } for row in rows]
        except Exception as e:
            print(f"Error getting user meetings: {e}")
            return []

    def get_user_tasks(self, user_id: int) -> List[Dict]:
        """Get all tasks assigned to a user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT t.id, t.title, t.description, t.due_date, t.status, 
                       m.title as meeting_title, t.created_at
                FROM tasks t
                JOIN meetings m ON t.meeting_id = m.id
                WHERE t.assigned_to = ?
                ORDER BY t.due_date ASC, t.created_at DESC
            ''', (user_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'due_date': row[3],
                'status': row[4],
                'meeting_title': row[5],
                'created_at': row[6]
            } for row in rows]
        except Exception as e:
            print(f"Error getting user tasks: {e}")
            return []

    def create_task(self, task_data: Dict) -> Optional[int]:
        """Create a new task."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO tasks (meeting_id, assigned_to, title, description, due_date, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                task_data['meeting_id'],
                task_data.get('assigned_to'),
                task_data['title'],
                task_data.get('description', ''),
                task_data.get('due_date'),
                task_data.get('status', 'pending')
            ))

            task_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return task_id
        except Exception as e:
            print(f"Error creating task: {e}")
            return None

    def update_task_status(self, task_id: int, status: str, user_id: int) -> bool:
        """Update task status (only by assigned user)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND assigned_to = ?
            ''', (status, task_id, user_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error updating task status: {e}")
            return False
