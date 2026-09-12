import { gateway, generateObject } from 'ai'
import type { z } from 'zod'

/**
 * Model chain, tried in order. Override with the AI_MODELS env var
 * (comma-separated) to switch models without touching code — useful when a
 * gateway plan gates one model but allows another.
 */
const DEFAULT_MODELS = [
  'anthropic/claude-sonnet-5',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-3-haiku',
]

function modelChain(): string[] {
  const raw = process.env.AI_MODELS?.trim()
  const chain = raw
    ? raw.split(',').map((s) => s.trim()).filter(Boolean)
    : DEFAULT_MODELS
  return chain.length ? chain : DEFAULT_MODELS
}

export type FailureReason = 'credits' | 'ratelimit' | 'config' | 'other'

export interface AiFailure {
  reason: FailureReason
  /** Raw provider message, for the server log and for debugging */
  detail: string
}

/** HTTP status that best matches the failure, so the client can branch on it. */
const STATUS: Record<FailureReason, number> = {
  credits: 402,
  ratelimit: 429,
  config: 500,
  other: 502,
}

function collectText(err: unknown, depth = 0): string {
  if (!err || depth > 5) return ''
  if (typeof err === 'string') return err
  const e = err as { message?: unknown; cause?: unknown; errors?: unknown }
  const parts: string[] = []
  if (typeof e.message === 'string') parts.push(e.message)
  if (Array.isArray(e.errors)) {
    for (const inner of e.errors) parts.push(collectText(inner, depth + 1))
  }
  if (e.cause) parts.push(collectText(e.cause, depth + 1))
  return parts.join(' | ')
}

export function classifyFailure(err: unknown): AiFailure {
  const detail = collectText(err) || 'Unknown AI error'
  const t = detail.toLowerCase()

  // The gateway reports an entitlement block as a 403 whose message names the
  // billing remedy — that is a "you must pay", not a transient failure.
  if (
    t.includes('do not have access to this model') ||
    t.includes('upgrade to paid credits') ||
    t.includes('insufficient credit') ||
    t.includes('payment required')
  ) {
    return { reason: 'credits', detail }
  }
  if (t.includes('rate-limited') || t.includes('rate limit') || t.includes('429')) {
    return { reason: 'ratelimit', detail }
  }
  if (
    t.includes('api key') ||
    t.includes('unauthorized') ||
    t.includes('authentication') ||
    t.includes('oidc')
  ) {
    return { reason: 'config', detail }
  }
  return { reason: 'other', detail }
}

/** A hard entitlement block will never succeed on a retry of the same model. */
function isRetryableOnSameModel(reason: FailureReason): boolean {
  return reason === 'ratelimit' || reason === 'other'
}

interface RunOptions<T extends z.ZodTypeAny> {
  schema: T
  prompt: string
  temperature?: number
}

export type RunResult<T> = { ok: true; object: T } | { ok: false; failure: AiFailure }

/**
 * Generate a structured object, walking the model chain. A model the current
 * plan cannot use is skipped immediately rather than retried, so a gated model
 * costs one request instead of three before the next one is tried.
 */
export async function runStructured<T extends z.ZodTypeAny>(
  tag: string,
  { schema, prompt, temperature = 0.4 }: RunOptions<T>,
): Promise<RunResult<z.infer<T>>> {
  const chain = modelChain()
  let last: AiFailure = { reason: 'other', detail: 'No model attempted' }

  for (const modelId of chain) {
    try {
      const { object } = await generateObject({
        model: gateway(modelId),
        schema,
        prompt,
        temperature,
        // The chain is the retry strategy; the SDK's own retries only multiply
        // the wait before a gated model gives up.
        maxRetries: 1,
      })
      // generateObject widens the return type for generic schemas; the schema
      // itself has already validated the shape at runtime.
      return { ok: true, object: object as z.infer<T> }
    } catch (err) {
      last = classifyFailure(err)
      console.error(`[${tag}] model ${modelId} failed (${last.reason}):`, last.detail)
      if (last.reason === 'config') break // a bad key fails identically on every model
      if (!isRetryableOnSameModel(last.reason) && chain.indexOf(modelId) === chain.length - 1) break
    }
  }

  return { ok: false, failure: last }
}

/** Turn a failure into the JSON body + status the client branches on. */
export function failureResponse(failure: AiFailure): Response {
  return Response.json(
    { error: 'AI request failed', reason: failure.reason, detail: failure.detail },
    { status: STATUS[failure.reason] },
  )
}
