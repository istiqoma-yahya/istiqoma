interface CalculatePointsInput {
  category: string;
  quantity: number;
  isJamaah?: boolean;
  quranUnit?: string;
  dzikirType?: string;
  sholatType?: string;
  fastingType?: string;
  sedekahType?: string;
  customUnit?: string;
}

const PROTECTED_CATEGORIES = [
  "dzikir",
  "sholat fardhu",
  "sholat sunnah",
  "puasa",
  "puasa fardhu",
  "puasa sunnah",
  "fasting",
  "fasting fardhu",
  "fasting sunnah",
  "baca quran",
  "quran",
  "hafalan quran",
  "shodaqoh",
  "sedekah",
  "sodaqoh",
];

export function calculatePoints(input: CalculatePointsInput): number {
  if (!input.category) {
    return 50;
  }
  const categoryLower = input.category.toLowerCase();
  const quantity = input.quantity || 1;

  if (categoryLower === "dzikir" || categoryLower === "dzikr") {
    return 1 * quantity;
  }

  if (categoryLower === "sholat fardhu") {
    const basePoints = 100 * quantity;
    const jamaahBonus = input.isJamaah ? 50 : 0;
    return basePoints + jamaahBonus;
  }

  if (categoryLower === "sholat sunnah") {
    const basePoints = 50 * quantity;
    const jamaahBonus = input.isJamaah ? 50 : 0;
    return basePoints + jamaahBonus;
  }

  if (categoryLower === "puasa" || categoryLower === "fasting" || categoryLower === "puasa fardhu" || categoryLower === "fasting fardhu" || categoryLower === "puasa sunnah" || categoryLower === "fasting sunnah") {
    const FARDHU_FASTING_TYPES = ["ramadhan", "qadha", "kaffarah", "nadzar"];
    const fastingTypeLower = input.fastingType?.toLowerCase();
    if (fastingTypeLower && FARDHU_FASTING_TYPES.includes(fastingTypeLower)) {
      return 500 * quantity;
    }
    if (categoryLower === "puasa fardhu" || categoryLower === "fasting fardhu") {
      return 500 * quantity;
    }
    return 250 * quantity;
  }

  if (categoryLower === "baca quran" || categoryLower === "quran") {
    const unit = input.quranUnit?.toLowerCase();
    switch (unit) {
      case "ayat":
        return 1 * quantity;
      case "halaman":
        return 10 * quantity;
      case "juz":
        return 200 * quantity;
      case "surat":
      case "surah":
        return 200 * quantity;
      default:
        return 1 * quantity;
    }
  }

  if (categoryLower === "hafalan quran") {
    return 5 * quantity;
  }

  if (categoryLower === "shodaqoh" || categoryLower === "sedekah" || categoryLower === "sodaqoh") {
    return 100;
  }

  const isCustomCategory = !PROTECTED_CATEGORIES.includes(categoryLower);
  if (isCustomCategory) {
    return 50;
  }

  return 50;
}
