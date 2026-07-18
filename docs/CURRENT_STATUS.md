# Current status

Last updated: 2026-07-19.

## Completed

- Standalone public repository renamed to `quants82/Ominilab-OpenAI`.
- Product, backend, frontend, server paths, database filename, demo password, and production title migrated to canonical `Ominilab`/`ominilab` naming.
- Exactly six experiments retained; unrelated backend and frontend features removed.
- Minimal login/register/JWT authentication and one-table SQLite database operational.
- Public MicroPython firmware and WebSerial flasher operational for five ESP32 families.
- FastAPI REST API, firmware bundles, OpenAI adapter, and bidirectional WebSocket relay operational.
- Production site deployed independently at `https://ominilab.vatli365.vn` behind Nginx and Let's Encrypt.
- Backend health, judge login, six-item firmware manifest, GPT-5.6 request, and bidirectional secure WebSocket relay verified on production.
- Certbot renewal timer enabled and dry-run successful.
- Local combined check script, production deployment script, backend smoke tests, and GitHub Actions validation added.
- GitHub Actions validation and automatic production deployment verified end to end with workflow #10 for commit `4857de8`.
- Production Open API navigation now derives from `PUBLIC_API_URL` and resolves to `https://ominilab.vatli365.vn/docs`.
- Login modal moved outside the sticky header with viewport scrolling.
- Legacy frontend directory moved outside the Git checkout for recoverable cleanup.
- Judge-focused homepage content, a dedicated `/judges` evidence page, and Devpost-ready submission documentation added.
- Harmonic motion now includes a deterministic, explicitly labeled synthetic replay so judges can exercise charts and the grounded GPT-5.6 learning flow without hardware.
- Internal links now use trailing slashes to match the Astro `trailingSlash: 'always'` configuration.
- AI panel failures now surface as an inline error message instead of a browser alert, for both question generation and answer evaluation.
- `ops/check-local.ps1` now fails fast when any native step (syntax check, tests, npm ci, build) returns a non-zero exit code.

## Known issues and next actions

1. **Production is behind the working tree.** The judges page, synthetic replay, link fixes, and submission documents exist locally but are not yet committed or deployed; `https://ominilab.vatli365.vn/judges/` currently serves the homepage fallback. Commit and push to trigger the automatic deployment.
2. **Competition evidence is incomplete.** Replace the Codex Session ID and YouTube placeholders in the root README before submission.
3. **Hardware regression testing remains manual.** Exercise every sensor, browser chart, flashing path, and device-prefix pairing on representative ESP32 boards before the final demonstration.
4. **WebSocket channels are unauthenticated.** This matches the current low-security competition scope, but device IDs should not be treated as secrets. Reassess only if the deployment becomes public beyond judging.
5. **Dependency audit reports known npm findings.** All four current findings require the breaking `astro@7` major upgrade and primarily affect dev-server/SSR features this static deployment does not use; upgrade deliberately after judging, not with `npm audit fix --force`.
6. **Legacy backup cleanup is deferred.** Keep `/root/ominilab-migration-20260719-024239` and `/var/www/ominilab.vatli365.vn/legacy/frontend_OmiLb-20260719` until the migration has been accepted and a separate backup policy exists.

## Recommended order

1. Complete six-experiment hardware acceptance testing.
2. Add the Codex Session ID and final competition evidence.
3. Review dependency audit findings without forcing breaking upgrades.
