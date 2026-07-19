export interface NodeTypeDefinition {
  type: string
  label: string
  category: string
  icon?: string
  color?: string
  defaultData?: Record<string, unknown>
  /** Flat field list (kept for backward compatibility) */
  formFields?: FormFieldDefinition[]
  /** Grouped form fields rendered as titled sections.
   *  When present, `formFields` is ignored and this takes precedence. */
  formGroups?: FormFieldGroup[]
  /** Declares what fields this node outputs after execution.
   *  Downstream nodes use this to know what data they can reference. */
  outputFields?: OutputFieldDefinition[]
  description?: string
}

export interface FormFieldDefinition {
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'json' | 'employee' | 'refs'
  required?: boolean
  defaultValue?: unknown
  options?: { label: string; value: string }[]
  /** If set, options are loaded dynamically at render time.
   *  'model_registry' — populates from ModelRegistry.getAll() */
  dynamicOptions?: 'model_registry'
  placeholder?: string
  description?: string
}

/**
 * Declares a field that a node type outputs after execution.
 * Downstream nodes can reference these fields via {{fieldName}} or input_refs.
 */
export interface OutputFieldDefinition {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any'
  description?: string
}

/**
 * A group of form fields rendered under a section header in the config panel.
 * When NodeTypeDefinition provides `formGroups`, the config panel renders
 * each group as a titled section instead of a flat field list.
 */
export interface FormFieldGroup {
  /** Section header text. Omit for groups without a visual header. */
  title?: string
  /** Optional description shown below the header */
  description?: string
  /** Whether this section can be collapsed */
  collapsible?: boolean
  /** Start collapsed (only applies when collapsible is true) */
  defaultCollapsed?: boolean
  /** Only show this group when the named field equals the specified value */
  showIf?: { field: string; eq: boolean | string }
  /** Fields in this group */
  fields: FormFieldDefinition[]
}

export class NodeRegistry {
  private definitions = new Map<string, NodeTypeDefinition>()

  register(def: NodeTypeDefinition): void {
    if (this.definitions.has(def.type)) {
      throw new Error(`Node type "${def.type}" already registered`)
    }
    this.definitions.set(def.type, def)
  }

  registerMany(defs: NodeTypeDefinition[]): void {
    for (const def of defs) {
      this.register(def)
    }
  }

  get(type: string): NodeTypeDefinition | undefined {
    return this.definitions.get(type)
  }

  getAll(): NodeTypeDefinition[] {
    return Array.from(this.definitions.values())
  }

  getByCategory(category: string): NodeTypeDefinition[] {
    return this.getAll().filter((d) => d.category === category)
  }

  getCategories(): string[] {
    const cats = new Set(this.getAll().map((d) => d.category))
    return Array.from(cats)
  }

  has(type: string): boolean {
    return this.definitions.has(type)
  }

  /**
   * Override an existing node definition with partial updates.
   * Useful for consumers who want to customize colors/icons/form fields
   * of default node types without redefining them from scratch.
   *
   * - Primitive fields (label, color, icon, etc.) → replace entirely
   * - `defaultData` → shallow merge
   * - `formFields` → replace entirely (consumer provides the full field list)
   * - `type` → cannot be overridden (preserves internal consistency)
   */
  override(type: string, overrides: Partial<Omit<NodeTypeDefinition, 'type'>>): void {
    const existing = this.definitions.get(type)
    if (!existing) {
      throw new Error(`Cannot override: node type "${type}" is not registered`)
    }
    this.definitions.set(type, {
      ...existing,
      ...overrides,
      defaultData: overrides.defaultData
        ? { ...existing.defaultData, ...overrides.defaultData }
        : existing.defaultData,
      type: existing.type,
    })
  }
}
