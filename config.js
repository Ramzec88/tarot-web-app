// config.js
const SUPABASE_CONFIG = {
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    anonKey: 'YOUR_ANON_KEY'
};

// Названия таблиц (адаптированы под существующую структуру)
const TABLES = {
    userProfiles: 'tarot_user_profiles',
    questions: 'tarot_questions', 
    answers: 'tarot_answers',
    dailyCards: 'tarot_daily_cards',
    spreads: 'tarot_spreads',
    reviews: 'tarot_reviews'
};

// API endpoints
const API_CONFIG = {
    n8nWebhook: 'https://your-n8n-domain.com/webhook/tarot-prediction',
    paymentUrl: 'https://www.wildberries.ru/catalog/199937445/detail.aspx'
};

// Telegram Bot конфигурация
const TELEGRAM_CONFIG = {
    botToken: 'YOUR_BOT_TOKEN', // Только для серверной части
    botUsername: 'YourTarotBot'
};

// Настройки приложения
const APP_CONFIG = {
    freeQuestionsLimit: 3,
    premiumPrice: 299,
    premiumDuration: 30, // дней
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 часа в миллисекундах
    
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

// Колода карт Таро с изображениями
const TAROT_CARDS = [
    {
        name: "Шут",
        symbol: "🃏",
        image: "./images/cards/fool.jpg",
        meaning: "Новые начинания, спонтанность, свобода. Время для смелых решений и доверия интуиции."
    },
    {
        name: "Маг",
        symbol: "🎭",
        image: "./images/cards/magician.jpg",
        meaning: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения цели."
    },
    {
        name: "Верховная Жрица",
        symbol: "🌙",
        image: "./images/cards/high_priestess.jpg",
        meaning: "Интуиция, мудрость, тайные знания. Доверьтесь своему внутреннему голосу."
    },
    {
        name: "Императрица",
        symbol: "👑",
        image: "./images/cards/empress.jpg",
        meaning: "Творчество, плодородие, материнство. Время для новых начинаний и роста."
    },
    {
        name: "Император",
        symbol: "⚔️",
        image: "./images/cards/emperor.jpg",
        meaning: "Власть, стабильность, контроль. Возьмите ситуацию в свои руки."
    },
    {
        name: "Иерофант",
        symbol: "📿",
        image: "./images/cards/hierophant.jpg",
        meaning: "Традиции, духовность, обучение. Ищите мудрость в проверенных путях."
    },
    {
        name: "Влюбленные",
        symbol: "💕",
        image: "./images/cards/lovers.jpg",
        meaning: "Любовь, выбор, единство. Важное решение в отношениях или партнерстве."
    },
    {
        name: "Колесница",
        symbol: "🏛️",
        image: "./images/cards/chariot.jpg",
        meaning: "Победа, контроль, движение вперед. Вы на правильном пути к успеху."
    },
    {
        name: "Сила",
        symbol: "🦁",
        image: "./images/cards/strength.jpg",
        meaning: "Внутренняя сила, мужество, терпение. Мягкость победит грубую силу."
    },
    {
        name: "Отшельник",
        symbol: "🕯️",
        image: "./images/cards/hermit.jpg",
        meaning: "Поиск истины, одиночество, самопознание. Время для внутренней работы."
    },
    {
        name: "Колесо Фортуны",
        symbol: "🎰",
        image: "./images/cards/wheel.jpg",
        meaning: "Судьба, перемены, удача. Поворотный момент в вашей жизни."
    },
    {
        name: "Справедливость",
        symbol: "⚖️",
        image: "./images/cards/justice.jpg",
        meaning: "Баланс, истина, карма. Справедливость восторжествует."
    },
    {
        name: "Повешенный",
        symbol: "🙃",
        image: "./images/cards/hanged.jpg",
        meaning: "Жертва, ожидание, новый взгляд. Иногда нужно отпустить контроль."
    },
    {
        name: "Смерть",
        symbol: "🌹",
        image: "./images/cards/death.jpg",
        meaning: "Трансформация, окончание, новое начало. Необходимые изменения."
    },
    {
        name: "Умеренность",
        symbol: "🍃",
        image: "./images/cards/temperance.jpg",
        meaning: "Баланс, терпение, умеренность. Найдите золотую середину."
    },
    {
        name: "Дьявол",
        symbol: "😈",
        image: "./images/cards/devil.jpg",
        meaning: "Искушение, зависимость, иллюзии. Освободитесь от того, что вас сдерживает."
    },
    {
        name: "Башня",
        symbol: "🏗️",
        image: "./images/cards/tower.jpg",
        meaning: "Разрушение, откровение, освобождение. Внезапные перемены к лучшему."
    },
    {
        name: "Звезда",
        symbol: "⭐",
        image: "./images/cards/star.jpg",
        meaning: "Надежда, вдохновение, исцеление. Светлое будущее впереди."
    },
    {
        name: "Луна",
        symbol: "🌛",
        image: "./images/cards/moon.jpg",
        meaning: "Иллюзии, подсознание, страхи. Доверьтесь интуиции в неопределенности."
    },
    {
        name: "Солнце",
        symbol: "☀️",
        image: "./images/cards/sun.jpg",
        meaning: "Радость, успех, позитив. Время счастья и достижений."
    },
    {
        name: "Суд",
        symbol: "📯",
        image: "./images/cards/judgement.jpg",
        meaning: "Возрождение, прощение, новый шанс. Время для второго шанса."
    },
    {
        name: "Мир",
        symbol: "🌍",
        image: "./images/cards/world.jpg",
        meaning: "Завершение цикла, достижение цели, гармония. Успешное завершение."
    }
];

// Типы раскладов
const SPREAD_TYPES = {
    love: {
        name: "💕 Любовь и отношения",
        positions: ["Вы", "Партнер", "Отношения"],
        description: "Узнайте о ваших отношениях",
        premium: true
    },
    career: {
        name: "💼 Карьера и финансы",
        positions: ["Текущее", "Препятствия", "Возможности", "Совет"],
        description: "Ваш путь к успеху",
        premium: true
    },
    week: {
        name: "📅 Неделя впереди",
        positions: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
        description: "Что ждет вас на этой неделе",
        premium: true
    },
    celtic: {
        name: "🍀 Кельтский крест",
        positions: ["Ситуация", "Вызов", "Прошлое", "Будущее", "Цель", "Подсознание", "Вы", "Окружение", "Страхи", "Результат"],
        description: "Глубокий анализ ситуации",
        premium: true
    }
};

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        TAROT_CARDS,
        SPREAD_TYPES
    };
}
