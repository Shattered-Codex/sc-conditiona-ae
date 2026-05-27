import { Constants } from "../constants/Constants.js";
import { ActiveEffectTransferMetadataService } from "../services/ActiveEffectTransferMetadataService.js";

export class EffectApplicationHooks {
  static #patched = false;

  static activate() {
    if (EffectApplicationHooks.#patched || !Constants.isDnd5eActive()) {
      return;
    }

    const elementClass = globalThis.window?.customElements?.get?.("effect-application");
    const originalApply = elementClass?.prototype?._applyEffectToActor;
    if (typeof originalApply !== "function") {
      console.warn(`[${Constants.MODULE_ID}] EffectApplicationHooks: could not patch _applyEffectToActor — element or method not found`, { elementClass, originalApply });
      return;
    }

    elementClass.prototype._applyEffectToActor = async function(effect, actor) {
      if (!(effect instanceof CONFIG.ActiveEffect.documentClass)) {
        return originalApply.call(this, effect, actor);
      }

      Constants.debug("EffectApplicationHooks._applyEffectToActor", { effect, actor });
      const activity = this.chatMessage?.getAssociatedActivity?.() ?? null;
      const sourceEffect = EffectApplicationHooks.#resolveSourceEffect(effect, activity);
      const concentration = this.chatMessage?.getAssociatedActor?.()?.effects?.get?.(this.chatMessage?.system?.concentration);
      const origin = concentration ?? sourceEffect ?? effect;
      if (!game.user.isGM && !actor?.isOwner) {
        throw new Error(game.i18n.localize("DND5E.EffectApplyWarningOwnership"));
      }

      const effectFlags = {
        flags: {
          dnd5e: {
            dependentOn: origin.uuid,
            scaling: this.chatMessage?.system?.scaling,
            spellLevel: this.chatMessage?.system?.spellLevel
          }
        }
      };

      const existingEffect = actor.effects.find(candidate => candidate.origin === origin.uuid);
      if (existingEffect) {
        const updateData = foundry.utils.mergeObject({
          ...EffectApplicationHooks.#getInitialDurationData(effect.constructor),
          disabled: false
        }, effectFlags);
        ActiveEffectTransferMetadataService.mergeModuleFlags(sourceEffect ?? effect, updateData, { activity });
        return existingEffect.update(updateData);
      }

      if (!game.user.isGM && concentration && !concentration.isOwner) {
        throw new Error(game.i18n.localize("DND5E.EffectApplyWarningConcentration"));
      }

      const effectData = foundry.utils.mergeObject({
        ...(sourceEffect ?? effect).toObject(),
        disabled: false,
        transfer: false,
        origin: origin.uuid
      }, effectFlags);
      const flagsMerged = ActiveEffectTransferMetadataService.mergeModuleFlags(sourceEffect ?? effect, effectData, { activity });
      Constants.debug("EffectApplicationHooks._applyEffectToActor: effectData prepared", {
        flagsMerged,
        moduleFlags: foundry.utils.getProperty(effectData, `flags.${Constants.MODULE_ID}`)
      });
      return ActiveEffect.implementation.create(effectData, { parent: actor });
    };

    EffectApplicationHooks.#patched = true;
  }

  static #getInitialDurationData(effectClass) {
    if (typeof effectClass?.getEffectStart === "function") {
      return effectClass.getEffectStart();
    }

    if (typeof effectClass?.getInitialDuration === "function") {
      return effectClass.getInitialDuration();
    }

    return {};
  }

  static #resolveSourceEffect(effect, activity) {
    const resolvedEffect = EffectApplicationHooks.#resolveEffectByUuid(effect?.uuid);
    if (resolvedEffect) {
      return resolvedEffect;
    }

    const activityEffect = EffectApplicationHooks.#resolveActivityEffect(effect, activity);
    if (activityEffect) {
      return activityEffect;
    }

    return effect;
  }

  static #resolveActivityEffect(effect, activity) {
    const item = activity?.item ?? activity?.parent;
    if (!(item instanceof CONFIG.Item.documentClass)) {
      return null;
    }

    if (effect?.id) {
      const matchedById = item.effects?.get?.(effect.id) ?? null;
      if (matchedById instanceof CONFIG.ActiveEffect.documentClass) {
        return matchedById;
      }
    }

    const linkedEffects = (Array.isArray(activity?.effects) ? activity.effects : [...(activity?.effects ?? [])])
      .map(entry => EffectApplicationHooks.#resolveLinkedItemEffect(item, entry))
      .filter(candidate => candidate instanceof CONFIG.ActiveEffect.documentClass);

    if (linkedEffects.length === 1) {
      return linkedEffects[0];
    }

    return linkedEffects.find(candidate => EffectApplicationHooks.#hasMatchingSignature(candidate, effect)) ?? null;
  }

  static #resolveEffectByUuid(uuid) {
    if (!uuid || typeof fromUuidSync !== "function") {
      return null;
    }

    try {
      const resolved = fromUuidSync(uuid);
      return resolved instanceof CONFIG.ActiveEffect.documentClass ? resolved : null;
    } catch {
      return null;
    }
  }

  static #resolveLinkedItemEffect(item, reference) {
    if (!(item instanceof CONFIG.Item.documentClass) || !reference) {
      return null;
    }

    if (reference instanceof CONFIG.ActiveEffect.documentClass) {
      return reference;
    }

    const directId = String(
      reference?.effect?.id
      ?? reference?._id
      ?? reference?.id
      ?? ""
    ).trim();
    if (directId.length) {
      const matchedById = item.effects?.get?.(directId) ?? null;
      if (matchedById instanceof CONFIG.ActiveEffect.documentClass) {
        return matchedById;
      }
    }

    const uuid = String(reference?.uuid ?? reference ?? "").trim();
    if (!uuid.length) {
      return null;
    }

    const parsedId = EffectApplicationHooks.#extractEffectId(uuid);
    if (parsedId) {
      const matchedByParsedId = item.effects?.get?.(parsedId) ?? null;
      if (matchedByParsedId instanceof CONFIG.ActiveEffect.documentClass) {
        return matchedByParsedId;
      }
    }

    if (typeof fromUuidSync !== "function") {
      return null;
    }

    try {
      const resolved = fromUuidSync(uuid, { relative: item, strict: false });
      return resolved instanceof CONFIG.ActiveEffect.documentClass ? resolved : null;
    } catch {
      return null;
    }
  }

  static #extractEffectId(reference) {
    const match = String(reference ?? "").trim().match(/(?:^|\.)ActiveEffect\.([A-Za-z0-9]+)$/);
    return match?.[1] ?? null;
  }

  static #hasMatchingSignature(candidate, effect) {
    const candidateName = String(candidate?.name ?? "").trim();
    const effectName = String(effect?.name ?? "").trim();
    if (!candidateName.length || candidateName !== effectName) {
      return false;
    }

    const candidateChanges = EffectApplicationHooks.#getChangeSignature(candidate?.changes ?? []);
    const effectChanges = EffectApplicationHooks.#getChangeSignature(effect?.changes ?? []);
    if (candidateChanges.length !== effectChanges.length) {
      return false;
    }

    return candidateChanges.every((change, index) => (
      change.key === effectChanges[index]?.key
      && change.mode === effectChanges[index]?.mode
    ));
  }

  static #getChangeSignature(changes) {
    if (!Array.isArray(changes)) {
      return [];
    }

    return changes.map(change => ({
      key: String(change?.key ?? "").trim(),
      mode: Number(change?.mode ?? 0)
    }));
  }
}
