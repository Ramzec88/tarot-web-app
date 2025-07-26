// config.js - Обновленная конфигурация с GitHub Raw интеграцией
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY',
};

const SUPABASE_SERVER_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    serviceRoleKey: 'YOUR_SERVICE_ROLE_KEY'
};

const TABLES = {
    userProfiles: 'tarot_user_profiles',
    questions: 'tarot_questions', 
    answers: 'tarot_answers',
    dailyCards: 'tarot_daily_cards',
    spreads: 'tarot_spreads',
    reviews: 'tarot_reviews'
};

// ОБНОВЛЕННАЯ конфигурация API с GitHub Raw для карт
const API_CONFIG = {
    // n8n вебхуки для пользователей и бизнес-логики
    createUser: 'https://romanmedn8n.ru/webhook/tarot-create-user',
    saveProfile: 'https://romanmedn8n.ru/webhook/tarot-save-profile',
    getProfile: 'https://romanmedn8n.ru/webhook/tarot-get-profile',
    saveQuestion: 'https://romanmedn8n.ru/webhook/tarot-save-question',
    saveAnswer: 'https://romanmedn8n.ru/webhook/tarot-save-answer',
    saveDailyCard: 'https://romanmedn8n.ru/webhook/tarot-save-daily-card',
    getHistory: 'https://romanmedn8n.ru/webhook/tarot-get-history',
    updateSubscription: 'https://romanmedn8n.ru/webhook/tarot-update-subscription',
    generatePrediction: 'https://romanmedn8n.ru/webhook/tarot-prediction',
    
    // НОВОЕ: GitHub Raw для карт (быстро и надежно)
    cardsUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/tarot-web-app/main/cards.json',
    
    // Резервный URL через jsDelivr CDN
    cardsFallbackUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/tarot-web-app@main/cards.json',
    
    // Настройки загрузки карт
    requestTimeout: 15000, // 15 секунд для карт
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 часа кэш
    maxRetries: 3,
    retryDelay: 2000,
    
    // URL для оплаты
    paymentUrl: 'https://digital.wildberries.ru/offer/491728'
};

// Остальные настройки
const TELEGRAM_CONFIG = {
    botToken: 'YOUR_BOT_TOKEN',
    botUsername: 'YourTarotBot'
};

const APP_CONFIG = {
    freeQuestionsLimit: 3,
    premiumPrice: 299,
    premiumDuration: 30,
    sessionTimeout: 24 * 60 * 60 * 1000,
    
    // Настройки анимации
    typewriterSpeed: 30,
    cardFlipDuration: 500,
    sparkleCount: 5,
    
    // Тексты
    texts: {
        welcome: 'Добро пожаловать в мистический мир карт Таро',
        noQuestions: 'Пожалуйста, задайте вопрос',
        questionsEnded: 'У вас закончились бесплатные вопросы',
        generating: 'Генерирую персональное предсказание...',
        cardsThinking: 'Карты размышляют...',
        cardsWhispering: 'Карты шепчут...'
    }
};

// УДАЛЯЕМ старую колоду TAROT_CARDS - теперь карты загружаются с GitHub!
// Оставляем только фоллбэк карты на случай проблем с загрузкой
const FALLBACK_CARDS = [
    {
        id: "0",
        name: "Шут",
        symbol: "🃏",
        meaningUpright: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции.",
        meaningReversed: "Безрассудство, необдуманные поступки, легкомыслие.",
        meaning: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции.",
        image: "./images/cards/fool.jpg"
    },
    {
        id: "1", 
        name: "Маг",
        symbol: "🔮",
        meaningUpright: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
        meaningReversed: "Злоупотребление силой, самообман, недостаток энергии.",
        meaning: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
        image: "./images/cards/magician.jpg"
    },
    {
        id: "2",
        name: "Верховная Жрица", 
        symbol: "🌙",
        meaningUpright: "Интуиция, тайны, подсознание. Доверьтесь внутреннему голосу и скрытым знаниям.",
        meaningReversed: "Скрытность, обман, поверхностность.",
        meaning: "Интуиция, тайны, подсознание. Доверьтесь внутреннему голосу и скрытым знаниям.",
        image: "./images/cards/high_priestess.jpg"
    }
];

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        FALLBACK_CARDS,
        TABLES
    };
}
