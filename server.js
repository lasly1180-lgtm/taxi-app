const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new Database("database.db");


const adminPassword = bcrypt.hashSync("admin123", 10);

db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        grade TEXT
    )
`).run();

db.prepare(`
    INSERT OR IGNORE INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "admin",
    adminPassword,
    "admin",
    "pdg"
);
const driverPassword = bcrypt.hashSync("chauffeur123", 10);

db.prepare(`
    INSERT OR IGNORE INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "chauffeur1",
    driverPassword,
    "driver",
    "novice"
);

db.prepare(`
    INSERT OR IGNORE INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "chauffeur2",
    driverPassword,
    "driver",
    "expérimenté"
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: "taxi-secret-key",
        resave: false,
        saveUninitialized: false
    })
);

app.use(express.static(path.join(__dirname, "public")));

/* LOGIN */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

const user = db.prepare(
    "SELECT * FROM users WHERE username = ?"
).get(username);

if (!user) {
    return res.status(401).json({
        error: "Utilisateur introuvable"
    });
}

const validPassword = await bcrypt.compare(password, user.password);

if (!validPassword) {
    return res.status(401).json({
        error: "Mot de passe incorrect"
    });
}

req.session.user = {
    id: user.id,
    username: user.username,
    role: user.role,
    grade: user.grade
};

req.session.save(() => {
    res.json({
        message: "Connexion réussie",
        user: req.session.user
    });
});

});

/* SESSION */
app.get("/me", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Non connecté" });
    }

    res.json(req.session.user);
});

/* AJOUT TRANSACTION */
app.post("/transaction", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Non connecté"
        });
    }

    const {
        type,
        total_amount,
        driver_amount,
        company_amount,
        km
    } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO transactions
            (user_id, type, total_amount, driver_amount, company_amount, km)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            req.session.user.id,
            type,
            total_amount,
            driver_amount,
            company_amount,
            km
        );

        res.json({
            message: "Transaction enregistrée",
            id: result.lastInsertRowid
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur insertion"
        });
    }
});

/* LISTE TRANSACTIONS */
app.get("/transactions", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Non connecté"
        });
    }

    try {
        const rows = db.prepare(
            "SELECT * FROM transactions ORDER BY date DESC"
        ).all();

        res.json(rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture"
        });
    }
});

/* UPDATE GRADE */
app.post("/update-grade", (req, res) => {
    const { username, grade } = req.body;

    try {
        db.prepare(
            "UPDATE users SET grade = ? WHERE username = ?"
        ).run(
            grade,
            username
        );

        res.json({
            message: "Grade mis à jour avec succès"
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur mise à jour grade"
        });
    }
});

/* LOGOUT */
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            message: "Déconnexion réussie"
        });
    });
});

app.post("/add-driver", async (req, res) => {
    const { username, password, grade } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
        db.prepare(
            "INSERT INTO users (username, password, role, grade) VALUES (?, ?, ?, ?)"
        ).run(
            username,
            hashedPassword,
            "driver",
            grade
        );

        res.json({
            message: "Chauffeur ajouté avec succès"
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur ajout chauffeur"
        });
    }
});
app.post("/delete-driver", (req, res) => {
    const { username } = req.body;

    try {
        const result = db.prepare(
            "DELETE FROM users WHERE username = ? AND role = 'driver'"
        ).run(username);

        if (result.changes === 0) {
            return res.json({
                error: "Chauffeur introuvable"
            });
        }

        res.json({
            message: "Chauffeur supprimé avec succès"
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur suppression chauffeur"
        });
    }
});
app.post("/rename-driver", (req, res) => {
    const { oldUsername, newUsername } = req.body;

    try {
        const result = db.prepare(
            "UPDATE users SET username = ? WHERE username = ? AND role = 'driver'"
        ).run(
            newUsername,
            oldUsername
        );

        if (result.changes === 0) {
            return res.json({
                error: "Chauffeur introuvable"
            });
        }

        res.json({
            message: "Nom du chauffeur modifié avec succès"
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur modification nom chauffeur"
        });
    }
});
app.post("/add-expense", (req, res) => {
    const { type, amount, description } = req.body;

    try {
        db.prepare(
            "INSERT INTO expenses (type, amount, description) VALUES (?, ?, ?)"
        ).run(
            type,
            amount,
            description
        );

        res.json({
            message: "Dépense ajoutée avec succès"
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur ajout dépense"
        });
    }
});
app.get("/expenses", (req, res) => {
    try {
        const rows = db.prepare(
            "SELECT * FROM expenses ORDER BY date DESC"
        ).all();

        res.json(rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture dépenses"
        });
    }
});
app.get("/drivers", (req, res) => {
    try {
        const rows = db.prepare(
            "SELECT username, grade, role FROM users WHERE role = 'driver' ORDER BY username ASC"
        ).all();

        res.json(rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture chauffeurs"
        });
    }
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
/* SALAIRE HEBDOMADAIRE */
app.get("/weekly-salary", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Non connecté"
        });
    }

    try {
        const row = db.prepare(`
            SELECT COALESCE(SUM(driver_amount), 0) AS weekly_salary
            FROM transactions
            WHERE user_id = ?
            AND date >= datetime('now', '-7 days')
        `).get(req.session.user.id);

        res.json({
            weekly_salary: row.weekly_salary
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur calcul salaire"
        });
    }
});
/* SALAIRES HEBDOMADAIRES ADMIN */
app.get("/weekly-salaries", (req, res) => {
    try {
        const rows = db.prepare(`
            SELECT 
                users.username,
                users.grade,
                COALESCE(SUM(transactions.driver_amount), 0) AS weekly_salary
            FROM users
            LEFT JOIN transactions
                ON users.id = transactions.user_id
                AND transactions.date >= datetime('now', '-7 days')
            WHERE users.role = 'driver'
            GROUP BY users.id
            ORDER BY weekly_salary DESC
        `).all();

        res.json(rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture salaires"
        });
    }
});
app.listen(3000, () => {
    console.log("Serveur lancé sur http://localhost:3000");
});