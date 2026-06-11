// Global store for events fetched from backend
let allEvents = [];

// Fetch and render upcoming events from backend
async function loadUpcomingEvents(recommendedEventType = null) {
    const grid = document.getElementById('events-grid');
    if (!grid) return;

    try {
        if (allEvents.length === 0) {
            const res = await fetch(`${API_BASE_URL}/api/events`);
            const data = await res.json();
            if (data.success) allEvents = data.events;
        }

        let sorted = [...allEvents];
        if (recommendedEventType) {
            sorted.sort((a, b) => {
                const aMatch = a.event_type === recommendedEventType ? -1 : 0;
                const bMatch = b.event_type === recommendedEventType ? -1 : 0;
                return aMatch - bMatch;
            });
        }

        grid.innerHTML = sorted.map(ev => {
            const isMatch = recommendedEventType && ev.event_type === recommendedEventType;
            return `
                <div class="event-card-horizontal${isMatch ? ' event-card-highlighted' : ''}">
                    <div class="event-date-badge">
                        <span class="day">${ev.date_day}</span>
                        <span class="month">${ev.date_month}</span>
                    </div>
                    <div class="event-details">
                        <span class="event-category-label">${ev.category}${isMatch ? ' &nbsp;<span class="rec-tag">&#10003; Recommended for You</span>' : ''}</span>
                        <h3 class="event-name-title">${ev.title}</h3>
                        <p class="event-meta"><i data-lucide="clock"></i> ${ev.time} | <i data-lucide="map-pin"></i> ${ev.venue}</p>
                    </div>
                    <button class="btn ${isMatch ? 'btn-primary' : 'btn-outline'}" onclick="quickRegister('${ev.event_type}')">Register</button>
                </div>
            `;
        }).join('');
        lucide.createIcons();
    } catch (err) {
        grid.innerHTML = `<div class="text-center" style="padding:40px;color:var(--text-muted);">Could not load events. Ensure the backend is running.</div>`;
    }
}

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
    }

    // Check existing admin session state
    const savedAdmin = localStorage.getItem('admin_email');
    if (savedAdmin) {
        updateNavbarAdminState(savedAdmin);
        const adminSection = document.getElementById('admin-section');
        if (adminSection) adminSection.style.display = 'block';
        fetchActivityLogs();
    }

    // Statistics Increment Animation
    animateStatistics();

    // Load upcoming events on page load
    loadUpcomingEvents();

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
                    setTimeout(() => {
                        renderRecommendation(result.recommended_event, result.confidence, result.top_features);
                        showCardState('result');
                        // Highlight matching event in upcoming events section
                        loadUpcomingEvents(result.recommended_event);
                        // Scroll to upcoming events section
                        setTimeout(() => {
                            document.getElementById('upcoming').scrollIntoView({ behavior: 'smooth' });
                        }, 1200);
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
    function renderRecommendation(eventName, confidence, topFeatures) {
        const meta = eventMetadata[eventName] || {
            category: 'Academic & Technical',
            difficulty: 'Intermediate',
            description: 'An engaging campus technical session tailored to develop your academic profile and vocational skills.'
        };

        eventNameEl.textContent = eventName;
        eventCategoryEl.textContent = meta.category;
        eventDifficultyEl.textContent = meta.difficulty;
        eventDescEl.textContent = meta.description;

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

        // Use real confidence score from model
        const finalScore = (typeof confidence === 'number' && confidence > 0) ? Math.min(99, confidence) : 75;
        matchScoreText.textContent = `${finalScore}%`;
        matchScoreFill.style.width = '0%';
        setTimeout(() => { matchScoreFill.style.width = `${finalScore}%`; }, 100);

        // Render feature importance bars
        const barsContainer = document.getElementById('feature-importance-bars');
        if (barsContainer && topFeatures && topFeatures.length > 0) {
            // Normalize bar widths relative to the top feature
            const maxVal = topFeatures[0].importance;
            barsContainer.innerHTML = topFeatures.map(f => {
                const barWidth = maxVal > 0 ? Math.round((f.importance / maxVal) * 100) : 0;
                return `
                    <div class="fi-row">
                        <span class="fi-label">${f.feature}</span>
                        <div class="fi-bar-track">
                            <div class="fi-bar-fill" style="width: 0%" data-width="${barWidth}"></div>
                        </div>
                        <span class="fi-val">${f.importance}%</span>
                    </div>
                `;
            }).join('');
            // Animate bars in
            setTimeout(() => {
                barsContainer.querySelectorAll('.fi-bar-fill').forEach(bar => {
                    bar.style.width = bar.getAttribute('data-width') + '%';
                });
            }, 150);
        }
        lucide.createIcons();
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
    switchAuthTab('login');
}

function closeLoginModal() {
    document.getElementById('login-modal').style.display = 'none';
    // Clear all inline errors and inputs on close
    ['login-form', 'register-form'].forEach(id => {
        const f = document.getElementById(id);
        if (f) {
            f.querySelectorAll('input').forEach(inp => inp.value = '');
            f.querySelectorAll('.form-group').forEach(g => g.classList.remove('invalid'));
        }
    });
    ['login-global-error', 'reg-global-error'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = ''; el.style.display = 'none'; }
    });
}

