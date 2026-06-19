# M1: Setup Ambiente — Riepilogo

## Cosa è stato fatto

### 1. Node.js installato via nvm
- Installato **nvm** (Node Version Manager)
- Installato **Node v22.14.0** (richiesto da `package.json` → `engines.node >=22.14.0`)
- npm v10.9.2 incluso

### 2. Dipendenze installate
- `npm install` → **1561 pacchetti** installati
- Postinstall eseguito (symlink per session storage, husky git hooks)

### 3. Fix al build system
Il progetto originale usa `node .esbuild.ts` ma il file è TypeScript, non JS. Abbiamo sostituito `node` con `tsx` in 3 script:

| Script | Prima | Dopo |
|--------|-------|------|
| `compile` | `node .esbuild.ts --dev` | `tsx .esbuild.ts --dev` |
| `build` | `node .esbuild.ts --sourcemaps` | `tsx .esbuild.ts --sourcemaps` |
| `watch:esbuild` | `node .esbuild.ts --watch --dev` | `tsx .esbuild.ts --watch --dev` |

### 4. Fix a `.esbuild.ts`
Il file usava `import.meta.dirname` che non è supportato da `tsx`. Sostituito con `fileURLToPath(import.meta.url)` + `path.dirname()`.

### 5. Build verificato
`npm run compile` completa senza errori. Output in `dist/`:
- `dist/extension.js` — estensione principale (Node)
- `dist/web.js` — versione web worker
- `dist/simulationMain.js` — test simulation
- `dist/worker2.js`, `dist/tikTokenizerWorker.js`, `dist/diffWorker.js`, `dist/tfidfWorker.js` — worker vari
- `dist/copilotCLIShim.js` — shim Copilot CLI
- `dist/copilotDebugCommand.js` — debug command
- `dist/suggestionsPanelWebview.js` — webview pannello suggerimenti

---

## Come lanciare l'estensione in debug

### Prerequisiti
- VS Code con estensione **GitHub Copilot Chat** **disabilitata** (per evitare conflitti)
- Terminale con nvm attivo (vedi sotto)

### Step

1. **Aprire il progetto in VS Code**
   ```bash
   code /home/gianni_moretti/code/vscode-jiido-chat
   ```

2. **Attivare nvm** (se non già attivo)
   ```bash
   export NVM_DIR="$HOME/.nvm"
   [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
   node -v   # deve stampare v22.14.0
   ```

3. **Compilare il codice** (se non già fatto)
   ```bash
   npm run compile
   ```

4. **Avviare il debug**
   - Aprire il pannello **Run and Debug** (Ctrl+Shift+D)
   - Selezionare **"Launch Copilot Extension"** dal dropdown
   - Premere **F5**
   - Si aprirà una nuova finestra VS Code (Extension Development Host) con l'estensione attiva

   In alternativa, usare **"Launch Copilot Extension - Watch Mode"** che compila automaticamente al salvataggio.

### Note
- La prima volta potrebbe chiedere di configurare il `.env` file (mancante). Il launch.json lo referenzia ma è opzionale per il debug base.
- L'estensione tenterà di autenticarsi con GitHub all'avvio (M2 si occuperà di bypassare questo).
- Per vedere i log dell'estensione: `Ctrl+Shift+U` e selezionare "GitHub Copilot" dall'output channel.

---

## Prossimi passi (M1.2)

Da fare:
- Mappare il flusso dei dati: trovare `createChatParticipant`, `getSession`, `sendTelemetryEvent`, endpoint di rete
- Identificare i file chiave per auth, telemetry, e chiamate API