import { io } from 'socket.io-client'

const loginForm = document.getElementById('loginForm') as HTMLFormElement
const answerInput = document.getElementById('answerInput') as HTMLInputElement
const waitDiv = document.getElementById('waitDiv') as HTMLDivElement
const questionDiv = document.getElementById('questionDiv') as HTMLDivElement
const answerDiv = document.getElementById('answerDiv') as HTMLDivElement
const changeDiv = document.getElementById('changeDiv') as HTMLDivElement
const infoDiv = document.getElementById('infoDiv') as HTMLDivElement
const nameDiv = document.getElementById('nameDiv') as HTMLDivElement
const socket = io()

let loginComplete = false
let answerComplete = false
let currentQuestion = 1
let submittedAnswer = ''
let eID = ''
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
    showDiv(msg)
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

const onkeydown = (event: any) => {
  if (event.key === 'Enter' && questionDiv.style.display === 'block') {
    submitAnswer()
  }
}

const login = () => {
  console.log('login')
  eID = loginForm.eIdInput.value.toLowerCase().split(' ').join('')
  socket.emit('login', { eID })
  return false
}

const submitAnswer = () => {
  console.log('submitAnswer')
  socket.emit('submitAnswer', { answer: answerInput.value, eID })
}

const changeAnswer = () => {
  answerComplete = false
}

const showDiv = (msg: any) => {
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