// Switch between Login and Register tabs inside the modal
function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.auth-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`${tab}-tab-btn`).classList.add('active');
    document.getElementById(`${tab}-tab-content`).classList.add('active');
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

// Show inline error on a form field
function setFieldError(inputId, errorId, show) {
    const input = document.getElementById(inputId);
    const group = input ? input.parentElement : null;
    if (group) show ? group.classList.add('invalid') : group.classList.remove('invalid');
}

// Show global form error message
function setGlobalError(id, message) {
    const el = document.getElementById(id);
    if (!el) return;
    if (message) { el.textContent = message; el.style.display = 'block'; }
    else { el.textContent = ''; el.style.display = 'none'; }
}

// POST login request to the Flask server
async function handleLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('student-email').value.trim();
    const password = document.getElementById('student-password').value;

    // Client-side validation
    let valid = true;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldError('student-email', 'login-email-error', !emailOk);
    if (!emailOk) valid = false;

    const passOk = password.length > 0;
    setFieldError('student-password', 'login-password-error', !passOk);
    if (!passOk) valid = false;

    if (!valid) return;
    setGlobalError('login-global-error', '');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            localStorage.setItem('student_email', email);
            updateNavbarLoginState(email);
            closeLoginModal();
        } else {
            setGlobalError('login-global-error', result.message || 'Login failed. Please try again.');
        }
    } catch (err) {
        console.error('Login error:', err);
        setGlobalError('login-global-error', 'Cannot connect to server. Please start the backend.');
    }
}

// POST register request to the Flask server
async function handleRegisterSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm = document.getElementById('reg-confirm-password').value;

    // Client-side validation
    let valid = true;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldError('reg-email', 'reg-email-error', !emailOk);
    if (!emailOk) valid = false;

    const passOk = password.length >= 6;
    setFieldError('reg-password', 'reg-password-error', !passOk);
    if (!passOk) valid = false;

    const confirmOk = password === confirm && confirm.length > 0;
    setFieldError('reg-confirm-password', 'reg-confirm-error', !confirmOk);
    if (!confirmOk) valid = false;

    if (!valid) return;
    setGlobalError('reg-global-error', '');

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            // Auto-switch to login tab with success message
            switchAuthTab('login');
            setGlobalError('login-global-error', '');
            document.getElementById('student-email').value = email;
            setGlobalError('login-global-error', '✓ Account created! You can now sign in.');
            document.getElementById('login-global-error').style.color = 'var(--success-color)';
        } else {
            setGlobalError('reg-global-error', result.message || 'Registration failed. Please try again.');
        }
    } catch (err) {
        console.error('Register error:', err);
        setGlobalError('reg-global-error', 'Cannot connect to server. Please start the backend.');
    }
}

// Clear session and restore logged-out state
function handleLogout() {
    localStorage.removeItem('student_email');
    updateNavbarLoginState(null);
}

// ── ADMIN AUTH ──────────────────────────────────────────────
function openAdminModal() {
    document.getElementById('admin-modal').style.display = 'flex';
    lucide.createIcons();
}

