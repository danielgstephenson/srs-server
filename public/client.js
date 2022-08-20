import { io } from './socketIo/socket.io.esm.min.js'

const loginForm = document.getElementById('loginForm')
const waitDiv = document.getElementById('waitDiv')
const questionDiv = document.getElementById('questionDiv')
const answerDiv = document.getElementById('answerDiv')
const answerInput = document.getElementById('answerInput')
const changeDiv = document.getElementById('changeDiv')
const socket = io()

let loginComplete = false
let answerComplete = false
let eID
let state = 'login'

socket.on('updateClients', (msg) => {
  if (loginComplete) {
    if (state !== msg.state) {
      state = msg.state
      console.log(msg.state)
    }
    window.showDiv(msg)
    if (state === 'wait') {
      answerInput.value = ''
      answerComplete = false
    }
  }
})

socket.on('loginComplete', (msg) => {
  console.log('loginComplete')
  loginComplete = true
})

socket.on('answerReceived', (msg) => {
  console.log('answerReceived')
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
    document.title = 'Q' + msg.currentQuestion
  } else document.title = 'SRS'
  if (msg.state === 'showQuestion') {
    waitDiv.style.display = 'none'
    questionDiv.style.display = 'block'
    if (answerComplete) {
      answerDiv.style.display = 'none'
      changeDiv.style.display = 'block'
    } else {
      answerDiv.style.display = 'block'
      changeDiv.style.display = 'none'
    }
  } else {
    waitDiv.style.display = 'block'
    questionDiv.style.display = 'none'
  }
}

document.body.onmousedown = function (event) {
  console.log('onmousedown')
}
