import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { RequestWithSession } from '../guards/session-token.guard'

export const CurrentSessionId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithSession>()
    return request.sessionId as string
  }
)
