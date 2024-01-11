const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'cricketMatchDetails.db')

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.error('DB Error: ${error.message}')
    process.exit(1)
  }
}
const convertPlayerDbToResponse = dbObject => ({
  playerId: dbObject.player_id,
  playerName: dbObject.player_name,
})

const convertMatchDbToResponse = dbObject => ({
  matchId: dbObject.match_id,
  match: dbObject.match,
  year: dbObject.year,
})

const convertPlayerMatchScoreDbToResponse = dbObject => ({
  playerMatchId: dbObject.player_match_id,
  playerId: dbObject.player_id,
  matchId: dbObject.match_id,
  score: dbObject.score,
  fours: dbObject.fours,
  sixes: dbObject.sixes,
})

app.get('/players/', async (req, res) => {
  const query =
    'SELECT player_id AS playerId, player_name AS playerName FROM player_details'
  const players = await db.all(query)
  res.send(players)
})

app.get('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const query = `SELECT player_id AS playerId, player_name AS playerName FROM player_details WHERE player_id = ${playerId}`
  const player = await db.get(query)
  res.send(player)
})

app.put('/players/:playerId/', async (req, res) => {
  const {playerId} = req.params
  const {playerName} = req.body
  const query = `UPDATE player_details SET player_name = '${playerName}' WHERE player_id = ${playerId}`
  await db.run(query)
  res.send('Player Details Updated')
})

app.get('/matches/:matchId/', async (req, res) => {
  const {matchId} = req.params
  const query = `SELECT match_id AS matchId, match, year FROM match_details WHERE match_id = ${matchId}`
  const match = await db.get(query)
  res.send(match)
})

app.get('/players/:playerId/matches/', async (req, res) => {
  const {playerId} = req.params
  const query = `
    SELECT match_details.match_id AS matchId, match_details.match, match_details.year 
    FROM player_match_score 
    JOIN match_details ON player_match_score.match_id = match_details.match_id 
    WHERE player_match_score.player_id = ${playerId}`
  const matches = await db.all(query)
  res.send(matches)
})

app.get('/matches/:matchId/players/', async (req, res) => {
  const {matchId} = req.params
  const query = `
    SELECT player_details.player_id AS playerId, player_details.player_name AS playerName 
    FROM player_match_score 
    JOIN player_details ON player_match_score.player_id = player_details.player_id 
    WHERE player_match_score.match_id = ${matchId}`
  const players = await db.all(query)
  res.send(players)
})

app.get('/players/:playerId/playerScores/', async (req, res) => {
  const {playerId} = req.params
  const query = `
    SELECT 
      player_details.player_id AS playerId, 
      player_details.player_name AS playerName, 
      SUM(player_match_score.score) AS totalScore, 
      SUM(player_match_score.fours) AS totalFours, 
      SUM(player_match_score.sixes) AS totalSixes 
    FROM player_match_score 
    JOIN player_details ON player_match_score.player_id = player_details.player_id 
    WHERE player_details.player_id = ${playerId}
    GROUP BY player_details.player_id, player_details.player_name`

  const playerScores = await db.get(query)
  res.send({
    playerId: playerScores.playerId,
    playerName: playerScores.playerName,
    totalScore: playerScores.totalScore,
    totalFours: playerScores.totalFours,
    totalSixes: playerScores.totalSixes,
  })
})

initializeDBAndServer()
module.exports = app
