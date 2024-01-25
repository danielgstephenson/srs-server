import { io } from './socketIo/socket.io.esm.min.js'

const loginForm = document.getElementById('loginForm')
const waitDiv = document.getElementById('waitDiv')
const questionDiv = document.getElementById('questionDiv')
const answerDiv = document.getElementById('answerDiv')
const answerInput = document.getElementById('answerInput')
const changeDiv = document.getElementById('changeDiv')
const infoDiv = document.getElementById('infoDiv')
const nameDiv = document.getElementById('nameDiv')
const socket = io()

let loginComplete = false
let answerComplete = false
let currentQuestion = 1
let submittedAnswer = ''
let eID
let state = 'login'
let firstName = 'SRS'
let lastName = 'SRS'

socket.on('updateClients', (msg) => {
  if (loginComplete) {
    if (state !== msg.state) {
      state = msg.state
      console.log(msg.state)
    }
    currentQuestion = msg.currentQuestion
    if (state === 'wait') {
      answerInput.value = ''
      answerComplete = false
    }
    window.showDiv(msg)
  }
})

socket.on('loginComplete', (msg) => {
  console.log('loginComplete')
  firstName = msg.firstName ? msg.firstName : 'Unknown'
  lastName = msg.lastName ? msg.lastName : 'eID'
  nameDiv.innerHTML = `${firstName} ${lastName} <br>`
  loginComplete = true
})

socket.on('answerReceived', (msg) => {
  console.log('answerReceived')
  submittedAnswer = msg.answer
  currentQuestion = msg.currentQuestion
  answerComplete = true
})

window.login = () => {
  console.log('login')
  eID = loginForm.eIdInput.value.toLowerCase().split(' ').join('')
  socket.emit('login', { eID })
  return false
}

window.submitAnswer = () => {
  console.log('submitAnswer')
  socket.emit('submitAnswer', { answer: answerInput.value, eID })
}

window.changeAnswer = () => {
  answerComplete = false
}

window.showDiv = (msg) => {
  loginForm.style.display = 'none'
  if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
    document.title = `Q${msg.currentQuestion + 1}`
  } else document.title = 'SRS'
  infoDiv.innerHTML = `Question ${currentQuestion + 1} <br>`
  if (msg.state === 'showQuestion') {
    waitDiv.style.display = 'none'
    questionDiv.style.display = 'block'
    infoDiv.style.display = 'block'
    if (answerComplete) {
      infoDiv.innerHTML += `Your Answer: ${submittedAnswer} <br>`
      answerDiv.style.display = 'none'
      changeDiv.style.display = 'block'
    } else {
      answerDiv.style.display = 'block'
      changeDiv.style.display = 'none'
    }
  } else {
    waitDiv.style.display = 'block'
    questionDiv.style.display = 'none'
    infoDiv.style.display = 'none'
  }
}

document.body.onmousedown = function (event) {
  console.log('onmousedown')
}
