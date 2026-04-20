CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    role TEXT,
    grade TEXT
);

CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    total_amount INTEGER,
    driver_amount INTEGER,
    company_amount INTEGER,
    km INTEGER,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);