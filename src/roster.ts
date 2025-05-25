import { readFileSync } from 'fs-extra'
import { csvToRows } from './functions'

export class Roster {
  ids: string[] = []
  firstNames: Record<string, string> = {}
  lastNames: Record<string, string> = {}
  vIds: Record<string, string> = {}

  constructor () {
    const csv = readFileSync('roster.csv', 'utf-8')
    const rows = csvToRows(csv)
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
      this.ids.push(id)
      this.firstNames[id] = firstName
      this.lastNames[id] = lastName
      this.vIds[id] = vId
    })
  }
}
