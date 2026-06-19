/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LanguageModelChatInformation, LanguageModelChatProvider, lm } from 'vscode';
import { IVSCodeExtensionContext } from '../../../platform/extContext/common/extensionContext';
import { ILogService } from '../../../platform/log/common/logService';
import { Disposable } from '../../../util/vs/base/common/lifecycle';
import { IInstantiationService } from '../../../util/vs/platform/instantiation/common/instantiation';
import { IExtensionContribution } from '../../common/contributions';
import { AnthropicLMProvider } from './anthropicProvider';
import { AzureBYOKModelProvider } from './azureProvider';
import { BYOKStorageService, IBYOKStorageService } from './byokStorageService';
import { CustomOAIBYOKModelProvider } from './customOAIProvider';
import { GeminiNativeBYOKLMProvider } from './geminiNativeProvider';
import { OllamaLMProvider } from './ollamaProvider';
import { OAIBYOKLMProvider } from './openAIProvider';
import { OpenRouterLMProvider } from './openRouterProvider';
import { XAIBYOKLMProvider } from './xAIProvider';

export class BYOKContrib extends Disposable implements IExtensionContribution {
	public readonly id: string = 'byok-contribution';
	private readonly _byokStorageService: IBYOKStorageService;
	private readonly _providers: Map<string, LanguageModelChatProvider<LanguageModelChatInformation>> = new Map();

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
		this._providers.set(OllamaLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(OllamaLMProvider, this._byokStorageService));
		this._providers.set(AnthropicLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(AnthropicLMProvider, this._byokStorageService));
		this._providers.set(GeminiNativeBYOKLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(GeminiNativeBYOKLMProvider, this._byokStorageService));
		this._providers.set(XAIBYOKLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(XAIBYOKLMProvider, this._byokStorageService));
		this._providers.set(OAIBYOKLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(OAIBYOKLMProvider, this._byokStorageService));
		this._providers.set(OpenRouterLMProvider.providerName.toLowerCase(), this._instantiationService.createInstance(OpenRouterLMProvider, this._byokStorageService));
		this._providers.set(AzureBYOKModelProvider.providerName.toLowerCase(), this._instantiationService.createInstance(AzureBYOKModelProvider, this._byokStorageService));
		this._providers.set(CustomOAIBYOKModelProvider.providerName.toLowerCase(), this._instantiationService.createInstance(CustomOAIBYOKModelProvider, this._byokStorageService));

		for (const [providerName, provider] of this._providers) {
			this._store.add(lm.registerLanguageModelChatProvider(providerName, provider));
		}
	}
}
