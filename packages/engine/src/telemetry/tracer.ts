import type { TraceSpan } from '../types'

/**
 * Distributed tracer for DAG execution.
 *
 * Creates spans for each node execution, forming a trace tree
 * that captures the full execution flow across the DAG.
 */
export class Tracer {
  private spans = new Map<string, TraceSpan>()
  private traces = new Map<string, string[]>() // traceId -> span IDs

  private currentTraceId?: string

  /**
   * Start a new trace for a DAG execution.
   */
  startTrace(dagExecId: string): void {
    this.currentTraceId = dagExecId
    this.traces.set(dagExecId, [])
  }

  /**
   * Start a span for a node operation.
   */
  startSpan(nodeId: string, operation: string, parentSpanId?: string): Span {
    const spanId = `span_${nodeId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const span: TraceSpan = {
      spanId,
      parentSpanId,
      nodeId,
      operation,
      startTime: Date.now(),
      tags: {},
      status: 'ok',
    }

    this.spans.set(spanId, span)

    if (this.currentTraceId) {
      const traceSpans = this.traces.get(this.currentTraceId) ?? []
      traceSpans.push(spanId)
      this.traces.set(this.currentTraceId, traceSpans)
    }

    return new Span(this, spanId)
  }

  /**
   * End a span with a status.
   */
  endSpan(spanId: string, status: 'ok' | 'error', error?: string): void {
    const span = this.spans.get(spanId)
    if (!span) return

    span.endTime = Date.now()
    span.status = status
    if (error) span.error = error
  }

  /**
   * Add a tag to a span.
   */
  addTag(spanId: string, key: string, value: string): void {
    const span = this.spans.get(spanId)
    if (span) {
      span.tags[key] = value
    }
  }

  /**
   * Get a span by ID.
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId)
  }

  /**
   * Get all spans for a trace.
   */
  getTraceSpans(traceId: string): TraceSpan[] {
    const spanIds = this.traces.get(traceId) ?? []
    return spanIds.map((id) => this.spans.get(id)).filter((s): s is TraceSpan => s !== undefined)
  }

  /**
   * Get all traces.
   */
  getTraces(): Map<string, TraceSpan[]> {
    const result = new Map<string, TraceSpan[]>()
    for (const [traceId] of this.traces) {
      result.set(traceId, this.getTraceSpans(traceId))
    }
    return result
  }

  /**
   * Export trace data as a JSON-compatible object.
   */
  export(): Record<string, unknown> {
    const traces: Record<string, unknown> = {}
    for (const [traceId, spanIds] of this.traces) {
      traces[traceId] = spanIds.map((id) => this.spans.get(id)).filter(Boolean)
    }
    return { traces }
  }

  /**
   * Clear all trace data.
   */
  clear(): void {
    this.spans.clear()
    this.traces.clear()
    this.currentTraceId = undefined
  }
}

/**
 * Span handle returned by Tracer.startSpan().
 */
export class Span {
  private tracer: Tracer
  private spanId: string

  constructor(tracer: Tracer, spanId: string) {
    this.tracer = tracer
    this.spanId = spanId
  }

  addTag(key: string, value: string): void {
    this.tracer.addTag(this.spanId, key, value)
  }

  end(status: 'ok' | 'error' = 'ok', error?: string): void {
    this.tracer.endSpan(this.spanId, status, error)
  }

  getId(): string {
    return this.spanId
  }
}
