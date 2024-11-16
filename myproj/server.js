var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql2');
var bcrypt = require('bcrypt');
var path = require('path'); // Import the path module

var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to the database
var connection = mysql.createConnection({
    host: '35.222.207.26', // Public IP of your Cloud SQL instance
    user: 'root', // Use the MySQL user with correct permissions
    password: 'Icecream123', // Replace with the correct MySQL password
    database: 'FantasyResearchAssistant', // Your database name
});

// Handle connection errors
connection.connect(function(err) {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the database successfully!');
});

// Serve the login page under /FantasyResearchAssistant/login
app.get('/FantasyResearchAssistant/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));  // Adjust the path if necessary
});

// Register route
app.post('/register', function(req, res) {
    const { username, email, password } = req.body;

    // Hash the password
    bcrypt.hash(password, 10, function(err, hash) {
        if (err) {
            res.status(500).send({ message: 'Error hashing password' });
            return;
        }

        // Fetch the last user_id from the UserInfo table
        const sql = 'SELECT MAX(user_id) AS lastUserId FROM UserInfo';
        connection.query(sql, function(err, result) {
            if (err) {
                res.status(500).send({ message: 'Error fetching last user_id', error: err });
                return;
            }

            // Get the last user_id and increment it
            const lastUserId = result[0].lastUserId || 0;
            const newUserId = lastUserId + 1;

            // Save the new user with the incremented user_id
            const insertSql = `INSERT INTO UserInfo (user_id, username, email, password) VALUES (?, ?, ?, ?)`;
            connection.query(insertSql, [newUserId, username, email, hash], function(err, result) {
                if (err) {
                    res.status(500).send({ message: 'Error registering user', error: err });
                    return;
                }
                res.status(201).send({ message: 'User registered successfully' });
            });
        });
    });
});

// User login route
app.post('/login', function (req, res) {
    const { username, password } = req.body;

    const sql = `SELECT * FROM UserInfo WHERE username = ?`;
    connection.query(sql, [username], function (err, results) {
        if (err) {
            res.status(500).send({ message: 'Error fetching user data', error: err });
            return;
        }

        if (results.length === 0) {
            res.status(401).send({ message: 'Invalid username or password' });
            return;
        }

        const user = results[0];
        bcrypt.compare(password, user.password, function (err, isMatch) {
            if (err) {
                res.status(500).send({ message: 'Error comparing passwords' });
                return;
            }

            if (!isMatch) {
                res.status(401).send({ message: 'Invalid username or password' });
                return;
            }

            // Successful login, redirect to personalized page
            res.redirect(`/FantasyResearchAssistant/${username}`);
        });
    });
});


app.get('/FantasyResearchAssistant/:username', (req, res) => {
    const username = req.params.username;

    const sql = `SELECT * FROM UserInfo WHERE username = ?`;
    connection.query(sql, [username], function (err, results) {
        if (err || results.length === 0) {
            return res.status(404).send('User not found');
        }

        // Serve the personalized page with properly styled buttons
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        background-color: #f4f4f4;
                        position: relative;
                    }
                    h1 {
                        color: #333;
                        margin-bottom: 20px;
                    }
                    .logout-btn {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background-color: #ff4d4d;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        text-decoration: none;
                    }
                    .logout-btn:hover {
                        background-color: #ff1a1a;
                    }
                    .manage-btn {
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        text-decoration: none;
                        margin-top: 20px;
                    }
                    .manage-btn:hover {
                        background-color: #45a049;
                    }
                </style>
            </head>
            <body>
                <a href="/FantasyResearchAssistant/login" class="logout-btn">Logout</a>
                <h1>Welcome, ${username}! You are logged in.</h1>
                <a href="/FantasyResearchAssistant/${username}/manage" class="manage-btn">Manage Fantasy Teams</a>
            </body>
            </html>
        `);
    });
});


app.get('/FantasyResearchAssistant/:username/manage', (req, res) => {
    const username = req.params.username;

    // Serve the Manage Fantasy Teams page
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Manage Fantasy Teams</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background-color: #f4f4f4;
                }
                h1 {
                    color: #333;
                    margin-bottom: 20px;
                }
                .button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 15px 20px;
                    margin: 10px;
                    border-radius: 5px;
                    font-size: 16px;
                    cursor: pointer;
                    text-decoration: none;
                    text-align: center;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .logout-btn {
                        position: absolute;
                        top: 20px;
                        right: 20px;
                        background-color: #ff4d4d;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 5px;
                        font-size: 14px;
                        cursor: pointer;
                        text-decoration: none;
                    }
                .logout-btn:hover {
                    background-color: #ff1a1a;
                }
            </style>
        </head>
        <body>
            <a href="/FantasyResearchAssistant/login" class="logout-btn">Logout</a>
            <h1>Manage Fantasy Teams</h1>
            <a href="/FantasyResearchAssistant/${username}/create-team" class="button">Create Fantasy Team</a>
            <a href="/FantasyResearchAssistant/${username}/delete-team" class="button">Delete Fantasy Team</a>
        </body>
        </html>
    `);
});




// Start the server
app.listen(8001, function () {
    console.log('Node app is running on port 8001');
    console.log('http://localhost:8001/FantasyResearchAssistant/login');
});
