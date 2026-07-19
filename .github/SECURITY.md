# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.x     | :white_check_mark: |

## Reporting a Vulnerability

We take the security of OpcpFlow seriously. If you believe you have found a
security vulnerability, please **do not** report it in a public GitHub issue.

Instead, report it by emailing the maintainers directly. We will acknowledge
receipt within 48 hours and provide an initial assessment within 5 business
days.

### What to include

- Type of vulnerability
- Full reproduction steps (screenshots, code snippets, network traces)
- Affected versions
- Potential impact

### What to expect

1. **Acknowledgment** within 48 hours
2. **Initial assessment** within 5 business days
3. **Fix timeline** after assessment
4. **Coordinated disclosure** — we will work with you on timing

We ask that you:

- Give us reasonable time to fix the issue before disclosure
- Avoid exploiting the vulnerability or violating user privacy
- Handle information about the vulnerability responsibly

## Security Best Practices for OpcpFlow Users

### If you embed OpcpFlow in your application:

1. **Input Validation** — Validate all node configurations and DAG definitions.
   Malicious DAG definitions could cause unexpected behavior.
2. **SSRF Protection** — If using the engine with HTTP request nodes, restrict
   outbound requests to prevent Server-Side Request Forgery.
3. **Rate Limiting** — Limit the number of concurrent DAG executions if the
   engine is exposed via API.
4. **Sandbox Execution** — For untrusted DAGs, run the engine in a sandboxed
   environment (Docker, Web Workers, etc.).
5. **Dependency Management** — Keep dependencies updated. Use Dependabot or
   similar tools for automated dependency scanning.

### If you develop OpcpFlow nodes:

1. Never execute arbitrary code from node configurations
2. Validate all inputs at the node boundary
3. Use `unknown` instead of `any` for node data types
4. Avoid dynamic `eval()` or `new Function()` in node implementations

## Reporting Non-Security Bugs

For non-security bugs, please open a standard
[GitHub Issue](https://github.com/opcpflow/opcpflow/issues).

## Recognition

We believe in responsible disclosure and will publicly acknowledge security
researchers who help us keep OpcpFlow secure, provided they follow this policy.

Thank you for helping keep OpcpFlow and its users safe.
