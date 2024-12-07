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

            // Successful login, redirect to the user's manage page
            res.redirect(`/FantasyResearchAssistant/${username}/manage`);
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

    // Fetch user_id based on username
    const userSql = `SELECT user_id FROM UserInfo WHERE username = ?`;
    connection.query(userSql, [username], (err, userResult) => {
        if (err || userResult.length === 0) {
            res.status(500).send('<h1>Error fetching user information.</h1>');
            return;
        }

        const userId = userResult[0].user_id;

        // Fetch all fantasy teams for this user
        const teamSql = `SELECT fantasy_team_id, fantasy_team_name, roster_size FROM FantasyTeam WHERE user_id = ?`;
        connection.query(teamSql, [userId], (err, teamResults) => {
            if (err) {
                res.status(500).send('<h1>Error fetching fantasy teams.</h1>');
                return;
            }

            // Generate HTML for the fantasy teams as links
            const teamList = teamResults.map(team => 
                `<li>
                    <a href="/FantasyResearchAssistant/${username}/manage/${team.fantasy_team_name}">
                        <strong>${team.fantasy_team_name}</strong>
                    </a> 
                    (Roster Size: ${team.roster_size})
                </li>`
            ).join('');

            // Serve the Manage Fantasy Teams page
            res.send(
                `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Manage Fantasy Teams</title>
                    <style>
                        /* Add your CSS styles here */
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
                        ul {
                            list-style: none;
                            padding: 0;
                        }
                        li {
                            margin: 10px 0;
                            font-size: 18px;
                            color: #444;
                        }
                        li a {
                            text-decoration: none;
                            color: #007BFF;
                        }
                        li a:hover {
                            text-decoration: underline;
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
                    <ul>
                        ${teamList || '<li>No fantasy teams found.</li>'}
                    </ul>
                    <a href="/FantasyResearchAssistant/${username}/create-team" class="button">Create Fantasy Team</a>
                    <a href="/FantasyResearchAssistant/${username}/delete-team" class="button">Delete Fantasy Team</a>
                    <a href="/FantasyResearchAssistant/${username}/best-player" class="button">Best Player</a>
                    <a href="/FantasyResearchAssistant/${username}/highest-scoring-player" class="button">Highest Scoring Player</a>
                    <a href="/FantasyResearchAssistant/${username}/most-consistent-player" class="button">Most Consistent Player</a>
                    <a href="/FantasyResearchAssistant/${username}/total-fantasy-points" class="button">Total Points</a>
                </body>
                </html>`
            );
        });
    });
});

