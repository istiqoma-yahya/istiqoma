import { db } from "./db";
import { quizQuestions } from "@shared/schema";
import { sql } from "drizzle-orm";

// ─── Authoring guide ────────────────────────────────────────────
// To add more questions:
//   1. Append entries to SEED_QUESTIONS below using the SeedQuestion shape.
//      • level         — integer, 1+. New levels above the current max are
//                        fine; the seeder fills any level that has zero rows.
//      • questionText  — the prompt the user sees.
//      • options       — exactly 4 answer choices (tuple of 4 strings).
//      • correctIndex  — 0-based index of the correct option.
//      • explanation   — shown after the user answers; cite source if useful.
//      • category      — short tag (e.g. "Aqidah", "Salah", "Seerah").
//   2. Boot the server. The seeder inserts questions only for levels that
//      currently have no rows in `quiz_questions`, so existing seeded
//      questions are preserved verbatim and re-seeding is safe.
//   3. To replace or edit a question that's already in the DB, edit it
//      directly (SQL/UI) — the seed file is append-only at runtime.
// ────────────────────────────────────────────────────────────────

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

  // ── Level 6 — Names & Attributes / Aqidah Deepened ───────────
  { level: 6, category: "Aqidah", questionText: "How many \"Beautiful Names\" of Allah (Asma'ul Husna) are commonly enumerated?", options: ["77", "99", "100", "114"], correctIndex: 1, explanation: "The Prophet ﷺ said Allah has 99 names; whoever enumerates them will enter Paradise (Bukhari & Muslim)." },
  { level: 6, category: "Aqidah", questionText: "Which name of Allah means \"The Most Merciful\" in the broadest, all-encompassing sense?", options: ["Ar-Rahim", "Ar-Rahman", "Al-Wadud", "Al-Karim"], correctIndex: 1, explanation: "Ar-Rahman denotes Allah's mercy that encompasses all creation; Ar-Rahim is mercy specifically for the believers." },
  { level: 6, category: "Aqidah", questionText: "Tawhid al-Uluhiyyah refers to:", options: ["Oneness of Allah's lordship over creation", "Oneness of Allah's right to be worshipped", "Oneness of Allah's names and attributes", "Oneness of the Muslim community"], correctIndex: 1, explanation: "Uluhiyyah is directing all worship to Allah alone; Rububiyyah is His sole lordship; Asma' wa Sifat is His names/attributes." },
  { level: 6, category: "Aqidah", questionText: "Which is the gravest sin in Islam, unforgiven if one dies upon it?", options: ["Backbiting", "Shirk (associating partners with Allah)", "Missing Hajj", "Eating haram"], correctIndex: 1, explanation: "Allah says He does not forgive shirk if one dies upon it, but forgives anything less for whom He wills (Quran 4:48)." },
  { level: 6, category: "Aqidah", questionText: "Belief in Qadar means belief in:", options: ["Free will only", "Allah's decree and predestination", "Astrology", "The unseen jinn"], correctIndex: 1, explanation: "Qadar — Allah's divine decree — is the sixth pillar of iman alongside belief in Allah, angels, books, messengers, and the Last Day." },
  { level: 6, category: "Aqidah", questionText: "How many books of revelation are mentioned by name in the Quran?", options: ["3", "4", "5", "7"], correctIndex: 1, explanation: "Four are named: Tawrat (Musa), Zabur (Dawud), Injil (Isa), and Quran (Muhammad ﷺ); the Suhuf of Ibrahim/Musa are also referenced." },
  { level: 6, category: "Aqidah", questionText: "Which angel is responsible for blowing the trumpet on the Day of Judgement?", options: ["Jibril", "Mika'il", "Israfil", "Izra'il"], correctIndex: 2, explanation: "Israfil (a.s.) is appointed to blow the trumpet (As-Sur) marking the end of the world and the resurrection." },
  { level: 6, category: "Aqidah", questionText: "Which angel is responsible for taking souls at death?", options: ["Jibril", "Malak al-Mawt", "Munkar", "Ridwan"], correctIndex: 1, explanation: "Malak al-Mawt — the Angel of Death — is referred to in Surah As-Sajdah 32:11." },
  { level: 6, category: "Aqidah", questionText: "Jinn were created from:", options: ["Clay", "Light", "Smokeless fire", "Water"], correctIndex: 2, explanation: "Allah created jinn from a smokeless flame of fire (Quran 55:15); angels from light, and humans from clay." },
  { level: 6, category: "Aqidah", questionText: "The bridge over Hellfire that all must cross on the Day of Judgement is called:", options: ["As-Sirat", "Al-Mizan", "Al-Hawd", "Al-Kawthar"], correctIndex: 0, explanation: "As-Sirat is the bridge stretched over Jahannam; Al-Mizan is the scale, Al-Hawd is the Prophet's ﷺ pond, and Al-Kawthar is a river in Paradise." },

  // ── Level 7 — Quran Advanced ─────────────────────────────────
  { level: 7, category: "Quran", questionText: "Which is the shortest Surah in the Quran?", options: ["Al-Ikhlas", "Al-Asr", "Al-Kawthar", "An-Nas"], correctIndex: 2, explanation: "Surah Al-Kawthar has only 3 verses, making it the shortest Surah." },
  { level: 7, category: "Quran", questionText: "Which Surah does NOT begin with Bismillah?", options: ["Al-Baqarah", "At-Tawbah", "Yasin", "Al-Mulk"], correctIndex: 1, explanation: "Surah At-Tawbah (Bara'ah) is the only Surah that does not open with Bismillahir-Rahmanir-Rahim." },
  { level: 7, category: "Quran", questionText: "Ayat al-Kursi is found in which Surah?", options: ["Al-Imran", "Al-Baqarah (verse 255)", "An-Nisa", "Al-Ma'idah"], correctIndex: 1, explanation: "Ayat al-Kursi is verse 255 of Surah Al-Baqarah and is the greatest verse in the Quran (Muslim)." },
  { level: 7, category: "Quran", questionText: "Which Surah is named after a metal mentioned in it?", options: ["Al-Hadid (Iron)", "An-Nahl (Bee)", "Al-Fil (Elephant)", "An-Naml (Ant)"], correctIndex: 0, explanation: "Surah Al-Hadid — \"Iron\" — references the iron Allah sent down with great strength (verse 25)." },
  { level: 7, category: "Quran", questionText: "How many Surahs in the Quran are named after prophets?", options: ["4", "6", "8", "10"], correctIndex: 1, explanation: "Six Surahs are named after prophets: Yunus, Hud, Yusuf, Ibrahim, Muhammad, and Nuh." },
  { level: 7, category: "Quran", questionText: "Surah Al-Fatihah consists of how many verses?", options: ["5", "6", "7", "8"], correctIndex: 2, explanation: "Al-Fatihah has 7 verses, also called As-Sab' al-Mathani — \"the seven oft-repeated\" (Quran 15:87)." },
  { level: 7, category: "Quran", questionText: "Which Surah is recited together with Al-Falaq for protection (Al-Mu'awwidhatayn)?", options: ["Al-Ikhlas", "An-Nas", "Al-Kafirun", "Al-Asr"], correctIndex: 1, explanation: "Al-Falaq and An-Nas form Al-Mu'awwidhatayn — the two Surahs of refuge — recited morning, evening, and before sleep." },
  { level: 7, category: "Quran", questionText: "Surah Al-Ikhlas is described by the Prophet ﷺ as equal to:", options: ["A quarter of the Quran", "A third of the Quran", "Half of the Quran", "The whole Quran"], correctIndex: 1, explanation: "The Prophet ﷺ said Qul Huwa Allahu Ahad equals one-third of the Quran (Bukhari) because of its pure declaration of Tawhid." },
  { level: 7, category: "Quran", questionText: "Which Surah begins with \"Tabarakalladhi\" and is recommended to read before sleep?", options: ["Al-Mulk", "As-Sajdah", "Al-Waqi'ah", "Ar-Rahman"], correctIndex: 0, explanation: "Surah Al-Mulk (\"Tabarakalladhi biyadihil Mulk\") intercedes for the one who recites it (Tirmidhi)." },
  { level: 7, category: "Quran", questionText: "What is the term for the prostration prescribed when reciting certain verses of the Quran?", options: ["Sujud as-Sahw", "Sujud at-Tilawah", "Sujud ash-Shukr", "Sujud at-Taqwa"], correctIndex: 1, explanation: "Sujud at-Tilawah is the prostration of recitation, performed at specific verses of sajdah marked in the mushaf." },

  // ── Level 8 — Seerah Advanced ────────────────────────────────
  { level: 8, category: "Seerah", questionText: "What was the name of the Prophet's ﷺ father?", options: ["Abdul-Muttalib", "Abdullah", "Abu Talib", "Hamzah"], correctIndex: 1, explanation: "Abdullah ibn Abdul-Muttalib died before the Prophet ﷺ was born." },
  { level: 8, category: "Seerah", questionText: "Who was the Prophet's ﷺ mother?", options: ["Halimah as-Sa'diyyah", "Aminah bint Wahb", "Khadijah bint Khuwaylid", "Fatimah bint Asad"], correctIndex: 1, explanation: "Aminah bint Wahb passed away when the Prophet ﷺ was about six years old." },
  { level: 8, category: "Seerah", questionText: "Which uncle of the Prophet ﷺ raised him after his grandfather's death?", options: ["Hamzah", "Al-Abbas", "Abu Lahab", "Abu Talib"], correctIndex: 3, explanation: "Abu Talib, the Prophet's ﷺ paternal uncle, took him into his care and protected him in Makkah." },
  { level: 8, category: "Seerah", questionText: "Which year is known as \"the Year of Sorrow\" ('Am al-Huzn)?", options: ["The year Khadijah and Abu Talib died", "The year of the Hijrah", "The year of Badr", "The year of the Conquest"], correctIndex: 0, explanation: "Both Khadijah (r.a.) and Abu Talib died in the same year (~10th year of prophethood), bringing immense grief to the Prophet ﷺ." },
  { level: 8, category: "Seerah", questionText: "Which battle did the Muslims dig a trench around Madinah for defense?", options: ["Badr", "Uhud", "Khandaq (Ahzab)", "Tabuk"], correctIndex: 2, explanation: "On Salman al-Farisi's (r.a.) advice, the Muslims dug a khandaq (trench) before the Battle of Ahzab in 5 AH." },
  { level: 8, category: "Seerah", questionText: "In what year (Hijri) did the Conquest of Makkah occur?", options: ["6 AH", "8 AH", "10 AH", "11 AH"], correctIndex: 1, explanation: "Fath Makkah took place in Ramadan, 8 AH, after the Quraysh broke the Treaty of Hudaybiyyah." },
  { level: 8, category: "Seerah", questionText: "Who was the first child to accept Islam?", options: ["Hasan ibn Ali", "Ali ibn Abi Talib", "Zayd ibn Harithah", "Usamah ibn Zayd"], correctIndex: 1, explanation: "Ali ibn Abi Talib (r.a.), then about 10 years old, was the first child to embrace Islam." },
  { level: 8, category: "Seerah", questionText: "Who was the first freed slave to accept Islam, later the muezzin of the Prophet ﷺ?", options: ["Salman al-Farisi", "Bilal ibn Rabah", "Suhayb ar-Rumi", "Zayd ibn Harithah"], correctIndex: 1, explanation: "Bilal ibn Rabah (r.a.) was tortured for his faith, freed by Abu Bakr (r.a.), and became the first muezzin of Islam." },
  { level: 8, category: "Seerah", questionText: "The Treaty of Hudaybiyyah was signed in what year?", options: ["2 AH", "5 AH", "6 AH", "9 AH"], correctIndex: 2, explanation: "The treaty was signed in 6 AH and is described in the Quran as a \"clear victory\" (Surah Al-Fath)." },
  { level: 8, category: "Seerah", questionText: "The Prophet ﷺ delivered his Farewell Sermon at:", options: ["Mount Hira", "Mount Uhud", "Arafah, during the Farewell Hajj", "The Cave of Thawr"], correctIndex: 2, explanation: "He ﷺ delivered Khutbat al-Wada' on the plain of Arafah during Hajjat al-Wada' (10 AH)." },

  // ── Level 9 — Hadith & Companions ────────────────────────────
  { level: 9, category: "Hadith", questionText: "Which two hadith collections are considered the most authentic (As-Sahihayn)?", options: ["Bukhari and Muslim", "Tirmidhi and Abu Dawud", "Nasa'i and Ibn Majah", "Muwatta and Ahmad"], correctIndex: 0, explanation: "Sahih al-Bukhari and Sahih Muslim are the two most rigorously authenticated hadith collections in Sunni Islam." },
  { level: 9, category: "Hadith", questionText: "Who compiled Sahih al-Bukhari?", options: ["Imam Muslim", "Imam Malik", "Imam Muhammad ibn Isma'il al-Bukhari", "Imam Ahmad ibn Hanbal"], correctIndex: 2, explanation: "Imam al-Bukhari spent ~16 years compiling and verifying his Sahih, selecting from hundreds of thousands of narrations." },
  { level: 9, category: "Hadith", questionText: "What does \"hadith\" literally mean?", options: ["Speech / report", "Law", "Path", "Memorization"], correctIndex: 0, explanation: "Hadith linguistically means \"speech\" or \"report\"; technically it refers to the sayings, actions, and approvals of the Prophet ﷺ." },
  { level: 9, category: "Hadith", questionText: "What is the chain of narrators in a hadith called?", options: ["Matn", "Sanad (Isnad)", "Sahih", "Mursal"], correctIndex: 1, explanation: "The sanad is the chain of transmission; the matn is the actual text/content of the hadith." },
  { level: 9, category: "Companions", questionText: "Which female companion narrated the most hadith from the Prophet ﷺ?", options: ["Khadijah (r.a.)", "Aisha (r.a.)", "Hafsa (r.a.)", "Umm Salamah (r.a.)"], correctIndex: 1, explanation: "Aisha bint Abi Bakr (r.a.) narrated over 2,200 ahadith and is among the top narrators of all the companions." },
  { level: 9, category: "Companions", questionText: "Who is the companion that narrated the most hadith overall?", options: ["Abu Hurairah (r.a.)", "Ibn Umar (r.a.)", "Anas ibn Malik (r.a.)", "Ibn Abbas (r.a.)"], correctIndex: 0, explanation: "Abu Hurairah (r.a.) narrated over 5,300 ahadith — more than any other companion." },
  { level: 9, category: "Companions", questionText: "Which companion is titled \"the trustworthy of this Ummah\" (Amin al-Ummah)?", options: ["Abu Ubaydah ibn al-Jarrah (r.a.)", "Mu'adh ibn Jabal (r.a.)", "Sa'd ibn Mu'adh (r.a.)", "Anas ibn Malik (r.a.)"], correctIndex: 0, explanation: "The Prophet ﷺ said \"Every Ummah has a trustworthy one, and the trustworthy of this Ummah is Abu Ubaydah ibn al-Jarrah\" (Bukhari)." },
  { level: 9, category: "Companions", questionText: "Which caliph is known as \"Dhun-Nurayn\" (the possessor of two lights)?", options: ["Abu Bakr (r.a.)", "Umar (r.a.)", "Uthman (r.a.)", "Ali (r.a.)"], correctIndex: 2, explanation: "Uthman ibn Affan (r.a.) was given this title because he married two of the Prophet's ﷺ daughters, Ruqayyah and Umm Kulthum." },
  { level: 9, category: "Companions", questionText: "Which companion was titled \"Al-Faruq\" (the one who distinguishes truth from falsehood)?", options: ["Abu Bakr (r.a.)", "Umar ibn al-Khattab (r.a.)", "Hamzah (r.a.)", "Bilal (r.a.)"], correctIndex: 1, explanation: "Umar ibn al-Khattab (r.a.) was named Al-Faruq for his uncompromising stance between truth and falsehood." },
  { level: 9, category: "Hadith", questionText: "A hadith narrated through an unbroken chain of trustworthy narrators free from defects is graded:", options: ["Da'if (weak)", "Hasan (good)", "Sahih (authentic)", "Mawdu' (fabricated)"], correctIndex: 2, explanation: "Sahih is the highest grade — an unbroken chain of upright, precise narrators with no hidden defect or contradiction." },

  // ── Level 10 — Advanced Fiqh & Akhlaq ────────────────────────
  { level: 10, category: "Fiqh", questionText: "Which is NOT one of the four major Sunni schools of jurisprudence (madhahib)?", options: ["Hanafi", "Maliki", "Ja'fari", "Shafi'i"], correctIndex: 2, explanation: "The four Sunni madhahib are Hanafi, Maliki, Shafi'i, and Hanbali. The Ja'fari school is followed in Shia Islam." },
  { level: 10, category: "Fiqh", questionText: "What is the nisab for zakah on silver, traditionally?", options: ["100 grams", "200 dirhams (~595g of silver)", "1 kg", "5 dinars"], correctIndex: 1, explanation: "The classical silver nisab is 200 dirhams, approximately 595 grams of silver." },
  { level: 10, category: "Fiqh", questionText: "Which prayer is specifically prescribed when seeking guidance for a decision?", options: ["Salat al-Hajah", "Salat al-Istikharah", "Salat at-Tasbih", "Salat al-Awwabin"], correctIndex: 1, explanation: "Salat al-Istikharah is two voluntary rak'ahs followed by a specific dua asking Allah for guidance (Bukhari)." },
  { level: 10, category: "Fiqh", questionText: "Tayammum (dry purification) is permitted when:", options: ["One is in a hurry", "Water is unavailable or harmful to use", "One is fasting", "One is travelling, regardless of water"], correctIndex: 1, explanation: "Tayammum replaces wudu/ghusl when water is absent or its use would cause harm (Quran 4:43, 5:6)." },
  { level: 10, category: "Fiqh", questionText: "What is the Iddah (waiting period) for a widow whose husband has died?", options: ["3 months", "4 months and 10 days", "1 year", "40 days"], correctIndex: 1, explanation: "The widow's iddah is four lunar months and ten days (Quran 2:234), unless she is pregnant — then until delivery." },
  { level: 10, category: "Fiqh", questionText: "Which is a condition for the validity of a Muslim marriage (nikah)?", options: ["A wedding feast", "Mutual consent, witnesses, and mahr", "A specific dress code", "Public photography"], correctIndex: 1, explanation: "Validity requires the consent of both parties, two witnesses, a wali for the bride (in most schools), and the mahr." },
  { level: 10, category: "Akhlaq", questionText: "What does \"Ghibah\" (backbiting) mean?", options: ["Praising someone in their presence", "Mentioning something about your brother that he would dislike, even if true", "Lying about someone", "Public correction"], correctIndex: 1, explanation: "The Prophet ﷺ defined ghibah as mentioning your brother with what he dislikes; if false, it is buhtan — slander (Muslim)." },
  { level: 10, category: "Akhlaq", questionText: "Which act did the Prophet ﷺ describe as \"half of faith\"?", options: ["Honesty", "Patience", "Cleanliness/Purification (At-Tahur)", "Fasting"], correctIndex: 2, explanation: "The Prophet ﷺ said \"At-Tahuru shatrul iman\" — purification is half of faith (Muslim)." },
  { level: 10, category: "Fiqh", questionText: "Riba (usury / interest) is:", options: ["Permissible in small amounts", "Strictly forbidden in Islam", "Allowed for trade only", "Allowed if mutually agreed"], correctIndex: 1, explanation: "Allah declared war on those who deal in riba (Quran 2:278–279); it is among the major sins." },
  { level: 10, category: "Akhlaq", questionText: "The Prophet ﷺ said the best among you are those who are best to:", options: ["Their tribe", "Their families", "Strangers", "The wealthy"], correctIndex: 1, explanation: "\"The best of you is the one who is best to his family, and I am the best of you to my family\" (Tirmidhi)." },
];

export async function seedQuizQuestions(): Promise<void> {
  // Per-level idempotency: insert questions only for levels that currently
  // have zero rows. This preserves any previously seeded questions verbatim
  // (so existing user answer history stays meaningful) while still letting
  // us add brand-new levels — like the Levels 6–10 batch — by simply
  // appending entries to SEED_QUESTIONS and rebooting.
  const existingLevelsResult = await db.execute<{ level: number }>(
    sql`SELECT DISTINCT level FROM ${quizQuestions}`,
  );
  const existingLevels = new Set(
    ((existingLevelsResult.rows ?? existingLevelsResult) as Array<{ level: number }>).map(
      (r) => Number(r.level),
    ),
  );

  const toInsert = SEED_QUESTIONS.filter((q) => !existingLevels.has(q.level));
  if (toInsert.length === 0) return;

  await db.insert(quizQuestions).values(toInsert).onConflictDoNothing();

  const levelsAdded = Array.from(new Set(toInsert.map((q) => q.level))).sort((a, b) => a - b);
  console.log(
    `[quiz-seed] inserted ${toInsert.length} quiz questions for level(s): ${levelsAdded.join(", ")}`,
  );
}
