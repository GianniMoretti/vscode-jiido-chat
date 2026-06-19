/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Commands ending with "Client" refer to the command ID used in the legacy Copilot extension.
// - These IDs should not appear in the package.json file
// - These IDs should be registered to support all functionality (except if this command needs to be supported when both extensions are loaded/active).
// Commands ending with "Chat" refer to the command ID used in the Copilot Chat extension.
// - These IDs should be used in package.json
// - These IDs should only be registered if they appear in the package.json (meaning the command palette) or if the command needs to be supported when both extensions are loaded/active.

export const CMDOpenPanelClient = 'jiido.generate';
export const CMDOpenPanelChat = 'jiido.chat.openSuggestionsPanel'; // "jiido.chat.generate" is already being used

export const CMDAcceptCursorPanelSolutionClient = 'jiido.acceptCursorPanelSolution';
export const CMDNavigatePreviousPanelSolutionClient = 'jiido.previousPanelSolution';
export const CMDNavigateNextPanelSolutionClient = 'jiido.nextPanelSolution';

export const CMDToggleStatusMenuClient = 'jiido.toggleStatusMenu';
export const CMDToggleStatusMenuChat = 'jiido.chat.toggleStatusMenu';

// Needs to be supported in both extensions when they are loaded/active. Requires a different ID.
export const CMDSendCompletionsFeedbackChat = 'jiido.chat.sendCompletionFeedback';

export const CMDEnableCompletionsChat = 'jiido.chat.completions.enable';
export const CMDDisableCompletionsChat = 'jiido.chat.completions.disable';
export const CMDToggleCompletionsChat = 'jiido.chat.completions.toggle';
export const CMDEnableCompletionsClient = 'jiido.completions.enable';
export const CMDDisableCompletionsClient = 'jiido.completions.disable';
export const CMDToggleCompletionsClient = 'jiido.completions.toggle';

export const CMDOpenLogsClient = 'jiido.openLogs';
export const CMDOpenDocumentationClient = 'jiido.openDocs';

// Existing chat command reused for diagnostics
export const CMDCollectDiagnosticsChat = 'jiido.debug.collectDiagnostics';

// Context variable that enable/disable panel-specific commands
export const CopilotPanelVisible = 'jiido.panelVisible';
export const ComparisonPanelVisible = 'jiido.comparisonPanelVisible';
export const HasMultipleCompletionModels = 'jiido.completions.hasMultipleModels';

export const CMDOpenModelPickerClient = 'jiido.openModelPicker';
export const CMDOpenModelPickerChat = 'jiido.chat.openModelPicker';