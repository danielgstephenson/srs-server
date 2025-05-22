import { io } from 'socket.io-client'
import { AnswerMessage, AnswerReceivedMessage, LoginCompleteMessage, UpdateStudentMessage } from '../messages'

export class Client {
  loginDiv = document.getElementById('loginDiv') as HTMLDivElement
  waitDiv = document.getElementById('waitDiv') as HTMLDivElement
  questionDiv = document.getElementById('questionDiv') as HTMLDivElement
  answerDiv = document.getElementById('answerDiv') as HTMLDivElement
  changeDiv = document.getElementById('changeDiv') as HTMLDivElement
  infoDiv = document.getElementById('infoDiv') as HTMLDivElement
  nameDiv = document.getElementById('nameDiv') as HTMLDivElement
  idInput = document.getElementById('idInput') as HTMLInputElement
  answerInput = document.getElementById('answerInput') as HTMLInputElement
  loginButton = document.getElementById('loginButton') as HTMLButtonElement
  submitButton = document.getElementById('submitButton') as HTMLButtonElement
  changeButton = document.getElementById('changeButton') as HTMLButtonElement
  socket = io()

  loginComplete = false
  ready = false
  currentQuestion = 1
  token = ''
  answer = ''
  id = ''
  state = 'login'
  firstName = 'Unknown'
  lastName = 'eID'

  constructor () {
    this.setupIo()
    window.addEventListener('keydown', event => this.onKeyDown(event))
    this.loginButton.onclick = () => this.login()
    this.submitButton.onclick = () => this.submitAnswer()
    this.changeButton.onclick = () => this.changeAnswer()
  }

  setupIo (): void {
    this.socket.on('connected', (token: string) => {
      console.log('connected')
      const newServer = !['', token].includes(this.token)
      if (newServer) location.reload()
      this.token = token
      this.loginDiv.style.display = 'block'
    })
    this.socket.on('update', (msg: UpdateStudentMessage) => {
      console.log('update')
      if (this.loginComplete) {
        if (this.state !== msg.state) {
          this.state = msg.state
          console.log(msg.state)
        }
        this.currentQuestion = msg.currentQuestion
        if (this.state === 'wait') {
          this.answerInput.value = ''
          this.ready = false
        }
        this.showDiv(msg)
      }
    })
    this.socket.on('loginComplete', (msg: LoginCompleteMessage) => {
      console.log('loginComplete')
      this.firstName = msg.firstName
      this.lastName = msg.lastName
      this.nameDiv.innerHTML = `${this.firstName} ${this.lastName}   ${this.id}<br>`
      this.loginComplete = true
    })
    this.socket.on('answerReceived', (msg: AnswerReceivedMessage) => {
      console.log('answerReceived')
      this.answer = msg.answer
      this.currentQuestion = msg.currentQuestion
      this.ready = true
    })
  }

  onKeyDown (event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const questionDisplay = getComputedStyle(this.questionDiv).display
      const loginDisplay = getComputedStyle(this.loginDiv).display
      if (questionDisplay === 'block' && this.answerInput.value !== '') {
        this.submitAnswer()
      }
      if (loginDisplay === 'block' && this.idInput.value !== '') {
        this.login()
      }
    }
  }

  login (): boolean {
    console.log('login')
    this.id = this.idInput.value.toLowerCase().split(' ').join('')
    this.socket.emit('login', this.id)
    return false
  }

  submitAnswer (): void {
    console.log('submitAnswer')
    const msg: AnswerMessage = {
      answer: this.answerInput.value,
      id: this.id
    }
    this.socket.emit('submitAnswer', msg)
  }

  changeAnswer (): void {
    this.ready = false
  }

  showDiv (msg: UpdateStudentMessage): void {
    this.loginDiv.style.display = 'none'
    if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
      document.title = `Q${msg.currentQuestion + 1}`
    } else document.title = 'SRS'
    this.infoDiv.innerHTML = `Question ${msg.currentQuestion + 1} <br>`
    if (msg.state === 'showQuestion') {
      this.waitDiv.style.display = 'none'
      this.questionDiv.style.display = 'block'
      this.infoDiv.style.display = 'block'
      if (this.ready) {
        this.infoDiv.innerHTML += `Your Answer: ${this.answer} <br>`
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
