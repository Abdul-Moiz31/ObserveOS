#!/usr/bin/env node
// One-command self-host bootstrap for ObserveOS.
//
//   npm run setup            deploy the Worker + D1 + mint a tenant API key
//   npm run setup -- --dry-run   print every step without touching Cloudflare
//
// See README.md > Self-Hosting the Backend for the manual equivalent of
// each step, and for what to do if something here fails partway through
// (every step is safe to re-run).

import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const WORKER_DIR = path.join(ROOT, 'packages', 'worker')
const DASHBOARD_DIR = path.join(ROOT, 'packages', 'dashboard')

const DRY_RUN = process.argv.includes('--dry-run')
const DB_NAME = 'observeos'
const WORKER_NAME = 'observeos-worker'
const TENANT_ID = 'default'

function log(msg) {
  console.log(msg)
}

function step(n, msg) {
  console.log(`\n[${n}/8] ${msg}`)
}

function run(cmd, args, cwd) {
  const display = `$ ${cmd} ${args.join(' ')}`
  if (DRY_RUN) {
    log(`  (dry-run) ${display}`)
    return ''
  }
  log(`  ${display}`)
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['inherit', 'pipe', 'pipe'] })
}

// Pipes stdin to the child instead of returning stdout — used for `secret put`.
function runWithStdin(cmd, args, cwd, stdinValue) {
  const display = `$ ${cmd} ${args.join(' ')}`
  if (DRY_RUN) {
    log(`  (dry-run) ${display} <<< (secret value)`)
    return
  }
  log(`  ${display}`)
  execFileSync(cmd, args, { cwd, input: stdinValue, encoding: 'utf8', stdio: ['pipe', 'inherit', 'inherit'] })
}

function readEnvFile(filePath) {
  if (!existsSync(filePath)) return {}
  const vars = {}
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (match) vars[match[1]] = match[2]
  }
  return vars
}

function upsertEnvFile(filePath, updates) {
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf8').split('\n') : []
  const seen = new Set()
  const lines = existing.map((line) => {
    const match = line.match(/^([A-Z0-9_]+)=/)
    if (match && updates[match[1]] !== undefined) {
      seen.add(match[1])
      return `${match[1]}=${updates[match[1]]}`
    }
    return line
  })
  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) lines.push(`${key}=${value}`)
  }
  if (DRY_RUN) {
    log(`  (dry-run) would write ${path.relative(ROOT, filePath)}:`)
    for (const key of Object.keys(updates)) log(`    ${key}=...`)
    return
  }
  writeFileSync(filePath, lines.join('\n').replace(/\n+$/, '\n'))
}

