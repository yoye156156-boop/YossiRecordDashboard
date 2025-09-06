import test from 'node:test'
import assert from 'node:assert/strict'
import { rms, smooth } from '../lib/audioLevel.js'

test('rms and smooth behave', () => {
  const arr = new Float32Array([0, 1, 0, -1, 0.5, -0.5])
  const r = rms(arr)
  assert.ok(r > 0 && r <= 1, 'rms within (0,1]')
  const s1 = smooth(0, 1, 0.5)
  const s2 = smooth(s1, 1, 0.5)
  assert.equal(s1, 0.5)
  assert.ok(s2 > s1)
})
