const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const { fingerprint, releaseDecision } = require('../.github/scripts/ci-inputs')
const { check } = require('../.github/scripts/check-voice-inputs')

assert.equal(fingerprint('same input'), fingerprint('same input'))
assert.notEqual(fingerprint('old audio'), fingerprint('new audio'))
assert.throws(() => fingerprint(''))
assert.equal(releaseDecision({status: 1, stderr: 'gh: Not Found (HTTP 404)'}), true)
assert.throws(() => releaseDecision({status: 1, stderr: 'Forbidden (HTTP 403)'}))
assert.throws(() => releaseDecision({status: 1, stderr: 'network unavailable'}))
const assets = ['RedAlert2-AIVoice-zh_hans.zip', 'RedAlert2-AIVoice-zh_hans.zip.sha256']
assert.equal(releaseDecision({status: 0, stdout: JSON.stringify({draft: false, prerelease: true,
  assets: assets.map(name => ({name, size: 10}))})}), false)
assert.throws(() => releaseDecision({status: 0, stdout: JSON.stringify({draft: false,
  prerelease: true, assets: []})}))

const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'ra2-ci-test-'))
try {
  fs.mkdirSync(path.join(fixture, 'assets'))
  assert.throws(() => check(fixture))
  const files = []
  for (const directory of ['audio', 'audiomd']) {
    fs.mkdirSync(path.join(fixture, '_src_files', directory), {recursive: true})
    for (const name of ['audio.bag', 'audio.idx']) {
      const file = `_src_files/${directory}/${name}`
      const bytes = Buffer.from(file)
      fs.writeFileSync(path.join(fixture, file), bytes)
      files.push({path: file, sha256: crypto.createHash('sha256').update(bytes).digest('hex')})
    }
  }
  const manifestPath = path.join(fixture, 'assets/voice-manifest.json')
  const manifest = {schema: 1, selected_voice_positions: 1, files}
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  assert.equal(check(fixture), 4)
  fs.writeFileSync(path.join(fixture, '_src_files/audio/unlisted.wav'), 'unlisted input')
  assert.throws(() => check(fixture))
  fs.unlinkSync(path.join(fixture, '_src_files/audio/unlisted.wav'))
  manifest.selected_voice_positions = 0
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  assert.throws(() => check(fixture))
  manifest.selected_voice_positions = 1
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  fs.writeFileSync(path.join(fixture, files[0].path), 'version https://git-lfs.github.com/spec/v1')
  assert.throws(() => check(fixture))
  fs.writeFileSync(path.join(fixture, files[0].path), 'changed input')
  assert.throws(() => check(fixture))
  manifest.files[0].path = '_src_files/audio/../../private.db'
  fs.writeFileSync(manifestPath, JSON.stringify(manifest))
  assert.throws(() => check(fixture))
} finally {
  fs.rmSync(fixture, {recursive: true, force: true})
}
console.log('CI fingerprint, duplicate-release, HTTP failure, and voice-input checks passed')
