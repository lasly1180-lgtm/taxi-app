const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();

const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

const adminPassword = bcrypt.hashSync("admin123", 10);

db.prepare(`

db.query(`
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT,
        grade TEXT
    )
`);
db.query(`
    CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        type TEXT,
        amount REAL,
        description TEXT,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
`);
db.prepare("DELETE FROM users WHERE username = ?").run("admin");

db.prepare(`
    INSERT INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "admin",
    adminPassword,
    "admin",
    "pdg"
);

const driverPassword = bcrypt.hashSync("chauffeur123", 10);

db.prepare("DELETE FROM users WHERE username = ?").run("chauffeur1");

db.prepare(`
    INSERT INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "chauffeur1",
    driverPassword,
    "driver",
    "novice"
);

db.prepare("DELETE FROM users WHERE username = ?").run("chauffeur2");

db.prepare(`
    INSERT INTO users (username, password, role, grade)
    VALUES (?, ?, ?, ?)
`).run(
    "chauffeur2",
    driverPassword,
    "driver",
    "expérimenté"
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("trust proxy", 1);

app.use(
    session({
        secret: "taxi-secret-key",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false,
            httpOnly: true,
            sameSite: "lax"
        }
    })
);
app.use(express.static(path.join(__dirname, "public")));

/* LOGIN */
app.post("/login", async (req, res) => {
    const { username, password } = req.body;

const result = await db.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
);

const user = result.rows[0];

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
app.post("/transaction", async (req, res) => {
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
        const result = await db.query(
            `
            INSERT INTO transactions
            (user_id, type, total_amount, driver_amount, company_amount, km)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
            `,
            [
                req.session.user.id,
                type,
                total_amount,
                driver_amount,
                company_amount,
                km
            ]
        );

        res.json({
            message: "Transaction enregistrée",
            id: result.rows[0].id
        });

    } catch (err) {
        res.status(500).json({
            error: "Erreur insertion"
        });
    }
});

/* LISTE TRANSACTIONS */

app.get("/transactions", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({
            error: "Non connecté"
        });
    }

    try {
        const result = await db.query(
            "SELECT * FROM transactions ORDER BY date DESC"
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture"
        });
    }
});

/* UPDATE GRADE */
app.post("/update-grade", async (req, res) => {
    const { username, grade } = req.body;

    try {
        const result = await db.query(
            "UPDATE users SET grade = $1 WHERE username = $2 RETURNING *",
            [
                grade,
                username
            ]
        );

        if (result.rowCount === 0) {
            return res.json({
                error: "Chauffeur introuvable"
            });
        }

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
        await db.query(
            "INSERT INTO users (username, password, role, grade) VALUES ($1, $2, $3, $4)",
            [
                username,
                hashedPassword,
                "driver",
                grade
            ]
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
app.post("/delete-driver", async (req, res) => {
    const { username } = req.body;

    try {
        const result = await db.query(
            "DELETE FROM users WHERE username = $1 AND role = 'driver' RETURNING *",
            [username]
        );

        if (result.rowCount === 0) {
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
app.post("/rename-driver", async (req, res) => {
    const { oldUsername, newUsername } = req.body;

    try {
        const result = await db.query(
            "UPDATE users SET username = $1 WHERE username = $2 AND role = 'driver' RETURNING *",
            [
                newUsername,
                oldUsername
            ]
        );

        if (result.rowCount === 0) {
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
app.post("/add-expense", async (req, res) => {
    const { type, amount, description } = req.body;

    try {
        await db.query(
            "INSERT INTO expenses (type, amount, description) VALUES ($1, $2, $3)",
            [
                type,
                amount,
                description
            ]
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
app.get("/expenses", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT * FROM expenses ORDER BY date DESC"
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json({
            error: "Erreur lecture dépenses"
        });
    }
});
app.get("/drivers", async (req, res) => {
    try {
        const result = await db.query(
            "SELECT username, grade, role FROM users WHERE role = 'driver' ORDER BY username ASC"
        );

        res.json(result.rows);

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