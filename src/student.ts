export class Student {
  id: string
  firstName: string
  lastName: string
  answers: string[] = []
  answered = false

  constructor (id: string, firstName: string, lastName: string) {
    this.id = id
    this.firstName = firstName
    this.lastName = lastName
  }
}
