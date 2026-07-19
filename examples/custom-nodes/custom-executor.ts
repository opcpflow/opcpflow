import type { DAGNode } from '@opcpflow/core'

// Custom executor for the sentiment-analysis node type
export async function executeSentimentNode(
  node: DAGNode,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const text = (input.text as string) || ''
  const instructions = (node.data.instructions as string) || 'Analyze the sentiment'

  // In production, call an LLM or ML model here
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love']
  const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'poor']

  const lower = text.toLowerCase()
  const positiveCount = positiveWords.filter((w) => lower.includes(w)).length
  const negativeCount = negativeWords.filter((w) => lower.includes(w)).length

  let sentiment: string
  let score: number

  if (positiveCount > negativeCount) {
    sentiment = 'positive'
    score = 0.5 + (positiveCount - negativeCount) * 0.1
  } else if (negativeCount > positiveCount) {
    sentiment = 'negative'
    score = 0.5 + (negativeCount - positiveCount) * 0.1
  } else {
    sentiment = 'neutral'
    score = 0.5
  }

  return {
    sentiment,
    score: Math.min(score, 1.0),
    details: { instructions, textLength: text.length },
  }
}