function closeAdminModal() {
    document.getElementById('admin-modal').style.display = 'none';
    ['admin-email','admin-password'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    ['admin-email-error','admin-password-error'].forEach(id => { const el = document.getElementById(id); if(el) el.parentElement.classList.remove('invalid'); });
    setGlobalError('admin-global-error','');
}

async function handleAdminLoginSubmit(e) {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    let valid = true;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setFieldError('admin-email', 'admin-email-error', !emailOk);
    if (!emailOk) valid = false;
    const passOk = password.length > 0;
    setFieldError('admin-password', 'admin-password-error', !passOk);
    if (!passOk) valid = false;
    if (!valid) return;
    setGlobalError('admin-global-error', '');

    try {
        const res = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await res.json();
        if (res.ok && result.success) {
            localStorage.setItem('admin_email', email);
            closeAdminModal();
            updateNavbarAdminState(email);
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.style.display = 'block';
                setTimeout(() => adminSection.scrollIntoView({ behavior: 'smooth' }), 300);
            }
            fetchActivityLogs();
            loadAdminEvents();
        } else {
            setGlobalError('admin-global-error', result.message || 'Invalid admin credentials.');
        }
    } catch (err) {
        setGlobalError('admin-global-error', 'Cannot connect to server.');
    }
}

function handleAdminLogout() {
    localStorage.removeItem('admin_email');
    updateNavbarAdminState(null);
    const adminSection = document.getElementById('admin-section');
    if (adminSection) adminSection.style.display = 'none';
}

function updateNavbarAdminState(email) {
    // Reuse nav-actions-container only if student is NOT logged in
    const studentEmail = localStorage.getItem('student_email');
    const container = document.getElementById('nav-actions-container');
    if (!container) return;
    if (email) {
        container.innerHTML = `
            <span class="user-welcome" style="color:var(--warning-color);"><i data-lucide="shield"></i> ${email}</span>
            <button class="btn btn-outline" onclick="handleAdminLogout()" style="padding:6px 14px;font-size:0.85rem;">Admin Logout</button>
            ${studentEmail ? '' : '<a href="#recommendations" class="btn btn-primary">Get Started</a>'}
        `;
    } else if (!studentEmail) {
        container.innerHTML = `
            <button class="btn btn-outline" onclick="openLoginModal()">Student Login</button>
            <button class="btn btn-outline" onclick="openAdminModal()" style="border-color:var(--warning-color);color:var(--warning-color);">Admin</button>
            <a href="#recommendations" class="btn btn-primary">Get Started</a>
        `;
    }
    lucide.createIcons();
}

// ── ADMIN EVENT MANAGEMENT ───────────────────────────────────
async function loadAdminEvents() {
    const tbody = document.getElementById('admin-events-body');
    if (!tbody) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/events`);
        const data = await res.json();
        if (data.success && data.events.length > 0) {
            tbody.innerHTML = data.events.map(ev => `
                <tr>
                    <td>${ev.date_day} ${ev.date_month}</td>
                    <td>${ev.category}</td>
                    <td><strong>${ev.title}</strong></td>
                    <td>${ev.time}</td>
                    <td>${ev.venue}</td>
                    <td><span style="color:var(--accent-color);font-weight:600;">${ev.event_type}</span></td>
                    <td><button class="btn btn-outline" style="padding:4px 10px;font-size:0.8rem;color:var(--danger-color);border-color:var(--danger-color);" onclick="adminDeleteEvent(${ev.id})">Delete</button></td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No events found.</td></tr>';
        }
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center" style="color:var(--danger-color);">Could not load events.</td></tr>';
    }
}

