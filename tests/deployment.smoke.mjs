import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { fileURLToPath } from 'node:url'

// No .env files or real database credentials are used by these checks.
const cwd = mkdtempSync(join(tmpdir(), 'habit-deploy-smoke-'))
after(() => rmSync(cwd, { recursive: true, force: true }))

const databaseUrl = 'postgresql://deploy:smoke-password@127.0.0.1:1/deploy_smoke'
const environment = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: databaseUrl,
  JWT_SECRET: 'deployment-smoke-secret-at-least-32-characters',
  JWT_EXPIRES_IN: '7d',
  BCRYPT_ROUNDS: '10',
  PORT: '10000',
}
delete environment.APP_STAGE

function readEnvironment(overrides = {}) {
  const envUrl = new URL('../env.ts', import.meta.url).href
  return spawnSync(process.execPath, ['--input-type=module', '--eval', `
    import env, { isProd } from ${JSON.stringify(envUrl)};
    console.log(JSON.stringify({ stage: env.APP_STAGE, production: isProd(), port: env.PORT }));
  `], {
    cwd,
    env: { ...environment, ...overrides },
    encoding: 'utf8',
    timeout: 10000,
    windowsHide: true,
  })
}

test('NODE_ENV=production enables production behavior without APP_STAGE', () => {
  const result = readEnvironment()
  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout.trim().split('\n').at(-1)), {
    stage: 'production', production: true, port: 10000,
  })
})

test('an explicit APP_STAGE still takes precedence', () => {
  const result = readEnvironment({ APP_STAGE: 'test' })
  assert.equal(result.status, 0, result.stderr)
  assert.equal(JSON.parse(result.stdout.trim().split('\n').at(-1)).stage, 'test')
})

test('accepts a postgres:// connection URL supplied by a database provider', () => {
  const result = readEnvironment({ DATABASE_URL: databaseUrl.replace('postgresql:', 'postgres:') })
  assert.equal(result.status, 0, result.stderr)
})

test('startup logs do not expose database credentials', () => {
  const result = readEnvironment({ APP_STAGE: 'production' })
  assert.equal(result.status, 0, result.stderr)
  assert.ok(!`${result.stdout}${result.stderr}`.includes('smoke-password'))
})

test('missing required deployment secrets fail with actionable field names', () => {
  const result = readEnvironment({ APP_STAGE: 'production', DATABASE_URL: '', JWT_SECRET: '' })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /DATABASE_URL/)
  assert.match(result.stderr, /JWT_SECRET/)
})

test('production server answers health checks on the assigned port', { timeout: 15000 }, async () => {
  const reservation = createServer()
  reservation.listen(0, '127.0.0.1')
  await once(reservation, 'listening')
  const port = reservation.address().port
  await new Promise((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()))

  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/index.ts', import.meta.url))], {
    cwd,
    env: { ...environment, PORT: String(port) },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  let output = ''
  child.stdout.on('data', chunk => { output += chunk })
  child.stderr.on('data', chunk => { output += chunk })
  const exited = once(child, 'exit')

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Server did not become ready: ${output}`)), 10000)
      child.once('error', error => { clearTimeout(timeout); reject(error) })
      child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited (${code}): ${output}`)) })
      child.stdout.on('data', () => {
        if (output.includes('Server is running')) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    const response = await fetch(`http://127.0.0.1:${port}/api/health`)
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { status: 'ok' })
    const protectedResponse = await fetch(`http://127.0.0.1:${port}/api/habits`)
    assert.equal(protectedResponse.status, 401)
    assert.ok(!output.includes('smoke-password'), 'Server logs exposed database credentials')
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill()
    await exited
  }
})
