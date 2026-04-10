import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const __dirname = path.parse(import.meta.url.slice(os.platform() === 'win32' ? 8 : 7)).dir

async function start() {
  const files = fs.readdirSync(path.join(__dirname, 'dist'))
  const toPath = path.join(__dirname, 'upload-dist')
  console.log('文件列表:', files)

  const file = files.find((i) => {
    switch (os.platform()) {
      case 'darwin': return i.endsWith('.dmg')
      case 'win32': return i.endsWith('.exe')
      default: return false
    }
  })

  if (file) {
    const filePath = path.join(__dirname, 'dist', file)
    fs.copyFileSync(filePath, path.join(toPath, file))
  }
}

start().then().catch(console.log)
