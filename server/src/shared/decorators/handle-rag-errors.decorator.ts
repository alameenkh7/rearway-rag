import { HttpException, Logger } from '@nestjs/common'
import { BaseError } from '../errors/base.error'

const logger = new Logger('HandleRagErrors')

// Direct equivalent of the reference standard's @HandleTherapyErrors('operation'):
// catches BaseError subclasses thrown anywhere in the use-case chain and maps
// them to the JSON shape the widget (and the legacy Express app before it)
// already expects: { error: errorCode, message, ...details }. Anything that
// isn't a BaseError is logged and rethrown to fall through to Nest's default
// 500 handler, rather than being silently swallowed.
export function HandleRagErrors(operation: string): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>

    descriptor.value = async function (...args: unknown[]) {
      try {
        // Function.prototype.apply()'s own lib typing always returns `any`
        // regardless of the target function's declared return type — the
        // cast recovers the type we already established `original` has.
        const result = original.apply(this, args) as Promise<unknown>
        return await result
      } catch (err) {
        if (err instanceof BaseError) {
          const details =
            err.details && typeof err.details === 'object' ? err.details : {}
          throw new HttpException(
            { error: err.errorCode, message: err.message, ...details },
            err.statusCode
          )
        }
        logger.error(
          `[${operation}] Unhandled error`,
          err instanceof Error ? err.stack : String(err)
        )
        throw err
      }
    }

    return descriptor
  }
}
