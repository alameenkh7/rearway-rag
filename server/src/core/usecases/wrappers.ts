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

const SENSITIVE_KEY_PATTERN = /^(code|password|secret|token|hash|otpCodeHash|pdfBuffer)$/i
const MAX_STRING_LENGTH = 200

// Generic redaction so every use case gets safe debug logging automatically,
// without each one having to hand-pick which of its fields are sensitive.
// Buffers (e.g. CreateBot's pdfBuffer) are summarized instead of dumped, long
// strings are truncated, and any key matching SENSITIVE_KEY_PATTERN is
// masked regardless of which use case it appears in.
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[truncated]'
  if (Buffer.isBuffer(value)) return `<Buffer ${value.length} bytes>`
  if (typeof value === 'string') {
    return value.length > MAX_STRING_LENGTH
      ? `${value.slice(0, MAX_STRING_LENGTH)}…(${value.length} chars total)`
      : value
  }
  if (Array.isArray(value)) return value.map(v => redact(v, depth + 1))
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? '[redacted]' : redact(val, depth + 1)
    }
    return out
  }
  return value
}

// Debug-level entry/exit logging for every use case — call, duration, and a
// redacted view of input/output. Separate from withLogging's error-level
// logging: this fires on both success and failure paths, that one only on
// failure with the full stack trace.
function withDebugLogging<Input, Output>(
  deps: Deps,
  fn: UseCaseFn<Input, Output>,
  name: string
): UseCaseFn<Input, Output> {
  return async (input: Input) => {
    const startedAt = Date.now()
    deps.logger.debug(`→ called with ${JSON.stringify(redact(input))}`, name)
    try {
      const result = await fn(input)
      deps.logger.debug(
        `← completed in ${Date.now() - startedAt}ms — ${JSON.stringify(redact(result))}`,
        name
      )
      return result
    } catch (err) {
      deps.logger.debug(`✗ failed after ${Date.now() - startedAt}ms`, name)
      throw err
    }
  }
}

export const defaultWrappers: Wrapper<unknown, unknown>[] = [withLogging, withDebugLogging]

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
