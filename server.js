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
app.get('/', function (req, res) { res.sendFile(clientHtmlPath) })
const managerHtmlPath = path.join(__dirname, 'public', 'manager.html')
app.get('/manager', function (req, res) { res.sendFile(managerHtmlPath) })
const socketIoPath = path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')
app.get('/socketIo/:fileName', function (req, res) {
  const filePath = path.join(socketIoPath, req.params.fileName)
  res.sendFile(filePath)
})

function makeServer () {
  if (config.secure) {
    const key = fs.readFileSync('./sis-key.pem')
    const cert = fs.readFileSync('./sis-cert.pem')
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
let students = {}
let answers = []
let answered = {}
let correctAnswers = []
let sessions = []
const firstNames = {}
const lastNames = {}

function average (array) {
  if (array.length === 0) return 0
  return array.reduce((a, b) => a + b) / array.length
}

io.on('connection', function (socket) {
  console.log(socket.id, 'connected')
  socket.on('updateServer', (msg) => {
    if (msg.state !== state) {
      // console.log(msg.state)
      // console.log(msg)
      if (msg.state === 'wait' && sessionId !== '') {
        answered = {}
        if (isFinite(parseFloat(msg.correctAnswer))) {
          correctAnswers[currentQuestion] = String(parseFloat(msg.correctAnswer))
        } else {
          correctAnswers[currentQuestion] = msg.correctAnswer.toLowerCase()
        }
        console.log('correctAnswer ' + correctAnswers[currentQuestion])
        writeDataFile()
      }
    }
    state = msg.state
    sessionId = msg.sessionId
    currentQuestion = msg.currentQuestion
    maxQuestion = Math.max(maxQuestion, currentQuestion)
  })

  socket.on('login', msg => {
    const studentId = msg.studentId
    const firstName = firstNames[studentId]
    const lastName = lastNames[studentId]
    students[studentId] = { firstName, lastName, excused: 0, answers: [] }
    console.log('login: ' + firstName + ' ' + lastName + ' ' + studentId)
    socket.emit('loginComplete')
  })

  socket.on('submitAnswer', msg => {
    const studentId = msg.studentId
    const firstName = firstNames[studentId]
    const lastName = lastNames[studentId]
    students[studentId] = { firstName, lastName, studentId, excused: 0 }
    answered[socket.id] = true
    if (answers[currentQuestion] === undefined) {
      answers[currentQuestion] = {}
    }
    if (isFinite(parseFloat(msg.answer))) {
      answers[currentQuestion][studentId] = String(parseFloat(msg.answer))
    } else {
      answers[currentQuestion][studentId] = msg.answer.toLowerCase()
    }
    socket.emit('answerReceived')
    console.log('submitAnswer ' + studentId + ' ' + firstNames[studentId] + ' ' + lastNames[studentId] + ' : ' + msg.answer)
  })

  socket.on('loadSession', async msg => {
    const filePath = './public/sessions/' + msg.sessionId + '/answers.csv'
    const sessionRows = await csvtojson().fromFile(filePath)
    console.log(sessionRows)
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) throw err
      socket.emit('sessionData', { sessionId: msg.sessionId, csvString: data })
      const rows = data.split('\n').map(row => row.split(','))
      students = {}
      answers = []
      correctAnswers = []
      maxQuestion = rows[0].length - 5
      currentQuestion = maxQuestion
      rows.forEach((row, rowIndex) => {
        if (rowIndex === 0) {
          row.forEach((questionId, columnIndex) => {
            if (columnIndex > 3) answers[columnIndex - 4] = {}
          })
        }
        if (rowIndex > 0 && rowIndex < rows.length - 1) {
          const studentId = row[0]
          students[studentId] = { firstName: row[1], lastName: row[2], excused: row[3] }
          row.forEach((answer, columnIndex) => {
            if (columnIndex > 3) answers[columnIndex - 4][studentId] = answer
          })
        }
        if (rowIndex === rows.length - 1) {
          row.forEach((answer, columnIndex) => {
            if (columnIndex > 3) correctAnswers[columnIndex - 4] = answer
          })
        }
      })
      console.log('students')
      console.log(students)
      console.log('answers')
      console.log(answers)
      console.log('correctAnswers')
      console.log(correctAnswers)
    })
  })
})

async function tick () {
  const numStudentsConnected = (await io.allSockets()).size - 1
  const numStudentsAnswered = Object.keys(answered).length
  sessions = fs.readdirSync(__dirname + '/public/sessions').reverse()
  io.emit('updateClients', {
    numStudentsConnected,
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
  for (const i of Array(maxQuestion).keys()) { csvString += ',' + i }
  csvString += '\n'
  Object.keys(students).forEach(studentId => {
    const student = students[studentId]
    csvString += studentId + ','
    csvString += student.firstName + ','
    csvString += student.lastName + ','
    csvString += student.excused
    answers.forEach(answer => {
      csvString += ','
      if (answer[studentId]) csvString += answer[studentId]
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
  console.log('sessions =', sessions)
  const scores = {}
  sessions.forEach(async session => {
    const filePath = './public/sessions/' + session + '/answers.csv'
    const sessionData = await csvtojson().fromFile(filePath)
    const answerKey = sessionData.pop()
    const numQuestions = Object.keys(answerKey).length - 4
    console.log('sessionData', sessionData)
    console.log('answerKey', answerKey)
    console.log('numQuestions', numQuestions)
    if (sessionData) {
      for (const i of Array(numQuestions.length).keys()) {
        const questionName = `${i}-${session}`
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
  console.log('roster', roster)
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
        console.log('sessionName', sessionName)
        mySessions.add(sessionName)
      } else {
        myScores.push(0)
      }
    }
    console.log('mySessions', mySessions)
    const myAttendance = mySessions.size
    const myAverage = average(myScores)
    gradeString += `${student.firstName},${student.lastName},${student.eID},${student.vNumber},${myAttendance},${myAverage}`
    myScores.forEach(score => { gradeString += ',' + score })
    gradeString += '\n'
  })
  console.log(gradeString)
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
  roster.forEach(entry => {
    const eID = entry.eID
    firstNames[eID] = entry.firstName
    lastNames[eID] = entry.lastName
  })
}

writeGradeFile()