async function main() {
  log('ObserveOS self-host setup' + (DRY_RUN ? ' (dry run — no changes will be made)' : ''))

  // 1. Preflight
  step(1, 'Checking wrangler and Cloudflare credentials')
  try {
    execFileSync('npx', ['wrangler', '--version'], { cwd: ROOT, stdio: 'pipe' })
  } catch {
    console.error('  wrangler is not available. Run `npm ci` first.')
    process.exit(1)
  }
  const rootEnv = readEnvFile(path.join(ROOT, '.env'))
  // .env is only read by this script — export any values it has onto
  // process.env so the wrangler/fetch calls below (which inherit process.env)
  // actually see them, instead of just this script knowing about them.
  for (const [key, value] of Object.entries(rootEnv)) {
    if (process.env[key] === undefined) process.env[key] = value
  }
  const hasCreds = process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN
  if (!hasCreds && !DRY_RUN) {
    console.error(
      '  No Cloudflare credentials found. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN\n' +
        '  in .env (see .env.example), or run `npx wrangler login` first.'
    )
    process.exit(1)
  }
  log('  ok')

  // 2. Create (or reuse) the D1 database
  step(2, `Creating D1 database "${DB_NAME}"`)
  let databaseId
  if (DRY_RUN) {
    databaseId = '<database-id>'
  } else {
    let createOutput
    try {
      createOutput = execFileSync('npx', ['wrangler', 'd1', 'create', DB_NAME], {
        cwd: WORKER_DIR,
        encoding: 'utf8',
      })
      log(createOutput)
    } catch (err) {
      const output = `${err.stdout ?? ''}${err.stderr ?? ''}`
      if (!/already exists/i.test(output)) throw err
      log(`  "${DB_NAME}" already exists, reusing it`)
      const infoOutput = execFileSync('npx', ['wrangler', 'd1', 'info', DB_NAME, '--json'], {
        cwd: WORKER_DIR,
        encoding: 'utf8',
      })
      databaseId = JSON.parse(infoOutput).uuid
      createOutput = ''
    }
    if (!databaseId) {
      const match = createOutput.match(/database_id\s*=\s*"([0-9a-f-]+)"/)
      if (!match) throw new Error('Could not parse database_id from `wrangler d1 create` output')
      databaseId = match[1]
    }
  }
  log(`  database_id = ${databaseId}`)

  // 3. Patch wrangler.toml
  step(3, 'Updating packages/worker/wrangler.toml with the database_id')
  const wranglerTomlPath = path.join(WORKER_DIR, 'wrangler.toml')
  const wranglerToml = readFileSync(wranglerTomlPath, 'utf8')
  const patchedToml = wranglerToml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${databaseId}"`)
  if (DRY_RUN) {
    log(`  (dry-run) would set database_id = "${databaseId}" in wrangler.toml`)
  } else {
    writeFileSync(wranglerTomlPath, patchedToml)
  }

  // 4. Apply schema
  step(4, 'Applying schema.sql to the remote D1 database')
  run('npx', ['wrangler', 'd1', 'execute', DB_NAME, '--remote', '--file=src/db/schema.sql'], WORKER_DIR)

  // 5. Set ADMIN_SECRET
  step(5, 'Setting the Worker ADMIN_SECRET')
  const adminSecret = rootEnv.WORKER_ADMIN_SECRET || randomBytes(32).toString('hex')
  runWithStdin('npx', ['wrangler', 'secret', 'put', 'ADMIN_SECRET'], WORKER_DIR, adminSecret)

  // 6. Deploy the Worker
  step(6, 'Deploying the Worker')
  let workerUrl = 'https://observeos-worker.<your-subdomain>.workers.dev'
  if (DRY_RUN) {
    log(`  (dry-run) $ npx wrangler deploy`)
  } else {
    const deployOutput = execFileSync('npx', ['wrangler', 'deploy'], { cwd: WORKER_DIR, encoding: 'utf8' })
    log(deployOutput)
    const urlMatch = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/)
    if (urlMatch) workerUrl = urlMatch[0]
  }
  log(`  Worker URL: ${workerUrl}`)

  // 7. Health check + mint the first API key
  step(7, 'Verifying deploy and minting a tenant API key')
  let apiKey = '<api-key>'
  if (!DRY_RUN) {
    const health = await fetch(`${workerUrl}/health`)
    if (!health.ok) throw new Error(`Health check failed: ${health.status}`)
    log('  /health ok')

    const keyRes = await fetch(`${workerUrl}/v1/keys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminSecret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: TENANT_ID, name: 'setup' }),
    })
    if (!keyRes.ok) throw new Error(`Minting API key failed: ${keyRes.status} ${await keyRes.text()}`)
    apiKey = (await keyRes.json()).apiKey
    log('  minted a tenant API key')
  }

  // 8. Write env files
  step(8, 'Writing .env and packages/dashboard/.dev.vars')
  upsertEnvFile(path.join(ROOT, '.env'), {
    WORKER_ADMIN_SECRET: adminSecret,
    WORKER_URL: workerUrl,
    OBSERVEOS_API_KEY: apiKey,
    OBSERVEOS_BASE_URL: workerUrl,
    OBSERVEOS_TENANT_ID: TENANT_ID,
  })
  upsertEnvFile(path.join(DASHBOARD_DIR, '.dev.vars'), {
    WORKER_URL: workerUrl,
    WORKER_API_KEY: apiKey,
    WORKER_TENANT_ID: TENANT_ID,
  })

  console.log(`
Done${DRY_RUN ? ' (dry run — nothing was actually created)' : ''}.

  Worker URL     ${workerUrl}
  Tenant         ${TENANT_ID}
  API key        ${DRY_RUN ? '<api-key>' : apiKey}  (shown once — already saved to .env)

Next steps:
  1. npm install observeos
  2. Wrap your OpenAI/Anthropic/Ollama/HuggingFace client with createObserveOS()
     using OBSERVEOS_API_KEY / OBSERVEOS_BASE_URL from .env.
  3. npm run dev -w packages/dashboard   # open http://localhost:3000
`)
}

main().catch((err) => {
  console.error(`\nSetup failed: ${err.message}`)
  process.exit(1)
})
