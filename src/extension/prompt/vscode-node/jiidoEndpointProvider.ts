/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LanguageModelChat, type ChatRequest } from 'vscode';
import { ChatEndpointFamily, EmbeddingsEndpointFamily, IChatModelInformation, ICompletionModelInformation, IEndpointProvider } from '../../../platform/endpoint/common/endpointProvider';
import { ChatEndpoint } from '../../../platform/endpoint/node/chatEndpoint';
import { ILogService } from '../../../platform/log/common/logService';
import { IChatEndpoint, IEmbeddingsEndpoint } from '../../../platform/networking/common/networking';
import { TokenizerType } from '../../../util/common/tokenizer';
import { Emitter, Event } from '../../../util/vs/base/common/event';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';

/**
 * Jiido: lightweight endpoint provider that returns a hardcoded endpoint.
 * No CAPI /models calls. No GitHub Copilot server dependency.
 */
export class JiidoEndpointProvider extends Disposable implements IEndpointProvider {
	declare readonly _serviceBrand: undefined;

	private readonly _onDidModelsRefresh = this._register(new Emitter<void>());
	readonly onDidModelsRefresh: Event<void> = this._onDidModelsRefresh.event;

	constructor(
		@ILogService protected readonly _logService: ILogService,
		@IInstantiationService protected readonly _instantiationService: IInstantiationService,
	) {
		super();
	}

	async getChatEndpoint(_requestOrFamilyOrModel: LanguageModelChat | ChatRequest | ChatEndpointFamily): Promise<IChatEndpoint> {
		this._logService.trace(`[Jiido] Resolving chat model (hardcoded)`);

		const modelInfo: IChatModelInformation = {
			id: 'jiido-default',
			vendor: 'jiido',
			name: 'Jiido Default',
			version: '1.0.0',
			model_picker_enabled: true,
			is_chat_default: true,
			is_chat_fallback: true,
			capabilities: {
				type: 'chat',
				family: 'jiido',
				tokenizer: TokenizerType.CL100K,
				limits: {
					max_prompt_tokens: 128000,
					max_output_tokens: 4096,
				},
				supports: {
					streaming: true,
					tool_calls: true,
					vision: false,
				},
			},
		};

		return this._instantiationService.createInstance(ChatEndpoint, modelInfo);
	}

	async getEmbeddingsEndpoint(_family?: EmbeddingsEndpointFamily): Promise<IEmbeddingsEndpoint> {
		throw new Error('Embeddings not supported in Jiido standalone mode');
	}

	async getAllCompletionModels(_forceRefresh?: boolean): Promise<ICompletionModelInformation[]> {
		return [];
	}

	async getAllChatEndpoints(): Promise<IChatEndpoint[]> {
		return [await this.getChatEndpoint('copilot-base' as ChatEndpointFamily)];
	}
}