# M3 — Sistema Modelli Esterni (BYOK)

## Visione

La chat funziona **solo** con modelli configurati dall'utente. Nessun modello Copilot predefinito. Supporto per:

- **Provider locali:** Ollama, LM Studio (nessuna API key richiesta)
- **Provider cloud:** OpenAI, Anthropic, Fireworks AI, xAI, OpenRouter, Azure OpenAI, Custom OpenAI-compatibile
- **Configurazione:** via `settings.json` + secrets API key

Se nessun modello è configurato → la chat mostra errore con link per configurare.

---

## Capitolo 3.1: Pulizia BYOK — Rimuovere Dipendenze Copilot

### Obiettivo
BYOK deve funzionare senza autenticazione Copilot, senza CAPI, senza CDN Microsoft.

### File da modificare

| File | Cosa cambiare |
|------|---------------|
| `src/extension/byok/vscode-node/byokContribution.ts` | Rimuovere `ICAPIClientService`, `IAuthenticationService`, `fetchKnownModelList()`, `isBYOKEnabled()` gate |
| `src/extension/byok/common/byokProvider.ts` | Rimuovere `isBYOKEnabled()`, `CopilotToken` import |
| `src/extension/byok/vscode-node/anthropicProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/openAIProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/azureProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/geminiNativeProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/xAIProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/customOAIProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/openRouterProvider.ts` | Rimuovere `knownModels` parameter |
| `src/extension/byok/vscode-node/ollamaProvider.ts` | Rimuovere `IExperimentationService` (non serve) |

### Dettaglio modifiche byokContribution.ts

**Prima:**
```typescript
constructor(
    @IFetcherService private readonly _fetcherService: IFetcherService,
    @ILogService private readonly _logService: ILogService,
    @ICAPIClientService private readonly _capiClientService: ICAPIClientService,
    @IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
    @IAuthenticationService authService: IAuthenticationService,
    @IInstantiationService private readonly _instantiationService: IInstantiationService,
) {
    super();
    this._byokStorageService = new BYOKStorageService(extensionContext);
    this._authChange(authService, this._instantiationService);
    this._register(authService.onDidAuthenticationChange(() => {
        this._authChange(authService, this._instantiationService);
    }));
}

private async _authChange(authService: IAuthenticationService, instantiationService: IInstantiationService) {
    if (authService.copilotToken && isBYOKEnabled(authService.copilotToken, this._capiClientService) && !this._byokProvidersRegistered) {
        // ... register providers with knownModels from CDN
    }
}
```

**Dopo:**
```typescript
constructor(
    @ILogService private readonly _logService: ILogService,
    @IVSCodeExtensionContext extensionContext: IVSCodeExtensionContext,
    @IInstantiationService private readonly _instantiationService: IInstantiationService,
) {
    super();
    this._byokStorageService = new BYOKStorageService(extensionContext);
    this._registerProviders();
}

private _registerProviders() {
    this._providers.set('ollama', this._instantiationService.createInstance(OllamaLMProvider, this._byokStorageService));
    this._providers.set('openai', this._instantiationService.createInstance(OAIBYOKLMProvider, this._byokStorageService));
    this._providers.set('anthropic', this._instantiationService.createInstance(AnthropicLMProvider, this._byokStorageService));
    this._providers.set('azure', this._instantiationService.createInstance(AzureBYOKModelProvider, this._byokStorageService));
    this._providers.set('gemini', this._instantiationService.createInstance(GeminiNativeBYOKLMProvider, this._byokStorageService));
    this._providers.set('xai', this._instantiationService.createInstance(XAIBYOKLMProvider, this._byokStorageService));
    this._providers.set('openrouter', this._instantiationService.createInstance(OpenRouterLMProvider, this._byokStorageService));
    this._providers.set('custom', this._instantiationService.createInstance(CustomOAIBYOKModelProvider, this._byokStorageService));

    for (const [name, provider] of this._providers) {
        this._store.add(lm.registerLanguageModelChatProvider(name, provider));
    }
}
```

---

## Capitolo 3.2: Attivazione BYOK Sempre

### Obiettivo
Provider registrati subito all'avvio, senza condizioni.

