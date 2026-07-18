import { Deps } from '../entitygateway'

type UseCaseFn<Input, Output> = (input: Input) => Promise<Output>
type Wrapper<Input, Output> = (
  deps: Deps,
  fn: UseCaseFn<Input, Output>,
  name: string
) => UseCaseFn<Input, Output>

// Logs (via the injected Logger port, never console directly) and rethrows —
// use cases stay try/catch-free for this cross-cutting concern per the
// standard's "wrap all logic, log errors, throw error to propagate" rule.
function withLogging<Input, Output>(
  deps: Deps,
  fn: UseCaseFn<Input, Output>,
  name: string
): UseCaseFn<Input, Output> {
  return async (input: Input) => {
    try {
      return await fn(input)
    } catch (err) {
      deps.logger.error(
        `[${name}] failed`,
        err instanceof Error ? err.stack : String(err)
      )
      throw err
    }
  }
}

export const defaultWrappers: Wrapper<unknown, unknown>[] = [withLogging]

export function wrapUC<Input, Output>(
  deps: Deps,
  fn: UseCaseFn<Input, Output>,
  name: string,
  ...wrappers: Wrapper<unknown, unknown>[]
): UseCaseFn<Input, Output> {
  return wrappers.reduce<UseCaseFn<Input, Output>>(
    (acc, wrapper) => wrapper(deps, acc, name) as UseCaseFn<Input, Output>,
    fn
  )
}
