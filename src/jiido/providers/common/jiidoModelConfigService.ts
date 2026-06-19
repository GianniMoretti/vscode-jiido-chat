/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurationService } from '../../../platform/configuration/common/configurationService';

export interface JiidoModelEntry {
	provider: 'ollama' | 'openai' | 'anthropic' | 'azure' | 'gemini' | 'xai' | 'openrouter' | 'custom';
	model: string;
	baseUrl?: string;
	type?: 'chat' | 'embeddings';
}

export const IJiidoModelConfigService = 'IJiidoModelConfigService';

export interface IJiidoModelConfigService {
	readonly _serviceBrand: undefined;
	getConfiguredModels(): JiidoModelEntry[];
	hasAnyModel(): boolean;
}

export class JiidoModelConfigService implements IJiidoModelConfigService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly _configService: IConfigurationService,
	) { }

	getConfiguredModels(): JiidoModelEntry[] {
		return this._configService.getNonExtensionConfig<JiidoModelEntry[]>('jiido.models') ?? [];
	}

	hasAnyModel(): boolean {
		return this.getConfiguredModels().length > 0;
	}
}
