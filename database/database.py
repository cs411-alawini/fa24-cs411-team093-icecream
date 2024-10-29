import os, sys
import pymysql as mdb
from bottle import FormsDict
from hashlib import md5
import pandas as pd

# Source this is code I wrote for my 461 WebSec Mp it has been adapted for this project now 

def connect():
    """
    Creates a connection object to the MySQL database.
    @return a mysqldb connection object.
    """

    return mdb.connect(host='localhost', user='arishko2', password='REPLACE_WITH_PASSWORD', db='FantasyResearchAssistant')


def insert_team_data():
    db_rw = connect()

    try:
        teams_df = pd.read_csv('teams.csv')
        cur = db_rw.cursor()

        sql = "INSERT INTO Team (team_name, city, wins, losses, ties) VALUES (%s, %s, %s, %s, %s)"

        for _, row in teams_df.iterrows():
            cur.execute(sql, (
                # row['team_abbr'],   # team_id same as team_abbr
                row['team_name'],   # team_name
                row['city'],
                row['wins'],
                row['losses'],
                row['ties']
            ))

            # cur.execute(sql, (
            #     row['team_id'], 
            #     row['team_name'], 
            #     row['city'], 
            #     row['wins'], 
            #     row['losses'], 
            #     row['ties']
            # ))
        
        db_rw.commit()
        print(f"Inserted {cur.rowcount} rows into the Team table.")

    except Exception as e:
        print(f"Error: {e}")
        db_rw.rollback()  

    finally:
        cur.close()
        db_rw.close()


def insert_player_data():
    team_id_mapping = {
        'LA': 1,   # Los Angeles Rams
        'ATL': 2,  # Atlanta Falcons
        'CAR': 3,  # Carolina Panthers
        'CHI': 4,  # Chicago Bears
        'CIN': 5,  # Cincinnati Bengals
        'DET': 6,  # Detroit Lions
        'HOU': 7,  # Houston Texans
        'MIA': 8,  # Miami Dolphins
        'NYJ': 9,  # New York Jets
        'WAS': 10, # Washington Commanders
        'ARI': 11, # Arizona Cardinals
        'LAC': 12, # Los Angeles Chargers
        'MIN': 13, # Minnesota Vikings
        'TEN': 14, # Tennessee Titans
        'DAL': 15, # Dallas Cowboys
        'SEA': 16, # Seattle Seahawks
        'KC': 17,  # Kansas City Chiefs
        'BAL': 18, # Baltimore Ravens
        'CLE': 19, # Cleveland Browns
        'JAX': 20, # Jacksonville Jaguars
        'NO': 21,  # New Orleans Saints
        'NYG': 22, # New York Giants
        'PIT': 23, # Pittsburgh Steelers
        'SF': 24,  # San Francisco 49ers
        'DEN': 25, # Denver Broncos
        'LV': 26,  # Las Vegas Raiders
        'GB': 27,  # Green Bay Packers
        'BUF': 28, # Buffalo Bills
        'PHI': 29, # Philadelphia Eagles
        'IND': 30, # Indianapolis Colts
        'NE': 31,  # New England Patriots
        'TB': 32   # Tampa Bay Buccaneers
    }

    db_rw = connect()

    try:
        players_df = pd.read_csv('player_table.csv')  
        cur = db_rw.cursor()
        
        sql = "INSERT INTO Player (player_id, name, position, age, height, weight, team_id) VALUES (%s, %s, %s, %s, %s, %s, %s)"
        
        for _, row in players_df.iterrows():
            age = row['age'] if not pd.isna(row['age']) else 28  
            cur.execute(sql, (
                row['nflId'],
                row['name'],
                row['position'],
                age,
                row['height'],
                row['weight'],
                team_id_mapping[row['team_name']],
            ))

        db_rw.commit()
        print(f"Inserted {cur.rowcount} rows into the Player table.")

    except Exception as e:
        print(f"Error: {e}")
        db_rw.rollback()  

    finally:
        cur.close()
        db_rw.close()

def createUser(username, email, password):
    """
    Creates a row in table named `users`
    @param username: username of user
    @param email: email of user
    @param password: password of user
    """

    db_rw = connect()
    cur = db_rw.cursor()

    sql = "INSERT INTO `UserInfo` (`email`, `username`, `password`) VALUES (%s, %s, %s)"
  
    cur.execute(sql, (email, username, password))
    db_rw.commit()

def validateUser(username, password):
    # we will use this later to validate users when they log in 
    """ validates if username,password pair provided by user is correct or not
    @param username: username of user
    @param password: password of user
    @return True if validation was successful, False otherwise.
    """

    db_rw = connect()
    cur = db_rw.cursor()

    sql = "SELECT `id`, `username`, `password`, `passwordhash` FROM `users` WHERE `username` = %s AND `password` = %s"

    cur.execute(sql, (username, password))

    if cur.rowcount < 1:
        return False
    return True

def createFantasyTeam(user_id, fantasy_team_name, roster_size):
    """ Creates Fantasy Team
    """
    db_rw = connect()
    cur = db_rw.cursor()

    sql = "INSERT INTO `FantasyTeam` (`user_id`, `fantasy_team_name`, `roster_size`) VALUES (%s, %s, %s)"

    cur.execute(sql, (user_id, fantasy_team_name, roster_size))
    db_rw.commit()

def addPlayerToRoster():
    # ill make jira tickets and assign this to ppl 
    pass

def deletePLayerFromRoster():
    pass


if __name__ == "__main__":
    # insert_team_data()
    # insert_player_data()
    # createUser('varshitha', 'vakella2@illinois.edu', 'password')
    createFantasyTeam(1, "krusty krab", 14)
    createFantasyTeam(2, "fish sticks", 14)









