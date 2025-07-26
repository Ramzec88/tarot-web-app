// config.js - Обновленная конфигурация
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY', // Для фронтенда - безопасный ключ
    // service_role НЕ должен быть здесь во фронтенде!
};

// Конфигурация для серверных операций (только для n8n или бэкенда)
const SUPABASE_SERVER_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    serviceRoleKey: 'YOUR_SERVICE_ROLE_KEY' // Только для серверной части!
};

// Названия таблиц
const TABLES = {
    userProfiles: 'tarot_user_profiles',
    questions: 'tarot_questions', 
    answers: 'tarot_answers',
    dailyCards: 'tarot_daily_cards',
    spreads: 'tarot_spreads',
    reviews: 'tarot_reviews'
};

// API endpoints для безопасной работы с данными
const API_CONFIG = {
    // n8n вебхуки для различных операций
    createUser: 'https://romanmedn8n.ru/webhook/tarot-create-user',
    saveQuestion: 'https://romanmedn8n.ru/webhook/tarot-save-question',
    saveDailyCard: 'https://romanmedn8n.ru/webhook/tarot-save-daily-card',
    getHistory: 'https://romanmedn8n.ru/webhook/tarot-get-history',
    updateSubscription: 'https://romanmedn8n.ru/webhook/tarot-update-subscription',
    generatePrediction: 'https://romanmedn8n.ru/webhook/tarot-prediction',
    paymentUrl: 'https://digital.wildberries.ru/offer/491728'
};

// Политики безопасности для Supabase RLS
const RLS_POLICIES = {
    // Пользователи могут видеть только свои данные
    userProfilesSelect: `
        CREATE POLICY "Users can view own profile" ON tarot_user_profiles
        FOR SELECT USING (auth.uid() = telegram_id::text OR telegram_id = current_setting('app.current_user_id')::bigint);
    `,
    
    // Пользователи могут обновлять только свои данные
    userProfilesUpdate: `
        CREATE POLICY "Users can update own profile" ON tarot_user_profiles
        FOR UPDATE USING (auth.uid() = telegram_id::text OR telegram_id = current_setting('app.current_user_id')::bigint);
    `,
    
    // Аналогично для других таблиц
    questionsPolicy: `
        CREATE POLICY "Users can view own questions" ON tarot_questions
        FOR ALL USING (user_id = current_setting('app.current_user_id')::bigint);
    `
};

// Остальные настройки без изменений...
const TELEGRAM_CONFIG = {
    botToken: 'YOUR_BOT_TOKEN', // Только для серверной части
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

// Колода карт остается без изменений
const TAROT_CARDS = [
    {
        name: "Шут",
        symbol: "🃏",
        image: "./images/cards/fool.jpg",
        meaning: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции."
    },
    // ... остальные карты
];

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        TAROT_CARDS,
        RLS_POLICIES
    };
}
