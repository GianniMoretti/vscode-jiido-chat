# M1.2 — Data Flow Map

## Overview

Complete request→response data flow for the Copilot Chat extension, from user input to LLM response.

---

## 1. Extension Activation

```
baseActivate(configuration)  [src/extension/extension/vscode/extension.ts]
  └─ createInstantiationService(configuration)
       └─ registerServices(builder, context)  [src/extension/extension/vscode/services.ts]
            └─ defines 176 DI services (IEndpointProvider, IAuthenticationService, ITelemetryService, etc.)
  └─ ContributionCollection.activate()
       └─ ChatAgentService.register()  [src/extension/conversation/vscode-node/chatParticipants.ts]
            └─ ChatAgents.register()
                 ├─ registerDefaultAgent()     → "Default" (Intent.Unknown / Intent.AskAgent)
                 ├─ registerEditingAgent()     → "Editing" (Intent.Edit)
                 ├─ registerEditsAgent()       → "Edits" (Intent.Agent)
                 ├─ registerVSCodeAgent()      → "VSCode" (Intent.VSCode)
                 ├─ registerTerminalAgent()    → "Terminal" (Intent.Terminal)
                 └─ ... (notebook, terminalPanel, etc.)
```

Each agent calls:
```
vscode.chat.createChatParticipant(id, handler)
  handler = getChatParticipantHandler(id, name, defaultIntentIdOrGetter)
```

---

## 2. Chat Request Flow

```
User types message in chat panel
  └─ VS Code invokes ChatParticipant handler
       └─ getChatParticipantHandler()  [chatParticipants.ts:204]
            ├─ switchToBaseModel() — checks quota, downgrades premium→base if exhausted
            ├─ handle rate-limit switch-to-auto confirmation
            ├─ interactionService.startInteraction()
            ├─ promptCategorizerService.categorizePrompt() — fire-and-forget telemetry
            ├─ resolve intentId (from command or default)
            └─ ChatParticipantRequestHandler  [src/extension/prompt/node/chatParticipantRequestHandler.ts]
                 └─ getResult()
                      └─ routes to Intent handler (AgentIntent, EditCodeIntent, VSCodeIntent, etc.)
```

### Intent Resolution

```
Intent map (src/extension/common/constants.ts):
  Intent.Unknown    → defaultIntentRequestHandler.ts
  Intent.Agent      → agentIntent.ts (tool-calling loop)
  Intent.Edit       → editCodeIntent.ts / editCodeIntent2.ts
  Intent.VSCode     → vscodeIntent.ts
  Intent.Terminal   → terminalIntent.ts
  Intent.Explain    → explainIntent.ts
  Intent.Fix        → fixIntent.ts
  ...
```

---

## 3. Endpoint Resolution

```
Intent handler needs a model endpoint:
  endpointProvider.getChatEndpoint(request)  [IEndpointProvider interface]

ProductionEndpointProvider  [src/extension/prompt/vscode-node/endpointProviderImpl.ts]
  └─ getChatEndpoint(requestOrFamily)
       ├─ string ("copilot-base") → ModelMetadataFetcher.getChatModelFromFamily()
       ├─ LanguageModelChat with vendor !== "copilot" → ExtensionContributedChatEndpoint
       ├─ model.id === "auto" → AutoChatEndpoint (via AutomodeService)
       └─ default → ModelMetadataFetcher.getChatModelFromApiModel(model)
            └─ returns IChatModelInformation → getOrCreateChatEndpointInstance()
                 └─ creates CopilotChatEndpoint(modelMetadata)
```

### ModelMetadataFetcher  [src/platform/endpoint/node/modelMetadataFetcher.ts]

```
_fetchModels()
  ├─ authService.getCopilotToken() → gets copilot token
  ├─ GET /models (via CAPI) with token in Authorization header
  ├─ parses IModelAPIResponse[] from response
  ├─ groups by family → _familyMap (chat) / _completionsFamilyMap (completion)
  ├─ marks is_chat_fallback model as _copilotBaseModel
  └─ caches for 10 minutes
```

