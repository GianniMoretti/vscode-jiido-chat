/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { AuthenticationGetSessionOptions, AuthenticationSession } from 'vscode';
import { IConfigurationService } from '../../configuration/common/configurationService';
import { ILogService } from '../../log/common/logService';
import { BaseAuthenticationService, GITHUB_SCOPE_USER_EMAIL, StrictAuthenticationPresentationOptions } from './authentication';
import { CopilotToken } from './copilotToken';
import { ICopilotTokenManager } from './copilotTokenManager';
import { ICopilotTokenStore } from './copilotTokenStore';

/**
 * A lightweight auth service for standalone mode.
 * No GitHub authentication — uses a static API key from the CopilotTokenManager.
 */
export class SimpleApiKeyAuthService extends BaseAuthenticationService {
	constructor(
		@ILogService logService: ILogService,
		@ICopilotTokenStore tokenStore: ICopilotTokenStore,
		@ICopilotTokenManager tokenManager: ICopilotTokenManager,
		@IConfigurationService configurationService: IConfigurationService
	) {
		super(logService, tokenStore, tokenManager, configurationService);

		// Set a dummy GitHub session so code that checks anyGitHubSession doesn't break
		this._anyGitHubSession = {
			id: 'jiido-api-key',
			accessToken: 'jiido-api-key',
			scopes: GITHUB_SCOPE_USER_EMAIL,
			account: {
				id: 'jiido-user',
				label: 'Jiido User'
			}
		};

		this._permissiveGitHubSession = {
			id: 'jiido-api-key',
			accessToken: 'jiido-api-key',
			scopes: GITHUB_SCOPE_USER_EMAIL,
			account: {
				id: 'jiido-user',
				label: 'Jiido User'
			}
		};
	}

	override async getGitHubSession(kind: 'permissive' | 'any', options: AuthenticationGetSessionOptions & { createIfNone: StrictAuthenticationPresentationOptions }): Promise<AuthenticationSession>;
	override async getGitHubSession(kind: 'permissive' | 'any', options: AuthenticationGetSessionOptions & { forceNewSession: StrictAuthenticationPresentationOptions }): Promise<AuthenticationSession>;
	override async getGitHubSession(kind: 'permissive' | 'any', options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined>;
	override async getGitHubSession(kind: 'permissive' | 'any', _options: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		if (kind === 'permissive') {
			return this._permissiveGitHubSession;
		}
		return this._anyGitHubSession;
	}

	override async getCopilotToken(force?: boolean): Promise<CopilotToken> {
		return super.getCopilotToken(force);
	}

	override getAnyAdoSession(_options?: AuthenticationGetSessionOptions): Promise<AuthenticationSession | undefined> {
		return Promise.resolve(undefined);
	}

	override getAdoAccessTokenBase64(_options?: AuthenticationGetSessionOptions): Promise<string | undefined> {
		return Promise.resolve(undefined);
	}
}