export class BaseError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = new.target.name
  }
}
