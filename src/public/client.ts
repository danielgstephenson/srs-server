import { io } from 'socket.io-client'
import { ServerUpdateClient } from '../messages'

export class Client {
  loginForm = document.getElementById('loginForm') as HTMLFormElement
  answerInput = document.getElementById('answerInput') as HTMLInputElement
  waitDiv = document.getElementById('waitDiv') as HTMLDivElement
  questionDiv = document.getElementById('questionDiv') as HTMLDivElement
  answerDiv = document.getElementById('answerDiv') as HTMLDivElement
  changeDiv = document.getElementById('changeDiv') as HTMLDivElement
  infoDiv = document.getElementById('infoDiv') as HTMLDivElement
  nameDiv = document.getElementById('nameDiv') as HTMLDivElement
  submitButton = document.getElementById('submitButton') as HTMLButtonElement
  changeButton = document.getElementById('changeButton') as HTMLButtonElement
  socket = io()

  loginComplete = false
  answerComplete = false
  currentQuestion = 1
  submittedAnswer = ''
  id = ''
  state = 'login'
  firstName = 'SRS'
  lastName = 'SRS'

  constructor () {
    this.setupIo()
    window.addEventListener('keydown', event => this.onKeyDown(event))
    this.loginForm.submit = () => this.login()
    this.submitButton.onclick = () => this.submitAnswer()
    this.changeButton.onclick = () => this.changeAnswer()
  }

  setupIo (): void {
    this.socket.on('updateClients', (msg: any) => {
      if (this.loginComplete) {
        if (this.state !== msg.state) {
          this.state = msg.state
          console.log(msg.state)
        }
        this.currentQuestion = msg.currentQuestion
        if (this.state === 'wait') {
          this.answerInput.value = ''
          this.answerComplete = false
        }
        this.showDiv(msg)
      }
    })
    this.socket.on('loginComplete', (msg: any) => {
      console.log('loginComplete')
      this.firstName = msg.firstName == null ? 'Unknown' : msg.firstName
      this.lastName = msg.lastName == null ? 'eID' : msg.lastName
      this.nameDiv.innerHTML = `${this.firstName} ${this.lastName} <br>`
      this.loginComplete = true
    })
    this.socket.on('answerReceived', (msg: any) => {
      console.log('answerReceived')
      this.submittedAnswer = msg.answer
      this.currentQuestion = msg.currentQuestion
      this.answerComplete = true
    })
  }

  onKeyDown (event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.questionDiv.style.display === 'block') {
      this.submitAnswer()
    }
  }

  login (): boolean {
    console.log('login')
    this.id = this.loginForm.eIdInput.value.toLowerCase().split(' ').join('')
    this.socket.emit('login', { id: this.id })
    return false
  }

  submitAnswer (): void {
    console.log('submitAnswer')
    this.socket.emit('submitAnswer', {
      answer: this.answerInput.value,
      id: this.id
    })
  }

  changeAnswer (): void {
    this.answerComplete = false
  }

  showDiv (msg: ServerUpdateClient): void {
    this.loginForm.style.display = 'none'
    if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
      document.title = `Q${msg.currentQuestion + 1}`
    } else document.title = 'SRS'
    this.infoDiv.innerHTML = `Question ${msg.currentQuestion + 1} <br>`
    if (msg.state === 'showQuestion') {
      this.waitDiv.style.display = 'none'
      this.questionDiv.style.display = 'block'
      this.infoDiv.style.display = 'block'
      if (this.answerComplete) {
        this.infoDiv.innerHTML += `Your Answer: ${this.submittedAnswer} <br>`
        this.answerDiv.style.display = 'none'
        this.changeDiv.style.display = 'block'
      } else {
        this.answerDiv.style.display = 'block'
        this.changeDiv.style.display = 'none'
      }
    } else {
      this.waitDiv.style.display = 'block'
      this.questionDiv.style.display = 'none'
      this.infoDiv.style.display = 'none'
    }
  }

  mousedown (event: MouseEvent): void {
    console.log('mousedown', event.clientX, event.clientY)
  }
}
