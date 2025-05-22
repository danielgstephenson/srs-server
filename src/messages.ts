export interface UpdateStudentMessage {
  sessionId: string
  currentQuestion: number
  state: string
  token: string
}

export interface UpdateManagerMessage {
  sessionId: string
  state: string
  currentQuestion: number
  uniqueAnswers: string[]
  answerCounts: number[]
  readyCount: number
}

export interface LoginCompleteMessage {
  firstName: string
  lastName: string
}

export interface AnswerReceivedMessage {
  answer: string
  currentQuestion: number
}

export interface CorrectAnswerMessage {
  sessionId: string
  answer: string
}

export interface AnswerMessage {
  id: string
  answer: string
}
