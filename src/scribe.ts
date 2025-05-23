import { csv2json, json2csv } from 'json-2-csv'
import { readFileSync, writeFileSync } from 'fs-extra'
import { System } from './system'
import path from 'path'

export class Scribe {
  system: System

  constructor (system: System) {
    this.system = system
    this.loadRoster()
  }

  loadRoster (): void {
    const csv = readFileSync('roster.csv', 'utf-8')
    const options = {
      delimiter: { eol: '\r\n' },
      trimHeaderFields: true
    }
    const rows = csv2json(csv, options)
    rows.forEach(row => {
      if (!('Name' in row && 'eID' in row && 'vID' in row)) return
      if (typeof row.Name !== 'string') return
      if (typeof row.eID !== 'string') return
      if (typeof row.vID !== 'string') return
      const id = row.eID
      const vId = row.vID
      const names = row.Name.split(', ')
      const lastName = names[0]
      const firstName = names[1]
      if (firstName == null) return
      if (lastName == null) return
      this.system.ids.push(id)
      this.system.firstNames[id] = firstName
      this.system.lastNames[id] = lastName
      this.system.vIds[id] = vId
    })
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
    writeFileSync(filePath, csv)
  }

  writeDataFile (): void {
    const rows: Row[] = []
    this.system.ids.forEach(id => {
      const row: Row = {
        firstName: this.system.firstNames[id],
        lastName: this.system.lastNames[id],
        eID: id,
        vID: this.system.vIds[id],
        absences: 0,
        sessions: 0,
        average: 0
      }
      rows.push(row)
    })
    const csv = json2csv(rows)
    writeFileSync('grades.csv', csv)
  }
}

type Row = Record<string, string | number>
