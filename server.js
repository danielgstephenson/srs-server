import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import csvtojson from 'csvtojson'
import path from 'path'
import { Server } from 'socket.io'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const config = fs.readJSONSync('config.json')
console.log(config)

const app = express()
const staticPath = path.join(__dirname, 'public')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)
const clientHtmlPath = path.join(__dirname, 'public', 'client.html')
app.get('/', function (req, res) {
  res.sendFile(clientHtmlPath)
})
const managerHtmlPath = path.join(__dirname, 'public', 'manager.html')
app.get('/manager', function (req, res) { res.sendFile(managerHtmlPath) })
const socketIoPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')
app.get('/socketIo/:fileName', function (req, res) {
  const filePath = path.join(socketIoPath, req.params.fileName)
  res.sendFile(filePath)
})

function makeServer () {
  if (config.secure) {
    const httpApp = express()
    const httpServer = new http.Server(httpApp)
    httpApp.get('/', function (req, res) {
      return res.redirect('https://' + req.headers.host + req.url)
    })
    httpServer.listen(80)
    const key = fs.readFileSync('./srs-key.pem')
    const cert = fs.readFileSync('./srs-cert.pem')
    const credentials = { key, cert }
    return new https.Server(credentials, app)
  } else {
    return new http.Server(app)
  }
}

const server = makeServer()
const io = new Server(server)
io.path(staticPath)
server.listen(config.port, () => {
  console.log(`Listening on :${config.port}`)
  setInterval(tick, 100)
})

let sessionId = ''
let state = 'startup'
let currentQuestion = -1
let maxQuestion = -1
let sessions = []
let firstNames = {}
let lastNames = {}
const students = {}
const answers = []
const answered = {}
const correctAnswers = []

function average (array) {
  if (array.length === 0) return 0
  return array.reduce((a, b) => a + b) / array.length
}

io.on('connection', function (socket) {
  console.log(socket.id, 'connected')
  socket.on('newSession', msg => {
    sessionId = msg.sessionId
    state = 'wait'
  })
  socket.on('newQuestion', msg => {
    sessionId = msg.sessionId
    currentQuestion += 1
    Object.keys(answered).forEach(eID => {
      answered[eID] = false
    })
    state = 'showQuestion'
    console.log(`Question ${currentQuestion + 1}`)
  })
  socket.on('hideQuestion', msg => {
    sessionId = msg.sessionId
    state = 'correctAnswer'
  })
  socket.on('showQuestion', msg => {
    sessionId = msg.sessionId
    state = 'showQuestion'
  })
  socket.on('submitCorrectAnswer', msg => {
    sessionId = msg.sessionId
    if (isFinite(parseFloat(msg.correctAnswer))) {
      correctAnswers[currentQuestion] = String(parseFloat(msg.correctAnswer))
    } else {
      correctAnswers[currentQuestion] = msg.correctAnswer.toLowerCase()
    }
    state = 'wait'
    console.log(`correctAnswer: ${correctAnswers[currentQuestion]}`)
    maxQuestion = Math.max(maxQuestion, currentQuestion)
    writeDataFile()
  })
  socket.on('login', msg => {
    const eID = msg.eID
    const firstName = firstNames[eID]
    const lastName = lastNames[eID]
    students[eID] = { firstName, lastName, answers: [] }
    console.log('login: ' + firstName + ' ' + lastName + ' ' + eID)
    const reply = { firstName, lastName }
    socket.emit('loginComplete', reply)
  })
  socket.on('submitAnswer', msg => {
    const eID = msg.eID
    const firstName = firstNames[eID]
    const lastName = lastNames[eID]
    students[eID] = { firstName, lastName, eID }
    answered[eID] = true
    const answeredNames = Object.keys(answered)
      .filter(eId => answered[eId])
      .map(eId => `${firstNames[eId]} ${lastNames[eId]} ${eId}`)
      .sort()
    const waitingNames = Object.keys(answered)
      .filter(eId => !answered[eId])
      .map(eId => `${firstNames[eId]} ${lastNames[eId]} ${eId}`)
      .sort()
    console.log('answered', answeredNames)
    console.log('waiting', waitingNames)
    if (answers[currentQuestion] === undefined) {
      answers[currentQuestion] = {}
    }
    if (isFinite(parseFloat(msg.answer))) {
      answers[currentQuestion][eID] = String(parseFloat(msg.answer))
    } else {
      answers[currentQuestion][eID] = msg.answer.toLowerCase()
    }
    const reply = {
      answer: msg.answer,
      currentQuestion
    }
    socket.emit('answerReceived', reply)
    console.log('submitAnswer ' + eID + ' ' + firstNames[eID] + ' ' + lastNames[eID] + ' : ' + msg.answer)
  })
})

