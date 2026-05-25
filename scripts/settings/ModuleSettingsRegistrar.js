import { Constants } from "../constants/Constants.js";
import { DocumentationMenu } from "./DocumentationMenu.js";
import { ModuleSettings } from "./ModuleSettings.js";
import { SupportMenu } from "./SupportMenu.js";
import { resolveSettingsRoot } from "./resolveSettingsRoot.js";

export class ModuleSettingsRegistrar {
  static #registered = false;

  static register() {
    if (ModuleSettingsRegistrar.#registered) {
      return;
    }
    ModuleSettingsRegistrar.#registered = true;

    ModuleSettingsRegistrar.#registerFormulaSetting();
    ModuleSettingsRegistrar.#registerFormulaChatCardSetting();
    ModuleSettingsRegistrar.#registerConditionTabSetting();
    ModuleSettingsRegistrar.#registerDebugSetting();
    ModuleSettingsRegistrar.#registerSupportMenu();
    ModuleSettingsRegistrar.#registerDocumentationMenu();
    ModuleSettingsRegistrar.#registerConditionTabDaeNotice();
  }

  static #registerFormulaSetting() {
    game.settings.register(Constants.MODULE_ID, ModuleSettings.SETTING_ENABLE_FORMULA_CHANGES, {
      name: Constants.localize("SCConditionalAE.Settings.EnableFormulaChanges.Name", "Enable formula column"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.EnableFormulaChanges.Hint",
        "Adds the Formula column to Active Effect changes and rolls formulas when effects are activated."
      ),
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });
  }

  static #registerFormulaChatCardSetting() {
    game.settings.register(Constants.MODULE_ID, ModuleSettings.SETTING_USE_FORMULA_CHAT_CARD, {
      name: Constants.localize("SCConditionalAE.Settings.UseFormulaChatCard.Name", "Post formula roll chat card"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.UseFormulaChatCard.Hint",
        "When a conditional effect becomes available or a formula-backed Active Effect is activated, post a chat card with a roll button instead of rolling immediately."
      ),
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
  }

  static #registerConditionTabSetting() {
    game.settings.register(Constants.MODULE_ID, ModuleSettings.SETTING_SHOW_CONDITION_TAB, {
      name: Constants.localize("SCConditionalAE.Settings.ShowConditionTab.Name", "Show condition tab"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.ShowConditionTab.Hint",
        "Adds the Condition tab to Active Effect configuration sheets."
      ),
      scope: "world",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });
  }

  static #registerDebugSetting() {
    game.settings.register(Constants.MODULE_ID, ModuleSettings.SETTING_DEBUG_LOGGING, {
      name: Constants.localize("SCConditionalAE.Settings.DebugLogging.Name", "Enable debug logging"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.DebugLogging.Hint",
        "Logs condition evaluation, suppression refreshes, and activation transitions to the browser console."
      ),
      scope: "client",
      config: true,
      type: Boolean,
      default: false
    });
  }

  static #registerConditionTabDaeNotice() {
    const settingId = `${Constants.MODULE_ID}.${ModuleSettings.SETTING_SHOW_CONDITION_TAB}`;
    const noticeText = Constants.localize(
      "SCConditionalAE.Settings.ShowConditionTab.DaeNotice",
      "If you use Dynamic Active Effects (DAE) with the condition tab enabled, a libWrapper conflict warning may appear in the browser console. This is expected behavior and can be safely ignored."
    );

    Hooks.on("renderSettingsConfig", (_app, html) => {
      const root = resolveSettingsRoot(html);
      if (!root) {
        return;
      }

      const settingRow = root.querySelector(
        `[data-setting-id="${settingId}"], [data-key="${settingId}"]`
      );
      if (!settingRow || settingRow.dataset.scCaeDaeNoticeBound === "true") {
        return;
      }

      settingRow.dataset.scCaeDaeNoticeBound = "true";
      const notice = document.createElement("p");
      notice.className = "sc-cae-settings-notice";
      notice.innerHTML = `<i class="fas fa-triangle-exclamation"></i><span>${noticeText}</span>`;
      settingRow.insertAdjacentElement("afterend", notice);
    });
  }

  static #registerSupportMenu() {
    game.settings.registerMenu(Constants.MODULE_ID, ModuleSettings.SETTING_SUPPORT_MENU, {
      name: Constants.localize("SCConditionalAE.Settings.SupportMenu.Name", "Support the developer"),
      label: Constants.localize("SCConditionalAE.Settings.SupportMenu.Label", "Patreon support"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.SupportMenu.Hint",
        "Support Shattered Codex development on Patreon."
      ),
      icon: "fas fa-heart",
      type: SupportMenu,
      restricted: true
    });

    Hooks.on("renderSettingsConfig", (_app, html) => {
      SupportMenu.bindSettingsButton(html);
    });
  }

  static #registerDocumentationMenu() {
    game.settings.registerMenu(Constants.MODULE_ID, ModuleSettings.SETTING_DOCUMENTATION_MENU, {
      name: Constants.localize("SCConditionalAE.Settings.DocumentationMenu.Name", "Documentation"),
      label: Constants.localize("SCConditionalAE.Settings.DocumentationMenu.Label", "Open wiki"),
      hint: Constants.localize(
        "SCConditionalAE.Settings.DocumentationMenu.Hint",
        "Open the SC - Conditional AE documentation wiki."
      ),
      icon: "fas fa-hat-wizard",
      type: DocumentationMenu,
      restricted: true
    });

    Hooks.on("renderSettingsConfig", (_app, html) => {
      DocumentationMenu.bindSettingsButton(html);
    });
  }
}
