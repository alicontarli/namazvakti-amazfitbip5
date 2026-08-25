export const LANGUAGES = [
  { name: 'English', value: 'en' },
  { name: 'Türkçe (Turkish)', value: 'tr' },
  { name: 'العربية (Arabic)', value: 'ar' },
  { name: 'Bahasa Indonesia (Indonesian)', value: 'id' }
]

export const TRANSLATIONS = {
  en: {
    appName: 'Prayer Times',
    next: 'Next',
    fajr: 'Fajr',
    dhuhr: 'Dhuhr',
    asr: 'Asr',
    maghrib: 'Maghrib',
    isha: 'Isha',
    updateNeeded: 'Please update',
    lastPrefix: 'Until:',
    daysSuffix: 'days',
    liveData: 'Live data',
    demoData: 'Demo data',
    noConnection: 'No connection',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  },
  tr: {
    appName: 'Namaz Vakti',
    next: 'Sonraki',
    fajr: 'Sabah',
    dhuhr: 'Ogle',
    asr: 'Ikindi',
    maghrib: 'Aksam',
    isha: 'Yatsi',
    updateNeeded: 'Guncelleme yapiniz',
    lastPrefix: 'Son:',
    daysSuffix: 'gun',
    liveData: 'Canli veri',
    demoData: 'Demo veri',
    noConnection: 'Baglanti yok',
    months: ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara']
  },
  ar: {
    appName: 'مواقيت الصلاة',
    next: 'القادم',
    fajr: 'الفجر',
    dhuhr: 'الظهر',
    asr: 'العصر',
    maghrib: 'المغرب',
    isha: 'العشاء',
    updateNeeded: 'يرجى التحديث',
    lastPrefix: 'حتى:',
    daysSuffix: 'يوم',
    liveData: 'بيانات حية',
    demoData: 'بيانات تجريبية',
    noConnection: 'لا يوجد اتصال',
    months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  },
  id: {
    appName: 'Jadwal Sholat',
    next: 'Berikutnya',
    fajr: 'Subuh',
    dhuhr: 'Dzuhur',
    asr: 'Ashar',
    maghrib: 'Maghrib',
    isha: 'Isya',
    updateNeeded: 'Silakan perbarui',
    lastPrefix: 'Sampai:',
    daysSuffix: 'hari',
    liveData: 'Data langsung',
    demoData: 'Data demo',
    noConnection: 'Tidak ada koneksi',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  }
}

export function getTranslation(langCode = 'en') {
  const code = String(langCode || 'en').toLowerCase().slice(0, 2)
  return TRANSLATIONS[code] || TRANSLATIONS.en
}
