import { Server } from './server'
import { Student } from './student'

export class System {
  server: Server
  sessionId = ''
  state = 'startup'
  currentQuestion = -1
  maxQuestion = -1
  students: Record<string, Student> = {}
  correctAnswers: string[] = []

  constructor () {
    this.server = new Server()
    this.setupIo()
  }

  setupIo (): void {
    this.server.io.on('connection', socket => {
      console.log('connection', socket.id)
      socket.on('newSession', msg => {
        this.sessionId = msg.sessionId
        this.state = 'wait'
      })
      socket.on('newQuestion', msg => {
        this.sessionId = msg.sessionId
        this.currentQuestion += 1
        Object.values(this.students).forEach(student => {
          student.answered = false
        })
        this.state = 'showQuestion'
        console.log(`Question ${this.currentQuestion + 1}`)
      })
    })
  }
}