app.get('/FantasyResearchAssistant/:username/manage/:teamName', (req, res) => {
    const { username, teamName } = req.params;

    // Fetch the team ID for the specified teamName and username
    const teamSql = `
        SELECT ft.fantasy_team_id 
        FROM FantasyTeam ft
        JOIN UserInfo ui ON ft.user_id = ui.user_id
        WHERE ui.username = ? AND ft.fantasy_team_name = ?`;

    connection.query(teamSql, [username, teamName], (err, teamResult) => {
        if (err || teamResult.length === 0) {
            console.log("Error fetching fantasy team ID:", err);
            return res.status(500).send('<h1>Error fetching fantasy team information.</h1>');
        }

        const fantasyTeamId = teamResult[0].fantasy_team_id;

        // Fetch players in this team
        const currentPlayersSql = `
            SELECT p.player_id, p.name, p.team_id, p.position, p.age, p.height, p.weight
            FROM FantasyTeamPlayer ftp
            JOIN Player p ON ftp.player_id = p.player_id
            WHERE ftp.fantasy_team_id = ?`;

        connection.query(currentPlayersSql, [fantasyTeamId], (err, currentPlayers) => {
            if (err) {
                console.log("Error fetching current players:", err);
                return res.status(500).send('<h1>Error fetching current players.</h1>');
            }

            // Fetch 30 players not already in the team
            const availablePlayersSql = `
                SELECT p.player_id, p.name, p.team_id, p.position, p.age, p.height, p.weight
                FROM Player p
                WHERE NOT EXISTS (
                    SELECT 1 
                    FROM FantasyTeamPlayer ftp 
                    WHERE ftp.player_id = p.player_id AND ftp.fantasy_team_id = ?
                )
                LIMIT 30`;

            connection.query(availablePlayersSql, [fantasyTeamId], (err, availablePlayers) => {
                if (err) {
                    console.log("Error fetching available players:", err);
                    return res.status(500).send('<h1>Error fetching available players.</h1>');
                }

                // Generate HTML for current players
                const currentPlayersList = currentPlayers.map(player => 
                    `<tr>
                        <td>${player.player_id}</td>
                        <td>${player.name}</td>
                        <td>${player.team_id}</td>
                        <td>${player.position}</td>
                        <td>${player.age}</td>
                        <td>${player.height}</td>
                        <td>${player.weight}</td>
                        <td>
                            <form action="/FantasyResearchAssistant/${username}/manage/${teamName}/remove-player" method="POST">
                                <input type="hidden" name="player_id" value="${player.player_id}">
                                <button type="submit" style="color:red;">Remove</button>
                            </form>
                        </td>
                    </tr>`
                ).join('');

                // Generate HTML for available players
                const availablePlayersList = availablePlayers.map(player => 
                    `<tr>
                        <td>${player.player_id}</td>
                        <td>${player.name}</td>
                        <td>${player.team_id}</td>
                        <td>${player.position}</td>
                        <td>${player.age}</td>
                        <td>${player.height}</td>
                        <td>${player.weight}</td>
                        <td>
                            <form action="/FantasyResearchAssistant/${username}/manage/${teamName}/add-player" method="POST">
                                <input type="hidden" name="player_id" value="${player.player_id}">
                                <button type="submit">Add</button>
                            </form>
                        </td>
                    </tr>`
                ).join('');

                res.send(
                    `<!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>Manage Team: ${teamName}</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 0;
                                padding: 20px;
                                background-color: #f4f4f4;
                            }
                            h1 {
                                text-align: center;
                                color: #333;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-bottom: 20px;
                            }
                            table, th, td {
                                border: 1px solid #ddd;
                            }
                            th, td {
                                padding: 10px;
                                text-align: center;
                            }
                            th {
                                background-color: #007BFF;
                                color: white;
                            }
                            .button {
                                display: block;
                                width: max-content;
                                margin: 10px auto;
                                text-decoration: none;
                                background-color: #007BFF;
                                color: white;
                                padding: 10px 20px;
                                border-radius: 5px;
                                font-size: 16px;
                            }
                            .button:hover {
                                background-color: #0056b3;
                            }
                            button {
                                background-color: #007BFF;
                                color: white;
                                border: none;
                                padding: 5px 10px;
                                border-radius: 5px;
                                cursor: pointer;
                            }
                            button:hover {
                                background-color: #0056b3;
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Manage Team: ${teamName}</h1>
                        <h2>Current Players</h2>
                        <table>
                            <tr>
                                <th>Player ID</th>
                                <th>Name</th>
                                <th>Team ID</th>
                                <th>Position</th>
                                <th>Age</th>
                                <th>Height</th>
                                <th>Weight</th>
                                <th>Action</th>
                            </tr>
                            ${currentPlayersList || '<tr><td colspan="8">No players in this team.</td></tr>'}
                        </table>

                        <h2>Add New Players</h2>
                        <table>
                            <tr>
                                <th>Player ID</th>
                                <th>Name</th>
                                <th>Team ID</th>
                                <th>Position</th>
                                <th>Age</th>
                                <th>Height</th>
                                <th>Weight</th>
                                <th>Action</th>
                            </tr>
                            ${availablePlayersList || '<tr><td colspan="8">No available players to add.</td></tr>'}
                        </table>

                        <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back to Teams</a>
                        <a href="/FantasyResearchAssistant/login" class="button" style="background-color: #ff4d4d;">Logout</a>
                    </body>
                    </html>`
                );
            });
        });
    });
});




