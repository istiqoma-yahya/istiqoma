import type { TargetWithProgress } from "@shared/schema";

export function getTargetDisplayTitle(target: TargetWithProgress, t: (key: string, options?: Record<string, string>) => string): string {
  if (target.name) {
    return target.name;
  }
  
  if (target.unitLabel) {
    return target.unitLabel;
  }
  
  if (target.dzikirType) {
    return t(`dzikir.types.${target.dzikirType}`);
  }
  
  if (target.sholatType) {
    return t(`sholat.types.${target.sholatType}`);
  }
  
  if (target.fastingType) {
    return t(`fasting.types.${target.fastingType}`);
  }
  
  if (target.quranUnit) {
    return t(`quran.units.${target.quranUnit}`);
  }
  
  if (target.sedekahType) {
    return t(`sedekah.types.${target.sedekahType}`);
  }
  
  return target.category;
}