---

## 4. ChatEndpoint → LLM Request

```
ChatEndpoint  [src/platform/endpoint/node/chatEndpoint.ts]

makeChatRequest2(options, token)
  └─ _makeChatRequest2()
       └─ chatMLFetcher.fetchOne({ endpoint: this, ...options }, token)

createRequestBody(options)
  ├─ useResponsesApi?  → createResponsesRequestBody()  → POST /responses
  ├─ useMessagesApi?   → createMessagesRequestBody()   → POST /v1/messages (Anthropic)
  └─ default           → createCapiRequestBody()       → POST /chat/completions

API type determined by modelMetadata.supported_endpoints:
  ModelSupportedEndpoint.ChatCompletions  = "/chat/completions"
  ModelSupportedEndpoint.Responses        = "/responses"
  ModelSupportedEndpoint.Messages         = "/v1/messages"
```

### Network Layer

```
IChatMLFetcher.fetchOne()
  └─ builds HTTP request with:
       ├─ URL from endpoint.urlOrRequestMetadata (or CAPI resolve)
       ├─ Authorization: Bearer {copilotToken}
       ├─ extra headers from endpoint.getExtraHeaders(location)
       │    ├─ anthropic-beta (interleaved-thinking, context-management, tool-search)
       │    └─ X-Model-Provider-Preference
       └─ body from endpoint.createRequestBody()

Response processing:
  processResponseFromChatEndpoint()
  ├─ useResponsesApi  → processResponseFromChatEndpoint()  (responsesApi.ts)
  ├─ useMessagesApi   → processResponseFromMessagesEndpoint()  (messagesApi.ts)
  ├─ !streaming       → defaultNonStreamChatResponseProcessor()
  └─ default          → defaultChatResponseProcessor()  (SSE stream via SSEProcessor)
       └─ prepareChatCompletionForReturn()
```

---

## 5. Authentication Flow

```
IAuthenticationService  [src/platform/authentication/common/authentication.ts]
  BaseAuthenticationService
    ├─ anyGitHubSession — cached session with user:email scope
    ├─ permissiveGitHubSession — cached session with repo scope
    ├─ copilotToken — from ICopilotTokenStore (simple token holder)
    └─ getCopilotToken(force?) → ICopilotTokenManager.getCopilotToken()
         └─ mints CopilotToken from GitHub session → stores in ICopilotTokenStore

Key implementations:
  - AuthenticationService (node) — uses vscode.authentication.getSession()
  - StaticGitHubAuthenticationService (test/scenario automation)
  - ICopilotTokenStore → CopilotTokenStore  [copilotTokenStore.ts]
```

### Where auth is consumed:
- `ModelMetadataFetcher._fetchModels()` — gets copilot token for /models API
- `ChatMLFetcher` — uses token for Authorization header on LLM requests
- `ITelemetryUserConfig` — reads trackingId from token claims
- `OctoKitService` — uses GitHub session for GitHub API calls

---

## 6. Telemetry Flow

```
ITelemetryService  [src/platform/telemetry/common/telemetry.ts]
  ├─ sendMSFTTelemetryEvent() — Microsoft internal telemetry
  ├─ sendGHTelemetryEvent() — GitHub telemetry (standard)
  ├─ sendEnhancedGHTelemetryEvent() — includes prompt/suggestion data
  └─ sendTelemetryEvent(name, destination, properties, measurements)

Telemetry senders:
  - IGHTelemetryService — sends to GitHub via secure reporter
  - IMSFTTelemetrySender — sends to Microsoft via 1DS SDK

Key telemetry events:
  - ChatEndpoint: 'completion.finishReason' — per-token finish reason
  - ChatAgents: 'chatRateLimitAction' — rate limit user actions
  - PromptCategorizerService: prompt categorization
  - Various: model selection, feature usage, errors
```

