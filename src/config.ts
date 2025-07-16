import fs from 'fs-extra'
import path from 'path'

export class Config {
  tolerance = 0.03
  port = 3000
  secure = false

  constructor () {
    const dirname = path.dirname(__filename)
    const configPath = path.join(dirname, '../config.json')
    const fileExists: boolean = fs.existsSync(configPath)
    if (fileExists) {
      const json = fs.readJSONSync(configPath)
      if (typeof json.port === 'number') this.port = json.port
      if (typeof json.secure === 'boolean') this.secure = json.secure
    }
    console.log('port:', this.port)
    console.log('secure:', this.secure)
  }
}
