import type { TargetWithProgress, CustomDzikirType } from "@shared/schema";

type TFunc = (key: string, options?: Record<string, string>) => string;

export function resolveDzikirTypeLabel(
  dzikirType: string,
  t: TFunc,
  customDzikirTypes?: CustomDzikirType[],
): string {
  const key = `dzikir.types.${dzikirType}`;
  const translated = t(key);
  if (translated !== key) return translated;
  if (customDzikirTypes) {
    const match = customDzikirTypes.find((ct) => ct.label === dzikirType);
    if (match) return match.label;
  }
  return dzikirType;
}

function translateCategory(category: string, t: TFunc): string {
  const key = `categoryNames.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

export function getTargetDisplayTitle(target: TargetWithProgress, t: TFunc, customDzikirTypes?: CustomDzikirType[]): string {
  if (target.name) {
    return target.name;
  }
  return getTargetCategoryLine(target, t, customDzikirTypes);
}

export function getTargetCategoryLine(target: TargetWithProgress, t: TFunc, customDzikirTypes?: CustomDzikirType[]): string {
  const parts: string[] = [];

  parts.push(translateCategory(target.category, t));

  if (target.dzikirType) {
    parts.push(resolveDzikirTypeLabel(target.dzikirType, t, customDzikirTypes));
  } else if (target.sholatType) {
    parts.push(t(`sholat.types.${target.sholatType}`));
  } else if (target.fastingType) {
    parts.push(t(`fasting.types.${target.fastingType}`));
  } else if (target.sedekahType) {
    parts.push(t(`sedekah.types.${target.sedekahType}`));
  }

  return parts.join(" - ");
}

export function getTargetUnitLabel(target: TargetWithProgress, t: TFunc): string {
  if (target.quranUnit) {
    return t(`quran.units.${target.quranUnit}`);
  }
  if (target.customUnit) {
    const unitKey = target.customUnit === "times" ? "sholat.units.times"
      : target.customUnit === "days" ? "fasting.units.days"
      : target.customUnit === "rakaat" ? "sholat.units.rakaat"
      : `customUnit.units.${target.customUnit}`;
    return t(unitKey);
  }
  if (target.unitLabel) {
    return target.unitLabel;
  }
  return "";
}
