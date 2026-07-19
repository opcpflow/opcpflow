import type { DAGDocument } from './types/dag-node'
import { toJSON, fromJSON } from './serializer'

export function exportDAG(doc: DAGDocument, filename?: string): string {
  const json = toJSON(doc)
  if (filename) {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.json') ? filename : `${filename}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  return json
}

export function importDAG(file: File): Promise<DAGDocument> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const doc = fromJSON(reader.result as string)
        resolve(doc)
      } catch (err) {
        reject(new Error(`Invalid DAG file: ${(err as Error).message}`))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
