import path from 'path'
import { json2csv } from 'json-2-csv'
import { readdirSync, writeFileSync } from 'fs-extra'
import { System } from './system'
import { Row } from './functions'
import { Session } from './session'

export class Scribe {
  system: System

  constructor (system: System) {
    this.system = system
  }

  writeSessionFile (): void {
    const rows: Row[] = []
    Object.values(this.system.students).forEach(student => {
      const row: Row = {
        eid: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        excused: 0
      }
      this.system.questions.forEach((question, i) => {
        const answer = question.answers[student.id] ?? ''
        const header = (i + 1).toString()
        row[header] = answer
      })
      rows.push(row)
    })
    const key: Row = {
      eid: 'key',
      firstName: '',
      lastName: '',
      excused: ''
    }
    this.system.questions.forEach((question, i) => {
      const answer = question.correctAnswer ?? ''
      const header = (i + 1).toString()
      key[header] = answer
    })
    rows.push(key)
    const headers = ['eid', 'firstName', 'lastName', 'excused']
    this.system.questions.forEach((_, i) => {
      const header = (i + 1).toString()
      headers.push(header)
    })
    const csv = json2csv(rows, { keys: headers })
    const filePath = path.join('sessions', `${this.system.sessionId}.csv`)
    try {
      writeFileSync(filePath, csv)
    } catch (error) {
      console.error('writeSessionFile error:', error)
    }
  }

  writeGradeFile (): void {
    console.log('writeGradeFile')
    const fileNames = readdirSync('sessions').filter(x => x !== '.gitkeep').reverse()
    const sessions = fileNames.map(fileName => new Session(this.system, fileName))
    sessions.sort((a, b) => a.date === b.date ? 0 : a.date < b.date ? 1 : -1)
    const gradeRows: Row[] = []
    const questionHeaders = sessions.flatMap(s => Object.values(s.headers))
    const headers: string[] = [
      'firstName',
      'lastName',
      'eID',
      'vID',
      'absences',
      'sessions',
      'average',
      ...questionHeaders
    ]
    this.system.ids.forEach(id => {
      const gradeRow: Row = {
        firstName: this.system.firstNames[id],
        lastName: this.system.lastNames[id],
        eID: id,
        vID: this.system.vIds[id],
        absences: sessions.filter(s => s.absent[id]).length,
        sessions: sessions.length,
        average: 0
      }
      sessions.forEach(session => {
        session.questions.forEach(q => {
          const header = session.headers[q]
          gradeRow[header] = session.scores[id][q]
        })
      })
      gradeRows.push(gradeRow)
    })
    sessions.forEach(session => {
      console.log(session.date)
    })
    const options = { keys: headers }
    const csv = json2csv(gradeRows, options)
    try {
      writeFileSync('grades.csv', csv)
    } catch (error) {
      console.error('writeDataFile error:', error)
    }
  }

  getIdRow (id: string, session: Row[]): Row | null {
    const rows = session.filter(row => {
      return row.eid === id
    })
    return rows.at(-1) ?? null
  }
}
