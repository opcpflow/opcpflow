/**
 * Model Registry — 统一的大模型配置管理。
 *
 * 模型注册时必须提供完整的调用信息（provider + endpoint + apiKey）。
 * 注册后，模型名称出现在节点属性面板的下拉框中，运行时自动解析 endpoint 和 apiKey。
 *
 * 使用方式:
 * ```ts
 * // 注册自定义模型（必须提供完整信息）
 * ModelRegistry.add('My Custom Model', {
 *   provider: 'custom',
 *   endpoint: 'https://my-llm-api.com/v1/chat/completions',
 *   apiKey: 'sk-my-key',
 * })
 *
 * // 批量注册
 * ModelRegistry.addMany({
 *   'GPT-4o': {
 *     provider: 'openai',
 *     endpoint: 'https://api.openai.com/v1/chat/completions',
 *     apiKey: 'sk-openai-key',
 *   },
 * })
 * ```
 */

export interface ModelConfig {
  /** 模型提供商：openai / anthropic / google / deepseek / aliyun / baidu / tencent / custom */
  provider: string
  /** API 端点地址 */
  endpoint: string
  /** API Key（注册时必须提供完整调用信息） */
  apiKey: string
  /** 默认最大 Token */
  maxTokens?: number
  /** API Key 提示名 */
  apiKeyHint?: string
  /** 是否支持流式输出 */
  streaming?: boolean
  /** 备注 */
  description?: string
}

const registry = new Map<string, ModelConfig>()
const providerKeys = new Map<string, string>()
let defaultsLoaded = false

export class ModelRegistry {
  /**
   * 初始化注册表。
   */
  static init(): void {
    defaultsLoaded = true
  }

  /** 清除所有已注册的模型 */
  static reset(): void {
    registry.clear()
    providerKeys.clear()
    defaultsLoaded = true
  }

  /** 获取所有已注册的模型名称列表（用于下拉选择） */
  static getAll(): { label: string; value: string }[] {
    if (registry.size === 0) ModelRegistry.init()
    return Array.from(registry.entries())
      .filter(([name]) => !name.startsWith('_'))  // 过滤内部项
      .map(([name, config]) => ({
        label: `${name} (${config.provider})`,
        value: name,
      }))
  }

  /** 按模型名称获取配置 */
  static get(name: string): ModelConfig | undefined {
    if (registry.size === 0) ModelRegistry.init()
    return registry.get(name)
  }

  /** 添加自定义模型 */
  static add(name: string, config: ModelConfig): void {
    registry.set(name, config)
    if (config.apiKey) {
      providerKeys.set(config.provider, config.apiKey)
    }
  }

  /** 批量添加模型 */
  static addMany(models: Record<string, ModelConfig>): void {
    for (const [name, config] of Object.entries(models)) {
      registry.set(name, config)
      if (config.apiKey) {
        providerKeys.set(config.provider, config.apiKey)
      }
    }
  }

  /** 删除模型 */
  static remove(name: string): boolean {
    return registry.delete(name)
  }

  /** 获取所有模型名称 */
  static getNames(): string[] {
    if (registry.size === 0) ModelRegistry.init()
    return Array.from(registry.keys())
  }

  /** 按提供商过滤 */
  static getByProvider(provider: string): { label: string; value: string }[] {
    if (registry.size === 0) ModelRegistry.init()
    return Array.from(registry.entries())
      .filter(([, config]) => config.provider === provider)
      .map(([name]) => ({ label: name, value: name }))
  }

  /** 获取模型名称对应的 endpoint（注册表 > null） */
  static resolveEndpoint(modelName: string): string | undefined {
    return ModelRegistry.get(modelName)?.endpoint
  }

  // ── 服务商 API Key 管理 ──

  /** 设置某服务商的 API Key（如 openai、deepseek、aliyun），
   *  运行时节点通过 provider 自动匹配 */
  static setProviderKey(provider: string, key: string): void {
    providerKeys.set(provider, key)
  }

  /** 获取某服务商的 API Key */
  static getProviderKey(provider: string): string | undefined {
    return providerKeys.get(provider)
  }

  /** 获取所有已配置的服务商 Key 列表 */
  static getProviderKeys(): Record<string, string> {
    const result: Record<string, string> = {}
    for (const [provider, key] of providerKeys) {
      result[provider] = key
    }
    return result
  }

  /** 清除所有服务商 Key */
  static clearProviderKeys(): void {
    providerKeys.clear()
  }
}
