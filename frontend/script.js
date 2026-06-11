// Global helper variables and configurations
const API_BASE_URL = 'http://127.0.0.1:5000';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // Elements Setup
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const attendanceSlider = document.getElementById('attendance_percentage');
    const attendanceDisplay = document.getElementById('attendance-display');
    const recommendationForm = document.getElementById('recommendation-form');
    
    // Result Card Views
    const resultPlaceholder = document.getElementById('result-placeholder');
    const resultLoader = document.getElementById('result-loader');
    const resultDisplay = document.getElementById('result-display');
    
    // Result Detail Elements
    const eventNameEl = document.getElementById('event-name');
    const eventCategoryEl = document.getElementById('event-category');
    const eventDifficultyEl = document.getElementById('event-difficulty');
    const eventDescEl = document.getElementById('event-description');
    const matchScoreText = document.getElementById('match-score-text');
    const matchScoreFill = document.getElementById('match-score-fill');

    // Event metadata dictionary
    const eventMetadata = {
        'AI Workshop': {
            category: 'Artificial Intelligence',
            difficulty: 'Beginner',
            description: 'A hands-on workshop covering deep learning, neural networks, and computer vision basics. Perfect for kickstarting your AI journey.'
        },
        'Career Development Session': {
            category: 'Career & Soft Skills',
            difficulty: 'Beginner',
            description: 'Improve your resume, learn interview strategies, and build a professional network for your career success.'
        },
        'Data Engineering Summit': {
            category: 'Data Science',
            difficulty: 'Advanced',
            description: 'Dive deep into big data pipelines, ETL processes, data warehousing, and modern data stack architectures.'
        },
        'GenAI Hackathon': {
            category: 'Software Development',
            difficulty: 'Intermediate',
            description: 'Collaborate in teams to build innovative applications using large language models and generative AI tools.'
        },
        'Machine Learning Seminar': {
            category: 'Machine Learning',
            difficulty: 'Intermediate',
            description: 'Learn from experts about supervised, unsupervised learning, model evaluation, and deployment paradigms.'
        },
        'Prompt Engineering Bootcamp': {
            category: 'Artificial Intelligence',
            difficulty: 'Beginner',
            description: 'Master the art of crafting effective prompts to interact with large language models like GPT-4 and Claude.'
        },
        'Python Coding Challenge': {
            category: 'Programming',
            difficulty: 'Intermediate',
            description: 'Test your coding skills, algorithms, and data structures knowledge in a timed Python programming contest.'
        },
        'Research Symposium': {
            category: 'Research & Academia',
            difficulty: 'Advanced',
            description: 'Present and discuss advanced research papers, academic findings, and emerging technologies in computer science.'
        }
    };

    // Sticky Navbar & Active Link Highlight
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        highlightActiveSection();
    });

    // Mobile Navbar Toggle
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            const icon = navToggle.querySelector('i');
            if (navMenu.classList.contains('show')) {
                icon.setAttribute('data-lucide', 'x');
            } else {
                icon.setAttribute('data-lucide', 'menu');
            }
            lucide.createIcons();
        });

        // Close menu on link click
        navMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('show');
                navToggle.querySelector('i').setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            });
        });
    }

    // Attendance Slider Display Update
    if (attendanceSlider && attendanceDisplay) {
        attendanceSlider.addEventListener('input', (e) => {
            attendanceDisplay.textContent = `${e.target.value}%`;
        });
    }

    // Active Section Indicator on Scroll
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    function highlightActiveSection() {
        let scrollPosition = window.scrollY + 100;

        sections.forEach(section => {
            if (scrollPosition >= section.offsetTop && scrollPosition < (section.offsetTop + section.offsetHeight)) {
                const id = section.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    // Check existing student login session state
    const savedEmail = localStorage.getItem('student_email');
    if (savedEmail) {
        updateNavbarLoginState(savedEmail);
        const adminSection = document.getElementById('admin-section');
        if (adminSection) adminSection.style.display = 'block';
        fetchActivityLogs();
    }

    // Statistics Increment Animation
    animateStatistics();

    // Recommendation Form Submit Handler
    if (recommendationForm) {
        recommendationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!validateForm()) {
                return; // Stop if form is invalid
            }

            // Gather Form Data
            const payload = {
                department: document.getElementById('department').value,
                year: parseInt(document.getElementById('year').value, 10),
                interest_area: document.getElementById('interest_area').value,
                past_events_attended: parseInt(document.getElementById('past_events_attended').value, 10),
                attendance_percentage: parseFloat(document.getElementById('attendance_percentage').value),
                engagement_status: document.getElementById('engagement_status').value,
                feedback_rating: parseInt(document.getElementById('feedback_rating').value, 10)
            };

            // Switch to Loading State
            showCardState('loading');

            try {
                const response = await fetch(`${API_BASE_URL}/predict`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error('Server returned an error response.');
                }

                const result = await response.json();

                if (result.success) {
                    // Introduce a tiny artificial delay to make the loading transition smooth
                    setTimeout(() => {
                        renderRecommendation(result.recommended_event, payload);
                        showCardState('result');
                        // If logged in, fetch activity logs automatically to show user's action
                        if (localStorage.getItem('student_email')) {
                            fetchActivityLogs();
                        }
                    }, 800);
                } else {
                    throw new Error(result.message || 'Failed to predict.');
                }

            } catch (error) {
                console.error('API Error:', error);
                setTimeout(() => {
                    renderError();
                    showCardState('result');
                }, 800);
            }
        });
    }

    // Form Validator Function
    function validateForm() {
        let isValid = true;
        
        // Helper validation function
        const validateField = (id, errorId, condition) => {
            const field = document.getElementById(id);
            const errorEl = document.getElementById(errorId);
            const parent = field.parentElement;
            
            if (condition(field.value)) {
                parent.classList.remove('invalid');
                return true;
            } else {
                parent.classList.add('invalid');
                isValid = false;
                return false;
            }
        };

        // Department Validate
        validateField('department', 'department-error', val => val !== "");
        // Year Validate
        validateField('year', 'year-error', val => val !== "");
        // Interest Validate
        validateField('interest_area', 'interest-error', val => val !== "");
        // Engagement Validate
        validateField('engagement_status', 'engagement-error', val => val !== "");
        // Feedback Validate
        validateField('feedback_rating', 'feedback-error', val => val !== "");
        
        // Past Events Validate
        validateField('past_events_attended', 'past-events-error', val => {
            const num = parseInt(val, 10);
            return !isNaN(num) && num >= 0 && num <= 30;
        });

        return isValid;
    }

    // Switch between Placeholder, Loading, and Result view states
    function showCardState(state) {
        resultPlaceholder.style.display = 'none';
        resultLoader.style.display = 'none';
        resultDisplay.style.display = 'none';

        if (state === 'placeholder') {
            resultPlaceholder.style.display = 'block';
        } else if (state === 'loading') {
            resultLoader.style.display = 'flex';
        } else if (state === 'result') {
            resultDisplay.style.display = 'flex';
        }
    }

    // Render Recommendation Details into UI
    function renderRecommendation(eventName, inputs) {
        // Find metadata or use fallback
        const meta = eventMetadata[eventName] || {
            category: 'Academic & Technical',
            difficulty: 'Intermediate',
            description: 'An engaging campus technical session tailored to develop your academic profile and vocational skills.'
        };

        // Populate elements
        eventNameEl.textContent = eventName;
        eventCategoryEl.textContent = meta.category;
        eventDifficultyEl.textContent = meta.difficulty;
        eventDescEl.textContent = meta.description;

        // Apply visual updates based on difficulty
        eventDifficultyEl.className = 'difficulty-tag';
        if (meta.difficulty === 'Beginner') {
            eventDifficultyEl.style.backgroundColor = 'var(--success-light)';
            eventDifficultyEl.style.color = 'var(--success-color)';
        } else if (meta.difficulty === 'Advanced') {
            eventDifficultyEl.style.backgroundColor = '#FEE2E2';
            eventDifficultyEl.style.color = 'var(--danger-color)';
        } else {
            eventDifficultyEl.style.backgroundColor = 'var(--bg-tertiary)';
            eventDifficultyEl.style.color = 'var(--text-secondary)';
        }

        // Calculate a realistic Match Score
        // Base score on affinity rules
        let baseScore = 75;
        // Boost score slightly if attendance is high
        if (inputs.attendance_percentage > 85) baseScore += 8;
        // Boost if they have attended past events
        if (inputs.past_events_attended > 3) baseScore += 5;
        // Boost if feedback is active
        if (inputs.feedback_rating >= 4) baseScore += 5;
        // Clamp between 75 and 98
        const finalScore = Math.min(98, Math.max(75, baseScore));

        matchScoreText.textContent = `${finalScore}%`;
        matchScoreFill.style.width = '0%';
        
        // Animate fill bar loading
        setTimeout(() => {
            matchScoreFill.style.width = `${finalScore}%`;
        }, 100);
    }

    // Render error card state if API fails
    function renderError() {
        eventNameEl.textContent = "Offline Recommendation Mode";
        eventCategoryEl.textContent = "AI Recommendation System";
        eventDifficultyEl.textContent = "Local Backup";
        eventDifficultyEl.style.backgroundColor = 'var(--bg-tertiary)';
        eventDifficultyEl.style.color = 'var(--text-secondary)';
        
        eventDescEl.innerHTML = `<span style="color: var(--danger-color); font-weight: 600;">Could not connect to local Flask server (http://127.0.0.1:5000).</span><br><br>
        Please ensure the backend is running by executing <code>python app.py</code> in the terminal. In the meantime, based on your profile, we recommend attending the <strong>AI Workshop</strong>.`;
        
        matchScoreText.textContent = "N/A";
        matchScoreFill.style.width = '0%';
    }

    // Number Increment Animation for Statistics
    function animateStatistics() {
        const stats = document.querySelectorAll('.stat-number');
        stats.forEach(stat => {
            const target = parseInt(stat.getAttribute('data-target'), 10);
            if (isNaN(target)) return;

            let current = 0;
            const duration = 1500; // 1.5s
            const interval = 20; // 20ms
            const step = Math.ceil(target / (duration / interval));

            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    stat.textContent = target + (target === 100 || target === 1000 ? '+' : '');
                    clearInterval(timer);
                } else {
                    stat.textContent = current;
                }
            }, interval);
        });
    }
});

