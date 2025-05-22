import { io } from 'socket.io-client'
import { CorrectAnswerMessage, UpdateManagerMessage } from '../messages'
import { getDateString } from '../math'

export class Manger {
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
  submitAnswerButton = document.getElementById('submitAnswerButton') as HTMLButtonElement
  showQuestionButton = document.getElementById('showQuestionButton') as HTMLButtonElement
  sessionId = ''
  correctAnswer = ''

  constructor () {
    this.setupIo()
    this.newSessionButton.onclick = () => this.newSession()
    this.newQuestionButton.onclick = () => this.newQuestion()
    this.submitAnswerButton.onclick = () => this.submitCorrectAnswer()
    this.showQuestionButton.onclick = () => this.showQuestion()
  }

  setupIo (): void {
    this.socket.on('update', (msg: UpdateManagerMessage) => {
      if (msg.state !== 'startup') this.sessionId = msg.sessionId
      this.showDiv(msg)
      this.readyCountSpan.innerHTML = msg.readyCount.toString() + ' '
    })
    this.socket.emit('managerLogin')
  }

  newSession (): void {
    this.sessionId = getDateString()
    this.socket.emit('newSession', this.sessionId)
  }

  newQuestion (): void {
    this.correctAnswerInput.value = ''
    this.correctAnswer = ''
    this.socket.emit('newQuestion', this.sessionId)
  }

  hideQuestion (): void {
    this.socket.emit('hideQuestion', this.sessionId)
  }

  showQuestion (): void {
    this.socket.emit('showQuestion', this.sessionId)
  }

  submitCorrectAnswer (): void {
    this.correctAnswer = this.correctAnswerInput.value
    const msg: CorrectAnswerMessage = {
      sessionId: this.sessionId,
      answer: this.correctAnswer
    }
    this.socket.emit('correctAnswer', msg)
  }

  showDiv (msg: UpdateManagerMessage): void {
    if (['showQuestion', 'correctAnswer'].includes(msg.state)) {
      document.title = `Q${msg.currentQuestion + 1}`
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
