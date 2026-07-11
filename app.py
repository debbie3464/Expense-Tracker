import logging
import os
import sqlite3
import time
from collections import defaultdict
from datetime import datetime

from flask import Flask, jsonify, request, render_template, redirect, session
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-fallback-key-change-me")

app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = not app.debug

logging.basicConfig(level=logging.INFO)


def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


failed_login_attempts = defaultdict(list)
MAX_ATTEMPTS = 5
WINDOW_SECONDS = 300 

def is_rate_limited(identifier):
    now = time.time()
    attempts = failed_login_attempts[identifier]
    attempts[:] = [t for t in attempts if now - t < WINDOW_SECONDS]
    return len(attempts) >= MAX_ATTEMPTS


def record_failed_attempt(identifier):
    failed_login_attempts[identifier].append(time.time())

def validate_registration(username, email, password):
    errors = []
    if not username or len(username.strip()) < 3:
        errors.append("Username must be at least 3 characters.")
    if not email or "@" not in email:
        errors.append("A valid email address is required.")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters.")
    return errors


@app.route("/")
def home():
    if "user_id" in session:
        return redirect("/dashboard")
    return render_template("login.html")


@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        return redirect("/")
    return render_template("index.html")

@app.route("/split")
def split():
    if "user_id" not in session:
        return redirect("/")
    return render_template("split.html")

@app.route("/settings")
def settings():
    if "user_id" not in session:
        return redirect("/")
    return render_template("settings.html")


@app.route('/logout')
def logout():
    session.clear()
    return redirect('/')


@app.route("/register", methods=["POST"])
def register():
    username = request.form.get('username', '').strip()
    email = request.form.get('email', '').strip()
    password = request.form.get('password', '')

    validation_errors = validate_registration(username, email, password)
    if validation_errors:
        return render_template('login.html', error=" ".join(validation_errors))

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, generate_password_hash(password)))
        conn.commit()

        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        default_categories = ["Food", "Utilities", "Transportation", "Others"]
        for cat in default_categories:
            cursor.execute(
                "INSERT INTO Central_Categories (category_name, user_id) VALUES (?, ?)",
                (cat, user['user_id'])
            )
        conn.commit()

        session['user_id'] = user['user_id']
        session['username'] = username

        return redirect('/dashboard')

    except sqlite3.IntegrityError as e:
        app.logger.warning(f"Registration conflict for '{username}': {e}")
        message = str(e)
        if "username" in message:
            error_msg = "That username is already taken."
        elif "email" in message:
            error_msg = "That email is already registered."
        else:
            error_msg = "Could not create account. Please try again."
        return render_template('login.html', error=error_msg)

    except Exception as e:
        app.logger.error(f"Unexpected error during registration: {e}")
        return render_template('login.html', error="Something went wrong. Please try again.")

    finally:
        conn.close()


@app.route("/login", methods=["POST"])
def login():
    username = request.form.get('username', '').strip()
    password = request.form.get('password', '')
    client_ip = request.remote_addr

    # --- ORANGE FIX: rate limit repeated failed attempts per IP.
    if is_rate_limited(client_ip):
        return render_template('login.html', error="Too many attempts. Please wait a few minutes and try again.")

    if not username or not password:
        return render_template('login.html', error="Username and password are required.")

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
        user = cursor.fetchone()
    finally:
        conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['user_id']
        session['username'] = user['username']
        return redirect('/dashboard')
    else:
        record_failed_attempt(client_ip)
        return render_template('login.html', error="Invalid username or password.")


@app.route('/api/dashboard-summary', methods=['GET'])
def dashboard_summary():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = session['user_id']
    today_str = datetime.now().strftime("%Y-%m-%d")

    conn = get_db_connection()
    try:
        cursor = conn.execute('''
            SELECT SUM(amount) as total 
            FROM Central_Expenses 
            WHERE user_id = ? AND date = ?
        ''', (current_user, today_str))

        result = cursor.fetchone()
        total_spent = result['total'] if result and result['total'] is not None else 0

        return jsonify({
            "total_spent_today": total_spent,
            "daily_budget_target": 2000
        })
    except Exception as e:
        app.logger.error(f"Error fetching dashboard summary: {e}")
        return jsonify({"error": "Could not load summary"}), 500
    finally:
        conn.close()


