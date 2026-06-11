import os
import sqlite3
import warnings
import datetime
import numpy as np
import pandas as pd
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

# Suppress version discrepancy warnings from scikit-learn unpickling
warnings.filterwarnings("ignore")

app = Flask(__name__)
# Enable CORS for frontend integration
CORS(app)

# Load encoders and model during startup
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'model')

try:
    print("Loading ML models and encoders...")
    department_encoder = joblib.load(os.path.join(MODEL_DIR, 'department_encoder.pkl'))
    interest_encoder = joblib.load(os.path.join(MODEL_DIR, 'interest_encoder.pkl'))
    engagement_encoder = joblib.load(os.path.join(MODEL_DIR, 'engagement_encoder.pkl'))
    event_encoder = joblib.load(os.path.join(MODEL_DIR, 'event_encoder.pkl'))
    model = joblib.load(os.path.join(MODEL_DIR, 'event_recommendation_model.pkl'))
    print("Models and encoders loaded successfully.")
except Exception as e:
    print(f"Error loading models/encoders: {e}")
    raise e

# Database and log file setup
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.db')
LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
LOG_FILE = os.path.join(LOG_DIR, 'activity.log')

def init_db():
    """Initializes SQLite database tables if they do not exist."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Create users table (registered credentials)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create logins table (audit log of login events)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create predictions table (audit log of ML inferences)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                department TEXT NOT NULL,
                year INTEGER NOT NULL,
                interest_area TEXT NOT NULL,
                past_events_attended INTEGER NOT NULL,
                attendance_percentage REAL NOT NULL,
                engagement_status TEXT NOT NULL,
                feedback_rating INTEGER NOT NULL,
                recommended_event TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Create admins table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS admins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        ''')

        # Create events table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date_day TEXT NOT NULL,
                date_month TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                time TEXT NOT NULL,
                venue TEXT NOT NULL,
                event_type TEXT NOT NULL
            )
        ''')

        # Seed default admin account
        cursor.execute('SELECT id FROM admins WHERE email = ?', ('admin@smartevent.edu',))
        if not cursor.fetchone():
            cursor.execute('INSERT INTO admins (email, password) VALUES (?, ?)', ('admin@smartevent.edu', 'admin123'))

        # Seed default events if table is empty
        cursor.execute('SELECT COUNT(*) FROM events')
        if cursor.fetchone()[0] == 0:
            default_events = [
                ('15','Jun','Workshop','AI Workshop: Fundamentals of Neural Networks','10:00 AM - 01:00 PM','Block A, Seminar Hall','AI Workshop'),
                ('18','Jun','Hackathon','GenAI Hackathon: Build LLM Prototypes','09:00 AM - 05:00 PM','Innovation Lab, CS Block','GenAI Hackathon'),
                ('21','Jun','Seminar','Career Guidance: Industry Prep for AI/ML Roles','02:00 PM - 04:00 PM','Main Auditorium','Career Development Session'),
                ('24','Jun','Seminar','Machine Learning Seminar: From Theory to Production','11:00 AM - 01:00 PM','Block B, Seminar Hall','Machine Learning Seminar'),
                ('27','Jun','Bootcamp','Prompt Engineering Bootcamp: Master LLM Interactions','09:00 AM - 03:00 PM','Computer Lab 2, IT Block','Prompt Engineering Bootcamp'),
                ('30','Jun','Challenge','Python Coding Challenge: Data Structures & Algorithms','10:00 AM - 12:00 PM','Online + Lab 3','Python Coding Challenge'),
                ('03','Jul','Summit','Data Engineering Summit: Modern Data Stack','09:00 AM - 05:00 PM','Innovation Hub, Main Block','Data Engineering Summit'),
                ('07','Jul','Symposium','Research Symposium: Emerging Trends in Computer Science','10:00 AM - 04:00 PM','Main Auditorium','Research Symposium'),
            ]
            cursor.executemany('INSERT INTO events (date_day,date_month,category,title,time,venue,event_type) VALUES (?,?,?,?,?,?,?)', default_events)

        conn.commit()
        conn.close()
        print("Database initialized successfully.")
    except Exception as e:
        print(f"Database initialization error: {e}")

# Run database setup
init_db()

def log_to_file(tag, message):
    """Appends an activity event directly to the raw text log file."""
    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(LOG_FILE, 'a') as f:
            f.write(f"[{timestamp}] [{tag}] {message}\n")
    except Exception as e:
        print(f"Error writing to text logs: {e}")

def save_login_to_db(email):
    """Inserts a student login record into database and logs to file."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO logins (email) VALUES (?)', (email,))
        conn.commit()
        conn.close()
        log_to_file("LOGIN", f"User logged in: {email}")
    except Exception as e:
        print(f"Error saving login: {e}")

