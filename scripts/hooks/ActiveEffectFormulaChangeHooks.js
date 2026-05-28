import { Constants } from "../constants/Constants.js";
import { ActiveEffectFormulaChatCardService } from "../services/ActiveEffectFormulaChatCardService.js";
import { ActiveEffectFormulaChangeService } from "../services/ActiveEffectFormulaChangeService.js";
import { ActiveEffectConditionService } from "../services/ActiveEffectConditionService.js";
import { ModuleSettings } from "../settings/ModuleSettings.js";

export class ActiveEffectFormulaChangeHooks {
  static #registered = false;
  static #UPDATE_ACTIVATION_OPTION = "formulaActivationTransition";

  static activate() {
    if (
      ActiveEffectFormulaChangeHooks.#registered
      || !Constants.isDnd5eActive()
      || !ModuleSettings.isFormulaChangesEnabled()
    ) {
      return;
    }

    ActiveEffectFormulaChangeHooks.#registered = true;
    Hooks.on("preCreateActiveEffect", ActiveEffectFormulaChangeHooks.#onPreCreateActiveEffect);
    Hooks.on("preUpdateActiveEffect", ActiveEffectFormulaChangeHooks.#onPreUpdateActiveEffect);
    Hooks.on("createActiveEffect", ActiveEffectFormulaChangeHooks.#onCreateActiveEffect);
    Hooks.on("updateActiveEffect", ActiveEffectFormulaChangeHooks.#onUpdateActiveEffect);
  }

  static #onPreCreateActiveEffect(effect, data) {
    ActiveEffectFormulaChangeService.prepareCreateSource(effect, data);
  }

  static #onPreUpdateActiveEffect(effect, updates, options) {
    ActiveEffectFormulaChangeService.prepareUpdateSource(effect, updates, options);
    ActiveEffectFormulaChangeHooks.#storeActivationTransition(effect, updates, options);
  }

  static #onCreateActiveEffect(effect) {
    if (!ActiveEffectFormulaChangeHooks.#shouldRoll(effect) || !ActiveEffectFormulaChangeHooks.#isActive(effect)) {
      return;
    }

    ActiveEffectFormulaChangeHooks.#roll(effect);
  }

  static #onUpdateActiveEffect(effect, updates, options) {
    if (options?.[Constants.MODULE_ID]?.[ActiveEffectFormulaChangeService.ROLL_UPDATE_OPTION]) {
      return;
    }

    const moduleOptions = options?.[Constants.MODULE_ID] ?? {};
    if (
      !moduleOptions[ActiveEffectFormulaChangeHooks.#UPDATE_ACTIVATION_OPTION]
      && !moduleOptions[ActiveEffectFormulaChangeService.REAPPLY_UPDATE_OPTION]
    ) {
      return;
    }

    if (!ActiveEffectFormulaChangeHooks.#shouldRoll(effect) || !ActiveEffectFormulaChangeHooks.#isActive(effect)) {
      return;
    }

    ActiveEffectFormulaChangeHooks.#roll(effect);
  }

  static #shouldRoll(effect) {
    return ActiveEffectFormulaChangeService.hasFormulaChanges(effect)
      && ActiveEffectFormulaChangeService.shouldPromptForCurrentUser(effect);
  }

  static #isActive(effect) {
    const conditionEvaluation = ActiveEffectConditionService.evaluate(effect);
    return effect?.active !== false
      && effect?.disabled !== true
      && !conditionEvaluation.error
      && conditionEvaluation.available;
  }

  static #roll(effect) {
    ActiveEffectFormulaChatCardService.requestRoll(effect, { reason: "activation" })
      .catch(error => console.warn(`[${Constants.MODULE_ID}] active effect formula change hook failed`, error));
  }

  static #storeActivationTransition(effect, updates, options) {
    if (!options || !("disabled" in (updates ?? {}))) {
      return;
    }

    const moduleOptions = options[Constants.MODULE_ID] ?? {};
    moduleOptions[ActiveEffectFormulaChangeHooks.#UPDATE_ACTIVATION_OPTION] = (
      updates.disabled === false
      && !ActiveEffectFormulaChangeHooks.#isActive(effect)
    );
    options[Constants.MODULE_ID] = moduleOptions;
  }
}
