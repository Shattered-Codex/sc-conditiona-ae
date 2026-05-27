import { Constants } from "../constants/Constants.js";
import { ActiveEffectTransferContextService } from "../services/ActiveEffectTransferContextService.js";
import { ActiveEffectTransferMetadataService } from "../services/ActiveEffectTransferMetadataService.js";

export class ActiveEffectTransferHooks {
  static #registered = false;

  static activate() {
    if (ActiveEffectTransferHooks.#registered || !Constants.isDnd5eActive()) {
      return;
    }

    ActiveEffectTransferHooks.#registered = true;
    Hooks.on("preCreateActiveEffect", ActiveEffectTransferHooks.#onPreCreateActiveEffect);
  }

  static #onPreCreateActiveEffect(effect, data, _options, userId) {
    if (ActiveEffectTransferHooks.#syncModuleFlagsFromTidyTransfer(effect, data, userId)) {
      return;
    }

    ActiveEffectTransferMetadataService.syncModuleFlagsFromOrigin(effect, data);
  }

  static #syncModuleFlagsFromTidyTransfer(effect, data, userId) {
    const actor = effect?.parent;
    if (!(actor instanceof CONFIG.Actor.documentClass)) {
      return false;
    }

    const sourceEffect = ActiveEffectTransferContextService.consumeMatchingDrop({
      actorUuid: actor.uuid,
      effectData: data,
      userId: userId ?? game.user?.id
    });
    if (!sourceEffect || !ActiveEffectTransferMetadataService.mergeModuleFlags(sourceEffect, data, {
      allowActivityFormulaInference: true
    })) {
      return false;
    }

    effect.updateSource({ flags: { [Constants.MODULE_ID]: data.flags?.[Constants.MODULE_ID] ?? {} } });
    return true;
  }
}
