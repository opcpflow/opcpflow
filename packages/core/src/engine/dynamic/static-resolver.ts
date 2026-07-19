import type { SubDAGResolver } from '../../types/execution'
import type { DAGDocument } from '../../types/dag-node'

/**
 * Default SubDAGResolver that reads a static sub-DAG from node data.
 *
 * Expects `nodeData.sub_dag` to contain a full DAGDocument-compatible object
 * with `nodes[]` and `edges[]` arrays.
 */
export class StaticSubDAGResolver implements SubDAGResolver {
  async resolve(
    nodeId: string,
    nodeData: Record<string, unknown>,
  ): Promise<DAGDocument> {
    const subDag = nodeData.sub_dag
    if (!subDag || typeof subDag !== 'object') {
      throw new Error(
        `[Required] Node "${nodeId}": sub_dag config is required for dynamic mode`,
      )
    }

    const dag = subDag as Record<string, unknown>
    if (!Array.isArray(dag.nodes) || !Array.isArray(dag.edges)) {
      throw new Error(
        `[Required] Node "${nodeId}": sub_dag must have nodes[] and edges[]`,
      )
    }

    return dag as unknown as DAGDocument
  }
}
