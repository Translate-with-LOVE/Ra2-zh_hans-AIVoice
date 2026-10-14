const fs = require('node:fs')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')

// README-only changes do not justify rebuilding a voice package.
const inputPaths = ['build.ps1', 'README.txt', '.github/scripts', '.github/bin', '.github/workflows',
  '.gitattributes', 'assets/voice-manifest.json', 'voice', '_src_files', 'csf', 'cameo',
  'bik', 'credits', 'fnt', 'shp', 'subtitle']
const assetNames = ['RedAlert2-AIVoice-zh_hans.zip', 'RedAlert2-AIVoice-zh_hans.zip.sha256']

function fingerprint(tree) {
  if (!tree.length) throw new Error('No tracked build inputs; commit the prepared inputs first')
  return crypto.createHash('sha256').update(tree).digest('hex')
}

function releaseDecision(result) {
  if (result.error) throw result.error
  if (result.status !== 0) {
    if (/\(HTTP 404\)/.test(result.stderr || '')) return true
    throw new Error(`Cannot check nightly release: ${result.stderr}`)
  }
  const release = JSON.parse(result.stdout)
  if (release.draft || !release.prerelease || !assetNames.every(name =>
    release.assets.some(asset => asset.name === name && asset.size > 0))) {
    throw new Error('An incomplete or unexpected nightly release exists; inspect it before retrying')
  }
  return false
}

function main() {
  const git = spawnSync('git', ['ls-tree', '-r', '-z', 'HEAD', '--', ...inputPaths], { encoding: 'utf8' })
  if (git.status !== 0) throw new Error(git.stderr || 'Cannot read committed build inputs')
  const hash = fingerprint(git.stdout)
  const official = process.env.RELEASE_KIND === 'official'
  const tag = official ? process.env.GITHUB_REF_NAME : `nightly-${hash}`
  if (official && !/^v[A-Za-z0-9._-]+$/.test(tag || '')) throw new Error('Expected a v* release tag')
  const build = official || releaseDecision(spawnSync('gh', ['api',
    `repos/${process.env.GITHUB_REPOSITORY}/releases/tags/${tag}`], { encoding: 'utf8' }))
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `build=${build}\nrelease_tag=${tag}\nfingerprint=${hash}\n`)
  console.log(build ? `Build ${tag}` : 'Unchanged inputs: skip build and publication')
}

module.exports = { fingerprint, releaseDecision, inputPaths }
if (require.main === module) main()
