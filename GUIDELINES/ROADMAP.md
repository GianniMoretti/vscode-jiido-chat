# Roadmap di Sviluppo: Jiido Chat Extension for VS Code

Questo documento funge da linea guida per lo sviluppo del fork dell'estensione chat. Ha l'obiettivo di guidare lo sviluppatore umano e l'agente IA nel processo di pulizia, disaccoppiamento dai server GitHub, integrazione modelli esterni (Ollama, API key, LM Studio) e ottimizzazione della gestione del contesto.

---

## 📌 Struttura delle Milestone

M1: Setup & Analisi ──> M2: De-coupling & Pulizia ──> M3: Modelli Esterni (BYOK) ──> M4: UI & Branding ──> M5: Context Engine ──> M6: Build

---

## 🛠 MILESTONE 1: Setup dell'Ambiente e Analisi dell'Architettura
**Obiettivo:** Isolare l'ambiente di sviluppo, installare le dipendenze corrette e mappare i punti di ingresso dell'estensione.

### Capitolo 1.1: Configurazione Ambiente Locale
*   **Obiettivo:** Clonare il codice sorgente ed eseguire l'estensione in modalità sviluppo senza errori.
*   **Fasi Operative:**
    1. Eseguire `npm install` per scaricare i pacchetti.
    2. Configurare il file `.vscode/launch.json` per abilitare l'**Extension Development Host**.
    3. Premere `F5` per verificare che si apra una nuova finestra di VS Code con l'estensione attiva in modalità debug.
*   **Cosa cercare e studiare:**
    *   **File chiave:** `package.json` (sezioni `scripts`, `engines`), `tsconfig.json`.
    *   **Documentazione VS Code:** *Extension Development Host* e *Debugging Extensions*.

