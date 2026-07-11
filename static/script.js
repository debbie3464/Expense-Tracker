const API_BASE = "";

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardSummary();
    loadExpenseHistory();
    loadCategories();
    loadPieChart();
    loadDailyChart();  

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
                const empty = document.createElement("tr");
                const emptyCell = document.createElement("td");
                emptyCell.colSpan = "3";
                emptyCell.style.textAlign = "center";
                emptyCell.style.padding = "20px";
                emptyCell.textContent = "No expenses logged yet!";
                empty.appendChild(emptyCell);
                listContainer.appendChild(empty);
                return;
            }

            expenses.forEach(item => {
                listContainer.appendChild(buildExpenseRow(item));
            });
        })
        .catch(error => {
            console.error("Error loading history:", error);
            showError("Could not load your expense history.");
        });
}

function buildExpenseRow(item) {
    const row = document.createElement("tr");
    row.className = "expense-row";

    const descCell = document.createElement("td");
    descCell.className = "expense-col description";
    descCell.textContent = item.description || "(no description)";

    
    const categoryCell = document.createElement("td");
    categoryCell.className = "expense-col category";
    categoryCell.textContent = item.category_name || "Uncategorized";

    
    const amountCell = document.createElement("td");
    amountCell.className = "expense-col amount";
    amountCell.textContent = `₹${item.amount}`;

    row.appendChild(descCell);
    row.appendChild(categoryCell);
    row.appendChild(amountCell);

    return row;
}

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
        });
}

function handleFormSubmit(event) {
    event.preventDefault();

    const expenseForm = event.target;
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");

    const amount = parseFloat(amountInput.value);

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
        loadPieChart();
        loadDailyChart();  
    })
    .catch(error => {
        const message = (error.body && error.body.error) || "Something went wrong adding that expense.";
        showError(message);
    })
    .finally(() => {
        if (submitButton) submitButton.disabled = false;
    });
}

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
let dailyChartInstance = null;

function loadDailyChart() {
    apiRequest('/api/daily-spending-by-hour')
        .then(data => {
            const ctx = document.getElementById('dailyChart');
            if (!ctx) return;

           
            const allHours = [];
            for (let i = 0; i < 24; i++) {
                allHours.push(String(i).padStart(2, '0') + ':00');
            }

           
            const amounts = new Array(24).fill(0);

            
            data.forEach(item => {
                const hourIndex = parseInt(item.hour.split(':')[0]);
                amounts[hourIndex] = item.total_amount;
            });

            if (dailyChartInstance) {
                dailyChartInstance.destroy();
            }

            dailyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: allHours,
                    datasets: [{
                        label: 'Spending today',
                        data: amounts,
                        borderColor: '#d7a889',
                        backgroundColor: 'rgba(215, 168, 137, 0.05)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#d7a889',
                        pointBorderColor: '#2e3745d4',
                        pointBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e0bdb1',
                                font: { size: 12 }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(108, 131, 167, 0.1)' },
                            ticks: {
                                color: '#e0bdb1',
                                font: { size: 11 }
                            }
                        },
                        y: {
                            grid: { color: 'rgba(108, 131, 167, 0.1)' },
                            ticks: {
                                color: '#e0bdb1',
                                font: { size: 11 }
                            }
                        }
                    }
                }
            });
        })
        .catch(error => console.error("Error loading daily chart:", error));
}
function updateDateTime() {
    const el = document.getElementById("live-datetime");
    if (!el) return;

    const now = new Date();

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };

    const dateStr = now.toLocaleDateString('en-IN', dateOptions);
    const timeStr = now.toLocaleTimeString('en-IN', timeOptions);

    el.textContent = `${dateStr}|${timeStr}`;
}

updateDateTime();
setInterval(updateDateTime, 1000);