### File da modificare
- `src/extension/byok/vscode-node/byokContribution.ts` — già coperto nel capitolo 3.1
- `src/extension/extension/vscode-node/contributions.ts` — aggiungere `BYOKContrib` alla lista contributi (se non già presente)

### Verifica
Cercare `BYOKContrib` in `contributions.ts` per assicurarsi sia registrato.

---

## Capitolo 3.3: Configurazione Modelli via settings.json

### Obiettivo
L'utente configura i modelli in `settings.json`. Le API key vanno in `vscode.Secrets` (già implementato in `BYOKStorageService`).

### package.json — contributes.configuration

Aggiungere sezione:
```json
"contributes": {
    "configuration": {
        "title": "Jiido Chat",
        "properties": {
            "jiido.models": {
                "type": "array",
                "default": [],
                "description": "Modelli configurati per Jiido Chat",
                "items": {
                    "type": "object",
                    "required": ["provider", "model"],
                    "properties": {
                        "provider": {
                            "type": "string",
                            "enum": ["ollama", "openai", "anthropic", "azure", "gemini", "xai", "openrouter", "custom"],
                            "description": "Provider del modello"
                        },
                        "model": {
                            "type": "string",
                            "description": "ID del modello (es. llama3.2, gpt-4o, claude-3-opus)"
                        },
                        "baseUrl": {
                            "type": "string",
                            "description": "URL base per API (es. http://localhost:11434 per Ollama)"
                        },
                        "type": {
                            "type": "string",
                            "enum": ["chat", "embeddings"],
                            "default": "chat",
                            "description": "Tipo di modello"
                        }
                    }
                }
            }
        }
    }
}
```

### Nuovo file: JiidoModelConfigService

```typescript
// src/extension/byok/common/jiidoModelConfigService.ts
export class JiidoModelConfigService {
    constructor(
        @IConfigurationService private readonly _configService: IConfigurationService,
        @IBYOKStorageService private readonly _storageService: IBYOKStorageService,
    ) {}

    getConfiguredModels(): JiidoModelEntry[] {
        return this._configService.getConfig('jiido.models') ?? [];
    }

    hasAnyModel(): boolean {
        return this.getConfiguredModels().length > 0;
    }

    async getApiKey(provider: string, modelId?: string): Promise<string | undefined> {
        return this._storageService.getAPIKey(provider, modelId);
    }
}
```

---

## Capitolo 3.4: No-Models Guard

### Obiettivo
Se nessun modello configurato, la chat mostra messaggio chiaro.

### Strategia

1. **Welcome message in ChatAgents:** Modificare `registerDefaultAgent()` in `chatParticipants.ts` per controllare se ci sono modelli configurati
2. **Se zero modelli:** Mostrare `additionalWelcomeMessage` con testo:
   > "Nessun modello configurato. Apri le impostazioni (cmd+,) e cerca 'jiido.models' per aggiungere un modello. Supporta Ollama, OpenAI, Anthropic e qualsiasi provider OpenAI-compatibile."
3. **Aggiungere comando:** `jiido.openSettings` che esegue:
   ```typescript
   commands.executeCommand('workbench.action.openSettings', 'jiido.models')
   ```

### File da modificare
- `src/extension/conversation/vscode-node/chatParticipants.ts` — inject `JiidoModelConfigService`, controllare `hasAnyModel()`
- `src/extension/commands/node/commandService.ts` o nuovo file — registrare comando `jiido.openSettings`

---

## Capitolo 3.5: Riorganizzazione File (Posticipabile)

### Obiettivo
Namespace chiaro, niente riferimenti a "byok" o "copilot".

### Operazioni (da fare DOPO che tutto funziona)
1. Spostare `src/extension/byok/` → `src/jiido/providers/`
2. Rinominare classi e tipi (BYOKContrib → JiidoModelContrib, etc.)
3. Aggiornare tutti gli import
4. Rinominare chiavi secrets da `copilot-byok-*` → `jiido-*`

---

## Ordine di Implementazione

1. **3.1** — Pulizia BYOK (rimuovere dipendenze Copilot)
2. **3.3** — Configurazione settings.json + JiidoModelConfigService
3. **3.2** — Attivazione sempre (con registerProviders semplificato)
4. **3.4** — No-models guard (welcome message + comando)
5. Build + test
6. **3.5** — Riorganizzazione file (solo dopo che tutto funziona)