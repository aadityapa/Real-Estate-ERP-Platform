# Security Policy

## Supported versions

PropOS is currently developed on a single active line (`main` / `0.1.x`).
Security fixes are applied to the latest version only; there are no separate
LTS branches at this stage.

| Version | Supported |
|---|---|
| `main` / latest `0.1.x` | :white_check_mark: |
| Older / pre-release snapshots | :x: |

## Reporting a vulnerability

If you believe you have found a security vulnerability in this repository or
in any deployed PropOS service, please report it privately — **do not** open
a public GitHub issue.

Email **security@karnex.in** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (proof-of-concept code, requests, or scripts are
  welcome).
- Any relevant logs, screenshots, or affected endpoints/modules.
- Your assessment of severity, if you have one.

We will acknowledge receipt within **3 business days** and aim to provide an
initial assessment within **7 business days**.

## Disclosure policy

- We ask that you give us a reasonable amount of time to investigate and
  remediate an issue before any public disclosure.
- We will keep you informed of progress toward a fix and coordinate a
  disclosure timeline with you once the issue is resolved.
- We do not currently operate a paid bug bounty program, but we credit
  reporters (with permission) in release notes for confirmed, responsibly
  disclosed vulnerabilities.

## Scope

This policy covers the source code in this repository (`backend/`,
`frontend/`, `apps/`, `packages/`, `infrastructure/`). Issues in third-party
dependencies should be reported upstream as well as to us if they affect a
deployed PropOS instance.
