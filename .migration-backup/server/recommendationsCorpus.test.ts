// Run with: npx tsx --test server/recommendationsCorpus.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  arabicMatchesEntry,
  CORPUS_ENTRIES,
  isBukhariNumberInRange,
  isMuslimNumberInRange,
  isQuranReferenceInRange,
  lookupCorpusEntry,
} from "./recommendationsCorpus";

test("isQuranReferenceInRange accepts canonical surah:ayah", () => {
  assert.equal(isQuranReferenceInRange("QS Al-Baqarah 2:152"), true);
  assert.equal(isQuranReferenceInRange("Quran 2:286"), true); // last ayah of Al-Baqarah
  assert.equal(isQuranReferenceInRange("Qur'an 1:7"), true);
  assert.equal(isQuranReferenceInRange("QS Al-Baqarah 2:1-5"), true); // ayah range
});

test("isQuranReferenceInRange rejects out-of-mushaf surah:ayah", () => {
  assert.equal(isQuranReferenceInRange("QS Al-Fatihah 1:99"), false); // surah 1 only has 7
  assert.equal(isQuranReferenceInRange("Quran 2:9999"), false);
  assert.equal(isQuranReferenceInRange("Quran 200:1"), false); // no surah 200
  assert.equal(isQuranReferenceInRange("QS Al-Baqarah 2:285-9999"), false); // bad range upper
});

test("isQuranReferenceInRange rejects refs without numeric surah:ayah", () => {
  assert.equal(isQuranReferenceInRange("Surah Al-Baqarah ayat 152"), false);
});

test("isBukhariNumberInRange accepts in-range numbers including 6407", () => {
  assert.equal(isBukhariNumberInRange("HR. Bukhari no. 1"), true);
  assert.equal(isBukhariNumberInRange("HR. Bukhari no. 6407"), true);
  assert.equal(isBukhariNumberInRange("Sahih al-Bukhari 7563"), true);
});

test("isBukhariNumberInRange rejects out-of-range numbers", () => {
  assert.equal(isBukhariNumberInRange("HR. Bukhari no. 99999"), false);
});

test("isMuslimNumberInRange accepts in-range numbers", () => {
  assert.equal(isMuslimNumberInRange("HR. Muslim no. 2675"), true);
  assert.equal(isMuslimNumberInRange("Sahih Muslim 1"), true);
});

test("lookupCorpusEntry returns entries for curated citations across display variants", () => {
  const a = lookupCorpusEntry("quran", "QS Al-Baqarah 2:152");
  const b = lookupCorpusEntry("quran", "Quran 2:152");
  assert.ok(a && b);
  assert.equal(a.refKey, "2:152");
  assert.equal(b.refKey, "2:152");
});

test("lookupCorpusEntry returns null for in-range citations not in the curated corpus", () => {
  // 6407 is in range, just not curated. With the validator's fail-closed
  // policy in server/recommendations.ts, this null causes the item to be
  // dropped — the curated corpus IS the accept-list.
  assert.equal(lookupCorpusEntry("bukhari", "HR. Bukhari no. 6407"), null);
  assert.equal(lookupCorpusEntry("muslim", "HR. Muslim no. 2675"), null);
});

test("arabicMatchesEntry accepts canonical Arabic text (with diacritics)", () => {
  const entry = lookupCorpusEntry("quran", "QS Al-Baqarah 2:152");
  assert.ok(entry);
  const arabic = "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ";
  assert.equal(arabicMatchesEntry(entry, arabic), true);
});

test("arabicMatchesEntry accepts a quoted portion of the canonical text", () => {
  const entry = lookupCorpusEntry("quran", "QS Ar-Ra'd 13:28");
  assert.ok(entry);
  const arabic = "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ";
  assert.equal(arabicMatchesEntry(entry, arabic), true);
});

test("arabicMatchesEntry rejects fabricated Arabic for a curated citation", () => {
  const entry = lookupCorpusEntry("bukhari", "HR. Bukhari no. 1");
  assert.ok(entry);
  // Plausible Arabic but NOT the actual hadith text.
  assert.equal(arabicMatchesEntry(entry, "الحمد لله رب العالمين"), false);
});

test("arabicMatchesEntry rejects canonical phrase plus fabricated additions", () => {
  const entry = lookupCorpusEntry("bukhari", "HR. Bukhari no. 1");
  assert.ok(entry);
  // Real opening phrase, but with extra invented material appended.
  const tampered = "إنما الأعمال بالنيات ومن قال هذا الكلام المخترع فله أجر عظيم";
  assert.equal(arabicMatchesEntry(entry, tampered), false);
});

test("arabicMatchesEntry tolerates alef/ya orthography differences", () => {
  const entry = lookupCorpusEntry("quran", "QS Al-'Alaq 96:1");
  assert.ok(entry);
  const arabic = "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ";
  assert.equal(arabicMatchesEntry(entry, arabic), true);
});

test("lookupCorpusEntry rejects multi-ayah ranges even when start ayah is curated", () => {
  // 2:152 is curated, but the curated text only covers ayah 152. Submitting
  // "QS Al-Baqarah 2:152-153" must NOT silently match the 2:152 entry.
  assert.equal(lookupCorpusEntry("quran", "QS Al-Baqarah 2:152-153"), null);
  // Same-ayah "range" still resolves.
  const single = lookupCorpusEntry("quran", "QS Al-Baqarah 2:152-152");
  assert.ok(single);
  assert.equal(single.refKey, "2:152");
});

test("arabicMatchesEntry rejects trivially short snippets even if they appear in canonical text", () => {
  const entry = lookupCorpusEntry("muslim", "HR. Muslim no. 223");
  assert.ok(entry);
  // "الله" is a substring of nearly any canonical text — must be rejected
  // by the minimum-length guard.
  assert.equal(arabicMatchesEntry(entry, "الله"), false);
  // The full canonical phrase still passes.
  assert.equal(arabicMatchesEntry(entry, "الطُّهُورُ شَطْرُ الْإِيمَانِ وَالْحَمْدُ لِلَّهِ تَمْلَأُ الْمِيزَانَ"), true);
});

test("CORPUS_ENTRIES are unique by (kind, refKey) and all have canonical text", () => {
  const seen = new Set<string>();
  for (const e of CORPUS_ENTRIES) {
    const k = `${e.kind}:${e.refKey}`;
    assert.equal(seen.has(k), false, `duplicate corpus entry ${k}`);
    seen.add(k);
    assert.ok(e.canonical.length > 0, `entry ${k} missing canonical text`);
  }
});