app.get('/FantasyResearchAssistant/:username/best-player', (req, res) => {
    const { username } = req.params;
    const limit = req.query.limit || 10; // Default to 10 players if not provided

    // Query to fetch best players with a limit
    const query = `
        SELECT 
            p.name AS player_name,
            p.position,
            t.team_name,
            SUM(g.points_scored) AS total_points
        FROM 
            Player p
        JOIN 
            Games g ON p.player_id = g.player_id
        JOIN 
            Team t ON p.team_id = t.team_id
        GROUP BY 
            p.player_id, p.name, p.position, t.team_name
        HAVING 
            SUM(g.points_scored) > (
                SELECT AVG(total_points)
                FROM (
                    SELECT SUM(g2.points_scored) AS total_points
                    FROM Player p2
                    JOIN Games g2 ON p2.player_id = g2.player_id
                    GROUP BY p2.player_id
                ) AS player_totals
            )
        ORDER BY 
            total_points DESC
        LIMIT ?;
    `;

    // Connect to the database and execute the query
    connection.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send('<h1>Error fetching best players.</h1>');
            return;
        }

        // Generate HTML table for results
        const playerTable = results.map(player => `
            <tr>
                <td>${player.player_name}</td>
                <td>${player.position}</td>
                <td>${player.team_name}</td>
                <td>${player.total_points}</td>
            </tr>
        `).join('');

        // Send response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Best Player</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        height: 100vh;
                        margin: 0;
                        background-color: #f4f4f4;
                        padding: 20px;
                    }
                    h1 {
                        margin-bottom: 20px;
                    }
                    form {
                        margin-bottom: 20px;
                    }
                    input[type="number"] {
                        padding: 5px;
                        font-size: 16px;
                        width: 60px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 80%;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        text-align: center;
                        padding: 8px;
                    }
                    th {
                        background-color: #007BFF;
                        color: white;
                    }
                    .button {
                        background-color: #007BFF;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        margin-top: 20px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        text-decoration: none;
                        text-align: center;
                    }
                    .button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h1>Best Players</h1>
                <form method="get" action="/FantasyResearchAssistant/${username}/best-player">
                    <label for="limit">Number of Players:</label>
                    <input type="number" id="limit" name="limit" value="${limit}" min="1">
                    <button type="submit" class="button">Update</button>
                </form>
                <table>
                    <thead>
                        <tr>
                            <th>Player Name</th>
                            <th>Position</th>
                            <th>Team Name</th>
                            <th>Total Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerTable || '<tr><td colspan="4">No players found.</td></tr>'}
                    </tbody>
                </table>
                <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back</a>
            </body>
            </html>
        `);
    });
});

app.post('/FantasyResearchAssistant/:username/manage/:teamName/add-player', (req, res) => {
    const { username, teamName } = req.params;
    const { player_id } = req.body;

    // Fetch the team ID for the specified teamName and username
    const teamSql = `
        SELECT ft.fantasy_team_id 
        FROM FantasyTeam ft
        JOIN UserInfo ui ON ft.user_id = ui.user_id
        WHERE ui.username = ? AND ft.fantasy_team_name = ?`;

    connection.query(teamSql, [username, teamName], (err, teamResult) => {
        if (err || teamResult.length === 0) {
            console.log("Error fetching fantasy team ID:", err);
            return res.status(500).send('<h1>Error fetching fantasy team information.</h1>');
        }

        const fantasyTeamId = teamResult[0].fantasy_team_id;

        // Insert the player into the FantasyTeamPlayer table
        const insertSql = `
            INSERT INTO FantasyTeamPlayer (fantasy_team_id, player_id)
            VALUES (?, ?)`;

        connection.query(insertSql, [fantasyTeamId, player_id], (err, result) => {
            if (err) {
                console.log("Error adding player to fantasy team:", err);
                return res.status(500).send('<h1>Error adding player to the team.</h1>');
            }

            console.log("Player added successfully:", result);
            res.redirect(`/FantasyResearchAssistant/${username}/manage/${teamName}`);
        });
    });
});

app.post('/FantasyResearchAssistant/:username/manage/:teamName/remove-player', (req, res) => {
    const { username, teamName } = req.params;
    const { player_id } = req.body;

    const teamSql = `
        SELECT ft.fantasy_team_id 
        FROM FantasyTeam ft
        JOIN UserInfo ui ON ft.user_id = ui.user_id
        WHERE ui.username = ? AND ft.fantasy_team_name = ?`;

    connection.query(teamSql, [username, teamName], (err, teamResult) => {
        if (err || teamResult.length === 0) {
            console.log("Error fetching fantasy team ID:", err);
            return res.status(500).send('<h1>Error removing player from the team.</h1>');
        }

        const fantasyTeamId = teamResult[0].fantasy_team_id;

        const deleteSql = `DELETE FROM FantasyTeamPlayer WHERE fantasy_team_id = ? AND player_id = ?`;
        connection.query(deleteSql, [fantasyTeamId, player_id], (err, result) => {
            if (err) {
                console.log("Error removing player:", err);
                return res.status(500).send('<h1>Error removing player from the team.</h1>');
            }

            console.log("Player removed successfully:", result);
            res.redirect(`/FantasyResearchAssistant/${username}/manage/${teamName}`);
        });
    });
});




app.get('/FantasyResearchAssistant/:username/highest-scoring-player', (req, res) => {
    const { username } = req.params;

    // SQL query to fetch highest-scoring player(s) by team
    const query = `
        SELECT 
            team_name,
            player_name,
            total_points
        FROM 
            (SELECT 
                T.team_name,
                P.name AS player_name,
                SUM(G.points_scored) AS total_points
            FROM 
                Player P
            JOIN 
                Team T ON P.team_id = T.team_id
            JOIN 
                Games G ON P.player_id = G.player_id
            GROUP BY 
                T.team_name, P.name
            HAVING 
                SUM(G.points_scored) > 250) AS Points
        WHERE 
            (team_name, total_points) IN (
                SELECT 
                    team_name, MAX(total_points)
                FROM 
                    (SELECT 
                        T.team_name,
                        P.name AS player_name,
                        SUM(G.points_scored) AS total_points
                    FROM 
                        Player P
                    JOIN 
                        Team T ON P.team_id = T.team_id
                    JOIN 
                        Games G ON P.player_id = G.player_id
                    GROUP BY 
                        T.team_name, P.name
                    HAVING 
                        SUM(G.points_scored) > 250) AS TeamPlayerPoints
                GROUP BY 
                    team_name
            )
        ORDER BY 
            team_name
        LIMIT 15;
    `;

    // Execute the query and handle the response
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send('<h1>Error fetching highest-scoring players.</h1>');
            return;
        }

        // Generate HTML table for results
        const playerTable = results.map(player => `
            <tr>
                <td>${player.team_name}</td>
                <td>${player.player_name}</td>
                <td>${player.total_points}</td>
            </tr>
        `).join('');

        // Send response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Highest Scoring Player</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        height: 100vh;
                        margin: 0;
                        background-color: #f4f4f4;
                        padding: 20px;
                    }
                    h1 {
                        margin-bottom: 20px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 80%;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        text-align: center;
                        padding: 8px;
                    }
                    th {
                        background-color: #007BFF;
                        color: white;
                    }
                    .button {
                        background-color: #007BFF;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        margin-top: 20px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        text-decoration: none;
                        text-align: center;
                    }
                    .button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h1>Highest Scoring Players</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Team Name</th>
                            <th>Player Name</th>
                            <th>Total Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerTable || '<tr><td colspan="3">No players found.</td></tr>'}
                    </tbody>
                </table>
                <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back</a>
            </body>
            </html>
        `);
    });
});

