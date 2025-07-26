// config.js - Исправленная конфигурация для работы с n8n
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY', // Для фронтенда - безопасный ключ
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

// ИСПРАВЛЕННАЯ конфигурация API для корректной работы с n8n
const API_CONFIG = {
    // n8n вебхуки для различных операций (ВСЕ используют POST метод)
    createUser: 'https://romanmedn8n.ru/webhook/tarot-create-user',
    saveProfile: 'https://romanmedn8n.ru/webhook/tarot-save-profile', 
    getProfile: 'https://romanmedn8n.ru/webhook/tarot-get-profile',
    saveQuestion: 'https://romanmedn8n.ru/webhook/tarot-save-question',
    saveAnswer: 'https://romanmedn8n.ru/webhook/tarot-save-answer',
    saveDailyCard: 'https://romanmedn8n.ru/webhook/tarot-save-daily-card',
    getHistory: 'https://romanmedn8n.ru/webhook/tarot-get-history',
    updateSubscription: 'https://romanmedn8n.ru/webhook/tarot-update-subscription',
    generatePrediction: 'https://romanmedn8n.ru/webhook/tarot-prediction', // ОСНОВНОЙ для ИИ предсказаний
    
    // Настройки запросов
    requestTimeout: 30000, // 30 секунд таймаут
    maxRetries: 3, // максимум повторных попыток
    retryDelay: 2000, // задержка между попытками (мс)
    
    // URL для оплаты
    paymentUrl: 'https://digital.wildberries.ru/offer/491728'
};

// Остальные настройки остаются без изменений...
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
    {
        name: "Маг",
        symbol: "🔮",
        image: "./images/cards/magician.jpg",
        meaning: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей."
    },
    {
        name: "Верховная Жрица",
        symbol: "🌙",
        image: "./images/cards/high_priestess.jpg",
        meaning: "Интуиция, тайны, подсознание. Доверьтесь внутреннему голосу и скрытым знаниям."
    },
    {
        name: "Императрица",
        symbol: "👑",
        image: "./images/cards/empress.jpg",
        meaning: "Женственность, плодородие, творчество. Время для роста и материализации идей."
    },
    {
        name: "Император",
        symbol: "⚔️",
        image: "./images/cards/emperor.jpg",
        meaning: "Власть, стабильность, контроль. Необходимо проявить лидерские качества и дисциплину."
    },
    {
        name: "Иерофант",
        symbol: "📿",
        image: "./images/cards/hierophant.jpg",
        meaning: "Традиции, духовность, наставничество. Обратитесь к мудрости предков и учителей."
    },
    {
        name: "Влюбленные",
        symbol: "💕",
        image: "./images/cards/lovers.jpg",
        meaning: "Любовь, выбор, гармония. Важное решение в отношениях или жизненном пути."
    },
    {
        name: "Колесница",
        symbol: "🏇",
        image: "./images/cards/chariot.jpg",
        meaning: "Победа, контроль, движение вперед. Преодолейте препятствия силой воли."
    },
    {
        name: "Сила",
        symbol: "🦁",
        image: "./images/cards/strength.jpg",
        meaning: "Внутренняя сила, терпение, сострадание. Побеждайте мягкостью, а не агрессией."
    },
    {
        name: "Отшельник",
        symbol: "🕯️",
        image: "./images/cards/hermit.jpg",
        meaning: "Поиск истины, самопознание, уединение. Время для внутренней работы и размышлений."
    },
    {
        name: "Колесо Фортуны",
        symbol: "🎡",
        image: "./images/cards/wheel_fortune.jpg",
        meaning: "Судьба, перемены, циклы. Удача поворачивается в вашу сторону."
    },
    {
        name: "Правосудие",
        symbol: "⚖️",
        image: "./images/cards/justice.jpg",
        meaning: "Справедливость, баланс, карма. Все получают по заслугам."
    },
    {
        name: "Повешенный",
        symbol: "🙃",
        image: "./images/cards/hanged_man.jpg",
        meaning: "Жертва, новый взгляд, терпение. Измените угол зрения на ситуацию."
    },
    {
        name: "Смерть",
        symbol: "💀",
        image: "./images/cards/death.jpg",
        meaning: "Трансформация, конец цикла, возрождение. Не бойтесь перемен."
    },
    {
        name: "Умеренность",
        symbol: "🍷",
        image: "./images/cards/temperance.jpg",
        meaning: "Баланс, умеренность, терпение. Найдите золотую середину."
    },
    {
        name: "Дьявол",
        symbol: "😈",
        image: "./images/cards/devil.jpg",
        meaning: "Искушения, зависимости, материализм. Освободитесь от того, что вас ограничивает."
    },
    {
        name: "Башня",
        symbol: "🏗️",
        image: "./images/cards/tower.jpg",
        meaning: "Разрушение иллюзий, внезапные перемены. Старое должно пасть для рождения нового."
    },
    {
        name: "Звезда",
        symbol: "⭐",
        image: "./images/cards/star.jpg",
        meaning: "Надежда, вдохновение, духовность. Вера в лучшее будущее оправдается."
    },
    {
        name: "Луна",
        symbol: "🌙",
        image: "./images/cards/moon.jpg",
        meaning: "Иллюзии, страхи, подсознание. Будьте осторожны с самообманом."
    },
    {
        name: "Солнце",
        symbol: "☀️",
        image: "./images/cards/sun.jpg",
        meaning: "Радость, успех, жизненная энергия. Период счастья и достижений."
    },
    {
        name: "Суд",
        symbol: "📯",
        image: "./images/cards/judgement.jpg",
        meaning: "Возрождение, прощение, призвание. Время для нового начала."
    },
    {
        name: "Мир",
        symbol: "🌍",
        image: "./images/cards/world.jpg",
        meaning: "Завершение, достижение цели, гармония. Цикл завершен успешно."
    }
];

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        TAROT_CARDS,
        TABLES
    };
}
