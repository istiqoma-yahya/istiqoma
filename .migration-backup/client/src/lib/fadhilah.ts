export interface FadhilahData {
  arabicText?: string;
  translation: string;
  source: string;
}

const fadhilahMap: Record<string, FadhilahData[]> = {
  "sholat fardhu": [
    {
      arabicText: "إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ",
      translation: "Sesungguhnya shalat itu mencegah dari perbuatan keji dan mungkar.",
      source: "QS. Al-Ankabut: 45",
    },
    {
      translation: "Shalat lima waktu, Jumat ke Jumat, dan Ramadhan ke Ramadhan adalah penghapus dosa di antara keduanya, selama dosa-dosa besar dijauhi.",
      source: "HR. Muslim no. 233",
    },
  ],
  "sholat sunnah": [
    {
      translation: "Tidaklah seorang hamba mendekatkan diri kepada-Ku dengan sesuatu yang lebih Aku cintai daripada apa yang Aku wajibkan kepadanya. Dan hamba-Ku senantiasa mendekatkan diri kepada-Ku dengan amalan-amalan sunnah hingga Aku mencintainya.",
      source: "HR. Bukhari no. 6502 (Hadits Qudsi)",
    },
  ],
  dzikir: [
    {
      arabicText: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
      translation: "Ketahuilah, hanya dengan mengingat Allah hati menjadi tenteram.",
      source: "QS. Ar-Ra'd: 28",
    },
    {
      translation: "Dua kalimat yang ringan di lisan, berat di timbangan, dan dicintai Ar-Rahman: Subhanallahi wa bihamdihi, Subhanallahil 'Azhim.",
      source: "HR. Bukhari no. 6406 & Muslim no. 2694",
    },
  ],
  "baca quran": [
    {
      translation: "Bacalah Al-Qur'an, karena sesungguhnya ia akan datang pada hari kiamat sebagai pemberi syafaat bagi para pembacanya.",
      source: "HR. Muslim no. 804",
    },
    {
      translation: "Orang yang mahir membaca Al-Qur'an akan bersama para malaikat yang mulia lagi taat. Dan orang yang membaca Al-Qur'an dengan terbata-bata dan susah payah, maka baginya dua pahala.",
      source: "HR. Bukhari no. 4937 & Muslim no. 798",
    },
  ],
  quran: [
    {
      translation: "Bacalah Al-Qur'an, karena sesungguhnya ia akan datang pada hari kiamat sebagai pemberi syafaat bagi para pembacanya.",
      source: "HR. Muslim no. 804",
    },
  ],
  puasa: [
    {
      translation: "Setiap amalan anak Adam dilipat gandakan, satu kebaikan bernilai sepuluh hingga tujuh ratus kali lipat. Allah berfirman: 'Kecuali puasa, karena puasa itu untuk-Ku, dan Aku sendiri yang akan membalasnya.'",
      source: "HR. Bukhari no. 1904 & Muslim no. 1151",
    },
    {
      translation: "Barang siapa berpuasa satu hari di jalan Allah, niscaya Allah menjauhkan wajahnya dari api neraka sejauh perjalanan tujuh puluh tahun.",
      source: "HR. Bukhari no. 2840 & Muslim no. 1153",
    },
  ],
  fasting: [
    {
      translation: "Setiap amalan anak Adam dilipat gandakan, satu kebaikan bernilai sepuluh hingga tujuh ratus kali lipat. Allah berfirman: 'Kecuali puasa, karena puasa itu untuk-Ku, dan Aku sendiri yang akan membalasnya.'",
      source: "HR. Bukhari no. 1904 & Muslim no. 1151",
    },
    {
      translation: "Barang siapa berpuasa satu hari di jalan Allah, niscaya Allah menjauhkan wajahnya dari api neraka sejauh perjalanan tujuh puluh tahun.",
      source: "HR. Bukhari no. 2840 & Muslim no. 1153",
    },
  ],
  "puasa fardhu": [
    {
      translation: "Setiap amalan anak Adam dilipat gandakan, satu kebaikan bernilai sepuluh hingga tujuh ratus kali lipat. Allah berfirman: 'Kecuali puasa, karena puasa itu untuk-Ku, dan Aku sendiri yang akan membalasnya.'",
      source: "HR. Bukhari no. 1904 & Muslim no. 1151",
    },
  ],
  "puasa sunnah": [
    {
      translation: "Barang siapa berpuasa satu hari di jalan Allah, niscaya Allah menjauhkan wajahnya dari api neraka sejauh perjalanan tujuh puluh tahun.",
      source: "HR. Bukhari no. 2840 & Muslim no. 1153",
    },
  ],
  "fasting fardhu": [
    {
      translation: "Setiap amalan anak Adam dilipat gandakan, satu kebaikan bernilai sepuluh hingga tujuh ratus kali lipat. Allah berfirman: 'Kecuali puasa, karena puasa itu untuk-Ku, dan Aku sendiri yang akan membalasnya.'",
      source: "HR. Bukhari no. 1904 & Muslim no. 1151",
    },
  ],
  "fasting sunnah": [
    {
      translation: "Barang siapa berpuasa satu hari di jalan Allah, niscaya Allah menjauhkan wajahnya dari api neraka sejauh perjalanan tujuh puluh tahun.",
      source: "HR. Bukhari no. 2840 & Muslim no. 1153",
    },
  ],
  shodaqoh: [
    {
      translation: "Sedekah itu tidak mengurangi harta. Tidaklah Allah menambah seorang hamba dengan pemberian maaf kecuali kemuliaan. Dan tidaklah seseorang merendahkan diri karena Allah kecuali Dia mengangkatnya.",
      source: "HR. Muslim no. 2588",
    },
    {
      arabicText: "مَّن ذَا الَّذِي يُقْرِضُ اللَّهَ قَرْضًا حَسَنًا فَيُضَاعِفَهُ لَهُ أَضْعَافًا كَثِيرَةً",
      translation: "Siapakah yang mau memberi pinjaman kepada Allah pinjaman yang baik, maka Allah akan melipatgandakan pembayaran kepadanya dengan lipat ganda yang banyak.",
      source: "QS. Al-Baqarah: 245",
    },
  ],
  sedekah: [
    {
      translation: "Sedekah itu tidak mengurangi harta. Tidaklah Allah menambah seorang hamba dengan pemberian maaf kecuali kemuliaan.",
      source: "HR. Muslim no. 2588",
    },
  ],
  sodaqoh: [
    {
      translation: "Sedekah itu tidak mengurangi harta. Tidaklah Allah menambah seorang hamba dengan pemberian maaf kecuali kemuliaan.",
      source: "HR. Muslim no. 2588",
    },
  ],
};

const defaultFadhilah: FadhilahData = {
  translation: "Barang siapa yang menempuh jalan untuk mencari ilmu, maka Allah akan memudahkan baginya jalan menuju surga.",
  source: "HR. Muslim no. 2699",
};

export function getFadhilahForCategory(category: string): FadhilahData {
  const categoryLower = category.toLowerCase();
  const entries = fadhilahMap[categoryLower];
  if (entries && entries.length > 0) {
    const randomIndex = Math.floor(Math.random() * entries.length);
    return entries[randomIndex];
  }
  return defaultFadhilah;
}
