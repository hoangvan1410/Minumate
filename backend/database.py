import sqlite3
import os
from datetime import datetime
from typing import List, Dict, Optional
import json
 
class EmailTrackingDB:
    def __init__(self, db_path: str = "email_tracking.db"):
        self.db_path = db_path
        self.init_database()
   
    def get_connection(self):
        """Get database connection."""
        return sqlite3.connect(self.db_path)
   
    def init_database(self):
        """Initialize database with required tables."""
        conn = self.get_connection()
        cursor = conn.cursor()
       
        # Create emails table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS emails (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tracking_id TEXT UNIQUE NOT NULL,
                recipient_email TEXT NOT NULL,
                recipient_name TEXT NOT NULL,
                sender_email TEXT NOT NULL,
                sender_name TEXT NOT NULL,
                subject TEXT NOT NULL,
                content TEXT NOT NULL,
                sent_at TIMESTAMP NOT NULL,
                tracking_enabled BOOLEAN NOT NULL,
                sendgrid_message_id TEXT,
                status TEXT NOT NULL DEFAULT 'sent',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
       
        # Create email_events table for tracking opens, clicks, etc.
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS email_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tracking_id TEXT NOT NULL,
                event_type TEXT NOT NULL,  -- 'open', 'click', 'bounce', 'delivered'
                event_data TEXT,  -- JSON data for additional info
                ip_address TEXT,
                user_agent TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (tracking_id) REFERENCES emails (tracking_id)
            )
        ''')
       
        # Create indexes for better performance
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_tracking_id ON emails (tracking_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_recipient_email ON emails (recipient_email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sent_at ON emails (sent_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_tracking_id ON email_events (tracking_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_events_type ON email_events (event_type)')
       
        conn.commit()
        conn.close()
   
    def save_email(self, email_data: Dict) -> bool:
        """Save email information to database."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            cursor.execute('''
                INSERT OR REPLACE INTO emails
                (tracking_id, recipient_email, recipient_name, sender_email, sender_name,
                 subject, content, sent_at, tracking_enabled, sendgrid_message_id, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                email_data['tracking_id'],
                email_data['recipient_email'],
                email_data['recipient_name'],
                email_data.get('sender_email', ''),
                email_data.get('sender_name', ''),
                email_data['subject'],
                email_data.get('content', ''),
                email_data['sent_at'],
                email_data['tracking_enabled'],
                email_data.get('sendgrid_message_id', ''),
                email_data.get('status', 'sent')
            ))
           
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error saving email: {e}")
            return False
   
    def record_event(self, tracking_id: str, event_type: str,
                    event_data: Optional[Dict] = None,
                    ip_address: Optional[str] = None,
                    user_agent: Optional[str] = None) -> bool:
        """Record an email event (open, click, etc.)."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            cursor.execute('''
                INSERT INTO email_events
                (tracking_id, event_type, event_data, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?)
            ''', (
                tracking_id,
                event_type,
                json.dumps(event_data) if event_data else None,
                ip_address,
                user_agent
            ))
           
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Error recording event: {e}")
            return False
   
    def get_email_by_tracking_id(self, tracking_id: str) -> Optional[Dict]:
        """Get email information by tracking ID."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            cursor.execute('''
                SELECT * FROM emails WHERE tracking_id = ?
            ''', (tracking_id,))
           
            row = cursor.fetchone()
            conn.close()
           
            if row:
                columns = [desc[0] for desc in cursor.description]
                return dict(zip(columns, row))
            return None
        except Exception as e:
            print(f"Error getting email: {e}")
            return None
   
    def get_email_events(self, tracking_id: str) -> List[Dict]:
        """Get all events for a specific email."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            cursor.execute('''
                SELECT * FROM email_events
                WHERE tracking_id = ?
                ORDER BY timestamp DESC
            ''', (tracking_id,))
           
            rows = cursor.fetchall()
            conn.close()
           
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in rows]
        except Exception as e:
            print(f"Error getting events: {e}")
            return []
   
    def get_email_with_events(self, tracking_id: str) -> Optional[Dict]:
        """Get email with all its events."""
        email = self.get_email_by_tracking_id(tracking_id)
        if email:
            events = self.get_email_events(tracking_id)
            email['events'] = events
           
            # Add convenience flags
            email['opened'] = any(event['event_type'] == 'open' for event in events)
            email['clicked'] = any(event['event_type'] == 'click' for event in events)
            email['click_count'] = len([e for e in events if e['event_type'] == 'click'])
           
            # Get latest open time
            open_events = [e for e in events if e['event_type'] == 'open']
            if open_events:
                email['opened_at'] = open_events[0]['timestamp']  # Most recent first
           
        return email
   
    def get_all_emails(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """Get all emails with basic event counts."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            cursor.execute('''
                SELECT e.*,
                       COUNT(CASE WHEN ev.event_type = 'open' THEN 1 END) as open_count,
                       COUNT(CASE WHEN ev.event_type = 'click' THEN 1 END) as click_count,
                       MAX(CASE WHEN ev.event_type = 'open' THEN ev.timestamp END) as last_opened
                FROM emails e
                LEFT JOIN email_events ev ON e.tracking_id = ev.tracking_id
                GROUP BY e.id
                ORDER BY e.sent_at DESC
                LIMIT ? OFFSET ?
            ''', (limit, offset))
           
            rows = cursor.fetchall()
            conn.close()
           
            columns = [desc[0] for desc in cursor.description]
            emails = [dict(zip(columns, row)) for row in rows]
           
            # Add convenience flags
            for email in emails:
                email['opened'] = email['open_count'] > 0
                email['clicked'] = email['click_count'] > 0
           
            return emails
        except Exception as e:
            print(f"Error getting all emails: {e}")
            return []
   
    def get_email_stats(self) -> Dict:
        """Get email statistics."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
           
            # Total emails
            cursor.execute('SELECT COUNT(*) FROM emails')
            total_emails = cursor.fetchone()[0]
           
            # Emails with opens
            cursor.execute('''
                SELECT COUNT(DISTINCT e.tracking_id)
                FROM emails e
                JOIN email_events ev ON e.tracking_id = ev.tracking_id
                WHERE ev.event_type = 'open'
            ''')
            opened_emails = cursor.fetchone()[0]
           
            # Emails with clicks
            cursor.execute('''
                SELECT COUNT(DISTINCT e.tracking_id)
                FROM emails e
                JOIN email_events ev ON e.tracking_id = ev.tracking_id
                WHERE ev.event_type = 'click'
            ''')
            clicked_emails = cursor.fetchone()[0]
           
            # Recent emails (last 24 hours)
            cursor.execute('''
                SELECT COUNT(*) FROM emails
                WHERE sent_at > datetime('now', '-1 day')
            ''')
            recent_emails = cursor.fetchone()[0]
           
            conn.close()
           
            return {
                'total_emails': total_emails,
                'opened_emails': opened_emails,
                'clicked_emails': clicked_emails,
                'recent_emails': recent_emails,
                'open_rate': (opened_emails / total_emails * 100) if total_emails > 0 else 0,
                'click_rate': (clicked_emails / total_emails * 100) if total_emails > 0 else 0
            }
        except Exception as e:
            print(f"Error getting stats: {e}")
            return {}
   
    def delete_old_emails(self, days_old: int = 30) -> int:
        """Delete emails older than specified days."""
        try:
            conn = self.get_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                DELETE FROM email_events
                WHERE tracking_id IN (
                    SELECT tracking_id FROM emails
                    WHERE sent_at < datetime('now', '-' || ? || ' days')
                )
            ''', (days_old,))
            
            cursor.execute('''
                DELETE FROM emails
                WHERE sent_at < datetime('now', '-' || ? || ' days')
            ''', (days_old,))
            
            deleted_count = cursor.rowcount
            conn.commit()
            conn.close()
            return deleted_count
        except Exception as e:
            print(f"Error deleting old emails: {e}")
            return 0
 
 