app.get('/FantasyResearchAssistant/:username/most-consistent-player', (req, res) => {
    const { username } = req.params;
    const limit = req.query.limit || 15; // Default to 15 players if not provided

    // SQL query to fetch the most consistent players
    const query = `
        SELECT 
            p.name AS player_name,
            p.position,
            t.team_name,
            STDDEV(g.points_scored) AS points_consistency
        FROM 
            Player p
        JOIN 
            Games g ON p.player_id = g.player_id
        JOIN 
            Team t ON p.team_id = t.team_id
        GROUP BY 
            p.player_id, p.position, t.team_name
        HAVING 
            COUNT(g.game_id) > 1  -- Ensure player has multiple games for consistency measure
        ORDER BY 
            points_consistency ASC
        LIMIT ?;
    `;

    // Execute the query
    connection.query(query, [parseInt(limit)], (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send('<h1>Error fetching most consistent players.</h1>');
            return;
        }

        // Generate HTML table for results
        const playerTable = results.map(player => `
            <tr>
                <td>${player.player_name}</td>
                <td>${player.position}</td>
                <td>${player.team_name}</td>
                <td>${player.points_consistency.toFixed(2)}</td>
            </tr>
        `).join('');

        // Send the HTML response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Most Consistent Player</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        height: 100vh;
                        margin: 0;
                        background-color: #f4f4f4;
                        padding: 20px;
                    }
                    h1 {
                        margin-bottom: 20px;
                    }
                    form {
                        margin-bottom: 20px;
                    }
                    input[type="number"] {
                        padding: 5px;
                        font-size: 16px;
                        width: 60px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 80%;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        text-align: center;
                        padding: 8px;
                    }
                    th {
                        background-color: #007BFF;
                        color: white;
                    }
                    .button {
                        background-color: #007BFF;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        margin-top: 20px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        text-decoration: none;
                        text-align: center;
                    }
                    .button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h1>Most Consistent Players</h1>
                <form method="get" action="/FantasyResearchAssistant/${username}/most-consistent-player">
                    <label for="limit">Number of Players:</label>
                    <input type="number" id="limit" name="limit" value="${limit}" min="1">
                    <button type="submit" class="button">Update</button>
                </form>
                <table>
                    <thead>
                        <tr>
                            <th>Player Name</th>
                            <th>Position</th>
                            <th>Team Name</th>
                            <th>Points Consistency (STDDEV)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${playerTable || '<tr><td colspan="4">No players found.</td></tr>'}
                    </tbody>
                </table>
                <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back</a>
            </body>
            </html>
        `);
    });
});


app.get('/FantasyResearchAssistant/:username/total-fantasy-points', (req, res) => {
    const { username } = req.params;

    // Query to calculate total fantasy points
    const query = `
        SELECT 
            p.player_id,
            p.name AS player_name,
            t.team_name AS team,
            SUM(
                (g.rushing_yards / 10) +
                (g.receiving_yards / 10) +
                (g.passing_yards / 25) +
                (g.touchdowns * 6) +
                (g.receptions * 1) -
                (g.fumbles_lost * 2)
            ) AS total_fantasy_points
        FROM 
            Player p
        JOIN 
            Games g ON p.player_id = g.player_id
        JOIN 
            Team t ON p.team_id = t.team_id
        GROUP BY 
            p.player_id, p.name, t.team_name
        ORDER BY 
            total_fantasy_points DESC;
    `;

    // Connect to the database and execute the query
    connection.query(query, (err, results) => {
        if (err) {
            console.error("Error executing query:", err);
            res.status(500).send('<h1>Error fetching total fantasy points.</h1>');
            return;
        }

        // Generate HTML table for results
        const fantasyPointsTable = results.map(player => `
            <tr>
                <td>${player.player_id}</td>
                <td>${player.player_name}</td>
                <td>${player.team}</td>
                <td>${parseFloat(player.total_fantasy_points).toFixed(2)}</td>
            </tr>
        `).join('');

        // Send response
        res.send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Total Fantasy Points</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: flex-start;
                        height: 100vh;
                        margin: 0;
                        background-color: #f4f4f4;
                        padding: 20px;
                    }
                    h1 {
                        margin-bottom: 20px;
                    }
                    table {
                        border-collapse: collapse;
                        width: 80%;
                        margin-top: 20px;
                    }
                    th, td {
                        border: 1px solid #ddd;
                        text-align: center;
                        padding: 8px;
                    }
                    th {
                        background-color: #007BFF;
                        color: white;
                    }
                    .button {
                        background-color: #007BFF;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        margin-top: 20px;
                        border-radius: 5px;
                        font-size: 16px;
                        cursor: pointer;
                        text-decoration: none;
                        text-align: center;
                    }
                    .button:hover {
                        background-color: #0056b3;
                    }
                </style>
            </head>
            <body>
                <h1>Total Fantasy Points</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Player ID</th>
                            <th>Player Name</th>
                            <th>Team</th>
                            <th>Total Fantasy Points</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fantasyPointsTable || '<tr><td colspan="4">No players found.</td></tr>'}
                    </tbody>
                </table>
                <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back</a>
            </body>
            </html>
        `);
    });
});

  



