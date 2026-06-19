/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../util/vs/base/common/event';
import { Disposable, toDisposable } from '../../../util/vs/base/common/lifecycle';
import { CopilotToken, createTestExtendedTokenInfo } from '../common/copilotToken';
import { ICopilotTokenManager } from '../common/copilotTokenManager';

/**
 * A CopilotTokenManager that returns a static API key from env var JIIDO_API_KEY.
 * No GitHub auth, no CAPI token minting. Used for standalone/self-hosted mode.
 */
export class SimpleCopilotTokenManager extends Disposable implements ICopilotTokenManager {
	declare readonly _serviceBrand: undefined;

	private readonly _copilotTokenRefreshEmitter = this._register(new Emitter<void>());
	readonly onDidCopilotTokenRefresh = this._copilotTokenRefreshEmitter.event;

	private _isDisposed = false;

	constructor() {
		super();
		this._register(toDisposable(() => this._isDisposed = true));
	}

	async getCopilotToken(_force?: boolean): Promise<CopilotToken> {
		const apiKey = process.env.JIIDO_API_KEY ?? 'jiido-dummy-token';

		const extendedInfo = createTestExtendedTokenInfo({
			token: apiKey,
			username: 'jiido-user',
			copilot_plan: 'individual',
			individual: true,
			sku: 'individual',
		});

		return new CopilotToken(extendedInfo);
	}

	resetCopilotToken(_httpError?: number): void {
		// No-op: static token doesn't need reset
	}
}