document.addEventListener("DOMContentLoaded", function() {
    // These run once when the page loads
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
            window.location.href = "/";
        }
        return response.json();
    })
    .then(data => {
        const smallText = document.getElementById("budget-spent");
        if (smallText) smallText.innerText = `₹${data.total_spent_today} spent today`;
        
        const largeText = document.getElementById("large-budget-spent");
        if (largeText) largeText.innerText = `₹${data.total_spent_today} spent today`;
        
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
        const listContainer = document.getElementById("expense-list");
        if (!listContainer) return;

        listContainer.innerHTML = "";

        if (expenses.length === 0) {
            listContainer.innerHTML = "<p class='no-expenses'>No expenses logged yet!</p>";
            return;
        }

        expenses.forEach(item => {
            const card = document.createElement("div");
            card.className = "expense-card"; 
            
            // FIX: We now use 'item.category_name' because of the INNER JOIN in app.py
            // item.category_id no longer exists in the response from /api/expenses
            card.innerHTML = `
                <div class="expense-info">
                    <strong>${item.description}</strong>
                    <small>${item.category_name} • ${item.date}</small>
                </div>
                <div class="expense-amount">₹${item.amount}</div>
            `;
            listContainer.appendChild(card);
        });
    })
    .catch(error => console.error("Error loading history:", error));
}
// --- JOB 3: SUBMIT NEW EXPENSE ---
function handleFormSubmit(event) {
    event.preventDefault();

    const expenseForm = event.target;
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");

    const payload = {
        amount: parseFloat(amountInput.value),
        description: descriptionInput.value,
        category: categoryInput.value
    };

    fetch('http://127.0.0.1:5000/api/add-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === "success") {
            expenseForm.reset();
            loadDashboardSummary();
            loadExpenseHistory();
        } else {
            alert("Error: " + (result.error || "Unknown"));
        }
    })
    .catch(error => console.error("Error submitting:", error));
}