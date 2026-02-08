import type { TargetWithProgress } from "@shared/schema";

function translateCategory(category: string, t: (key: string, options?: Record<string, string>) => string): string {
  const key = `categoryNames.${category}`;
  const translated = t(key);
  return translated === key ? category : translated;
}

export function getTargetDisplayTitle(target: TargetWithProgress, t: (key: string, options?: Record<string, string>) => string): string {
  const parts: string[] = [];

  parts.push(translateCategory(target.category, t));

  if (target.dzikirType) {
    parts.push(t(`dzikir.types.${target.dzikirType}`));
  } else if (target.sholatType) {
    parts.push(t(`sholat.types.${target.sholatType}`));
  } else if (target.fastingType) {
    parts.push(t(`fasting.types.${target.fastingType}`));
  } else if (target.sedekahType) {
    parts.push(t(`sedekah.types.${target.sedekahType}`));
  }

  if (target.quranUnit) {
    parts.push(t(`quran.units.${target.quranUnit}`));
  } else if (target.customUnit) {
    const unitKey = target.customUnit === "times" ? "sholat.units.times"
      : target.customUnit === "days" ? "fasting.units.days"
      : target.customUnit === "rakaat" ? "sholat.units.rakaat"
      : `customUnit.units.${target.customUnit}`;
    parts.push(t(unitKey));
  } else if (target.unitLabel) {
    parts.push(target.unitLabel);
  }

  return parts.join(" - ");
}
