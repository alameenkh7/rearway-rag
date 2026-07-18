import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'
import * as jwt from 'jsonwebtoken'
import { verifyVerificationToken } from '../jwt.util'
import {
  VerificationTokenInvalidError,
  VerificationTokenExpiredError,
} from '../../../shared/errors/domain.errors'

export interface RequestWithAdminUser extends Request {
  adminUserId?: string
  adminUserEmail?: string
}

@Injectable()
export class VerificationTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithAdminUser>()
    const header = request.headers.authorization

    if (!header?.startsWith('Bearer ')) {
      throw new VerificationTokenInvalidError()
    }

    const token = header.slice('Bearer '.length)

    try {
      const payload = verifyVerificationToken(token)
      request.adminUserId = payload.adminUserId
      request.adminUserEmail = payload.email
      return true
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new VerificationTokenExpiredError()
      }
      throw new VerificationTokenInvalidError()
    }
  }
}
