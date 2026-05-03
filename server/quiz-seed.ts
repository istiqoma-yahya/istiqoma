import { db } from "./db";
import { quizQuestions } from "@shared/schema";
import { sql } from "drizzle-orm";

type SeedQuestion = {
  level: number;
  questionText: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  category: string;
};

const SEED_QUESTIONS: SeedQuestion[] = [
  // ── Level 1 — Foundations of Faith ────────────────────────────
  { level: 1, category: "Aqidah", questionText: "How many pillars of Islam are there?", options: ["3", "4", "5", "6"], correctIndex: 2, explanation: "The five pillars are Shahadah, Salah, Zakah, Sawm (fasting Ramadan), and Hajj." },
  { level: 1, category: "Aqidah", questionText: "Who is the final messenger of Allah?", options: ["Prophet Isa (a.s.)", "Prophet Musa (a.s.)", "Prophet Muhammad ﷺ", "Prophet Ibrahim (a.s.)"], correctIndex: 2, explanation: "Prophet Muhammad ﷺ is the seal of the prophets (Khatam an-Nabiyyin)." },
  { level: 1, category: "Salah", questionText: "How many obligatory daily prayers are there?", options: ["3", "4", "5", "6"], correctIndex: 2, explanation: "Fajr, Dhuhr, Asr, Maghrib, and Isha — five fardh prayers each day." },
  { level: 1, category: "Quran", questionText: "What is the first Surah of the Quran?", options: ["Al-Baqarah", "Al-Fatihah", "An-Nas", "Al-Ikhlas"], correctIndex: 1, explanation: "Al-Fatihah is the opening chapter and is recited in every rak'ah of salah." },
  { level: 1, category: "Sawm", questionText: "In which month do Muslims fast from dawn to sunset?", options: ["Sha'ban", "Ramadan", "Muharram", "Rajab"], correctIndex: 1, explanation: "Fasting in Ramadan is the fourth pillar of Islam." },
  { level: 1, category: "Aqidah", questionText: "What is the literal meaning of the word \"Islam\"?", options: ["Peace and submission", "Faith", "Worship", "Mercy"], correctIndex: 0, explanation: "Islam comes from the root s-l-m, meaning peace and submission to Allah's will." },
  { level: 1, category: "Aqidah", questionText: "How many angels are mentioned by name and role as required belief?", options: ["Belief in all of them", "Only Jibril", "Only the four archangels", "None"], correctIndex: 0, explanation: "Muslims must believe in all angels of Allah, even those whose names we do not know." },
  { level: 1, category: "Hajj", questionText: "Which holy city must every able Muslim visit at least once for Hajj?", options: ["Madinah", "Jerusalem", "Makkah", "Cairo"], correctIndex: 2, explanation: "Hajj is performed at the Ka'bah in Makkah." },
  { level: 1, category: "Quran", questionText: "In which language was the Quran originally revealed?", options: ["Hebrew", "Aramaic", "Arabic", "Persian"], correctIndex: 2, explanation: "The Quran was revealed in Arabic, as Allah states in Surah Yusuf 12:2." },
  { level: 1, category: "Aqidah", questionText: "What is the Shahadah?", options: ["The pilgrimage", "The fast", "The testimony of faith", "The charity"], correctIndex: 2, explanation: "The Shahadah is bearing witness that there is no god but Allah and Muhammad ﷺ is His messenger." },

  // ── Level 2 — Salah & Worship ────────────────────────────────
  { level: 2, category: "Salah", questionText: "How many rak'ahs are in Fajr (fardh)?", options: ["2", "3", "4", "5"], correctIndex: 0, explanation: "Fajr fardh is two rak'ahs, preceded by two sunnah rak'ahs." },
  { level: 2, category: "Salah", questionText: "How many rak'ahs are in Maghrib (fardh)?", options: ["2", "3", "4", "5"], correctIndex: 1, explanation: "Maghrib fardh is three rak'ahs." },
  { level: 2, category: "Salah", questionText: "What direction do Muslims face in prayer?", options: ["East", "Towards Makkah (Qiblah)", "North", "Towards Madinah"], correctIndex: 1, explanation: "Muslims face the Qiblah — the direction of the Ka'bah in Makkah." },
  { level: 2, category: "Wudu", questionText: "Which act invalidates wudu?", options: ["Drinking water", "Speaking", "Passing wind", "Looking at the Quran"], correctIndex: 2, explanation: "Passing wind, urinating, defecating, and deep sleep break wudu." },
  { level: 2, category: "Salah", questionText: "Which Surah is recited in every rak'ah of salah?", options: ["Al-Ikhlas", "Al-Fatihah", "Al-Falaq", "An-Nas"], correctIndex: 1, explanation: "Al-Fatihah is recited in every rak'ah; the Prophet ﷺ said no prayer is valid without it." },
  { level: 2, category: "Salah", questionText: "What is the night prayer voluntarily performed in Ramadan called?", options: ["Tahajjud", "Witr", "Tarawih", "Duha"], correctIndex: 2, explanation: "Tarawih is the special night prayer of Ramadan, prayed in congregation after Isha." },
  { level: 2, category: "Wudu", questionText: "How many times is each washed limb typically rinsed in wudu (sunnah)?", options: ["Once", "Twice", "Three times", "Five times"], correctIndex: 2, explanation: "Three times is the sunnah, though once is the obligatory minimum for most limbs." },
  { level: 2, category: "Salah", questionText: "What is the call to prayer called?", options: ["Iqamah", "Adhan", "Khutbah", "Dua"], correctIndex: 1, explanation: "The Adhan is the public call announcing prayer time; the Iqamah is the second call right before salah begins." },
  { level: 2, category: "Salah", questionText: "Friday congregational prayer is known as:", options: ["Salah al-Eid", "Salah al-Jumu'ah", "Salah al-Janazah", "Salah al-Istikharah"], correctIndex: 1, explanation: "Salah al-Jumu'ah replaces Dhuhr on Fridays and includes a khutbah (sermon)." },
  { level: 2, category: "Salah", questionText: "What position is described by the word \"sujood\"?", options: ["Standing", "Bowing", "Prostration", "Sitting"], correctIndex: 2, explanation: "Sujood is the prostration with forehead, nose, palms, knees, and toes touching the ground." },

  // ── Level 3 — Quran & Prophets ───────────────────────────────
  { level: 3, category: "Quran", questionText: "How many Surahs are in the Quran?", options: ["99", "114", "120", "100"], correctIndex: 1, explanation: "The Quran contains 114 Surahs (chapters)." },
  { level: 3, category: "Quran", questionText: "Which is the longest Surah of the Quran?", options: ["Al-Baqarah", "Yasin", "Al-Kahf", "Al-Imran"], correctIndex: 0, explanation: "Surah Al-Baqarah, with 286 verses, is the longest chapter." },
  { level: 3, category: "Quran", questionText: "Which Surah is known as the \"heart of the Quran\"?", options: ["Al-Fatihah", "Yasin", "Al-Mulk", "Al-Rahman"], correctIndex: 1, explanation: "The Prophet ﷺ called Surah Yasin the heart of the Quran in a well-known narration." },
  { level: 3, category: "Prophets", questionText: "Which prophet is known as Khalilullah (the friend of Allah)?", options: ["Musa (a.s.)", "Ibrahim (a.s.)", "Isa (a.s.)", "Nuh (a.s.)"], correctIndex: 1, explanation: "Allah took Ibrahim (a.s.) as a Khalil — a close friend (Quran 4:125)." },
  { level: 3, category: "Prophets", questionText: "Which prophet was given the Torah?", options: ["Isa (a.s.)", "Dawud (a.s.)", "Musa (a.s.)", "Ibrahim (a.s.)"], correctIndex: 2, explanation: "Musa (a.s.) received the Tawrat (Torah) on Mount Sinai." },
  { level: 3, category: "Prophets", questionText: "Which prophet was given the Zabur (Psalms)?", options: ["Sulayman (a.s.)", "Dawud (a.s.)", "Yahya (a.s.)", "Ya'qub (a.s.)"], correctIndex: 1, explanation: "Dawud (a.s.) was given the Zabur (Quran 4:163)." },
  { level: 3, category: "Quran", questionText: "How many years did the revelation of the Quran take?", options: ["10 years", "Approximately 23 years", "30 years", "5 years"], correctIndex: 1, explanation: "Revelation began at age 40 and continued until the Prophet's ﷺ death — about 23 years." },
  { level: 3, category: "Quran", questionText: "What is the night the Quran was first revealed called?", options: ["Laylat al-Bara'ah", "Laylat al-Qadr", "Laylat al-Mi'raj", "Laylat al-Isra"], correctIndex: 1, explanation: "Laylat al-Qadr — the Night of Power — is described in Surah Al-Qadr." },
  { level: 3, category: "Quran", questionText: "How many ajza (parts/juz) is the Quran divided into?", options: ["20", "30", "40", "60"], correctIndex: 1, explanation: "The Quran is divided into 30 juz to facilitate recitation, especially in Ramadan." },
  { level: 3, category: "Prophets", questionText: "Which prophet's people were destroyed by a great flood?", options: ["Hud (a.s.)", "Salih (a.s.)", "Nuh (a.s.)", "Lut (a.s.)"], correctIndex: 2, explanation: "The flood was sent in the time of Nuh (a.s.) for those who rejected his message." },

  // ── Level 4 — Seerah & History ───────────────────────────────
  { level: 4, category: "Seerah", questionText: "In which city was Prophet Muhammad ﷺ born?", options: ["Madinah", "Makkah", "Ta'if", "Khaybar"], correctIndex: 1, explanation: "He ﷺ was born in Makkah in the Year of the Elephant (~570 CE)." },
  { level: 4, category: "Seerah", questionText: "Who was the Prophet ﷺ's first wife?", options: ["Aisha (r.a.)", "Hafsa (r.a.)", "Khadijah (r.a.)", "Sawda (r.a.)"], correctIndex: 2, explanation: "Khadijah bint Khuwaylid (r.a.) was his first wife and the first to believe in him." },
  { level: 4, category: "Seerah", questionText: "What is the migration from Makkah to Madinah called?", options: ["Isra", "Mi'raj", "Hijrah", "Fath"], correctIndex: 2, explanation: "The Hijrah marks the start of the Islamic (Hijri) calendar." },
  { level: 4, category: "Seerah", questionText: "Who was the first caliph after the Prophet ﷺ?", options: ["Umar ibn al-Khattab (r.a.)", "Uthman ibn Affan (r.a.)", "Ali ibn Abi Talib (r.a.)", "Abu Bakr as-Siddiq (r.a.)"], correctIndex: 3, explanation: "Abu Bakr as-Siddiq (r.a.) was chosen as the first Khalifah." },
  { level: 4, category: "Seerah", questionText: "Which battle is known as the first major battle in Islam?", options: ["Uhud", "Khandaq", "Badr", "Hunayn"], correctIndex: 2, explanation: "The Battle of Badr (2 AH) was the first decisive battle, with the Muslims outnumbered roughly 3:1." },
  { level: 4, category: "Seerah", questionText: "Who was the Prophet ﷺ's youngest daughter?", options: ["Zaynab", "Ruqayyah", "Umm Kulthum", "Fatimah"], correctIndex: 3, explanation: "Fatimah az-Zahra (r.a.) was his youngest daughter and the only one to outlive him briefly." },
  { level: 4, category: "Seerah", questionText: "At what age did Prophet Muhammad ﷺ receive the first revelation?", options: ["25", "30", "40", "50"], correctIndex: 2, explanation: "He ﷺ received the first revelation at age 40 in the Cave of Hira." },
  { level: 4, category: "Seerah", questionText: "Which angel brought revelation to the Prophet ﷺ?", options: ["Mika'il", "Israfil", "Jibril", "Malik"], correctIndex: 2, explanation: "The angel Jibril (Gabriel) is the angel of revelation." },
  { level: 4, category: "Seerah", questionText: "What is the night journey of the Prophet ﷺ from Makkah to Jerusalem called?", options: ["Hijrah", "Mi'raj", "Isra", "Fath"], correctIndex: 2, explanation: "Al-Isra is the night journey to Al-Aqsa; Al-Mi'raj is the ascension to the heavens that followed." },
  { level: 4, category: "Seerah", questionText: "Which companion is known as \"the sword of Allah\"?", options: ["Khalid ibn al-Walid (r.a.)", "Sa'd ibn Abi Waqqas (r.a.)", "Abu Ubaydah (r.a.)", "Talha (r.a.)"], correctIndex: 0, explanation: "The Prophet ﷺ titled Khalid ibn al-Walid (r.a.) Sayfullah — the Sword of Allah." },

  // ── Level 5 — Fiqh & Daily Practice ──────────────────────────
  { level: 5, category: "Zakah", questionText: "Zakah is generally what percentage of qualifying wealth held for a year?", options: ["1%", "2.5%", "5%", "10%"], correctIndex: 1, explanation: "Zakah on monetary wealth above the nisab is 2.5% per lunar year." },
  { level: 5, category: "Sawm", questionText: "Which act invalidates the fast?", options: ["Brushing teeth", "Smelling food", "Eating intentionally", "Taking a shower"], correctIndex: 2, explanation: "Intentional eating, drinking, or sexual relations during fasting hours invalidate the fast." },
  { level: 5, category: "Hajj", questionText: "Which act is the central pillar of Hajj?", options: ["Sa'i between Safa and Marwah", "Standing at Arafah", "Tawaf al-Wada", "Stoning the Jamarat"], correctIndex: 1, explanation: "The Prophet ﷺ said \"Hajj is Arafah\" — standing at Arafah on the 9th of Dhul-Hijjah is the essential pillar." },
  { level: 5, category: "Halal", questionText: "Which of these is haram to consume?", options: ["Beef slaughtered Islamically", "Pork", "Lamb", "Chicken slaughtered Islamically"], correctIndex: 1, explanation: "Pork, blood, carrion, and intoxicants are explicitly forbidden (Quran 5:3)." },
  { level: 5, category: "Sawm", questionText: "What is the pre-dawn meal before fasting called?", options: ["Iftar", "Suhoor", "Tarawih", "I'tikaf"], correctIndex: 1, explanation: "Suhoor is the meal taken before Fajr; iftar is the meal that breaks the fast at sunset." },
  { level: 5, category: "Adab", questionText: "What should a Muslim say upon entering a home?", options: ["Bismillah", "Assalamu alaikum", "Alhamdulillah", "Masha'Allah"], correctIndex: 1, explanation: "The greeting of peace — \"Assalamu alaikum\" — is the sunnah upon entering, even an empty home (Quran 24:61)." },
  { level: 5, category: "Adab", questionText: "Which hand is preferred for eating and drinking?", options: ["Left hand", "Right hand", "Either equally", "Both together"], correctIndex: 1, explanation: "The Prophet ﷺ taught us to eat and drink with the right hand; the left was associated with shaytan's manner." },
  { level: 5, category: "Zakah", questionText: "Zakat al-Fitr is paid:", options: ["Only by the wealthy", "By every Muslim able to, before Eid al-Fitr prayer", "Only on Eid al-Adha", "Once a lifetime"], correctIndex: 1, explanation: "Every Muslim who has surplus food gives Zakat al-Fitr on behalf of themselves and dependents before Eid al-Fitr salah." },
  { level: 5, category: "Adab", questionText: "What is said before beginning a permissible act like eating?", options: ["Alhamdulillah", "Bismillah", "Inna lillahi", "Astaghfirullah"], correctIndex: 1, explanation: "\"Bismillah\" — In the name of Allah — is said at the start; \"Alhamdulillah\" follows when finished." },
  { level: 5, category: "Hajj", questionText: "How many times does a pilgrim circle the Ka'bah in tawaf?", options: ["3", "5", "7", "10"], correctIndex: 2, explanation: "Tawaf consists of seven circuits around the Ka'bah, beginning and ending at the Black Stone." },
];

export async function seedQuizQuestions(): Promise<void> {
  const existing = await db.execute<{ count: number }>(sql`SELECT COUNT(*)::int AS count FROM ${quizQuestions}`);
  const count = Number((existing.rows ?? existing)[0]?.count ?? 0);
  if (count > 0) return;
  await db.insert(quizQuestions).values(SEED_QUESTIONS).onConflictDoNothing();
  console.log(`[quiz-seed] inserted ${SEED_QUESTIONS.length} quiz questions`);
}
