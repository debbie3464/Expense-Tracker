const API_BASE = "";

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardSummary();
    loadExpenseHistory();
    loadCategories();
    loadPieChart();

    const expenseForm = document.getElementById("expense");
    if (expenseForm) {
        expenseForm.addEventListener("submit", handleFormSubmit);
    }
});

async function apiRequest(url, options = {}) {
    const response = await fetch(API_BASE + url, options);
    if (!response.ok) {
        const error = new Error(`Request failed: ${response.status}`);
        error.status = response.status;
        try {
            error.body = await response.json();
        } catch (_) {
            error.body = null;
        }
        throw error;
    }
    return response.json();
}

function showError(message) {
    let banner = document.getElementById("error-banner");
    if (!banner) {
        banner = document.createElement("div");
        banner.id = "error-banner";
        banner.style.background = "#fce8e6";
        banner.style.color = "#a82e2e";
        banner.style.padding = "10px";
        banner.style.borderRadius = "8px";
        banner.style.margin = "10px 0";
        banner.style.textAlign = "center";
        document.body.prepend(banner);
    }
    banner.textContent = message;
    banner.style.display = "block";
    setTimeout(() => { banner.style.display = "none"; }, 4000);
}

function loadDashboardSummary() {
    apiRequest('/api/dashboard-summary')
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
        .catch(error => {
          
            if (error.status === 401) {
                window.location.href = "/";
                return;
            }
            console.error("Error loading summary:", error);
            showError("Could not load your spending summary.");
        });
}

function loadExpenseHistory() {
    apiRequest('/api/expenses')
        .then(expenses => {
            const listContainer = document.getElementById("expense-list");
            if (!listContainer) return;

            listContainer.innerHTML = "";

            if (expenses.length === 0) {
                const empty = document.createElement("p");
                empty.className = "no-expenses";
                empty.textContent = "No expenses logged yet!";
                listContainer.appendChild(empty);
                return;
            }

            expenses.forEach(item => {
                listContainer.appendChild(buildExpenseCard(item));
            });
        })
        .catch(error => {
            console.error("Error loading history:", error);
            showError("Could not load your expense history.");
        });
}

// --- RED FIX: build cards with DOM APIs + textContent instead of
// innerHTML, so a description like "<img src=x onerror=alert(1)>"
// is rendered as plain text, not executed.
function buildExpenseCard(item) {
    const card = document.createElement("div");
    card.className = "expense-card";

    const info = document.createElement("div");
    info.className = "expense-info";

    const desc = document.createElement("strong");
    desc.textContent = item.description || "(no description)";

    const meta = document.createElement("small");
    meta.textContent = `${item.category_name || "Uncategorized"} • DATE: ${item.date}`;

    info.appendChild(desc);
    info.appendChild(meta);

    const amountCont = document.createElement("div");
    amountCont.className = "expense-amount-cont";

    const amount = document.createElement("div");
    amount.className = "expense-amount";
    amount.textContent = `₹${item.amount}`;

    amountCont.appendChild(amount);

    card.appendChild(info);
    card.appendChild(amountCont);

    return card;
}

// --- ORANGE FIX: populate the category dropdown from the DB instead
// of four hardcoded <option> tags disconnected from Central_Categories.
function loadCategories() {
    apiRequest('/api/categories')
        .then(categories => {
            const select = document.getElementById("category");
            if (!select || categories.length === 0) return;

            select.innerHTML = "";
            categories.forEach(name => {
                const option = document.createElement("option");
                option.value = name;
                option.textContent = name;
                select.appendChild(option);
            });
        })
        .catch(error => {
            console.error("Error loading categories:", error);
            // Leave the static HTML options in place as a fallback.
        });
}

function handleFormSubmit(event) {
    event.preventDefault();

    const expenseForm = event.target;
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");

    const amount = parseFloat(amountInput.value);

    // --- YELLOW FIX: validate before sending instead of letting NaN
    // silently become null on the backend.
    if (isNaN(amount) || amount <= 0) {
        showError("Please enter a valid amount greater than 0.");
        return;
    }

    if (!categoryInput.value) {
        showError("Please choose a category.");
        return;
    }

    const payload = {
        amount: amount,
        description: descriptionInput.value.trim(),
        category: categoryInput.value
    };

    const submitButton = expenseForm.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    apiRequest('/api/add-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(() => {
            expenseForm.reset();
            loadDashboardSummary();
            loadExpenseHistory();
        })
        .catch(error => {
            const message = (error.body && error.body.error) || "Something went wrong adding that expense.";
            showError(message);
        })
        .finally(() => {
            if (submitButton) submitButton.disabled = false;
        });
}

// --- ORANGE FIX: keep a reference so we can destroy the old chart
// before drawing a new one; otherwise Chart.js throws "Canvas is
// already in use" the second time this runs.
let pieChartInstance = null;

function loadPieChart() {
    apiRequest('/api/piechart-data')
        .then(data => {
            const labels = data.map(item => item.category_name);
            const amounts = data.map(item => item.total_amount);

            const ctx = document.getElementById('pieChart');
            if (!ctx) return;

            if (pieChartInstance) {
                pieChartInstance.destroy();
            }

            pieChartInstance = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: amounts,
                        backgroundColor: [
                            '#e17055', '#d63031', '#e84393', '#00b894', '#0984e3'
                        ]
                    }]
                },
                options: {
                    plugins: {
                        legend: {
                            labels: {
                                color: '#3b1616'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error("Error loading pie chart:", error));
}

