import { io } from './socketIo/socket.io.esm.min.js'
const socket = io()

const startupDiv = document.getElementById('startupDiv')
const waitDiv = document.getElementById('waitDiv')
const showQuestionDiv = document.getElementById('showQuestionDiv')
const correctAnswerDiv = document.getElementById('correctAnswerDiv')
const correctAnswerInput = document.getElementById('correctAnswerInput')
const answerCountText = document.getElementById('answerCountText')
const summaryText = document.getElementById('summaryText')
const selectQuestionDiv = document.getElementById('selectQuestionDiv')
const selectQuestionDropdown = document.getElementById('selectQuestionDropdown')
const selectSessionDiv = document.getElementById('selectSessionDiv')
const selectSessionDropdown = document.getElementById('selectSessionDropdown')

let sessionId = ''
let state = 'startup'
let maxQuestion = -1
let currentQuestion = -1
let correctAnswer = ''
let sessions = []

function tick () {
  socket.emit('updateServer', {
    state,
    sessionId,
    currentQuestion,
    correctAnswer
  })
}

setInterval(tick, 250)

socket.on('updateClients', msg => {
  if (msg.sessionId === sessionId) {
    window.showDiv(msg)
    window.setupQuestionDropdown(msg)
    window.setupSessionDropdown(msg)
    answerCountText.innerHTML = msg.numStudentsAnswered + '/' + msg.numStudentsConnected
    summaryText.innerHTML = msg.summary
    sessions = msg.sessions
  }
})

socket.on('sessionData', msg => {
  console.log(msg)
  sessionId = msg.sessionId
  state = 'wait'
})

window.newSession = () => {
  sessionId = window.getDateString()
  state = 'wait'
}

window.selectSession = () => {
  state = 'selectSession'
}
window.cancelLoadSession = () => {
  state = 'startup'
}

window.loadSession = () => {
  if (selectSessionDropdown.firstChild) {
    socket.emit('loadSession', { sessionId: selectSessionDropdown.value })
  }
}

window.newQuestion = () => {
  currentQuestion = maxQuestion + 1
  correctAnswerInput.value = ''
  correctAnswer = ''
  state = 'showQuestion'
}

window.hideQuestion = () => {
  state = 'correctAnswer'
}

window.showQuestion = () => {
  state = 'showQuestion'
}

window.submitCorrectAnswer = () => {
  correctAnswer = correctAnswerInput.value
  state = 'wait'
}

window.selectQuestion = () => {
  correctAnswerInput.value = ''
  correctAnswer = ''
  state = 'selectQuestion'
}

window.loadQuestion = () => {
  if (selectQuestionDropdown.firstChild) {
    currentQuestion = selectQuestionDropdown.value
    state = 'showQuestion'
  }
}

window.answerQuestion = () => {
  if (selectQuestionDropdown.firstChild) {
    currentQuestion = selectQuestionDropdown.value
    state = 'correctAnswer'
  }
}

window.cancelLoadQuestion = () => {
  state = 'wait'
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
  stateMap[msg.state] = 'block'
  startupDiv.style.display = stateMap.startup
  waitDiv.style.display = stateMap.wait
  showQuestionDiv.style.display = stateMap.showQuestion
  correctAnswerDiv.style.display = stateMap.correctAnswer
  selectQuestionDiv.style.display = stateMap.selectQuestion
  selectSessionDiv.style.display = stateMap.selectSession
}

window.setupQuestionDropdown = (msg) => {
  if (maxQuestion !== msg.maxQuestion && msg.maxQuestion >= 0) {
    maxQuestion = msg.maxQuestion
    while (selectQuestionDropdown.firstChild) {
      selectQuestionDropdown.removeChild(selectQuestionDropdown.firstChild)
    }
    for (let i = maxQuestion; i >= 0; i--) {
      const option = document.createElement('option')
      option.value = i
      option.text = i
      selectQuestionDropdown.appendChild(option)
    }
  }
}

window.setupSessionDropdown = (msg) => {
  if (sessions.length !== msg.sessions.length && sessions.length >= 0) {
    sessions = msg.sessions
    while (selectSessionDropdown.firstChild) {
      selectSessionDropdown.removeChild(selectSessionDropdown.firstChild)
    }
    sessions.forEach((session) => {
      const option = document.createElement('option')
      option.value = session
      option.text = session
      selectSessionDropdown.appendChild(option)
    })
  }
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
