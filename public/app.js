const loginForm = document.getElementById("loginForm");
const transactionForm = document.getElementById("transactionForm");
const message = document.getElementById("message");

if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        const response = await fetch("/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                password
            })
        });

        const data = await response.json();

        if (response.ok) {
            if (data.user.role === "boss") {
                window.location.href = "/admin.html";
            } else {
                window.location.href = "/dashboard.html";
            }
        } else {
            message.innerText = data.error;
        }
    });
}

if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const type = document.getElementById("type").value;
        const total_amount = document.getElementById("total_amount").value;
        const driver_amount = document.getElementById("driver_amount").value;
        const company_amount = document.getElementById("company_amount").value;
        const km = document.getElementById("km").value;

        const response = await fetch("/transaction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type,
                total_amount,
                driver_amount,
                company_amount,
                km
            })
        });

        const data = await response.json();
        message.innerText = data.message || data.error;
    });
}

async function logout() {
    await fetch("/logout");
    window.location.href = "/login.html";
}
const transactionsDiv = document.getElementById("transactions");

const courseType = document.getElementById("course_type");
const kmInput = document.getElementById("km");
const totalInput = document.getElementById("total_amount");

if (courseType && kmInput && totalInput) {
    function updateTotal() {
        const courseTypeValue = courseType.value;
        const kmValue = Number(kmInput.value);

        if (courseTypeValue === "auto" && kmValue > 0) {
            totalInput.value = kmValue * 150;
            totalInput.readOnly = true;
        } else {
            totalInput.readOnly = false;
        }
    }

    courseType.addEventListener("change", updateTotal);
    kmInput.addEventListener("input", updateTotal);
}
if (transactionForm) {
    transactionForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const course_type = document.getElementById("course_type").value;
        const type = document.getElementById("type").value;
        let total_amount = Number(document.getElementById("total_amount").value);
        let km = Number(document.getElementById("km").value);

        if (course_type === "auto") {
            total_amount = km * 150;
        }

        const userResponse = await fetch("/me");
        const user = await userResponse.json();

        let percentage = 40;

        switch (user.grade) {
            case "novice":
                percentage = 40;
                break;
            case "expérimenté":
                percentage = 45;
                break;
            case "vétéran":
                percentage = 50;
                break;
            case "DRH":
                percentage = 55;
                break;
            case "co pdg":
                percentage = 60;
                break;
            case "pdg":
                percentage = 70;
                break;
        }

        const driver_amount = (total_amount * percentage) / 100;
        const company_amount = total_amount - driver_amount;

        const response = await fetch("/transaction", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type,
                total_amount,
                driver_amount,
                company_amount,
                km
            })
        });

        const data = await response.json();

        message.innerText =
            `Course enregistrée | Chauffeur : ${driver_amount}$ | Société : ${company_amount}$`;
    });
}
if (transactionsDiv) {
    fetch("/transactions")
        .then(res => res.json())
        .then(data => {
            let total = 0;
            let drivers = 0;
            let company = 0;
            let kms = 0;

            data.forEach(t => {
                total += Number(t.total_amount);
                drivers += Number(t.driver_amount);
                company += Number(t.company_amount);
                kms += Number(t.km);

                transactionsDiv.innerHTML += `
                    <div style="border:1px solid #ddd; padding:10px; margin:10px 0;">
                        <strong>${t.type}</strong><br>
                        Total : ${t.total_amount} €<br>
                        Chauffeur : ${t.driver_amount} €<br>
                        Société : ${t.company_amount} €<br>
                        KM : ${t.km}<br>
                        Date : ${t.date}
                    </div>
                `;
            });

            document.getElementById("total").innerText = total;
            document.getElementById("drivers").innerText = drivers;
            document.getElementById("company").innerText = company;
            document.getElementById("kms").innerText = kms;

            fetch("/expenses")
                .then(res => res.json())
                .then(expenses => {
                    let totalExpenses = 0;

                    expenses.forEach(expense => {
                        totalExpenses += Number(expense.amount);
                    });

                    const netProfit = company - totalExpenses;

                    document.getElementById("netProfit").innerText = netProfit;
                });
        });
}
async function updateGrade() {
    alert("test");

    const username = document.getElementById("driverUsername").value;
    const grade = document.getElementById("newGrade").value;
    const gradeMessage = document.getElementById("gradeMessage");

    const response = await fetch("/update-grade", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            grade
        })
    });

    const text = await response.text();
    console.log(text);

    gradeMessage.innerText = text;
}

 async function addDriver() {
    alert("test add driver");

    const username = document.getElementById("newDriverUsername").value;
    const password = document.getElementById("newDriverPassword").value;
    const grade = document.getElementById("newDriverGrade").value;
    const addDriverMessage = document.getElementById("addDriverMessage");

    const response = await fetch("/add-driver", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password,
            grade
        })
    });

   const text = await response.text();
console.log(text);

addDriverMessage.innerText = text;
}
async function deleteDriver() {
    const username = document.getElementById("deleteDriverUsername").value;
    const deleteDriverMessage = document.getElementById("deleteDriverMessage");

    const response = await fetch("/delete-driver", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username
        })
    });

    const data = await response.json();

    deleteDriverMessage.innerText = data.message || data.error;
}
async function renameDriver() {
    const oldUsername = document.getElementById("oldDriverUsername").value;
    const newUsername = document.getElementById("newDriverUsernameRename").value;
    const renameDriverMessage = document.getElementById("renameDriverMessage");

    const response = await fetch("/rename-driver", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            oldUsername,
            newUsername
        })
    });

    const data = await response.json();

    renameDriverMessage.innerText = data.message || data.error;
}
async function addExpense() {
    const type = document.getElementById("expenseType").value;
    const amount = document.getElementById("expenseAmount").value;
    const description = document.getElementById("expenseDescription").value;
    const expenseMessage = document.getElementById("expenseMessage");

    const response = await fetch("/add-expense", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            type,
            amount,
            description
        })
    });

    const data = await response.json();

    expenseMessage.innerText = data.message || data.error;
}
const expensesList = document.getElementById("expensesList");

if (expensesList) {
    fetch("/expenses")
        .then(res => res.json())
        .then(data => {
            let totalExpenses = 0;

            data.forEach(expense => {
                totalExpenses += Number(expense.amount);

                expensesList.innerHTML += `
                    <div style="border:1px solid #ddd; padding:10px; margin:10px 0;">
                        <strong>${expense.type}</strong><br>
                        Montant : ${expense.amount} €<br>
                        Description : ${expense.description}<br>
                        Date : ${expense.date}
                    </div>
                `;
            });

            document.getElementById("totalExpenses").innerText = totalExpenses;
        });
}
const driversList = document.getElementById("driversList");

if (driversList) {
    fetch("/drivers")
        .then(res => res.json())
        .then(data => {
            data.forEach(driver => {
                driversList.innerHTML += `
                    <div style="border:1px solid #ddd; padding:10px; margin:10px 0;">
                        <strong>${driver.username}</strong><br>
                        Grade : ${driver.grade}<br>
                        Rôle : ${driver.role}
                    </div>
                `;
            });
        });
}