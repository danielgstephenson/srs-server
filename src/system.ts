import { Socket } from 'socket.io'
import { AnswerMessage, AnswerReceivedMessage, CorrectAnswerMessage, UpdateManagerMessage, UpdateStudentMessage } from './messages'
import { Question } from './question'
import { Scribe } from './scribe'
import { Server } from './server'
import { Student } from './student'
import { parseAnswer, unique } from './math'

export class System {
  server: Server
  managerSocket?: Socket
  scribe = new Scribe()
  token = Math.random().toString()
  sessionId = ''
  state = 'startup'
  questions: Question[] = []
  firstNames: Record<string, string> = {}
  lastNames: Record<string, string> = {}
  students: Record<string, Student> = {}
  correctAnswers: string[] = []

  constructor () {
    this.server = new Server()
    this.setupIo()
    setInterval(() => this.tick(), 200)
  }

  setupIo (): void {
    console.log('setupIo')
    this.server.io.on('connection', socket => {
      console.log('connect', socket.id)
      socket.emit('connected', this.token)
      socket.on('disconnect', () => {
        Object.values(this.students).forEach(student => {
          if (student.socket.id === socket.id) {
            console.log('disconnect', student.firstName, student.lastName, student.id)
            student.connected = false
          }
        })
      })
      socket.on('managerLogin', () => {
        this.managerSocket = socket
      })
      socket.on('newSession', (sessionId: string) => {
        console.log('newSession', sessionId)
        this.sessionId = sessionId
        this.state = 'wait'
      })
      socket.on('newQuestion', (sessionId: string) => {
        this.sessionId = sessionId
        this.questions.push(new Question())
        Object.values(this.students).forEach(student => {
          student.ready = false
        })
        this.state = 'showQuestion'
        console.log(`Question ${this.questions.length}`)
      })
      socket.on('hideQuestion', (sessionId: string) => {
        this.sessionId = sessionId
        this.state = 'correctAnswer'
      })
      socket.on('showQuestion', (sessionId: string) => {
        this.sessionId = sessionId
        this.state = 'showQuestion'
      })
      socket.on('login', (id: string) => {
        this.login(socket, id)
      })
      socket.on('correctAnswer', (msg: CorrectAnswerMessage) => {
        this.sessionId = msg.sessionId
        const currentQuestion = this.currentQuestion()
        if (currentQuestion == null) return
        currentQuestion.correctAnswer = parseAnswer(msg.answer)
        this.state = 'wait'
        console.log(`correctAnswer: ${msg.answer}`)
        this.scribe.writeDataFile()
      })
      socket.on('submitAnswer', (msg: AnswerMessage) => {
        const id = msg.id
        if (this.students[id] == null) this.login(socket, id)
        const student = this.students[id]
        student.socket = socket
        student.connected = true
        const currentQuestion = this.currentQuestion()
        if (currentQuestion == null) return
        currentQuestion.answers[id] = parseAnswer(msg.answer)
        student.ready = true
        this.logReady()
        console.log(`submitAnswer ${student.firstName} ${student.lastName} ${msg.answer}`)
        const reply: AnswerReceivedMessage = {
          answer: msg.answer,
          currentQuestion: this.questions.length
        }
        socket.emit('answerReceived', reply)
      })
      socket.on('changeAnswer', (id: string) => {
        const student = this.students[id]
        if (student == null) return
        student.ready = false
        this.logReady()
        console.log(`changeAnswer ${student.firstName} ${student.lastName}`)
      })
    })
  }

  login (socket: Socket, id: string): void {
    const firstName = this.firstNames[id] ?? 'Unknown'
    const lastName = this.lastNames[id] ?? 'eID'
    if (this.students[id] == null) {
      this.students[id] = new Student(socket, id, firstName, lastName)
    } else {
      this.students[id].socket = socket
    }
    console.log('login: ' + firstName + ' ' + lastName + ' ' + id)
    socket.emit('loginComplete', { firstName, lastName })
  }

  logReady (): void {
    const currentQuestion = this.currentQuestion()
    if (currentQuestion == null) return
    const readyStudents = Object.values(this.students).filter(s => s.ready)
    const unreadyStudents = Object.values(this.students).filter(s => !s.ready)
    const readyNames = readyStudents.map(s => `${s.firstName} ${s.lastName} ${s.id}`).sort()
    const unreadyNames = unreadyStudents.map(s => `${s.firstName} ${s.lastName} ${s.id}`).sort()
    console.log('ready', readyNames)
    console.log('unready', unreadyNames)
  }

  currentQuestion (): Question | null {
    return this.questions[this.questions.length - 1]
  }

  currentAnswers (): Record<string, string> {
    const currentQuestion = this.currentQuestion()
    if (currentQuestion == null) return {}
    return currentQuestion.answers
  }

  tick (): void {
    const updateStudentMsg: UpdateStudentMessage = {
      sessionId: this.sessionId,
      currentQuestion: this.questions.length,
      state: this.state,
      token: this.token
    }
    Object.values(this.students).forEach(student => {
      student.socket.emit('update', updateStudentMsg)
    })
    if (this.managerSocket == null) return
    const students = Object.values(this.students)
    const readyCount = students.filter(s => s.ready).length
    const answers = Object.values(this.currentAnswers())
    const uniqueAnswers = unique(answers)
    const answerCounts = uniqueAnswers.map(answer => {
      return answers.filter(x => x === answer).length
    })
    const updateManagerMessage: UpdateManagerMessage = {
      sessionId: this.sessionId,
      state: this.state,
      currentQuestion: this.questions.length,
      readyCount,
      uniqueAnswers,
      answerCounts

    }
    this.managerSocket.emit('update', updateManagerMessage)
  }
}
