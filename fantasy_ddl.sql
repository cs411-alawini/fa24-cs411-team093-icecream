CREATE DATABASE FantasyResearchAssistant;

USE FantasyResearchAssistant;

CREATE TABLE UserInfo (
    user_id INT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(100) NOT NULL
);

CREATE TABLE Team (
    team_id INT PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    wins INT DEFAULT 0,
    losses INT DEFAULT 0,
    ties INT DEFAULT 0
);

CREATE TABLE Player (
    player_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    team_id INT,
    position VARCHAR(50),
    age INT,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    FOREIGN KEY (team_id) REFERENCES Team(team_id)
);

CREATE TABLE FantasyTeam (
    fantasy_team_id INT PRIMARY KEY,
    user_id INT,
    fantasy_team_name VARCHAR(100) NOT NULL,
    roster_size INT,
    FOREIGN KEY (user_id) REFERENCES UserInfo(user_id)
);

CREATE TABLE Games ( 
    game_id INT PRIMARY KEY, 
    home_team INT,
    away_team INT,
    points_scored INT, 
    passing_yards INT, 
    rushing_yards INT, 
    receiving_yards INT, 
    touchdowns INT, 
    receptions INT, 
    fumbles_lost INT, 
    expected_points INT,
    player_id INT,
	FOREIGN KEY (player_id) REFERENCES Player(player_id)
);

