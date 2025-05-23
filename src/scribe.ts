import { csv2json, json2csv } from 'json-2-csv'
import { readdirSync, readFileSync, writeFileSync } from 'fs-extra'
import { System } from './system'
import path from 'path'
import { isDecimal } from './math'

export class Scribe {
  system: System

  constructor (system: System) {
    this.system = system
    this.loadRoster()
  }

  loadRoster (): void {
    const csv = readFileSync('roster.csv', 'utf-8')
    const rows = this.csvToRows(csv)
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
    try {
      writeFileSync(filePath, csv)
    } catch (error) {
      console.error('writeSessionFile error:', error)
    }
  }

  writeGradeFile (): void {
    console.log('writeGradeFile')
    const sessions: Row[][] = []
    const sessionFiles = readdirSync('sessions').filter(x => x !== '.gitkeep').reverse()
    sessionFiles.forEach(sessionFile => {
      const filePath = path.join('sessions', sessionFile)
      const csv = readFileSync(filePath, 'utf-8')
      const session = this.csvToRows(csv)
      sessions.push(session)
    })
    const gradeRows: Row[] = []
    this.system.ids.forEach(id => {
      let absences = 0
      sessions.forEach((session, i) => {
        const sessionName = sessionFiles[i].slice(0, -4)
        const headers = Object.keys(session[0])
        const questionIndices = headers.filter(header => isDecimal(header))
        console.log(id, sessionName, ...questionIndices)
        const sessionRow = this.getIdRow(id, session)
        if (sessionRow == null) {
          console.log('absent')
          absences += 1
        } else {
          console.log('present')
        }
      })
      const gradeRow: Row = {
        firstName: this.system.firstNames[id],
        lastName: this.system.lastNames[id],
        eID: id,
        vID: this.system.vIds[id],
        absences,
        sessions: sessions.length,
        average: 0
      }
      gradeRows.push(gradeRow)
    })
    const csv = json2csv(gradeRows)
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

  csvToRows (csv: string): Row[] {
    const linuxOptions = {
      delimiter: { eol: '\r\n' },
      trimHeaderFields: true
    }
    const linuxRows = csv2json(csv, linuxOptions)
    if (linuxRows.length > 0) return linuxRows
    const windowsOptions = {
      delimiter: { eol: '\n' },
      trimHeaderFields: true
    }
    const windowsRows = csv2json(csv, windowsOptions)
    return windowsRows
  }
}

type Row = Record<string, any>