async function adminAddEvent() {
    const adminEmail = localStorage.getItem('admin_email');
    if (!adminEmail) return;

    const title = document.getElementById('ev-title').value.trim();
    const category = document.getElementById('ev-category').value.trim();
    const day = document.getElementById('ev-day').value.trim();
    const month = document.getElementById('ev-month').value.trim();
    const time = document.getElementById('ev-time').value.trim();
    const venue = document.getElementById('ev-venue').value.trim();
    const eventType = document.getElementById('ev-type').value;

    if (!title || !category || !day || !month || !time || !venue || !eventType) {
        setGlobalError('ev-error', 'All fields are required.');
        return;
    }
    setGlobalError('ev-error', '');

    try {
        const res = await fetch(`${API_BASE_URL}/admin/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Email': adminEmail },
            body: JSON.stringify({ title, category, date_day: day, date_month: month, time, venue, event_type: eventType })
        });
        const result = await res.json();
        if (result.success) {
            // Clear form
            ['ev-title','ev-category','ev-day','ev-month','ev-time','ev-venue'].forEach(id => { document.getElementById(id).value = ''; });
            document.getElementById('ev-type').value = '';
            allEvents = []; // reset cache so upcoming events reloads
            loadAdminEvents();
            loadUpcomingEvents();
        } else {
            setGlobalError('ev-error', result.message || 'Failed to add event.');
        }
    } catch (err) {
        setGlobalError('ev-error', 'Cannot connect to server.');
    }
}

async function adminDeleteEvent(id) {
    const adminEmail = localStorage.getItem('admin_email');
    if (!adminEmail) return;
    if (!confirm('Delete this event?')) return;
    try {
        const res = await fetch(`${API_BASE_URL}/admin/events/${id}`, {
            method: 'DELETE',
            headers: { 'X-Admin-Email': adminEmail }
        });
        const result = await res.json();
        if (result.success) {
            allEvents = [];
            loadAdminEvents();
            loadUpcomingEvents();
        }
    } catch (err) {
        console.error('Delete event error:', err);
    }
}

// Chart instances — kept to allow destroy on re-render
let chartEvents = null, chartDepts = null, chartLogins = null;

function renderCharts(predictions, logins) {
    // --- Chart 1: Most Recommended Events (Bar) ---
    const eventCounts = {};
    predictions.forEach(p => {
        eventCounts[p.recommended_event] = (eventCounts[p.recommended_event] || 0) + 1;
    });
    const eventLabels = Object.keys(eventCounts);
    const eventData = Object.values(eventCounts);

    if (chartEvents) chartEvents.destroy();
    const ctxE = document.getElementById('chart-events');
    if (ctxE) {
        chartEvents = new Chart(ctxE, {
            type: 'bar',
            data: {
                labels: eventLabels,
                datasets: [{
                    label: 'Recommendations',
                    data: eventData,
                    backgroundColor: 'rgba(37, 99, 235, 0.75)',
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#F1F5F9' } }
                }
            }
        });
    }

    // --- Chart 2: Department Activity (Pie) ---
    const deptCounts = {};
    predictions.forEach(p => {
        deptCounts[p.department] = (deptCounts[p.department] || 0) + 1;
    });
    const deptLabels = Object.keys(deptCounts);
    const deptData = Object.values(deptCounts);
    const pieColors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    if (chartDepts) chartDepts.destroy();
    const ctxD = document.getElementById('chart-departments');
    if (ctxD) {
        chartDepts = new Chart(ctxD, {
            type: 'pie',
            data: {
                labels: deptLabels,
                datasets: [{
                    data: deptData,
                    backgroundColor: pieColors.slice(0, deptLabels.length),
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 12 } }
                }
            }
        });
    }

    // --- Chart 3: Login Activity last 7 days (Line) ---
    const today = new Date();
    const dayLabels = [];
    const dayCounts = {};
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const key = d.toISOString().substring(0, 10);
        dayLabels.push(key.substring(5)); // MM-DD
        dayCounts[key] = 0;
    }
    logins.forEach(l => {
        const key = l.timestamp.substring(0, 10);
        if (dayCounts.hasOwnProperty(key)) dayCounts[key]++;
    });
    const loginData = Object.values(dayCounts);

    if (chartLogins) chartLogins.destroy();
    const ctxL = document.getElementById('chart-logins');
    if (ctxL) {
        chartLogins = new Chart(ctxL, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Logins',
                    data: loginData,
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                    borderWidth: 2,
                    pointBackgroundColor: '#2563EB',
                    pointRadius: 4,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: 10 } }, grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#F1F5F9' } }
                }
            }
        });
    }
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
            // Render charts from activity data
            renderCharts(result.predictions || [], result.logins || []);

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
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.getElementById(`${tabId}-btn`).classList.add('active');
    if (tabId === 'events-tab') loadAdminEvents();
}

function registerForEvent() {
    const eventName = document.getElementById('event-name').textContent;
    alert(`Success! You have been registered for "${eventName}". Confirmation details have been sent to your student portal.`);
}

function quickRegister(eventName) {
    alert(`Success! You have registered for "${eventName}". The schedule is synced to your university calendar.`);
}