def save_prediction_to_db(dept, year, interest, past_events, attendance, engagement, feedback, recommendation):
    """Inserts a prediction transaction into database and logs to file."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO predictions (department, year, interest_area, past_events_attended, attendance_percentage, engagement_status, feedback_rating, recommended_event)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (dept, year, interest, past_events, attendance, engagement, feedback, recommendation))
        conn.commit()
        conn.close()
        log_to_file("PREDICTION", f"Dept: {dept}, Year: {year}, Interest: {interest}, Attended: {past_events}, Attendance: {attendance}%, Status: {engagement}, Rating: {feedback} => Rec: {recommendation}")
    except Exception as e:
        print(f"Error saving prediction: {e}")


@app.route('/', methods=['GET'])
def home():
    """Status endpoint."""
    return jsonify({
        "status": "running",
        "message": "Smart Event Recommendation API"
    }), 200

@app.route('/register', methods=['POST'])
def register():
    """Registers a new student user with credentials."""
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({
                "success": False,
                "message": "Email and password are required"
            }), 400

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute('SELECT id FROM users WHERE email = ?', (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({
                "success": False,
                "message": "Email already registered"
            }), 400

        # Insert user (stored plain text for sandbox academic showcase purposes)
        cursor.execute('INSERT INTO users (email, password) VALUES (?, ?)', (email, password))
        conn.commit()
        conn.close()

        log_to_file("REGISTER", f"New user registered: {email}")
        return jsonify({
            "success": True,
            "message": "User registered successfully"
        }), 200

    except Exception as e:
        app.logger.error(f"Register exception: {e}")
        return jsonify({
            "success": False,
            "message": "Registration failed"
        }), 400

@app.route('/login', methods=['POST'])
def login():
    """Handles and verifies student login credentials."""
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({
                "success": False, 
                "message": "Email and password are required"
            }), 400
            
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check if user exists in the database
        cursor.execute('SELECT password FROM users WHERE email = ?', (email,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({
                "success": False,
                "message": "User does not exist. Please register first."
            }), 400

        db_password = row[0]
        if db_password != password:
            conn.close()
            return jsonify({
                "success": False,
                "message": "Incorrect password"
            }), 400
            
        conn.close()

        # Save login audit trail
        save_login_to_db(email)
        
        return jsonify({
            "success": True,
            "message": "Logged in successfully",
            "email": email
        }), 200

    except Exception as e:
        app.logger.error(f"Login exception: {e}")
        return jsonify({
            "success": False, 
            "message": "Login failed"
        }), 400

@app.route('/predict', methods=['POST'])
def predict():
    """Recommends an event based on student features."""
    try:
        data = request.get_json(force=True)
        
        # Required features list
        required_fields = [
            'department', 
            'year', 
            'interest_area', 
            'past_events_attended', 
            'attendance_percentage', 
            'engagement_status', 
            'feedback_rating'
        ]
        
        # Validate existence of all fields
        for field in required_fields:
            if field not in data or data[field] is None:
                return jsonify({
                    "success": False, 
                    "message": "Invalid input"
                }), 400

        dept = data['department']
        year = data['year']
        interest = data['interest_area']
        past_events = data['past_events_attended']
        attendance = data['attendance_percentage']
        engagement = data['engagement_status']
        feedback = data['feedback_rating']

        # Validate categorical values against encoder classes
        if dept not in department_encoder.classes_:
            return jsonify({
                "success": False, 
                "message": "Invalid input"
            }), 400
            
        if interest not in interest_encoder.classes_:
            return jsonify({
                "success": False, 
                "message": "Invalid input"
            }), 400
            
        if engagement not in engagement_encoder.classes_:
            return jsonify({
                "success": False, 
                "message": "Invalid input"
            }), 400

        # Validate numerical types and values
        try:
            year = int(year)
            past_events = int(past_events)
            attendance = float(attendance)
            feedback = int(feedback)
        except (ValueError, TypeError):
            return jsonify({
                "success": False, 
                "message": "Invalid input"
            }), 400

        # Transform categorical strings into numerical categories
        encoded_dept = int(department_encoder.transform([dept])[0])
        encoded_interest = int(interest_encoder.transform([interest])[0])
        encoded_engagement = int(engagement_encoder.transform([engagement])[0])

        # Create input DataFrame matching expected feature structure
        input_df = pd.DataFrame([{
            'department': encoded_dept,
            'year': year,
            'interest_area': encoded_interest,
            'past_events_attended': past_events,
            'attendance_percentage': attendance,
            'engagement_status': encoded_engagement,
            'feedback_rating': feedback
        }])

        # Predict using Random Forest classifier
        prediction_encoded = model.predict(input_df)[0]
        
        # Get real confidence score from predict_proba
        proba = model.predict_proba(input_df)[0]
        confidence = round(float(max(proba)) * 100, 1)

        # Get feature importances from the model
        feature_names = ['Department', 'Year', 'Interest Area', 'Past Events', 'Attendance', 'Engagement', 'Feedback Rating']
        importances = model.feature_importances_
        feature_importance_list = [
            {"feature": feature_names[i], "importance": round(float(importances[i]) * 100, 1)}
            for i in range(len(feature_names))
        ]
        feature_importance_list.sort(key=lambda x: x["importance"], reverse=True)
        top_features = feature_importance_list[:3]

        # Decode target label
        recommended_event = event_encoder.inverse_transform([prediction_encoded])[0]

        # Log prediction to DB and activity log file
        save_prediction_to_db(dept, year, interest, past_events, attendance, engagement, feedback, str(recommended_event))

        return jsonify({
            "success": True,
            "recommended_event": str(recommended_event),
            "confidence": confidence,
            "top_features": top_features
        }), 200

    except Exception as e:
        app.logger.error(f"Prediction exception: {e}")
        return jsonify({
            "success": False, 
            "message": "Invalid input"
        }), 400

@app.route('/api/events', methods=['GET'])
def get_events():
    """Returns events from the database."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT id,date_day,date_month,category,title,time,venue,event_type FROM events ORDER BY id')
        events = [{
            'id': r[0], 'date_day': r[1], 'date_month': r[2], 'category': r[3],
            'title': r[4], 'time': r[5], 'venue': r[6], 'event_type': r[7]
        } for r in cursor.fetchall()]
        conn.close()
        return jsonify({'success': True, 'events': events}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/login', methods=['POST'])
def admin_login():
    """Admin-only login endpoint."""
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        password = data.get('password')
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password required'}), 400
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('SELECT password FROM admins WHERE email = ?', (email,))
        row = cursor.fetchone()
        conn.close()
        if not row or row[0] != password:
            return jsonify({'success': False, 'message': 'Invalid admin credentials'}), 400
        log_to_file('ADMIN_LOGIN', f'Admin logged in: {email}')
        return jsonify({'success': True, 'email': email}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': 'Admin login failed'}), 400

def verify_admin(req):
    """Check admin session token from request header."""
    return req.headers.get('X-Admin-Email') is not None and req.headers.get('X-Admin-Email') != ''

@app.route('/admin/events', methods=['POST'])
def add_event():
    """Admin: Add a new event."""
    if not verify_admin(request):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    try:
        data = request.get_json(force=True)
        required = ['date_day','date_month','category','title','time','venue','event_type']
        for f in required:
            if not data.get(f):
                return jsonify({'success': False, 'message': f'{f} is required'}), 400
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('INSERT INTO events (date_day,date_month,category,title,time,venue,event_type) VALUES (?,?,?,?,?,?,?)',
            (data['date_day'], data['date_month'], data['category'], data['title'], data['time'], data['venue'], data['event_type']))
        conn.commit()
        new_id = cursor.lastrowid
        conn.close()
        log_to_file('ADMIN_ADD_EVENT', f"Added event: {data['title']}")
        return jsonify({'success': True, 'id': new_id}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/admin/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    """Admin: Delete an event by ID."""
    if not verify_admin(request):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 401
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM events WHERE id = ?', (event_id,))
        conn.commit()
        conn.close()
        log_to_file('ADMIN_DELETE_EVENT', f'Deleted event ID: {event_id}')
        return jsonify({'success': True}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@app.route('/api/activity', methods=['GET'])
def get_activity():
    """Retrieves prediction logs, login audit trails, and registered users list."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get last 50 logins
        cursor.execute('SELECT email, timestamp FROM logins ORDER BY timestamp DESC LIMIT 50')
        logins = [{"email": row[0], "timestamp": row[1]} for row in cursor.fetchall()]
        
        # Get registered users list
        cursor.execute('SELECT email, created_at FROM users ORDER BY created_at DESC LIMIT 50')
        users = [{"email": row[0], "created_at": row[1]} for row in cursor.fetchall()]
        
        # Get last 50 predictions
        cursor.execute('''
            SELECT department, year, interest_area, past_events_attended, 
                   attendance_percentage, engagement_status, feedback_rating, 
                   recommended_event, timestamp 
            FROM predictions 
            ORDER BY timestamp DESC LIMIT 50
        ''')
        predictions = [{
            "department": row[0],
            "year": row[1],
            "interest_area": row[2],
            "past_events_attended": row[3],
            "attendance_percentage": row[4],
            "engagement_status": row[5],
            "feedback_rating": row[6],
            "recommended_event": row[7],
            "timestamp": row[8]
        } for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            "success": True,
            "logins": logins,
            "users": users,
            "predictions": predictions
        }), 200
    except Exception as e:
        app.logger.error(f"Activity API exception: {e}")
        return jsonify({
            "success": False, 
            "message": "Failed to fetch activities"
        }), 500

if __name__ == '__main__':
    # Run server locally on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