app.get('/FantasyResearchAssistant/:username/create-team', (req, res) => {
    const username = req.params.username;
    
    // Serve the Create Fantasy Team page with a form
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Fantasy Team</title>
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
                input {
                    padding: 10px;
                    margin: 5px 0;
                    font-size: 16px;
                    width: 300px;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                }
                label {
                    font-size: 16px;
                    margin: 10px 0 5px;
                    display: inline-block;
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
            <h1>Create Fantasy Team</h1>
            <form action="#" method="POST">
                <label for="fantasy_team_name">Fantasy Team Name</label>
                <input type="text" id="fantasy_team_name" name="fantasy_team_name" required>

                <label for="roster_size">Roster Size</label>
                <input type="number" id="roster_size" name="roster_size" min="1" required>

                <button type="submit" class="button">Create Team</button>
            </form>
            <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back to Manage Teams</a>
        </body>
        </html>
    `);
});

  



app.get('/FantasyResearchAssistant/:username/create-team', (req, res) => {
    const username = req.params.username;
    
    // Serve the Create Fantasy Team page with a form
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Create Fantasy Team</title>
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
                input {
                    padding: 10px;
                    margin: 5px 0;
                    font-size: 16px;
                    width: 300px;
                    border-radius: 5px;
                    border: 1px solid #ccc;
                }
                label {
                    font-size: 16px;
                    margin: 10px 0 5px;
                    display: inline-block;
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
            <h1>Create Fantasy Team</h1>
            <form action="#" method="POST">
                <label for="fantasy_team_name">Fantasy Team Name</label>
                <input type="text" id="fantasy_team_name" name="fantasy_team_name" required>

                <label for="roster_size">Roster Size</label>
                <input type="number" id="roster_size" name="roster_size" min="1" required>

                <button type="submit" class="button">Create Team</button>
            </form>
            <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back to Manage Teams</a>
        </body>
        </html>
    `);
});

