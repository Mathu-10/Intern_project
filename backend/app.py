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
        # Create logins table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        # Create predictions table
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

@app.route('/login', methods=['POST'])
def login():
    """Handles and audits student login attempts."""
    try:
        data = request.get_json(force=True)
        email = data.get('email')
        password = data.get('password') # Dummy password check for college project sandbox
        
        if not email:
            return jsonify({
                "success": False, 
                "message": "Email is required"
            }), 400
            
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
        
        # Decode target label
        recommended_event = event_encoder.inverse_transform([prediction_encoded])[0]

        # Log prediction to DB and activity log file
        save_prediction_to_db(dept, year, interest, past_events, attendance, engagement, feedback, str(recommended_event))

        return jsonify({
            "success": True,
            "recommended_event": str(recommended_event)
        }), 200

    except Exception as e:
        app.logger.error(f"Prediction exception: {e}")
        return jsonify({
            "success": False, 
            "message": "Invalid input"
        }), 400

@app.route('/api/activity', methods=['GET'])
def get_activity():
    """Retrieves prediction audit logs and login histories."""
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get last 50 logins
        cursor.execute('SELECT email, timestamp FROM logins ORDER BY timestamp DESC LIMIT 50')
        logins = [{"email": row[0], "timestamp": row[1]} for row in cursor.fetchall()]
        
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