---

## 7. CAPI Client Layer

```
ICAPIClientService  [src/platform/endpoint/common/capiClient.ts]
  BaseCAPIClientService extends CAPIClient (@vscode/copilot-api)
    ├─ machineId, deviceId, sessionId, vscodeVersion from IEnvService
    ├─ injects AB Exp Context headers (VScode-ABExpContext, X-Copilot-Client-Exp-Assignment-Context)
    └─ skips fetch telemetry for high-volume endpoints (Telemetry, ChatCompletions, ChatMessages, ChatResponses)

CAPIClientImpl (node)  [src/platform/endpoint/node/capiClientImpl.ts]
  └─ passes HMAC_SECRET and VSCODE_COPILOT_INTEGRATION_ID from env
```

---

## 8. Complete Request Flow Diagram

```
User Input
  │
  ▼
vscode.chat.createChatParticipant handler
  │
  ▼
getChatParticipantHandler()  ──→ switchToBaseModel() [quota check]
  │                              └─ switchToAutoModel() [rate-limit]
  ▼
ChatParticipantRequestHandler.getResult()
  │
  ▼
Intent Handler (AgentIntent / EditCodeIntent / etc.)
  │
  ▼
endpointProvider.getChatEndpoint(request)
  │
  ├─ ModelMetadataFetcher._fetchModels() → GET /models (CAPI)
  │     └─ authService.getCopilotToken()
  │
  ▼
CopilotChatEndpoint / ChatEndpoint
  │
  ├─ createRequestBody() → POST /chat/completions | /v1/messages | /responses
  │
  ▼
chatMLFetcher.fetchOne()
  │
  ├─ IFetcherService → HTTP request to CAPI endpoint
  │     └─ Authorization: Bearer {copilotToken}
  │
  ▼
SSEProcessor.processSSE()  ← streaming response
  │
  ▼
processResponseFromChatEndpoint()
  │
  ▼
ChatCompletion[] → streamed back to user via ChatResponseStream
```

---

## 9. Key Files Reference

| Layer | File | Purpose |
|-------|------|---------|
| Activation | `src/extension/extension/vscode/extension.ts` | `baseActivate()`, DI setup |
| Services | `src/extension/extension/vscode/services.ts` | 176 service registrations |
| Chat Participants | `src/extension/conversation/vscode-node/chatParticipants.ts` | `createChatParticipant`, agent registration |
| Request Handler | `src/extension/prompt/node/chatParticipantRequestHandler.ts` | Routes requests to intents |
| Endpoint Provider | `src/extension/prompt/vscode-node/endpointProviderImpl.ts` | `ProductionEndpointProvider` |
| Model Metadata | `src/platform/endpoint/node/modelMetadataFetcher.ts` | Fetches models from CAPI `/models` |
| Chat Endpoint | `src/platform/endpoint/node/chatEndpoint.ts` | `ChatEndpoint` base class |
| Copilot Endpoint | `src/platform/endpoint/node/copilotChatEndpoint.ts` | Copilot-specific overrides |
| Auto Endpoint | `src/platform/endpoint/node/autoChatEndpoint.ts` | Auto model routing |
| CAPI Client | `src/platform/endpoint/common/capiClient.ts` | `BaseCAPIClientService` |
| CAPI Impl | `src/platform/endpoint/node/capiClientImpl.ts` | Node implementation |
| Auth Service | `src/platform/authentication/common/authentication.ts` | `IAuthenticationService` |
| Token Store | `src/platform/authentication/common/copilotTokenStore.ts` | `ICopilotTokenStore` |
| Telemetry | `src/platform/telemetry/common/telemetry.ts` | `ITelemetryService` |
| Chat Fetcher | `src/platform/chat/common/chatMLFetcher.ts` | `IChatMLFetcher` |
| Endpoint Types | `src/platform/endpoint/common/endpointProvider.ts` | `IEndpointProvider`, model types |