### Capitolo 1.2: Mappatura del Flusso dei Dati
*   **Obiettivo:** Identificare dove i messaggi inseriti dall'utente vengono intercettati e passati al modulo di rete.
*   **Fasi Operative:**
    1. Trovare l'attivazione della Chat View (solitamente un `WebviewViewProvider` o la registrazione di un `ChatParticipant` nativo).
    2. Identificare i file che gestiscono il ciclo di vita del messaggio (dall'invio alla ricezione dello stream).
*   **Cosa cercare e studiare:**
    *   **Keyword di ricerca nel codice:** `createChatParticipant`, `registerWebviewViewProvider`, `onDidReceiveMessage`, `postMessage`.

---

## 🧹 MILESTONE 2: De-coupling e Pulizia (Rimozione Stack Copilot)
**Obiettivo:** Sradicare l'autenticazione obbligatoria con GitHub, i moduli di telemetria, i controlli di licenza e le chiamate ai server CAPI.

### Capitolo 2.1: Bypass dell'Autenticazione
*   **Obiettivo:** Rimuovere l'obbligo di login GitHub per usare la chat.
*   **Fasi Operative:**
    1. Creare `SimpleCopilotTokenManager` — restituisce token statico da env `JIIDO_API_KEY`
    2. Creare `SimpleApiKeyAuthService` — auth leggero senza GitHub OAuth
    3. Sostituire `AuthenticationService` → `SimpleApiKeyAuthService` in services.ts
    4. Sostituire `VSCodeCopilotTokenManager` → `SimpleCopilotTokenManager`
*   **Risultato:** Nessuna dipendenza da GitHub OAuth o CAPI token minting.

### Capitolo 2.2: Rimozione Telemetria e Analytics
*   **Obiettivo:** Bloccare qualsiasi invio di dati verso server Microsoft/GitHub.
*   **Fasi Operative:**
    1. Sostituire `TelemetryService` → `NullTelemetryService` (sempre)
    2. Sostituire `MicrosoftExperimentationService` → `NullExperimentationService` (sempre)
    3. Rimuovere import di `TelemetryService`, `MicrosoftExperimentationService`, `APP_INSIGHTS_KEY_*`
*   **Risultato:** Zero telemetry, zero A/B experiments.

### Capitolo 2.3: Rimozione Dipendenze Server Copilot
*   **Obiettivo:** Eliminare chiamate a server CAPI e GitHub API.
*   **Fasi Operative:**
    1. Sostituire `OctoKitService` → `NullBaseOctoKitService` (sempre)
    2. Creare `JiidoEndpointProvider` — hardcoded model info, nessuna chiamata `/models`
    3. Sostituire `ProductionEndpointProvider` → `JiidoEndpointProvider`
    4. Rimuovere import di `ModelMetadataFetcher`, `OctoKitService`, `ScenarioAutomationEndpointProviderImpl`
*   **Risultato:** Nessuna chiamata a `api.copilot.com` o `api.github.com`.

---

## 🔌 MILESTONE 3: Sistema Modelli Esterni (BYOK)
**Obiettivo:** La chat funziona solo con modelli configurati dall'utente — Ollama (locale), LM Studio (locale), o API key (OpenAI, Anthropic, Fireworks, qualsiasi provider OpenAI-compatibile). Nessun modello Copilot predefinito.

### Capitolo 3.1: Pulizia BYOK — Rimuovere Dipendenze Copilot
*   **Obiettivo:** BYOK deve funzionare senza autenticazione Copilot.
*   **Fasi Operative:**
    1. Rimuovere gate `isBYOKEnabled()` in `BYOKContrib` — BYOK sempre attivo
    2. Rimuovere dipendenza da `ICAPIClientService` in `BYOKContrib`
    3. Rimuovere dipendenza da `IAuthenticationService` in `BYOKContrib`
    4. Rimuovere `fetchKnownModelList()` da CDN Microsoft
    5. Rimuovere `knownModels` parameter da tutti i provider (non serve più lista predefinita)
    6. Rimuovere `IExperimentationService` dai provider dove non serve
*   **Cosa cercare:**
    *   `isBYOKEnabled` in `byokProvider.ts`
    *   `ICAPIClientService` in `byokContribution.ts`
    *   `fetchKnownModelList` in `byokContribution.ts`
    *   `knownModels` parameter in costruttori provider

### Capitolo 3.2: Attivazione BYOK Sempre
*   **Obiettivo:** I provider di modelli si registrano all'avvio, senza condizioni.
*   **Fasi Operative:**
    1. Modificare `BYOKContrib._authChange()` → rinominare in `activate()` e chiamare subito nel costruttore
    2. Registrare tutti i provider immediatamente (Ollama, OpenAI, Anthropic, Custom OAI, etc.)
    3. Rimuovere `_byokProvidersRegistered` flag
*   **Cosa cercare:**
    *   `_authChange` in `byokContribution.ts`
    *   `_byokProvidersRegistered` flag

### Capitolo 3.3: Configurazione Modelli via settings.json
*   **Obiettivo:** L'utente configura i modelli in `settings.json` invece di dipendere solo da UI.
*   **Fasi Operative:**
    1. Aggiungere schema settings in `package.json` per `jiido.models`:
    ```json
    "jiido.models": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "provider": { "type": "string", "enum": ["ollama", "openai", "anthropic", "custom"] },
          "model": { "type": "string" },
          "apiKey": { "type": "string" },
          "baseUrl": { "type": "string" },
          "type": { "type": "string", "enum": ["chat", "embeddings"] }
        }
      }
    }
    ```
    2. Creare `JiidoModelConfigService` che legge `jiido.models` da settings
    3. Integrare con `BYOKStorageService` per API key (secrets) + configurazioni
*   **Cosa cercare:**
    *   `contributes.configuration` in `package.json`
    *   `BYOKStorageService` per capire storage pattern

### Capitolo 3.4: No-Models Guard
*   **Obiettivo:** Se nessun modello è configurato, la chat mostra errore + azione per configurare.
*   **Fasi Operative:**
    1. Creare `NoModelsError` o messaggio welcome nella chat
    2. Modificare `ChatParticipantRequestHandler` o `ChatAgents` per controllare se ci sono modelli
    3. Se zero modelli → mostrare messaggio: "Nessun modello configurato. Apri le impostazioni per aggiungere un modello (Ollama, OpenAI, etc.)"
    4. Aggiungere comando `jiido.openSettings` per aprire direttamente le settings
*   **Cosa cercare:**
    *   `ChatParticipantRequestHandler.getResult()` in `chatParticipantRequestHandler.ts`
    *   Welcome message in `chatParticipants.ts`

### Capitolo 3.5: Riorganizzazione File
*   **Obiettivo:** Namespace chiaro, niente riferimenti a "byok" o "copilot".
*   **Fasi Operative:**
    1. Spostare `src/extension/byok/` → `src/jiido/providers/`
    2. Rinominare `BYOKContrib` → `JiidoModelContrib`
    3. Rinominare `BYOKStorageService` → `JiidoStorageService`
    4. Rinominare `BYOKAuthType` → `JiidoAuthType`
    5. Rinominare `BYOKModelConfig` → `JiidoModelConfig`
    6. Aggiornare tutti gli import in services.ts e contributions
    7. Rinominare chiavi secrets da `copilot-byok-*` → `jiido-*`
*   **Nota:** Questa fase può essere fatta dopo che tutto funziona, per ridurre il rischio di errori.

---

## 🎨 MILESTONE 4: UI Refactoring & Branding Customization
**Obiettivo:** Rinominare l'estensione, sostituire le icone e personalizzare i testi.

### Capitolo 4.1: Rinomina e Metadati del Progetto
*   **Fasi Operative:**
    1. Modificare `package.json`: cambiare `name`, `displayName`, `publisher`, `description`.
    2. Rimuovere link a repository Microsoft.
*   **Cosa cercare:**
    *   `package.json`, `README.md`.

### Capitolo 4.2: Icone e Asset Grafici
*   **Fasi Operative:**
    1. Sostituire icone Copilot in `/assets/` con logo Jiido.
    2. Aggiornare percorsi in `package.json` se necessario.

---

## 🧠 MILESTONE 5: Advanced Context Management (Il "Cervello")
**Obiettivo:** Motore client-side per comprimere token prima della chiamata di rete.

### Capitolo 5.1: Sliding Window
*   **Fasi Operative:**
    1. Intercettare array `messages` prima della serializzazione JSON.
    2. Calcolo approssimativo token.
    3. Se supera soglia (es. 128k), rimuovere messaggi più vecchi preservando system prompt.

### Capitolo 5.2: Summarization Asincrona (Opzionale)
*   **Fasi Operative:**
    1. Isolare primi N messaggi da scartare.
    2. Chiamata asincrona a modello veloce per riassunto.
    3. Iniettare riassunto come messaggio di sistema.

---

## 📦 MILESTONE 6: Compilazione, Test e Deployment Locale
**Obiettivo:** Validare e generare il pacchetto `.vsix`.

### Capitolo 6.1: Test
*   Verificare chat con Ollama locale, OpenAI API key, nessun modello configurato.

### Capitolo 6.2: Generazione `.vsix`
*   `npm install -g @vscode/vsce`
*   `vsce package`
*   Installare da VSIX.