const express = require("express");
const Database = require("better-sqlite3");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new Database("database.db");
const bcrypt = require("bcrypt");

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
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [username],
        async (err, user) => {
            if (err) {
                return res.status(500).json({ error: "Erreur serveur" });
            }

            if (!user) {
                return res.status(401).json({ error: "Utilisateur introuvable" });
            }

            const validPassword = await bcrypt.compare(password, user.password);

            if (!validPassword) {
                return res.status(401).json({ error: "Mot de passe incorrect" });
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                role: user.role,
                grade: user.grade
            };

            res.json({
                message: "Connexion réussie",
                user: req.session.user
            });
        }
    );
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
        return res.status(401).json({ error: "Non connecté" });
    }

    const {
        type,
        total_amount,
        driver_amount,
        company_amount,
        km
    } = req.body;

    db.run(
        `INSERT INTO transactions
        (user_id, type, total_amount, driver_amount, company_amount, km)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
            req.session.user.id,
            type,
            total_amount,
            driver_amount,
            company_amount,
            km
        ],
        function (err) {
            if (err) {
                return res.status(500).json({ error: "Erreur insertion" });
            }

            res.json({
                message: "Transaction enregistrée",
                id: this.lastID
            });
        }
    );
});

/* LISTE TRANSACTIONS */
app.get("/transactions", (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Non connecté" });
    }

    db.all(
        "SELECT * FROM transactions ORDER BY date DESC",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: "Erreur lecture" });
            }

            res.json(rows);
        }
    );
});

/* UPDATE GRADE */
app.post("/update-grade", (req, res) => {
    const { username, grade } = req.body;

    db.run(
        "UPDATE users SET grade = ? WHERE username = ?",
        [grade, username],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Erreur mise à jour grade"
                });
            }

            res.json({
                message: "Grade mis à jour avec succès"
            });
        }
    );
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

    db.run(
        "INSERT INTO users (username, password, role, grade) VALUES (?, ?, ?, ?)",
        [username, hashedPassword, "driver", grade],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Erreur ajout chauffeur"
                });
            }

            res.json({
                message: "Chauffeur ajouté avec succès"
            });
        }
    );
});
app.post("/delete-driver", (req, res) => {
    const { username } = req.body;

    db.run(
        "DELETE FROM users WHERE username = ? AND role = 'driver'",
        [username],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Erreur suppression chauffeur"
                });
            }

            if (this.changes === 0) {
                return res.json({
                    error: "Chauffeur introuvable"
                });
            }

            res.json({
                message: "Chauffeur supprimé avec succès"
            });
        }
    );
});
app.post("/rename-driver", (req, res) => {
    const { oldUsername, newUsername } = req.body;

    db.run(
        "UPDATE users SET username = ? WHERE username = ? AND role = 'driver'",
        [newUsername, oldUsername],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Erreur modification nom chauffeur"
                });
            }

            if (this.changes === 0) {
                return res.json({
                    error: "Chauffeur introuvable"
                });
            }

            res.json({
                message: "Nom du chauffeur modifié avec succès"
            });
        }
    );
});
app.post("/add-expense", (req, res) => {
    const { type, amount, description } = req.body;

    db.run(
        "INSERT INTO expenses (type, amount, description) VALUES (?, ?, ?)",
        [type, amount, description],
        function (err) {
            if (err) {
                return res.status(500).json({
                    error: "Erreur ajout dépense"
                });
            }

            res.json({
                message: "Dépense ajoutée avec succès"
            });
        }
    );
});
app.get("/expenses", (req, res) => {
    db.all(
        "SELECT * FROM expenses ORDER BY date DESC",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: "Erreur lecture dépenses"
                });
            }

            res.json(rows);
        }
    );
});
app.get("/drivers", (req, res) => {
    db.all(
        "SELECT username, grade, role FROM users WHERE role = 'driver' ORDER BY username ASC",
        [],
        (err, rows) => {
            if (err) {
                return res.status(500).json({
                    error: "Erreur lecture chauffeurs"
                });
            }

            res.json(rows);
        }
    );
});
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});
app.listen(3000, () => {
    console.log("Serveur lancé sur http://localhost:3000");
});