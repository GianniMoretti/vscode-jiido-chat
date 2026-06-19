# M2 — De-coupling Plan

## Goal

Remove GitHub auth dependency, telemetry, experimentation, and GitHub API calls. Make extension work standalone with a configurable API key.

## Changes Required

### 1. Auth Bypass

**Current chain:**
```
AuthenticationService → VSCodeCopilotTokenManager → GitHub session → CAPI /copilot/token → CopilotToken
```

**Target:**
```
SimpleApiKeyAuthService → SimpleCopilotTokenManager → static token from config/env
```

**Files to modify:**
- `src/extension/extension/vscode-node/services.ts` — swap auth + token manager implementations
- Create `src/platform/authentication/common/simpleApiKeyAuthService.ts` — new auth service
- Create `src/platform/authentication/node/simpleCopilotTokenManager.ts` — new token manager

### 2. Telemetry → Null

**Current:** `TelemetryService` in production, `NullTelemetryService` in dev
**Target:** Always `NullTelemetryService`

**Files to modify:**
- `src/extension/extension/vscode-node/services.ts` — `setupTelemetry()` always uses `NullTelemetryService`

### 3. Experimentation → Null

**Current:** `MicrosoftExperimentationService` in production, `NullExperimentationService` in dev
**Target:** Always `NullExperimentationService`

**Files to modify:**
- `src/extension/extension/vscode-node/services.ts` — `setupMSFTExperimentationService()` always uses `NullExperimentationService`

### 4. GitHub API → Null

**Current:** `OctoKitService` (real GitHub API calls)
**Target:** `NullBaseOctoKitService` (no-ops)

**Files to modify:**
- `src/extension/extension/vscode/services.ts` — line 146: always use `NullBaseOctoKitService`

### 5. CAPI Client — Keep for now

`CAPIClientImpl` uses `HMAC_SECRET` and `VSCODE_COPILOT_INTEGRATION_ID` from env. These are optional in the `@vscode/copilot-api` package. Keep as-is for M2; M3 will replace CAPI entirely with direct Fireworks calls.

## Implementation Order

1. Create `SimpleCopilotTokenManager` — returns a static token from env var `JIIDO_API_KEY`
2. Create `SimpleApiKeyAuthService` — lightweight auth service using static token
3. Modify `services.ts` (node) — swap auth, null telemetry, null experimentation
4. Modify `services.ts` (common) — swap OctoKitService → NullBaseOctoKitService
5. Verify build succeeds