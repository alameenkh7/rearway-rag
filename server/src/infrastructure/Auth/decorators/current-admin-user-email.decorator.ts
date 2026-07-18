import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { RequestWithAdminUser } from '../guards/verification-token.guard'

export const CurrentAdminUserEmail = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdminUser>()
    return request.adminUserEmail as string
  }
)
