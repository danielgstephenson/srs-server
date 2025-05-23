import { csv2json } from 'json-2-csv'
import { readFileSync } from 'fs-extra'
import { System } from './system'

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
      if (!('Name' in row && 'eID' in row)) return
      if (typeof row.Name !== 'string') return
      if (typeof row.eID !== 'string') return
      const id = row.eID
      const names = row.Name.split(', ')
      const lastName = names[0]
      const firstName = names[1]
      if (firstName == null) return
      if (lastName == null) return
      this.system.firstNames[id] = firstName
      this.system.lastNames[id] = lastName
    })
  }

  writeDataFile (): void {}
}
