const API_BASE = "";
let currentPeriod = 'today';

document.addEventListener("DOMContentLoaded", function () {
    loadDashboardSummary();
    loadExpenseHistory();
    loadCategories();
    loadPieChart('today');
    loadDailyChart('today');
    initPeriodToggle();

    const now = new Date();                              // ← add
    loadHeatmap(now.getFullYear(), now.getMonth() + 1);

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

            const budgetTarget = document.querySelector(".budget-target");
            if (budgetTarget) {
                budgetTarget.textContent = `of ₹${data.daily_budget_target} Daily Budget`;
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
                emptyCell.colSpan = "4";
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

    // Description column
    const descCell = document.createElement("td");
    descCell.className = "expense-col description";
    descCell.textContent = item.description || "(no description)";

    // Category column
    const categoryCell = document.createElement("td");
    categoryCell.className = "expense-col category";
    categoryCell.textContent = item.category_name || "Uncategorized";

    // Date & Time column
    const dateTimeCell = document.createElement("td");
    dateTimeCell.className = "expense-col datetime";
    dateTimeCell.textContent = `${item.date} ${item.time}`;

    // Amount column
    const amountCell = document.createElement("td");
    amountCell.className = "expense-col amount";
    amountCell.textContent = `₹${item.amount}`;

    row.appendChild(descCell);
    row.appendChild(categoryCell);
    row.appendChild(dateTimeCell);
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
            loadPieChart(currentPeriod);
            loadDailyChart(currentPeriod);
            loadHeatmap(heatmapInstance.year, heatmapInstance.month + 1);
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

function loadPieChart(period = 'today') {
    currentPeriod = period;

    apiRequest(`/api/piechart-data?period=${period}`)
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

function loadDailyChart(period = 'today') {
    apiRequest(`/api/daily-spending-by-hour?period=${period}`)
        .then(data => {
            const ctx = document.getElementById('dailyChart');
            if (!ctx) return;

            // Map labels and amounts from API response
            const labels = data.map(item => item.label);
            const amounts = data.map(item => item.total_amount);

            if (dailyChartInstance) {
                dailyChartInstance.destroy();
            }

            dailyChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `Spending - ${period.charAt(0).toUpperCase() + period.slice(1)}`,
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

function initPeriodToggle() {
    const periodBtns = document.querySelectorAll('.period-btn');

    periodBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active class from all buttons
            periodBtns.forEach(b => b.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Get selected period
            const period = this.getAttribute('data-period');

            // Reload charts with new period
            loadPieChart(period);
            loadDailyChart(period);
        });
    });
}
let heatmapInstance = null;

function loadHeatmap(year, month) {
    apiRequest(`/api/monthly-heatmap?year=${year}&month=${month}`)
        .then(data => {
            const container = document.getElementById('spending-heatmap');
            if (!container) return;

            const values = Object.values(data);
            const maxValue = Math.max(2000, ...values);

            if (!heatmapInstance) {
                heatmapInstance = new HeatmapLib.CalendarHeatmap({
                    container,
                    year,
                    month: month - 1,
                    data,
                    colorRange: ['#2e3745', '#940e0e'],
                    valueRange: [0, maxValue],
                    emptyColor: '#3a4353',
                    onMonthChange: (newYear, newMonth) => {
                        loadHeatmap(newYear, newMonth + 1);
                    },
                });
                heatmapInstance.render();
            } else {
                heatmapInstance.setData(data);
            }
        })
        .catch(error => console.error("Error loading heatmap:", error));
}