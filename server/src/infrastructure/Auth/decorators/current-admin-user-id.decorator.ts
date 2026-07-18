import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { RequestWithAdminUser } from '../guards/verification-token.guard'

// Reads adminUserId off the request — set by VerificationTokenGuard, never
// by passport's req.user. There's no logged-in-user concept in Trial (the
// verification token is one-shot), so this is not @CurrentUser().
export const CurrentAdminUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdminUser>()
    return request.adminUserId as string
  }
)
