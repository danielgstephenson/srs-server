import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const startupDiv = document.getElementById('startupDiv')
const waitDiv = document.getElementById('waitDiv')
const showQuestionDiv = document.getElementById('showQuestionDiv')
const correctAnswerDiv = document.getElementById('correctAnswerDiv')
const correctAnswerInput = document.getElementById('correctAnswerInput')
const answerCountText = document.getElementById('answerCountText')
const summaryText = document.getElementById('summaryText')

let sessionId = ''
let correctAnswer = ''

socket.on('updateClients', msg => {
  if (msg.state !== 'startup') sessionId = msg.sessionId
  window.showDiv(msg)
  answerCountText.innerHTML = msg.numStudentsAnswered + '/' + msg.numStudentsConnected
  summaryText.innerHTML = msg.summary
})

window.newSession = () => {
  sessionId = window.getDateString()
  socket.emit('newSession', { sessionId })
}

window.newQuestion = () => {
  correctAnswerInput.value = ''
  correctAnswer = ''
  socket.emit('newQuestion', { sessionId })
}

window.hideQuestion = () => {
  socket.emit('hideQuestion', { sessionId })
}

window.showQuestion = () => {
  socket.emit('showQuestion', { sessionId })
}

window.submitCorrectAnswer = () => {
  correctAnswer = correctAnswerInput.value
  socket.emit('submitCorrectAnswer', { sessionId, correctAnswer })
}

window.showDiv = (msg) => {
  if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
    document.title = 'Q' + msg.currentQuestion
  } else document.title = 'SRS'
  const stateMap = {
    startup: 'none',
    wait: 'none',
    showQuestion: 'none',
    correctAnswer: 'none',
    selectQuestion: 'none',
    selectSession: 'none'
  }
  console.log('msg.state', msg.state)
  stateMap[msg.state] = 'block'
  startupDiv.style.display = stateMap.startup
  waitDiv.style.display = stateMap.wait
  showQuestionDiv.style.display = stateMap.showQuestion
  correctAnswerDiv.style.display = stateMap.correctAnswer
}

window.getDateString = function () {
  const makeTwoDigits = function (x) {
    const y = Math.round(x)
    if (y > 9) return String(y)
    else return String('0' + y)
  }
  const d = new Date()
  let myDateString = ''
  myDateString += d.getFullYear()
  myDateString += makeTwoDigits((d.getMonth() + 1))
  myDateString += makeTwoDigits(d.getDate())
  myDateString += makeTwoDigits(d.getHours())
  myDateString += makeTwoDigits(d.getMinutes())
  myDateString += makeTwoDigits(d.getSeconds())
  return myDateString
}