@app.route('/api/add-expense', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    if not data or 'amount' not in data or 'category' not in data:
        return jsonify({"error": "Missing amount or category"}), 400

    try:
        amount = float(data['amount'])
    except (TypeError, ValueError):
        return jsonify({"error": "Amount must be a valid number"}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400

    category_name = str(data['category']).strip()
    if not category_name:
        return jsonify({"error": "Category is required"}), 400

    description = str(data.get('description', '')).strip()

    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    conn = get_db_connection()
    try:
        cat_lookup = conn.execute(
            "SELECT category_id FROM Central_Categories WHERE category_name = ? AND user_id = ?",
            (category_name, session['user_id'])
        ).fetchone()

        if not cat_lookup:
            return jsonify({"error": "Category does not exist"}), 400

        category_id = cat_lookup['category_id']

        conn.execute('''
            INSERT INTO Central_Expenses (user_id, amount, description, date, time, category_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (session['user_id'], amount, description, today_str, time_str, category_id))

        conn.commit()
        return jsonify({"status": "success"})

    except Exception as e:
        app.logger.error(f"Error adding expense: {e}")
        return jsonify({"error": "Could not add expense"}), 500
    finally:
        conn.close()


@app.route('/api/add-category', methods=['POST'])
def add_category():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json(silent=True)
    category_name = str(data.get('category_name', '')).strip() if data else ''

    if not category_name:
        return jsonify({"error": "Category name is required"}), 400

    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO Central_Categories (category_name, user_id) VALUES (?, ?)",
            (category_name, session['user_id'])
        )
        conn.commit()
        return jsonify({"status": "success"})

    except sqlite3.IntegrityError:
        return jsonify({"error": "Category already exists"}), 400
    except Exception as e:
        app.logger.error(f"Error adding category: {e}")
        return jsonify({"error": "Could not add category"}), 500
    finally:
        conn.close()

@app.route('/api/categories', methods=['GET'])
def get_categories_list():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    try:
        rows = conn.execute(
            "SELECT category_name FROM Central_Categories WHERE user_id = ? ORDER BY category_name",
            (session['user_id'],)
        ).fetchall()
        return jsonify([row['category_name'] for row in rows])
    finally:
        conn.close()


@app.route('/api/expenses', methods=['GET'])
def get_all_expenses():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db_connection()
    try:
        query = '''
            SELECT e.amount, e.description, e.date, c.category_name 
            FROM Central_Expenses e
            LEFT JOIN Central_Categories c ON e.category_id = c.category_id
            WHERE e.user_id = ? 
            ORDER BY e.expense_id DESC
        '''
        rows = conn.execute(query, (session['user_id'],)).fetchall()
        return jsonify([dict(row) for row in rows])
    finally:
        conn.close()


@app.route("/api/piechart-data", methods=['GET'])
def get_categories():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = session['user_id']
    current_month = datetime.now().strftime("%Y-%m")  # e.g., "2026-07"
    
    conn = get_db_connection()
    try:
        query = '''
            SELECT c.category_name, SUM(e.amount) as total_amount
            FROM Central_Expenses e
            JOIN Central_Categories c ON e.category_id = c.category_id
            WHERE e.user_id = ? AND strftime('%Y-%m', e.date) = ?
            GROUP BY c.category_name
        '''
        rows = conn.execute(query, (current_user, current_month)).fetchall()
        return jsonify([dict(row) for row in rows])
    finally:
        conn.close()

@app.route('/api/daily-spending-by-hour', methods=['GET'])
def daily_spending_by_hour():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = session['user_id']
    today_str = datetime.now().strftime("%Y-%m-%d")

    conn = get_db_connection()
    try:
        query = '''
            SELECT strftime('%H:00', time) as hour, SUM(amount) as total_amount
            FROM Central_Expenses
            WHERE user_id = ? AND date = ?
            GROUP BY strftime('%H:00', time)
            ORDER BY hour ASC
        '''
        rows = conn.execute(query, (current_user, today_str)).fetchall()
        return jsonify([dict(row) for row in rows])
    finally:
        conn.close()


if __name__ == '__main__':
    debug_mode = os.environ.get("FLASK_DEBUG", "true").lower() == "true"
    app.run(debug=debug_mode, port=5000)