app.post('/FantasyResearchAssistant/:username/create-team', (req, res) => {
    const username = req.params.username;
    const { fantasy_team_name, roster_size } = req.body;  // Get form data from the body

    // Fetch user_id based on the username
    const userSql = `SELECT user_id FROM UserInfo WHERE username = ?`;
    
    connection.query(userSql, [username], (err, userResult) => {
        if (err || userResult.length === 0) {
            console.log("Error fetching user information for username:", username);
            return res.status(500).send('<h1>Error fetching user information.</h1>');
        }

        const user_id = userResult[0].user_id;  // Get user_id from the query result

        // Debugging: Log the fetched user_id
        console.log("Fetched user_id:", user_id);

        // If user_id is invalid, return an error
        if (!user_id) {
            console.log("Error: Invalid user ID.");
            return res.status(400).send('<h1>Error: Invalid user ID.</h1>');
        }

        // Get the current maximum fantasy_team_id (this step is optional, since AUTO_INCREMENT handles this)
        const maxFantasyTeamIdSql = `SELECT MAX(fantasy_team_id) AS max_team_id FROM FantasyTeam`;
        
        connection.query(maxFantasyTeamIdSql, (err, result) => {
            if (err) {
                console.log("Error fetching max fantasy_team_id:", err);
                return res.status(500).send('<h1>Error fetching max fantasy_team_id.</h1>');
            }

            // Debugging: Log the max fantasy_team_id
            console.log("Max Fantasy Team ID:", result[0].max_team_id);

            // Get the next fantasy_team_id (Max ID + 1)
            const nextFantasyTeamId = result[0].max_team_id ? result[0].max_team_id + 1 : 1;

            // Insert the new fantasy team into the database, including the new fantasy_team_id
            const insertSql = `
                INSERT INTO FantasyTeam (fantasy_team_id, user_id, fantasy_team_name, roster_size)
                VALUES (?, ?, ?, ?)
            `;

            connection.query(insertSql, [nextFantasyTeamId, user_id, fantasy_team_name, roster_size], (err, insertResult) => {
                if (err) {
                    console.log("Error inserting fantasy team:", err);
                    return res.status(500).send('<h1>Error creating fantasy team.</h1>');
                }

                // Debugging: Log successful insert
                console.log("Team created successfully:", insertResult);
                
                // Redirect to the Manage Fantasy Teams page after the team is created
                res.redirect(`/FantasyResearchAssistant/${username}/manage`);
            });
        });
    });
});


