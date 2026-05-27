import { Constants } from "../constants/Constants.js";
import { ActiveEffectTransferContextService } from "../services/ActiveEffectTransferContextService.js";

export class ActiveEffectTransferContextHooks {
  static #TIDY_MODULE_ID = "tidy5e-sheet";
  static #registered = false;

  static activate() {
    if (ActiveEffectTransferContextHooks.#registered || !Constants.isDnd5eActive()) {
      return;
    }

    ActiveEffectTransferContextHooks.#registered = true;
    Hooks.on("dropActorSheetData", ActiveEffectTransferContextHooks.#onDropActorSheetData);
  }

  static #onDropActorSheetData(actor, app, data) {
    if (
      !(actor instanceof CONFIG.Actor.documentClass)
      || !ActiveEffectTransferContextHooks.#isTidyActorSheet(app)
      || data?.type !== "ActiveEffect"
      || !data?.uuid
    ) {
      return true;
    }

    ActiveEffectTransferContextService.rememberDrop({
      actorUuid: actor.uuid,
      effectUuid: data.uuid,
      userId: game.user?.id
    });

    return true;
  }

  static #isTidyActorSheet(app) {
    if (game.modules?.get(ActiveEffectTransferContextHooks.#TIDY_MODULE_ID)?.active !== true) {
      return false;
    }

    const element = app?.element?.[0] ?? app?.element ?? null;
    const sheetModule = element?.dataset?.sheetModule
      ?? element?.getAttribute?.("data-sheet-module")
      ?? "";
    if (sheetModule === ActiveEffectTransferContextHooks.#TIDY_MODULE_ID) {
      return true;
    }

    return String(app?.constructor?.name ?? "").includes("Tidy5e");
  }
}
