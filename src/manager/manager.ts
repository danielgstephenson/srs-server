import { io } from 'socket.io-client'
const socket = io()

const startupDiv = document.getElementById('startupDiv') as HTMLDivElement
const waitDiv = document.getElementById('waitDiv') as HTMLDivElement
const showQuestionDiv = document.getElementById('showQuestionDiv') as HTMLDivElement
const correctAnswerDiv = document.getElementById('correctAnswerDiv') as HTMLDivElement
const correctAnswerInput = document.getElementById('correctAnswerInput') as HTMLInputElement
const answerCountText = document.getElementById('answerCountText') as HTMLSpanElement
const summaryText = document.getElementById('summaryText') as HTMLSpanElement

let sessionId = ''
let correctAnswer = ''

socket.on('updateClients', msg => {
  if (msg.state !== 'startup') sessionId = msg.sessionId
  showDiv(msg)
  answerCountText.innerHTML = msg.numStudentsAnswered + ' '
  summaryText.innerHTML = msg.summary
})

const newSession = () => {
  sessionId = getDateString()
  socket.emit('newSession', { sessionId })
}

const newQuestion = () => {
  correctAnswerInput.value = ''
  correctAnswer = ''
  socket.emit('newQuestion', { sessionId })
}

const hideQuestion = () => {
  socket.emit('hideQuestion', { sessionId })
}

const showQuestion = () => {
  socket.emit('showQuestion', { sessionId })
}

const submitCorrectAnswer = () => {
  correctAnswer = correctAnswerInput.value
  socket.emit('submitCorrectAnswer', { sessionId, correctAnswer })
}

const showDiv = (msg: any) => {
  if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
    document.title = `Q${msg.currentQuestion + 1}`
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
  if(msg.state === 'startup') stateMap.startup = 'block'
  if(msg.state === 'wait') stateMap.wait = 'block'
  if(msg.state === 'showQuestion') stateMap.showQuestion = 'block'
  if(msg.state === 'correctAnswer') stateMap.correctAnswer = 'block'
  if(msg.state === 'selectQuestion') stateMap.selectQuestion = 'block'
  if(msg.state === 'selectSession') stateMap.selectSession = 'block'
  startupDiv.style.display = stateMap.startup
  waitDiv.style.display = stateMap.wait
  showQuestionDiv.style.display = stateMap.showQuestion
  correctAnswerDiv.style.display = stateMap.correctAnswer
}

const getDateString = function () {
  const makeTwoDigits = function (x: number) {
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