app.get('/FantasyResearchAssistant/:username/delete-team', (req, res) => {
    const username = req.params.username;

    // Fetch user_id based on username
    const userSql = `SELECT user_id FROM UserInfo WHERE username = ?`;
    connection.query(userSql, [username], (err, userResult) => {
        if (err || userResult.length === 0) {
            res.status(500).send('<h1>Error fetching user information.</h1>');
            return;
        }

        const userId = userResult[0].user_id;

        // Fetch all fantasy teams for this user
        const teamSql = `SELECT fantasy_team_id, fantasy_team_name, roster_size FROM FantasyTeam WHERE user_id = ?`;
        connection.query(teamSql, [userId], (err, teamResults) => {
            if (err) {
                res.status(500).send('<h1>Error fetching fantasy teams.</h1>');
                return;
            }

            // Generate HTML for the fantasy teams in a table with checkboxes
            const teamTable = teamResults.map(team => `
                <tr>
                    <td><input type="checkbox" name="team_id" value="${team.fantasy_team_id}"></td>
                    <td>${team.fantasy_team_name}</td>
                    <td>${team.roster_size}</td>
                </tr>
            `).join('');

            // Serve the Delete Fantasy Team page with the table
            res.send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Delete Fantasy Team</title>
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
                        table {
                            width: 80%;
                            margin-top: 20px;
                            border-collapse: collapse;
                        }
                        th, td {
                            padding: 10px;
                            text-align: center;
                            border: 1px solid #ddd;
                        }
                        th {
                            background-color: #f2f2f2;
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
                    <h1>Delete Fantasy Team</h1>
                    <form action="/FantasyResearchAssistant/${username}/delete-team" method="POST">
                        <table>
                            <thead>
                                <tr>
                                    <th>Select</th>
                                    <th>Fantasy Team Name</th>
                                    <th>Roster Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${teamTable || '<tr><td colspan="3">No fantasy teams found.</td></tr>'}
                            </tbody>
                        </table>
                        <button type="submit" class="button">Delete Selected Team</button>
                    </form>
                    <a href="/FantasyResearchAssistant/${username}/manage" class="button">Back to Manage Teams</a>
                </body>
                </html>
            `);
        });
    });
});

app.post('/FantasyResearchAssistant/:username/delete-team', (req, res) => {
    const username = req.params.username;
    const teamId = req.body.team_id; // Get the selected team ID from the form

    if (!teamId) {
        return res.send(`
            <script>
                alert('No team selected for deletion.');
                window.location.href = '/FantasyResearchAssistant/${username}/delete-team';
            </script>
        `);
    }

    // Delete the selected fantasy team from the database
    const deleteSql = `DELETE FROM FantasyTeam WHERE fantasy_team_id = ?`;

    connection.query(deleteSql, [teamId], (err, result) => {
        if (err) {
            console.log("Error deleting fantasy team:", err);
            return res.send(`
                <script>
                    alert('Error deleting fantasy team.');
                    window.location.href = '/FantasyResearchAssistant/${username}/manage';
                </script>
            `);
        }

        // Redirect to the Manage Fantasy Teams page after deletion
        res.send(`
            <script>
                alert('Fantasy team deleted successfully.');
                window.location.href = '/FantasyResearchAssistant/${username}/manage';
            </script>
        `);
    });
});




// Start the server
app.listen(8001, function () {
    console.log('Node app is running on port 8001');
    console.log('http://localhost:8001/FantasyResearchAssistant/login');
});