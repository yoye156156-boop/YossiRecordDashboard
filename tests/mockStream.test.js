import test from 'node:test'
import assert from 'node:assert/strict'
import { createMockHebrewStream } from '../lib/mockStream.js'
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

test('emits periodically and stops on abort', async () => {
  const controller = new AbortController()
  const received = []
  const start = createMockHebrewStream({ intervalMs: 1 })
  const stop = start({ signal: controller.signal, onData: (s) => received.push(s) })
  await sleep(5)
  controller.abort()
  stop?.()
  const countAfterAbort = received.length
  await sleep(5)
  assert.ok(countAfterAbort >= 2)
  assert.equal(received.length, countAfterAbort)
})
