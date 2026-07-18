export interface GenerateAnswerInput {
  systemPrompt: string
  contextChunks: string[]
  question: string
}

export interface GenerateAnswerOutput {
  answered: boolean
  text: string
  totalTokens: number
}

export interface LlmService {
  embedChunks(texts: string[]): Promise<number[][]>
  embedQuery(text: string): Promise<number[]>
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerOutput>
}