async function tick () {
  const numStudentsAnswered = Object.values(answered).filter(x => x).length
  sessions = fs.readdirSync(__dirname + '/public/sessions').reverse().filter(s => s !== '.gitkeep')
  io.emit('updateClients', {
    numStudentsAnswered,
    summary: getSummaryTable(),
    sessionId,
    currentQuestion,
    maxQuestion,
    state,
    sessions
  })
}

function writeDataFile () {
  console.log('writeDataFile')
  const filePath = './public/sessions/' + sessionId + '/answers.csv'
  let csvString = 'eID,firstName,lastName,excused'
  for (const i of Array(maxQuestion + 1).keys()) { csvString += `,${i + 1}` }
  csvString += '\n'
  Object.keys(students).forEach(eID => {
    const student = students[eID]
    csvString += eID + ','
    csvString += student.firstName + ','
    csvString += student.lastName + ','
    csvString += 0
    answers.forEach(answer => {
      csvString += ','
      if (answer[eID]) csvString += answer[eID]
    })
    csvString += '\n'
  })
  csvString += 'key,,,'
  correctAnswers.forEach(answer => {
    csvString += ',' + answer
  })
  csvString += '\n'
  fs.outputFile(filePath, csvString).then(writeGradeFile)
}

async function writeGradeFile () {
  loadRoster()
  console.log('writeGradeFile')
  const sessionsPath = path.join(__dirname, 'public', 'sessions')
  sessions = fs.readdirSync(sessionsPath).filter(x => x !== '.gitkeep').reverse()
  const scores = {}
  sessions.forEach(async session => {
    const filePath = './public/sessions/' + session + '/answers.csv'
    const sessionData = await csvtojson().fromFile(filePath)
    const answerKey = sessionData.pop()
    const numQuestions = Object.keys(answerKey).length - 4
    const questionIds = [...Array(numQuestions).keys()].reverse()
    if (sessionData) {
      for (const i of questionIds) {
        const questionName = `${i + 1}-${session}`
        const correctAnswer = answerKey[i]
        scores[questionName] = {}
        sessionData.forEach(student => {
          const eID = student.eID
          const studentAnswer = student[i]
          if (student.excused === '1' || correctAnswer === '') {
            scores[questionName][eID] = 100
          } else if (studentAnswer === '') {
            scores[questionName][eID] = 0
          } else if (isFinite(parseFloat(correctAnswer))) {
            const correctAnswerNum = parseFloat(correctAnswer)
            const studentAnswerNum = parseFloat(studentAnswer)
            if (Math.abs(correctAnswerNum - studentAnswerNum) < 0.01) {
              scores[questionName][eID] = 100
            } else {
              scores[questionName][eID] = 75
            }
          } else if (correctAnswer === studentAnswer) {
            scores[questionName][eID] = 100
          } else {
            scores[questionName][eID] = 75
          }
        })
      }
    }
  })
  const roster = await csvtojson().fromFile('./grades/roster.csv')
  let gradeString = 'firstName,lastName,eID,vNumber,attendance,average'
  for (const question in scores) { gradeString += ',' + question }
  gradeString += '\n'
  roster.forEach(student => {
    const myScores = []
    const mySessions = new Set()
    for (const question in scores) {
      if (scores[question][student.eID]) {
        myScores.push(scores[question][student.eID])
        const sessionName = question.slice(question.length - 14, question.length)
        mySessions.add(sessionName)
      } else {
        myScores.push(0)
      }
    }
    const myAttendance = mySessions.size
    const myAverage = Math.ceil(average(myScores))
    gradeString += `${student.firstName},${student.lastName},${student.eID},${student.vNumber},${myAttendance},${myAverage}`
    myScores.forEach(score => { gradeString += ',' + score })
    gradeString += '\n'
  })
  fs.outputFile('./grades/grades.csv', gradeString)
}

function getSummaryTable () {
  let currentAnswers = []
  if (answers[currentQuestion]) {
    currentAnswers = Object.values(answers[currentQuestion])
  }
  const counts = {}
  currentAnswers.forEach((answer) => {
    counts[answer] = 1 + (counts[answer] || 0)
  })
  const unique = Object.keys(counts)
  unique.sort((a, b) => { return counts[b] - counts[a] })
  let summaryString = '<table>'
  summaryString += '<tr>'
  summaryString += '<td align="right">Answer: </td>'
  unique.forEach((a) => { summaryString += '<td align="center">' + a + '</td>' })
  summaryString += '</tr>'
  summaryString += '<tr>'
  summaryString += '<td align="right">Count: </td>'
  unique.forEach((a) => { summaryString += '<td align="center">' + counts[a] + '</td>' })
  summaryString += '</tr>'
  summaryString += '</table>'
  return (summaryString)
}

async function loadRoster () {
  console.log('loadRoster')
  const roster = await csvtojson().fromFile('./grades/roster.csv')
  firstNames = []
  lastNames = []
  roster.forEach(entry => {
    const eID = entry.eID
    firstNames[eID] = entry.firstName
    lastNames[eID] = entry.lastName
  })
}

writeGradeFile()
