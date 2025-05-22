import { Socket } from 'socket.io'

export class Student {
  id: string
  firstName: string
  lastName: string
  socket: Socket
  ready = false
  connected = true

  constructor (socket: Socket, id: string, firstName: string, lastName: string) {
    this.socket = socket
    this.id = id
    this.firstName = firstName
    this.lastName = lastName
  }
}
