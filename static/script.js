 HEAD
document.addEventListener("DOMContentLoaded", function() {
    // Run these immediately when the dashboard loads
    loadDashboardSummary();
    loadExpenseHistory();

    // Attach an event listener to your expense form
    const expenseForm = document.getElementById("expense");
    if (expenseForm) {
        expenseForm.addEventListener("submit", handleFormSubmit);
    }
});

// --- JOB 1: FETCH & DISPLAY PROGRESS BAR METRICS ---
function loadDashboardSummary() {
    fetch('http://127.0.0.1:5000/api/dashboard-summary')
    .then(response => {
        if (!response.ok) {
            window.location.href = "/"; // Kick out to login if unauthorized
        }
        return response.json();
    })
    .then(data => {
        console.log("Summary metrics:", data);
        
        // 1. Update the small top text element
        const smallText = document.getElementById("budget-spent");
        if (smallText) {
            smallText.innerText = `₹${data.total_spent_today} spent today`;
        }
        
        // 2. Update the massive center text element (Line 28 in your HTML)
        const largeText = document.getElementById("large-budget-spent");
        if (largeText) {
            largeText.innerText = `₹${data.total_spent_today} spent today`;
        }
        
        // 3. Adjust the progress bar filling and cap
        const progressBar = document.getElementById("daily-progress");
        if (progressBar) {
            progressBar.value = data.total_spent_today;
            progressBar.max = data.daily_budget_target;
        }
    })
    .catch(error => console.error("Error loading summary:", error));
}


// --- JOB 2: FETCH & RENDER TRANSACTION HISTORY ---
function loadExpenseHistory() {
    fetch('http://127.0.0.1:5000/api/expenses')
    .then(response => response.json())
    .then(expenses => {
        console.log("Expense history list:", expenses);
        
        const listContainer = document.getElementById("expense-list");
        if (!listContainer) return;

        // Clear out old static placeholders
        listContainer.innerHTML = "";

        if (expenses.length === 0) {
            listContainer.innerHTML = "<p class='no-expenses'>No expenses logged yet!</p>";
            return;
        }

        // Loop through each expense returned from SQLite and build HTML dynamically
        expenses.forEach(item => {
            const card = document.createElement("div");
            card.className = "expense-card"; 
            
            // 🔥 FIXED: item.category changed to item.category_id, added item.time
            card.innerHTML = `
                <div class="expense-info">
                    <strong>${item.description}</strong>
                    <small>Cat ID: ${item.category_id} • ${item.date} (${item.time})</small>
                </div>
                <div class="expense-amount">₹${item.amount}</div>
            `;
            listContainer.appendChild(card);
        });
    })
    .catch(error => console.error("Error loading history:", error));
}

// --- JOB 3: SUBMIT NEW EXPENSE VIA JSON BACKEND ---
function handleFormSubmit(event) {
    event.preventDefault(); // STOP the form from reloading the page!

    const expenseForm = event.target;
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");

    const payload = {
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value,
        category: categoryInput.value // Matches data.get('category') in Python
    };

    // Shoot data to your POST route
    fetch('http://127.0.0.1:5000/api/add-expense', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        console.log("Insert status:", result);
        
        if (result.status === "success") {
            expenseForm.reset();

            loadDashboardSummary();
            loadExpenseHistory();
        } else {
            alert("Error adding expense: " + (result.error || "Unknown error"));
        }
    })
    .catch(error => console.error("Error submitting expense:", error));

document.addEventListener("DOMContentLoaded", function() {
    // Run these immediately when the dashboard loads
    loadDashboardSummary();
    loadExpenseHistory();

    // Attach an event listener to your expense form
    const expenseForm = document.getElementById("expense");
    if (expenseForm) {
        expenseForm.addEventListener("submit", handleFormSubmit);
    }
});

// --- JOB 1: FETCH & DISPLAY PROGRESS BAR METRICS ---
function loadDashboardSummary() {
    fetch('http://127.0.0.1:5000/api/dashboard-summary')
    .then(response => {
        if (!response.ok) {
            window.location.href = "/"; // Kick out to login if unauthorized
        }
        return response.json();
    })
    .then(data => {
        console.log("Summary metrics:", data);
        
        // 1. Update the small top text element
        const smallText = document.getElementById("budget-spent");
        if (smallText) {
            smallText.innerText = `₹${data.total_spent_today} spent today`;
        }
        
        // 2. Update the massive center text element (Line 28 in your HTML)
        const largeText = document.getElementById("large-budget-spent");
        if (largeText) {
            largeText.innerText = `₹${data.total_spent_today} spent today`;
        }
        
        // 3. Adjust the progress bar filling and cap
        const progressBar = document.getElementById("daily-progress");
        if (progressBar) {
            progressBar.value = data.total_spent_today;
            progressBar.max = data.daily_budget_target;
        }
    })
    .catch(error => console.error("Error loading summary:", error));
}


// --- JOB 2: FETCH & RENDER TRANSACTION HISTORY ---
function loadExpenseHistory() {
    fetch('http://127.0.0.1:5000/api/expenses')
    .then(response => response.json())
    .then(expenses => {
        console.log("Expense history list:", expenses);
        
        const listContainer = document.getElementById("expense-list");
        if (!listContainer) return;

        // Clear out old static placeholders
        listContainer.innerHTML = "";

        if (expenses.length === 0) {
            listContainer.innerHTML = "<p class='no-expenses'>No expenses logged yet!</p>";
            return;
        }

        // Loop through each expense returned from SQLite and build HTML dynamically
        expenses.forEach(item => {
            const card = document.createElement("div");
            card.className = "expense-card"; 
            
            // 🔥 FIXED: item.category changed to item.category_id, added item.time
            card.innerHTML = `
                <div class="expense-info">
                    <strong>${item.description}</strong>
                    <small>Cat ID: ${item.category_id} • ${item.date} (${item.time})</small>
                </div>
                <div class="expense-amount">₹${item.amount}</div>
            `;
            listContainer.appendChild(card);
        });
    })
    .catch(error => console.error("Error loading history:", error));
}

// --- JOB 3: SUBMIT NEW EXPENSE VIA JSON BACKEND ---
function handleFormSubmit(event) {
    event.preventDefault(); // STOP the form from reloading the page!

    const expenseForm = event.target;
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");

    const payload = {
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value,
        category: categoryInput.value // Matches data.get('category') in Python
    };

    // Shoot data to your POST route
    fetch('http://127.0.0.1:5000/api/add-expense', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        console.log("Insert status:", result);
        
        if (result.status === "success") {
            expenseForm.reset();

            loadDashboardSummary();
            loadExpenseHistory();
        } else {
            alert("Error adding expense: " + (result.error || "Unknown error"));
        }
    })
    .catch(error => console.error("Error submitting expense:", error));
}
}