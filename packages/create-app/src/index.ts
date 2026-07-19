#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createInterface } from 'readline'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = resolve(__dirname, '..', 'templates')

interface CreateAppOptions {
  projectName: string
  template: 'basic'
  typescript: boolean
}

function readlineQuestion(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

async function readlineConfirm(query: string, defaultVal = true): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  const hint = defaultVal ? 'Y/n' : 'y/N'
  return new Promise((resolve) => {
    rl.question(`${query} (${hint}): `, (answer) => {
      rl.close()
      const trimmed = answer.trim().toLowerCase()
      if (trimmed === '') resolve(defaultVal)
      else resolve(trimmed === 'y' || trimmed === 'yes')
    })
  })
}

function copyTemplate(tmplDir: string, targetDir: string, options: CreateAppOptions): void {
  const entries = [
    { src: 'package.json', dest: 'package.json' },
    { src: 'tsconfig.json', dest: 'tsconfig.json' },
    { src: 'vite.config.ts', dest: 'vite.config.ts' },
    { src: 'index.html', dest: 'index.html' },
    { src: 'src/App.tsx', dest: 'src/App.tsx' },
    { src: 'src/main.tsx', dest: 'src/main.tsx' },
  ]

  for (const { src, dest } of entries) {
    const srcPath = resolve(tmplDir, src)
    const destPath = resolve(targetDir, dest)

    if (!existsSync(srcPath)) {
      console.warn(`  Warning: template file not found: ${src}`)
      continue
    }

    let content = readFileSync(srcPath, 'utf-8')

    if (dest === 'package.json') {
      content = content.replace(/{{project-name}}/g, options.projectName)
    }

    const destDir = dirname(destPath)
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true })
    }

    writeFileSync(destPath, content, 'utf-8')
    console.log(`  Created: ${dest}`)
  }
}

async function main(): Promise<void> {
  console.log()
  console.log('  \x1b[36mOpcpFlow - Create DAG Workflow App\x1b[0m')
  console.log('  \x1b[90mOpen DAG Workflow Framework\x1b[0m')
  console.log()

  const projectName = await readlineQuestion('  Project name: ')
  if (!projectName) {
    console.error('  Project name is required.')
    process.exit(1)
  }

  const useTypescript = await readlineConfirm('  Use TypeScript?', true)

  const template = 'basic' as const

  const options: CreateAppOptions = {
    projectName,
    template,
    typescript: useTypescript,
  }

  const targetDir = resolve(process.cwd(), projectName)

  if (existsSync(targetDir)) {
    const overwrite = await readlineConfirm(
      `  Directory "${projectName}" already exists. Overwrite?`,
      false,
    )
    if (!overwrite) {
      console.log('  Cancelled.')
      process.exit(0)
    }
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  console.log()
  console.log('  Creating project...')
  console.log()

  const tmplDir = resolve(TEMPLATES_DIR, template)
  if (!existsSync(tmplDir)) {
    console.error(`  Template "${template}" not found at ${tmplDir}`)
    process.exit(1)
  }

  copyTemplate(tmplDir, targetDir, options)

  console.log()
  console.log('  \x1b[32mProject created successfully!\x1b[0m')
  console.log()
  console.log('  Next steps:')
  console.log()
  console.log(`    cd ${projectName}`)
  console.log('    npm install')
  console.log('    npm run dev')
  console.log()
  console.log('  For more information, visit:')
  console.log('  \x1b[36mhttps://github.com/opcpflow/opcpflow\x1b[0m')
  console.log()
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
