import { io } from 'socket.io-client'
import { CorrectAnswerMessage, UpdateManagerMessage } from '../messages'
import { getDateString } from '../functions'

export class Manager {
  socket = io()
  startupDiv = document.getElementById('startupDiv') as HTMLDivElement
  waitDiv = document.getElementById('waitDiv') as HTMLDivElement
  showQuestionDiv = document.getElementById('showQuestionDiv') as HTMLDivElement
  correctAnswerDiv = document.getElementById('correctAnswerDiv') as HTMLDivElement
  correctAnswerInput = document.getElementById('correctAnswerInput') as HTMLInputElement
  readyCountSpan = document.getElementById('readyCountSpan') as HTMLSpanElement
  resultCountSpan = document.getElementById('resultCountSpan') as HTMLSpanElement
  newSessionButton = document.getElementById('newSessionButton') as HTMLButtonElement
  newQuestionButton = document.getElementById('newQuestionButton') as HTMLButtonElement
  hideQuestionButton = document.getElementById('hideQuestionButton') as HTMLButtonElement
  submitAnswerButton = document.getElementById('submitAnswerButton') as HTMLButtonElement
  showQuestionButton = document.getElementById('showQuestionButton') as HTMLButtonElement
  sessionId = ''
  correctAnswer = ''
  token = ''
  state = ''

  constructor () {
    this.setupIo()
    window.addEventListener('keydown', event => this.onKeyDown(event))
    this.newSessionButton.onclick = () => this.newSession()
    this.newQuestionButton.onclick = () => this.newQuestion()
    this.hideQuestionButton.onclick = () => this.hideQuestion()
    this.submitAnswerButton.onclick = () => this.submitCorrectAnswer()
    this.showQuestionButton.onclick = () => this.showQuestion()
  }

  setupIo (): void {
    this.socket.on('connected', (token: string) => {
      console.log('connected')
      const newServer = !['', token].includes(this.token)
      if (newServer) location.reload()
      this.token = token
    })
    this.socket.on('update', (msg: UpdateManagerMessage) => {
      if (msg.state !== 'startup') this.sessionId = msg.sessionId
      this.showDiv(msg)
      this.readyCountSpan.innerHTML = msg.readyCount.toString() + ' '
      if (msg.state === 'correctAnswer' && this.state !== 'correctAnswer') {
        this.correctAnswerInput.focus()
        this.correctAnswerInput.select()
      }
      this.state = msg.state
    })
    this.socket.emit('managerLogin')
  }

  onKeyDown (event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      if (this.state === 'correctAnswer' && this.correctAnswerInput.value !== '') {
        this.submitCorrectAnswer()
      }
    }
  }

  newSession (): void {
    console.log('newSession')
    this.sessionId = getDateString()
    this.socket.emit('newSession', this.sessionId)
  }

  newQuestion (): void {
    console.log('newQuestion')
    this.correctAnswerInput.value = ''
    this.correctAnswer = ''
    this.socket.emit('newQuestion', this.sessionId)
  }

  hideQuestion (): void {
    console.log('hideQuestion')
    this.socket.emit('hideQuestion', this.sessionId)
  }

  showQuestion (): void {
    console.log('showQuestion')
    this.socket.emit('showQuestion', this.sessionId)
  }

  submitCorrectAnswer (): void {
    console.log('submitCorrectAnswer')
    this.correctAnswer = this.correctAnswerInput.value
    const msg: CorrectAnswerMessage = {
      sessionId: this.sessionId,
      answer: this.correctAnswer
    }
    this.socket.emit('correctAnswer', msg)
  }

  showDiv (msg: UpdateManagerMessage): void {
    console.log('msg.state', msg.state)
    if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
      document.title = `Q${msg.currentQuestion}`
    } else document.title = 'SRS'
    this.startupDiv.style.display = 'none'
    this.waitDiv.style.display = 'none'
    this.showQuestionDiv.style.display = 'none'
    this.correctAnswerDiv.style.display = 'none'
    if (msg.state === 'startup') this.startupDiv.style.display = 'block'
    if (msg.state === 'wait') this.waitDiv.style.display = 'block'
    if (msg.state === 'showQuestion') this.showQuestionDiv.style.display = 'block'
    if (msg.state === 'correctAnswer') this.correctAnswerDiv.style.display = 'block'
  }
}
