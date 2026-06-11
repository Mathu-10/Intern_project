# Smart Event Recommendation Platform for Students

An AI-powered academic and career event recommendation web application designed for university students. This platform leverages a pre-trained **Random Forest Classifier** model to recommend college events (such as workshops, seminars, coding challenges, and hackathons) based on academic profile vectors and student interest preferences.

Suitable for college AI/ML academic project demonstrations.

---

## Folder Structure

```
Smart-Event-Recommendation/
├── backend/
│   ├── app.py                      # Flask backend API
│   ├── requirements.txt            # Python packages dependencies
│   └── model/                      # Trained model & categorical encoders
│       ├── event_recommendation_model.pkl
│       ├── department_encoder.pkl
│       ├── interest_encoder.pkl
│       ├── engagement_encoder.pkl
│       └── event_encoder.pkl
│
├── frontend/
│   ├── index.html                  # Interface structure (HTML5)
│   ├── style.css                   # Custom styles & responsiveness (CSS3)
│   ├── script.js                   # Client-side dynamic validation & async requests
│   └── hero_illustration.png       # Generated Student & AI hero illustration
│
└── README.md                       # Documentation
```

---

## Features

- **Machine Learning Integration**: Loads a pre-trained Random Forest model and five categorical LabelEncoders during Flask startup.
- **Academic Input Capture**: Collects department, year of study, technical interest domain, past event history count, academic attendance, feedback rating patterns, and current enrollment status.
- **Robust Field Validation**: Complete client-side validation for all fields, ensuring correct data formats prior to API dispatch.
- **University Design Aesthetic**: Sleek slate-and-blue theme, clean typography, soft card shadows, smooth transitions, and count-up statistics animations.
- **Asynchronous Loading Interface**: Handles dynamic state changes (Form Entry → Loader Transition → Result Rendering) without page refresh.
- **Responsive Layout**: Designed for seamless accessibility across desktops, tablets, and mobile smartphones.
- **Server Offline Fallback Mode**: Gracefully catches connection issues if the local Flask API is offline and offers interactive guidance.

---

## Technical Architecture & Prediction Logic

1. **Input Collection**: The frontend collects form selections. The categorical inputs must map exactly to values supported by the encoders.
2. **REST Request**: Student parameters are converted into a JSON payload and dispatched via a `POST` request to the backend `/predict` endpoint.
3. **Backend Processing (`app.py`)**:
   - Validates JSON fields and runs type-sanity checks.
   - Decodes inputs and checks if category values belong to the encoder's learned classes (returns HTTP 400 Bad Request if invalid inputs are supplied).
   - Numerically encodes categorical strings using the saved `LabelEncoder` objects.
   - Constructs a pandas `DataFrame` with columns structured in the exact sequence expected by the Random Forest classifier:
     `['department', 'year', 'interest_area', 'past_events_attended', 'attendance_percentage', 'engagement_status', 'feedback_rating']`
   - Executes `model.predict(input_df)` to obtain the numerical target prediction.
   - Runs `inverse_transform` on the prediction index using the target `event_encoder` to map it back to the event string.
4. **Response Delivery**: The Flask API responds with `{"success": true, "recommended_event": "AI Workshop"}`.
5. **Frontend Update**: The UI displays the recommendation details (matching the recommended event against metadata for category, difficulty, and description), and dynamically animates a match confidence score.

---

## Installation & Setup

### 1. Backend Setup

First, navigate to the `backend/` directory:
```bash
cd backend
```

Create a Python virtual environment:
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows (Command Prompt)**:
  ```cmd
  venv\Scripts\activate.bat
  ```
- **Windows (PowerShell)**:
  ```powershell
  .\venv\Scripts\Activate.ps1
  ```
- **macOS / Linux**:
  ```bash
  source venv/bin/activate
  ```

Install Python dependencies:
```bash
pip install -r requirements.txt
```

Run the Flask backend server:
```bash
python app.py
```
The server will boot on `http://127.0.0.1:5000/`.

---

### 2. Frontend Setup

Since the frontend is built using Vanilla HTML5, CSS3, and JavaScript:
1. Open the `frontend/` directory.
2. Double-click `index.html` to open it in any web browser (Chrome, Firefox, Edge, Safari).
3. (Optional) For a full local server setup, you can host the frontend folder using extension tools like VS Code Live Server or python's built-in http server:
   ```bash
   cd frontend
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000/` in your browser.

---

## Future Enhancements

- **Dynamic Database Integration**: Replace static upcoming events with database-driven updates (e.g. SQLite/MongoDB).
- **Expanded Model Classes**: Update the Random Forest model to recommend external online webinars and Coursera courses.
- **Enhanced Metrics Dashboards**: Incorporate student-facing analytics charts using Chart.js to track event registrations.
- **Authentication**: Enable Google OAuth/Firebase login for students to save recommendations.
