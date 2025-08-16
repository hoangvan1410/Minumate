"""User management database operations."""

import sqlite3
import json
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
                status TEXT NOT NULL DEFAULT 'registered',  -- 'created', 'registered'
                is_active BOOLEAN NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Add status column if it doesn't exist (for existing databases)
        try:
            cursor.execute('ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT "registered"')
        except sqlite3.OperationalError:
            # Column already exists
            pass

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
                intended_owner TEXT,  -- Store intended owner name for later assignment
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id),
                FOREIGN KEY (assigned_to) REFERENCES users (id)
            )
        ''')
        
        # Add intended_owner column if it doesn't exist (for existing databases)
        try:
            cursor.execute('ALTER TABLE tasks ADD COLUMN intended_owner TEXT')
        except sqlite3.OperationalError:
            pass  # Column already exists

        # Create projects table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',  -- 'active', 'completed', 'on_hold', 'cancelled'
                start_date TIMESTAMP,
                end_date TIMESTAMP,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users (id)
            )
        ''')

        # Create project_meetings junction table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS project_meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                meeting_id INTEGER NOT NULL,
                linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
                FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE CASCADE,
                UNIQUE(project_id, meeting_id)
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
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects (created_by)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_projects_status ON projects (status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_project_meetings_project ON project_meetings (project_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_project_meetings_meeting ON project_meetings (meeting_id)')

        conn.commit()
        conn.close()

    def create_user(self, user_data: Dict) -> Optional[int]:
        """Create a new user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, role, status, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                user_data['username'],
                user_data['email'],
                user_data['password'],  # Should already be hashed
                user_data['full_name'],
                user_data.get('role', 'user'),
                user_data.get('status', 'registered'),
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
        """Get user by username (only registered users)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, status, is_active, created_at
                FROM users WHERE username = ? AND status = 'registered' AND is_active = 1
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
                    'status': row[6],
                    'is_active': row[7],
                    'created_at': row[8]
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    def get_user_by_username_any_status(self, username: str) -> Optional[Dict]:
        """Get user by username regardless of status."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, status, is_active, created_at
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
                    'status': row[6],
                    'is_active': row[7],
                    'created_at': row[8]
                }
            return None
        except Exception as e:
            print(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict]:
        """Get user by email (only registered users)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, status, is_active, created_at
                FROM users WHERE email = ? AND status = 'registered' AND is_active = 1
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
                    'status': row[6],
                    'is_active': row[7],
                    'created_at': row[8]
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
                SELECT id, username, email, full_name, role, status, is_active, created_at
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
                'status': row[5],
                'is_active': row[6],
                'created_at': row[7]
            } for row in rows]
        except Exception as e:
            print(f"Error getting all users: {e}")
            return []

    def create_user_from_email(self, email: str, full_name: str) -> Optional[int]:
        """Create a user with 'created' status when sending meeting emails."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Use email as username
            username = email
            
            # Check if user already exists
            existing_user = self.get_user_by_email_any_status(email)
            if existing_user:
                return existing_user['id']

            cursor.execute('''
                INSERT INTO users (username, email, password_hash, full_name, role, status, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                username,
                email,
                '',  # No password hash yet - will be set when user registers
                full_name,
                'user',
                'created',
                True
            ))

            user_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return user_id
        except sqlite3.IntegrityError as e:
            print(f"Error creating user from email (IntegrityError): {e}")
            # Email already exists, return None to indicate failure
            return None
        except Exception as e:
            print(f"Error creating user from email: {e}")
            return None

    def update_user_status_to_registered(self, email: str, password_hash: str, username: str = None, full_name: str = None) -> bool:
        """Update user status from 'created' to 'registered' when user registers."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Build dynamic update query
            update_fields = ['password_hash = ?', 'status = "registered"', 'updated_at = CURRENT_TIMESTAMP']
            params = [password_hash]
            
            if username:
                update_fields.append('username = ?')
                params.append(username)
            
            if full_name:
                update_fields.append('full_name = ?')
                params.append(full_name)
            
            params.append(email)  # for WHERE clause
            
            query = f'''
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE email = ? AND status = 'created'
            '''
            
            cursor.execute(query, params)
            updated = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return updated
        except Exception as e:
            print(f"Error updating user status: {e}")
            return False

    def get_user_by_email_any_status(self, email: str) -> Optional[Dict]:
        """Get user by email regardless of status (for checking existence)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT id, username, email, password_hash, full_name, role, status, is_active, created_at
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
                    'status': row[6],
                    'is_active': row[7],
                    'created_at': row[8]
                }
            return None
        except Exception as e:
            print(f"Error getting user by email: {e}")
            return None

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
                       m.title as meeting_title, t.created_at, t.meeting_id
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
                'created_at': row[6],
                'meeting_id': row[7]
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
                INSERT INTO tasks (meeting_id, assigned_to, title, description, due_date, status, intended_owner)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                task_data['meeting_id'],
                task_data.get('assigned_to'),
                task_data['title'],
                task_data.get('description', ''),
                task_data.get('due_date'),
                task_data.get('status', 'pending'),
                task_data.get('intended_owner')
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

    def get_all_meetings(self) -> List[Dict]:
        """Get all meetings with creator, participant, and project information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT m.id, m.title, m.description, m.transcript, m.created_by, 
                       m.created_at, u.full_name as creator_name,
                       COUNT(DISTINCT mp.user_id) as participant_count,
                       p.id as project_id, p.name as project_name
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id
                LEFT JOIN project_meetings pm ON m.id = pm.meeting_id
                LEFT JOIN projects p ON pm.project_id = p.id
                GROUP BY m.id, m.title, m.description, m.transcript, m.created_by, 
                         m.created_at, u.full_name, p.id, p.name
                ORDER BY m.created_at DESC
            ''')

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'transcript': row[3],
                'creator_id': row[4],
                'created_at': row[5],
                'creator_name': row[6],
                'participant_count': row[7],
                'project_id': row[8],
                'project_name': row[9]
            } for row in rows]
        except Exception as e:
            print(f"Error getting all meetings: {e}")
            return []

    def get_meeting_by_id(self, meeting_id: int) -> Optional[Dict]:
        """Get meeting by ID with participants and project information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Get meeting details with project information
            cursor.execute('''
                SELECT m.id, m.title, m.description, m.transcript, m.analysis_result, m.created_by, 
                       m.created_at, u.full_name as creator_name,
                       p.id as project_id, p.name as project_name
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                LEFT JOIN project_meetings pm ON m.id = pm.meeting_id
                LEFT JOIN projects p ON pm.project_id = p.id
                WHERE m.id = ?
            ''', (meeting_id,))

            meeting_row = cursor.fetchone()
            if not meeting_row:
                conn.close()
                return None

            # Get participants
            cursor.execute('''
                SELECT u.id, u.full_name, u.email, mp.role
                FROM meeting_participants mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.meeting_id = ?
            ''', (meeting_id,))

            participants = cursor.fetchall()
            conn.close()

            # Parse analysis_result if it exists
            analysis = None
            if meeting_row[4]:  # analysis_result
                try:
                    analysis = json.loads(meeting_row[4])
                except:
                    analysis = None

            return {
                'id': meeting_row[0],
                'title': meeting_row[1],
                'description': meeting_row[2],
                'transcript': meeting_row[3],
                'analysis': analysis,
                'creator_id': meeting_row[5],
                'created_at': meeting_row[6],
                'creator_name': meeting_row[7],
                'project_id': meeting_row[8],
                'project_name': meeting_row[9],
                'participants': [{
                    'id': p[0],
                    'full_name': p[1],
                    'email': p[2],
                    'role': p[3]
                } for p in participants]
            }
        except Exception as e:
            print(f"Error getting meeting by ID: {e}")
            return None

    def update_user(self, user_id: int, user_data: Dict) -> bool:
        """Update user information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Build update query dynamically based on provided fields
            update_fields = []
            values = []
            
            for field in ['username', 'email', 'full_name', 'role', 'status', 'is_active']:
                if field in user_data:
                    update_fields.append(f"{field} = ?")
                    values.append(user_data[field])
            
            if not update_fields:
                return False

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(user_id)

            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, values)

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error updating user: {e}")
            return False

    def delete_user(self, user_id: int) -> bool:
        """Delete user and related data."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Delete user's tasks
            cursor.execute('DELETE FROM tasks WHERE assigned_to = ?', (user_id,))
            
            # Delete user's meeting participations
            cursor.execute('DELETE FROM meeting_participants WHERE user_id = ?', (user_id,))
            
            # Delete meetings created by user
            cursor.execute('DELETE FROM meetings WHERE created_by = ?', (user_id,))
            
            # Delete user
            cursor.execute('DELETE FROM users WHERE id = ?', (user_id,))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error deleting user: {e}")
            return False

    def update_meeting(self, meeting_id: int, meeting_data: Dict) -> bool:
        """Update meeting information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Build update query dynamically based on provided fields
            update_fields = []
            values = []
            
            for field in ['title', 'description', 'transcript']:
                if field in meeting_data:
                    update_fields.append(f"{field} = ?")
                    values.append(meeting_data[field])
            
            if not update_fields:
                return False

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(meeting_id)

            query = f"UPDATE meetings SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, values)

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error updating meeting: {e}")
            return False

    def delete_meeting(self, meeting_id: int) -> bool:
        """Delete meeting and related data."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Delete meeting tasks
            cursor.execute('DELETE FROM tasks WHERE meeting_id = ?', (meeting_id,))
            
            # Delete meeting participants
            cursor.execute('DELETE FROM meeting_participants WHERE meeting_id = ?', (meeting_id,))
            
            # Delete meeting
            cursor.execute('DELETE FROM meetings WHERE id = ?', (meeting_id,))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error deleting meeting: {e}")
            return False

    def remove_meeting_participant(self, meeting_id: int, user_id: int) -> bool:
        """Remove participant from meeting."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                DELETE FROM meeting_participants 
                WHERE meeting_id = ? AND user_id = ?
            ''', (meeting_id, user_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error removing meeting participant: {e}")
            return False

    def assign_task_to_user(self, task_id: int, user_id: int) -> bool:
        """Assign a task to a specific user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                UPDATE tasks SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (user_id, task_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error assigning task to user: {e}")
            return False

    def get_meeting_tasks(self, meeting_id: int) -> List[Dict]:
        """Get all tasks for a specific meeting."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT t.id, t.title, t.description, t.assigned_to, t.due_date, t.status, 
                       t.created_at, u.full_name as assigned_name
                FROM tasks t
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE t.meeting_id = ?
                ORDER BY t.created_at DESC
            ''', (meeting_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'assigned_to': row[3],
                'due_date': row[4],
                'status': row[5],
                'created_at': row[6],
                'assigned_name': row[7]
            } for row in rows]
        except Exception as e:
            print(f"Error getting meeting tasks: {e}")
            return []

    def get_unassigned_tasks_by_intended_owner(self, meeting_id: int, owner_name: str) -> List[Dict]:
        """Get unassigned tasks that are intended for a specific owner."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Get all unassigned tasks for this meeting
            cursor.execute('''
                SELECT id, title, description, due_date, status, intended_owner
                FROM tasks 
                WHERE meeting_id = ? AND assigned_to IS NULL
            ''', (meeting_id,))

            rows = cursor.fetchall()
            conn.close()

            # Filter tasks using proper name matching to avoid partial matches
            matching_tasks = []
            owner_name_lower = owner_name.lower().strip()
            
            for row in rows:
                intended_owner = (row[5] or '').lower().strip()
                
                # Check for exact match or proper word boundary match
                if (intended_owner == owner_name_lower or 
                    owner_name_lower in intended_owner.split()):
                    matching_tasks.append({
                        'id': row[0],
                        'title': row[1],
                        'description': row[2],
                        'due_date': row[3],
                        'status': row[4],
                        'intended_owner': row[5]
                    })

            return matching_tasks
        except Exception as e:
            print(f"Error getting unassigned tasks by intended owner: {e}")
            return []

    def get_user_assigned_tasks(self, user_id: int) -> List[Dict]:
        """Get all tasks assigned to a specific user with meeting information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT t.id, t.title, t.description, t.due_date, t.status, 
                       t.created_at, t.updated_at, m.title as meeting_title,
                       m.id as meeting_id, m.created_at as meeting_date
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
                'created_at': row[5],
                'updated_at': row[6],
                'meeting_title': row[7],
                'meeting_id': row[8],
                'meeting_date': row[9]
            } for row in rows]
        except Exception as e:
            print(f"Error getting user assigned tasks: {e}")
            return []

    def update_user_email(self, user_id: int, new_email: str) -> bool:
        """Update user's email address (used when converting placeholder to real user)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Update email and username to the new email
            cursor.execute('''
                UPDATE users 
                SET email = ?, username = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (new_email, new_email, user_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error updating user email: {e}")
            return False

    # Project Management Methods
    def create_project(self, project_data: Dict) -> Optional[int]:
        """Create a new project."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT INTO projects (name, description, status, start_date, end_date, created_by)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (
                project_data['name'],
                project_data.get('description'),
                project_data.get('status', 'active'),
                project_data.get('start_date'),
                project_data.get('end_date'),
                project_data.get('created_by')
            ))

            project_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return project_id
        except Exception as e:
            print(f"Error creating project: {e}")
            return None

    def get_all_projects(self) -> List[Dict]:
        """Get all projects with creator information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT p.id, p.name, p.description, p.status, p.start_date, p.end_date,
                       p.created_by, p.created_at, p.updated_at, u.full_name as creator_name
                FROM projects p
                LEFT JOIN users u ON p.created_by = u.id
                ORDER BY p.created_at DESC
            ''')

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'status': row[3],
                'start_date': row[4],
                'end_date': row[5],
                'created_by': row[6],
                'created_at': row[7],
                'updated_at': row[8],
                'creator_name': row[9]
            } for row in rows]
        except Exception as e:
            print(f"Error getting all projects: {e}")
            return []

    def get_project_by_id(self, project_id: int) -> Optional[Dict]:
        """Get project by ID with creator information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT p.id, p.name, p.description, p.status, p.start_date, p.end_date,
                       p.created_by, p.created_at, p.updated_at, u.full_name as creator_name
                FROM projects p
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.id = ?
            ''', (project_id,))

            row = cursor.fetchone()
            conn.close()

            if row:
                return {
                    'id': row[0],
                    'name': row[1],
                    'description': row[2],
                    'status': row[3],
                    'start_date': row[4],
                    'end_date': row[5],
                    'created_by': row[6],
                    'created_at': row[7],
                    'updated_at': row[8],
                    'creator_name': row[9]
                }
            return None
        except Exception as e:
            print(f"Error getting project by ID: {e}")
            return None

    def update_project(self, project_id: int, project_data: Dict) -> bool:
        """Update project information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Build update query dynamically based on provided fields
            update_fields = []
            values = []
            
            for field in ['name', 'description', 'status', 'start_date', 'end_date']:
                if field in project_data:
                    update_fields.append(f"{field} = ?")
                    values.append(project_data[field])
            
            if not update_fields:
                return False

            update_fields.append("updated_at = CURRENT_TIMESTAMP")
            values.append(project_id)

            query = f"UPDATE projects SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, values)

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error updating project: {e}")
            return False

    def delete_project(self, project_id: int) -> bool:
        """Delete a project and all its meeting associations."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            # Delete project (project_meetings will be deleted by CASCADE)
            cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            
            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error deleting project: {e}")
            return False

    def link_meeting_to_project(self, project_id: int, meeting_id: int) -> bool:
        """Link a meeting to a project."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                INSERT OR IGNORE INTO project_meetings (project_id, meeting_id)
                VALUES (?, ?)
            ''', (project_id, meeting_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error linking meeting to project: {e}")
            return False

    def unlink_meeting_from_project(self, project_id: int, meeting_id: int) -> bool:
        """Unlink a meeting from a project."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                DELETE FROM project_meetings 
                WHERE project_id = ? AND meeting_id = ?
            ''', (project_id, meeting_id))

            success = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return success
        except Exception as e:
            print(f"Error unlinking meeting from project: {e}")
            return False

    def get_project_meetings(self, project_id: int) -> List[Dict]:
        """Get all meetings linked to a project."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT m.id, m.title, m.description, m.created_at, m.created_by,
                       u.full_name as creator_name, pm.linked_at
                FROM project_meetings pm
                JOIN meetings m ON pm.meeting_id = m.id
                LEFT JOIN users u ON m.created_by = u.id
                WHERE pm.project_id = ?
                ORDER BY pm.linked_at DESC
            ''', (project_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'created_at': row[3],
                'created_by': row[4],
                'creator_name': row[5],
                'linked_at': row[6]
            } for row in rows]
        except Exception as e:
            print(f"Error getting project meetings: {e}")
            return []

    def get_meeting_projects(self, meeting_id: int) -> List[Dict]:
        """Get all projects that a meeting is linked to."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT p.id, p.name, p.description, p.status, p.created_at,
                       u.full_name as creator_name, pm.linked_at
                FROM project_meetings pm
                JOIN projects p ON pm.project_id = p.id
                LEFT JOIN users u ON p.created_by = u.id
                WHERE pm.meeting_id = ?
                ORDER BY pm.linked_at DESC
            ''', (meeting_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'status': row[3],
                'created_at': row[4],
                'creator_name': row[5],
                'linked_at': row[6]
            } for row in rows]
        except Exception as e:
            print(f"Error getting meeting projects: {e}")
            return []

    def get_unlinked_meetings(self, project_id: int) -> List[Dict]:
        """Get all meetings that are not linked to a specific project."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT m.id, m.title, m.description, m.created_at, m.created_by,
                       u.full_name as creator_name
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                WHERE m.id NOT IN (
                    SELECT meeting_id FROM project_meetings WHERE project_id = ?
                )
                ORDER BY m.created_at DESC
            ''', (project_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'created_at': row[3],
                'created_by': row[4],
                'creator_name': row[5]
            } for row in rows]
        except Exception as e:
            print(f"Error getting unlinked meetings: {e}")
            return []

    def get_projects_by_user(self, user_id: int) -> List[Dict]:
        """Get all projects created by a specific user."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT p.id, p.name, p.description, p.status, p.start_date, p.end_date,
                       p.created_by, p.created_at, p.updated_at, u.full_name as creator_name
                FROM projects p
                LEFT JOIN users u ON p.created_by = u.id
                WHERE p.created_by = ?
                ORDER BY p.created_at DESC
            ''', (user_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'name': row[1],
                'description': row[2],
                'status': row[3],
                'start_date': row[4],
                'end_date': row[5],
                'created_by': row[6],
                'created_at': row[7],
                'updated_at': row[8],
                'creator_name': row[9]
            } for row in rows]
        except Exception as e:
            print(f"Error getting projects for user {user_id}: {e}")
            return []

    def get_meetings_by_user(self, user_id: int) -> List[Dict]:
        """Get all meetings created by a specific user with their project information."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()

            cursor.execute('''
                SELECT m.id, m.title, m.description, m.created_at, m.created_by, 
                       u.full_name as creator_name, p.id as project_id, p.name as project_name
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                LEFT JOIN project_meetings pm ON m.id = pm.meeting_id
                LEFT JOIN projects p ON pm.project_id = p.id
                WHERE m.created_by = ?
                ORDER BY m.created_at DESC
            ''', (user_id,))

            rows = cursor.fetchall()
            conn.close()

            return [{
                'id': row[0],
                'title': row[1],
                'description': row[2],
                'created_at': row[3],
                'created_by': row[4],
                'creator_name': row[5],
                'project_id': row[6],
                'project_name': row[7]
            } for row in rows]
        except Exception as e:
            print(f"Error getting meetings for user {user_id}: {e}")
            return []