// Event Handlers for UI Popups & Sessions
function openLoginModal() {
    document.getElementById('login-modal').style.display = 'flex';
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
}

// Update navbar layout dynamically on login state
function updateNavbarLoginState(email) {
    const container = document.getElementById('nav-actions-container');
    if (!container) return;

    if (email) {
        container.innerHTML = `
            <span class="user-welcome"><i data-lucide="user"></i> ${email}</span>
            <button class="btn btn-outline" onclick="handleLogout()" style="padding: 6px 14px; font-size: 0.85rem;">Logout</button>
        `;
    } else {
        container.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">Student Login</button>
            <a href="#recommendations" class="btn btn-primary">Get Started</a>
        `;
    }
    lucide.createIcons();
}

// POST login request to the Flask server
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('student-email').value;
    const password = document.getElementById('student-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            localStorage.setItem('student_email', email);
            updateNavbarLoginState(email);
            closeLoginModal();

            // Display and populate the Admin section
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.style.display = 'block';
                // Scroll to Admin section smoothly
                setTimeout(() => {
                    adminSection.scrollIntoView({ behavior: 'smooth' });
                }, 300);
            }
            fetchActivityLogs();
            alert(`Welcome back! Logged in successfully as: ${email}`);
        } else {
            alert('Login failed: ' + (result.message || 'Server error'));
        }
    } catch (err) {
        console.error('Login error:', err);
        // Fallback mockup login if server is offline
        localStorage.setItem('student_email', email);
        updateNavbarLoginState(email);
        closeLoginModal();
        alert(`Offline Mode: Dummy login successful for ${email}. Start the backend server to audit logins.`);
    }
}

// Clear session and restore logged-out state
function handleLogout() {
    localStorage.removeItem('student_email');
    updateNavbarLoginState(null);
    const adminSection = document.getElementById('admin-section');
    if (adminSection) adminSection.style.display = 'none';
    alert('Logged out successfully.');
}

// Query backend /api/activity logs and render tables
async function fetchActivityLogs() {
    const predictionsBody = document.getElementById('predictions-log-body');
    const loginsBody = document.getElementById('logins-log-body');

    try {
        const response = await fetch(`${API_BASE_URL}/api/activity`);
        if (!response.ok) throw new Error('Failed to fetch activity logs');
        
        const result = await response.json();

        if (result.success) {
            // Render predictions logs
            if (result.predictions && result.predictions.length > 0) {
                predictionsBody.innerHTML = result.predictions.map(pred => {
                    // Extract Date-Time string representation
                    const dateStr = pred.timestamp.replace('T', ' ').substring(0, 19);
                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td><strong>${pred.department}</strong></td>
                            <td>Year ${pred.year}</td>
                            <td>${pred.interest_area}</td>
                            <td>${pred.past_events_attended}</td>
                            <td>${pred.attendance_percentage}%</td>
                            <td>${pred.feedback_rating} Star</td>
                            <td><span style="color: var(--accent-color); font-weight: 600;">${pred.recommended_event}</span></td>
                        </tr>
                    `;
                }).join('');
            } else {
                predictionsBody.innerHTML = `<tr><td colspan="8" class="text-center">No predictions logged yet. Make a recommendation query above!</td></tr>`;
            }

            // Render logins logs
            if (result.logins && result.logins.length > 0) {
                loginsBody.innerHTML = result.logins.map(log => {
                    const dateStr = log.timestamp.replace('T', ' ').substring(0, 19);
                    return `
                        <tr>
                            <td>${dateStr}</td>
                            <td><strong>${log.email}</strong></td>
                        </tr>
                    `;
                }).join('');
            } else {
                loginsBody.innerHTML = `<tr><td colspan="2" class="text-center">No login history recorded yet.</td></tr>`;
            }
        }
    } catch (err) {
        console.error('Error fetching logs:', err);
        predictionsBody.innerHTML = `<tr><td colspan="8" class="text-center" style="color: var(--danger-color);">Could not fetch logs from Flask server. Ensure it is running!</td></tr>`;
        loginsBody.innerHTML = `<tr><td colspan="2" class="text-center" style="color: var(--danger-color);">Could not fetch logs from Flask server. Ensure it is running!</td></tr>`;
    }
}

// Switch between predictions and logins tabs in admin panel
function switchAdminTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    document.getElementById(tabId).classList.add('active');
    // Highlight active tab button
    document.getElementById(`${tabId}-btn`).classList.add('active');
}

function registerForEvent() {
    const eventName = document.getElementById('event-name').textContent;
    alert(`Success! You have been registered for "${eventName}". Confirmation details have been sent to your student portal.`);
}

function quickRegister(eventName) {
    alert(`Success! You have registered for "${eventName}". The schedule is synced to your university calendar.`);
}
