from flask import Flask, jsonify, request, render_template, redirect, session
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import os
import sqlite3

app = Flask(__name__)
CORS(app)

app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-only-fallback-key-change-me")

def get_db_connection():
    conn = sqlite3.connect("database.db")
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

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

@app.route('/logout')
def logout():
    session.clear() 
    return redirect('/')

@app.route("/register", methods=["POST"])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
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
        
@app.route("/login", methods=["POST"])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor() 
    
    cursor.execute('''
                SELECT * FROM users WHERE username = ?
            ''', (username,))
    user = cursor.fetchone()
    conn.close()

    if user and check_password_hash(user['password_hash'], password):
        session['user_id'] = user['user_id']
        session['username'] = user['username']
        return redirect('/dashboard')
    else:
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
    finally:
        conn.close()
@app.route('/api/add-expense', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    if not data or 'amount' not in data or 'category' not in data:
        return jsonify({"error": "Missing amount or category"}), 400

    category_name = data['category']
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    time_str = now.strftime("%H:%M:%S")

    conn = get_db_connection()

    cat_lookup = conn.execute(
        "SELECT category_id FROM Central_Categories WHERE category_name = ? AND user_id = ?",
        (category_name, session['user_id'])
    ).fetchone()

    if not cat_lookup:
        conn.close()
        return jsonify({"error": "Category does not exist"}), 400

    category_id = cat_lookup['category_id']

    conn.execute('''
        INSERT INTO Central_Expenses (user_id, amount, description, date, time, category_id)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (session['user_id'], data['amount'], data.get('description', ''), today_str, time_str, category_id))

    conn.commit()
    conn.close()
    return jsonify({"status": "success"})



@app.route('/api/add-category', methods=['POST'])
def add_category():
    data = request.get_json()
    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO Central_Categories (category_name, user_id) VALUES (?, ?)", 
                     (data['category_name'], session['user_id']))
        conn.commit()
        return jsonify({"status": "success"})
    except:
        return jsonify({"error": "Could not add category"}), 400
    finally:
        conn.close()

    
@app.route('/api/expenses', methods=['GET'])
def get_all_expenses():

    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    conn = get_db_connection()

    query = '''
        SELECT e.amount, e.description, e.date, c.category_name 
        FROM Central_Expenses e
        JOIN Central_Categories c ON e.category_id = c.category_id
        WHERE e.user_id = ? 
        ORDER BY e.expense_id DESC
    '''
    rows = conn.execute(query, (session['user_id'],)).fetchall()
    expenses_list = [dict(row) for row in rows]
    conn.close()
    return jsonify(expenses_list)

@app.route("/api/piechart-data", methods=['GET'])
def get_categories():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    current_user = session['user_id']
    conn = get_db_connection()

    query = '''
        SELECT c.category_name, SUM(e.amount) as total_amount
        FROM Central_Expenses e
        JOIN Central_Categories c ON e.category_id = c.category_id
        WHERE e.user_id = ?
        GROUP BY c.category_name
    '''
    rows = conn.execute(query, (current_user,)).fetchall()
    conn.close()

    category_list = [dict(row) for row in rows]
    return jsonify(category_list)

if __name__ == '__main__':
    app.run(debug=True, port=5000)