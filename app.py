<<<<<<< HEAD
from flask import Flask, jsonify, request, render_template, redirect,  session
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

app.secret_key = "super_secret_unpredictable_key_string"

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

@app.route("/register" , methods = ["POST"])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Insert the new user profile row
        cursor.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, password))
        conn.commit()

        # 2. Immediately look up the auto-generated user_id of the user we just made
        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        # 3. Log them in right away by putting them into the secure cookie session
        session['user_id'] = user['user_id']
        session['username'] = username
        
        # 4. Teleport them straight to their dashboard
        return redirect('/dashboard')

    except sqlite3.IntegrityError:
        # If the username or email is already taken, kick them back to login with an error
        return render_template('login.html', error="Username or Email already exists!")
    
    finally:
        # Always close the connection nicely so our database file doesn't lock up
        conn.close()

@app.route("/login", methods = ["POST"])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM users WHERE username = ? AND password_hash = ?
    ''', (username, password))
    user = cursor.fetchone()
    conn.close()

    if user:
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
    
    from datetime import datetime
    # Ensure this matches the exact date format stored in your DB (e.g., "2026-07-08")
    today_str = datetime.now().strftime("%Y-%m-%d") 

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
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
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/add-expense', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user = session['user_id']
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    amount = data.get('amount')
    description = data.get('description')
    category_id = data.get('category') 

    if not amount or not description or not category_id:
        return jsonify({"error": "Missing required fields"}), 400

    from datetime import datetime
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d") 
    time_str = now.strftime("%H:%M:%S") 

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 🔥 PLACE IT RIGHT HERE (Turns off the strict checker for this insert)
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # Your insert query follows right after
        cursor.execute('''
            INSERT INTO Central_Expenses (user_id, amount, description, date, time, category_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (current_user, amount, description, today_str, time_str, category_id))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Expense added successfully!"}), 201
    except Exception as e:
        print("!!! GENERAL SQL ERROR !!!:", str(e))
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/expenses', methods=['GET'])
def get_all_expenses():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Updated to match your exact SQLite column names:
    cursor.execute('''
        SELECT expense_id, amount, description, date, time, user_id, category_id 
        FROM Central_Expenses 
        WHERE user_id = ? 
        ORDER BY expense_id DESC
    ''', (current_user,))
    
    rows = cursor.fetchall()
    expenses_list = [dict(row) for row in rows]
    conn.close()

    return jsonify(expenses_list)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
=======
from flask import Flask, jsonify, request, render_template, redirect,  session
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

app.secret_key = "super_secret_unpredictable_key_string"

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

@app.route("/register" , methods = ["POST"])
def register():
    username = request.form.get('username')
    email = request.form.get('email')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Insert the new user profile row
        cursor.execute('''
            INSERT INTO users (username, email, password_hash)
            VALUES (?, ?, ?)
        ''', (username, email, password))
        conn.commit()

        # 2. Immediately look up the auto-generated user_id of the user we just made
        cursor.execute("SELECT user_id FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()
        
        # 3. Log them in right away by putting them into the secure cookie session
        session['user_id'] = user['user_id']
        session['username'] = username
        
        # 4. Teleport them straight to their dashboard
        return redirect('/dashboard')

    except sqlite3.IntegrityError:
        # If the username or email is already taken, kick them back to login with an error
        return render_template('login.html', error="Username or Email already exists!")
    
    finally:
        # Always close the connection nicely so our database file doesn't lock up
        conn.close()

@app.route("/login", methods = ["POST"])
def login():
    username = request.form.get('username')
    password = request.form.get('password')

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT * FROM users WHERE username = ? AND password_hash = ?
    ''', (username, password))
    user = cursor.fetchone()
    conn.close()

    if user:
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
    
    from datetime import datetime
    # Ensure this matches the exact date format stored in your DB (e.g., "2026-07-08")
    today_str = datetime.now().strftime("%Y-%m-%d") 

    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute('''
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
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/add-expense', methods=['POST'])
def add_expense():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user = session['user_id']
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    amount = data.get('amount')
    description = data.get('description')
    category_id = data.get('category') 

    if not amount or not description or not category_id:
        return jsonify({"error": "Missing required fields"}), 400

    from datetime import datetime
    now = datetime.now()
    today_str = now.strftime("%Y-%m-%d") 
    time_str = now.strftime("%H:%M:%S") 

    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 🔥 PLACE IT RIGHT HERE (Turns off the strict checker for this insert)
        cursor.execute("PRAGMA foreign_keys = OFF;")

        # Your insert query follows right after
        cursor.execute('''
            INSERT INTO Central_Expenses (user_id, amount, description, date, time, category_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (current_user, amount, description, today_str, time_str, category_id))
        conn.commit()
        
        return jsonify({"status": "success", "message": "Expense added successfully!"}), 201
    except Exception as e:
        print("!!! GENERAL SQL ERROR !!!:", str(e))
        return jsonify({"error": "Database error", "details": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/expenses', methods=['GET'])
def get_all_expenses():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    current_user = session['user_id']

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Updated to match your exact SQLite column names:
    cursor.execute('''
        SELECT expense_id, amount, description, date, time, user_id, category_id 
        FROM Central_Expenses 
        WHERE user_id = ? 
        ORDER BY expense_id DESC
    ''', (current_user,))
    
    rows = cursor.fetchall()
    expenses_list = [dict(row) for row in rows]
    conn.close()

    return jsonify(expenses_list)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
>>>>>>> 7c0cb20630249950a1e4d8d9f7bcf957bed17658
