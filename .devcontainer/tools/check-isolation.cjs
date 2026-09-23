#!/usr/bin/env node
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

function curl(args) {
  return spawnSync('curl', ['--silent', '--show-error', '--max-time', '8', ...args], {
    encoding: 'utf8', timeout: 10000,
  });
}

assert.ok(process.getuid() >= 1000, 'Run as an unprivileged workspace user');
const processStatus = fs.readFileSync('/proc/self/status', 'utf8');
assert.match(processStatus, /CapBnd:\s+0+\n/, 'Capabilities must all be dropped');
assert.match(processStatus, /NoNewPrivs:\s+1\n/, 'no-new-privileges must be enabled');
assert.ok(!process.env.SSH_AUTH_SOCK, 'Disable host SSH agent forwarding before using agents');
for (const filename of ['/var/run/docker.sock', '/run/docker.sock', '/run/host-services/ssh-auth.sock']) {
  assert.ok(!fs.existsSync(filename), `Forbidden host socket: ${filename}`);
}
assert.throws(() => fs.accessSync('/etc/claude-code/managed-settings.json', fs.constants.W_OK));
assert.throws(() => fs.accessSync('/usr/local/bin', fs.constants.W_OK));
assert.throws(() => fs.accessSync('/opt/docs-tools', fs.constants.W_OK));
const helpers = spawnSync('git', ['config', '--get-all', 'credential.helper'], { encoding: 'utf8' });
assert.equal(helpers.stdout.trim(), '', 'Disable host Git credential helper forwarding');
// Only gh's helper for GitHub (set by github-setup) may hold credentials.
const scopedHelpers = spawnSync('git', ['config', '--get-regexp', '^credential\\..+\\.helper$'], { encoding: 'utf8' });
for (const line of scopedHelpers.stdout.split('\n').filter(Boolean)) {
  assert.match(line, /^credential\.https:\/\/(gist\.)?github\.com\.helper( ?| !\S*gh auth git-credential)$/, `Unexpected Git credential helper: ${line}`);
}

for (const target of ['https://example.com', 'https://gitlab.com', 'https://127.0.0.1', 'https://api.anthropic.com.example.com']) {
  const result = curl(['--proxy', 'http://127.0.0.1:3128', '--noproxy', '', '-o', '/dev/null', '-w', '%{http_connect}', target]);
  assert.equal(result.stdout, '403', `Proxy must explicitly deny ${target}: ${result.stderr}`);
}
for (const address of ['1.1.1.1', '169.254.169.254', '[2606:4700:4700::1111]']) {
  const result = curl(['--proxy', '', '--noproxy', '*', '-k', `https://${address}`]);
  assert.notEqual(result.status, 0, `Direct egress must fail: ${address}`);
}
const dns = spawnSync('getent', ['ahostsv4', 'example.com'], { timeout: 3000 });
assert.notEqual(dns.status, 0, 'Workspace DNS must be blocked, including Docker DNS');

for (const domain of ['api.anthropic.com', 'claude.ai', 'claude.com', 'platform.claude.com', 'github.com', 'api.github.com']) {
  const result = curl(['--proxy', 'http://127.0.0.1:3128', '--noproxy', '', '-o', '/dev/null', '-w', '%{http_connect}', `https://${domain}`]);
  assert.equal(result.stdout, '200', `Allowed endpoint tunnel must work: ${domain}: ${result.stderr}`);
  assert.equal(result.status, 0, `TLS must validate for ${domain}: ${result.stderr}`);
}
console.log('PASS: unprivileged runtime, protected tools, denied research/direct egress/DNS, allowed Claude and GitHub TLS.');
console.log('Also inspect host mounts, VS Code forwarding, and loaded agent tools as described in .devcontainer/SECURITY.md.');