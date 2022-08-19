import express from 'express'
import http from 'http'
import https from 'https'
import fs from 'fs-extra'
import { Server } from 'socket.io'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const config = fs.readJSONSync('config.json')
console.log(config)

const app = express()
const staticPath = path.join(__dirname, 'public')
const staticMiddleware = express.static(staticPath)
app.use(staticMiddleware)
const clientPath = path.join(__dirname, 'public', 'client.html')
app.get('/', function (req, res) { res.sendFile(clientPath) })

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
    students[studentId] = { firstName, lastName, excused: 0 }
    console.log('login: ' + firstName + ' ' + lastName + ' ' + studentId)
    socket.emit('loginComplete')
  })

  socket.on('submitAnswer', msg => {
    const studentId = msg.studentId
    const firstName = firstNames[studentId]
    const lastName = lastNames[studentId]
    students[studentId] = { firstName, lastName, excused: 0 }
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

  socket.on('loadSession', msg => {
    const filePath = './public/sessions/' + msg.sessionId + '/answers.csv'
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
    summary: getSummary(),
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
  let csvString = 'studentId,firstName,lastName,excused'
  for (let i = 0; i <= maxQuestion; i++) {
    csvString += ',' + i
  }
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

function writeGradeFile () {
  setupRoster()
  console.log('writeGradeFile')
  const sessionsPath = path.join(__dirname, 'public', 'sessions')
  sessions = fs.readdirSync(sessionsPath).filter(x => x !== '.gitkeep').reverse()
  console.log('sessions =', sessions)
  const scores = {}
  sessions.forEach((session) => {
    const filePath = './public/sessions/' + session + '/answers.csv'
    let csvString = fs.readFileSync(filePath, 'utf8')
    if (csvString) {
      csvString = csvString.replace(/\r\n/g, '\n')
      const sessionData = csvString.split('\n').map(row => row.split(','))
      for (let column = sessionData[0].length - 1; column > 3; column--) {
        const questionName = sessionData[0][column] + '-' + session
        const correctAnswer = sessionData[sessionData.length - 2][column]
        scores[questionName] = {}
        for (let row = 1; row < sessionData.length - 2; row++) {
          const studentId = sessionData[row][0]
          const excused = sessionData[row][3]
          const studentAnswer = sessionData[row][column]
          if (excused === '1' || correctAnswer === '') {
            scores[questionName][studentId] = 100
          } else if (studentAnswer === '') {
            scores[questionName][studentId] = 0
          } else if (isFinite(parseFloat(correctAnswer))) {
            const correctAnswerNum = parseFloat(correctAnswer)
            const studentAnswerNum = parseFloat(studentAnswer)
            if (Math.abs(correctAnswerNum - studentAnswerNum) < 0.01) {
              scores[questionName][studentId] = 100
            } else {
              scores[questionName][studentId] = 75
            }
          } else if (correctAnswer === studentAnswer) {
            scores[questionName][studentId] = 100
          } else {
            scores[questionName][studentId] = 75
          }
        }
      }
    }
  })
  fs.readFile('./grades/roster.csv', 'utf8', (err, data) => {
    if (err) throw err
    const csvString = data.replace(/\r\n/g, '\n')
    const gradeData = csvString.split('\n').map(row => row.split(','))
    const attendanceColumn = 4
    const averageColumn = 5
    gradeData[0][attendanceColumn] = 'attendance'
    gradeData[0][averageColumn] = 'average'
    for (const questionName in scores) {
      gradeData[0].push(questionName)
    }
    for (let row = 1; row < gradeData.length; row++) {
      if (gradeData[row].length > 1) {
        const studentId = gradeData[row][2].replace(/"/g, '')
        const myScores = []
        const myAttendance = new Set()
        gradeData[row][attendanceColumn] = 0
        gradeData[row][averageColumn] = 0
        for (const questionName in scores) {
          const date = questionName.substr(questionName.length - 14, 8)
          let score = 0
          if (scores[questionName][studentId]) {
            score = scores[questionName][studentId]
            myAttendance.add(date)
          }
          gradeData[row].push(score)
          myScores.push(score)
        }
        gradeData[row][averageColumn] = Math.round(average(myScores))
        gradeData[row][attendanceColumn] = myAttendance.size
      }
    }
    const gradeString = gradeData.map(row => row.join(',')).join('\n')
    fs.outputFile('./grades/grades.csv', gradeString)
  })
}

function getSummary () {
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

function setupRoster () {
  console.log('setupRoster')
  fs.readFile('./grades/roster.csv', 'utf8', (err, data) => {
    if (err) throw err
    const csvString = data.replace(/\r\n/g, '\n')
    const table = csvString.split('\n').map(row => row.split(','))
    for (const i of Array(table.length).keys()) {
      if (i > 0 && table[i][1]) {
        const eId = table[i][2].replace(/"/g, '')
        firstNames[eId] = table[i][1].replace(/"/g, '')
        lastNames[eId] = table[i][0].replace(/"/g, '')
      }
    }
  })
}

writeGradeFile()
