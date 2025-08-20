import path from 'path'
import { csvToRows, range, Row } from './functions'
import { System } from './system'
import { readFileSync } from 'fs-extra'

export class Session {
  system: System
  date: string
  rows: Row[]
  studentRows: Row[]
  questions: number[]
  headers: Record<string, string> = {}
  absent: Record<string, boolean> = {}
  correctAnswers: Row = {}
  answers: Record<string, Row> = {}
  scores: Record<string, Row> = {}

  constructor (system: System, fileName: string) {
    this.system = system
    this.date = fileName.slice(0, -4)
    const filePath = path.join('sessions', fileName)
    const csv = readFileSync(filePath, 'utf-8')
    this.rows = csvToRows(csv)
    const questionCount = Object.values(this.rows[0]).length - 4
    this.questions = range(1, questionCount)
    this.questions.forEach(q => {
      this.headers[q] = `${q}-${this.date}`
    })
    const keyRows = this.rows.filter(row => row.eid === 'key')
    this.questions.forEach(q => {
      this.correctAnswers[q] = keyRows[0][q]
    })
    this.studentRows = this.rows.filter(row => {
      return row.firstName != null && row.firstName !== ''
    })
    this.system.ids.forEach(id => {
      this.absent[id] = true
      this.scores[id] = {}
      this.answers[id] = {}
      this.questions.forEach(q => {
        this.scores[id][q] = 0
        this.answers[id][q] = ''
      })
    })
    this.studentRows.forEach(row => {
      const id = row.eid
      this.absent[id] = false
      this.questions.forEach(q => {
        const answer = row[q]
        const correctAnswer = this.correctAnswers[q]
        if (this.answers[id] == null) return
        this.answers[id][q] = answer
        if (answer !== '') {
          this.scores[id][q] = 75
        }
        if (answer === correctAnswer) {
          this.scores[id][q] = 100
        }
        if (typeof answer !== 'number') return
        if (typeof correctAnswer !== 'number') return
        const error = Math.abs(answer - correctAnswer)
        const tolerance = this.system.server.config.tolerance
        if (error < tolerance) {
          this.scores[id][q] = 100
        }
      })
    })
  }
}
