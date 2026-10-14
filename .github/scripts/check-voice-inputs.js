const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const roots = ['_src_files/audio/', '_src_files/audiomd/']
const banks = roots.flatMap(root => ['audio.bag', 'audio.idx'].map(name => root + name))

function check(root) {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/voice-manifest.json'), 'utf8'))
  if (manifest.schema !== 1 || !Number.isInteger(manifest.selected_voice_positions) ||
    manifest.selected_voice_positions <= 0 || !Array.isArray(manifest.files) || !manifest.files.length) {
    throw new Error('Expected a nonempty frozen AI voice manifest with selected voice positions')
  }
  const seen = new Set()
  for (const row of manifest.files) {
    if (typeof row.path !== 'string' || !roots.some(prefix => row.path.startsWith(prefix)) ||
      row.path.split('/').some(part => part === '..' || part === '.' || !part) ||
      /[\\:\r\n]/.test(row.path) || !/^[a-f0-9]{64}$/.test(row.sha256) || seen.has(row.path)) {
      throw new Error('Invalid, duplicate, or private voice asset path/hash')
    }
    seen.add(row.path)
    if (!fs.existsSync(path.join(root, row.path))) throw new Error(`Missing voice asset: ${row.path}`)
    const resolved = fs.realpathSync(path.join(root, row.path))
    if (!resolved.startsWith(fs.realpathSync(root) + path.sep)) throw new Error('Voice asset escapes repository')
    const bytes = fs.readFileSync(resolved)
    if (!bytes.length || crypto.createHash('sha256').update(bytes).digest('hex') !== row.sha256) {
      throw new Error(`Missing, empty, LFS pointer, or changed voice asset: ${row.path}`)
    }
  }
  if (!banks.every(name => seen.has(name))) throw new Error('Both complete audio.bag/audio.idx pairs are required')
  for (const directory of roots) {
    for (const name of fs.readdirSync(path.join(root, directory))) {
      const file = directory + name
      if (!seen.has(file) || !fs.statSync(path.join(root, file)).isFile()) {
        throw new Error(`Unlisted voice input: ${file}`)
      }
    }
  }
  console.log(`Verified ${seen.size} frozen inputs; ${manifest.selected_voice_positions} declared selected positions`)
  return seen.size
}

module.exports = { check }
if (require.main === module) check(process.cwd())
