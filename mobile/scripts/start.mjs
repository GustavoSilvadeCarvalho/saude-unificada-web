// Sobe o app (Expo) já apontando para a API certa, sem editar o .env:
//   npm run start:local   API rodando neste computador (cd backend && npm run dev:memory)
//   npm run start:aws     API publicada na AWS
// Argumentos extras vão direto para o Expo, ex.: npm run start:local -- --tunnel
//
// No "local", o celular não enxerga o "localhost" do PC: o script descobre o IP do
// computador na rede Wi-Fi e usa http://IP:3000/api. Celular e PC precisam estar na mesma rede.

import { spawn } from 'node:child_process'
import { networkInterfaces } from 'node:os'

// Saída ApiUrl do deploy em infra/. Se a stack for derrubada e subida de novo, o endereço muda: atualize aqui.
const AWS_API_URL = 'https://d2jog01y159we3.cloudfront.net/api'
const LOCAL_PORT = process.env.API_PORT ?? '3000'

const [target, ...expoArgs] = process.argv.slice(2)

/** Primeiro IPv4 da rede local (Wi-Fi/cabo), ignorando loopback e interfaces de Docker/VPN */
function lanAddress() {
  const ignored = /^(docker|br-|veth|virbr|vmnet|vboxnet|tun|tap|wg|zt|lo)/i
  for (const [name, addresses] of Object.entries(networkInterfaces())) {
    if (ignored.test(name)) continue
    for (const a of addresses ?? []) {
      if (a.family === 'IPv4' && !a.internal) return a.address
    }
  }
  return 'localhost'
}

async function isUp(url) {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) })
    return response.ok
  } catch {
    return false
  }
}

let apiUrl
if (target === 'local') apiUrl = `http://${lanAddress()}:${LOCAL_PORT}/api`
else if (target === 'aws') apiUrl = AWS_API_URL
else {
  console.error('Use: npm run start:local  ou  npm run start:aws')
  process.exit(1)
}

console.log(`\nApp usando a API: ${apiUrl}`)
if (!(await isUp(apiUrl))) {
  console.warn(
    target === 'local'
      ? '⚠ A API local não respondeu. Em outro terminal: cd backend && npm run dev:memory\n' +
          '  (se ela já está rodando, confira se o firewall libera a porta 3000 para a rede)'
      : '⚠ A API da AWS não respondeu. Ela pode estar desligada: use npm run start:local ou suba com infra/ (npm run deploy:api).',
  )
}
console.log('')

// Variável já definida no ambiente tem prioridade sobre o .env do Expo
const child = spawn('npx', ['expo', 'start', ...expoArgs], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, EXPO_PUBLIC_API_URL: apiUrl },
})
child.on('exit', (code) => process.exit(code ?? 0))
