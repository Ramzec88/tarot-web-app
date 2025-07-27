// config.js - Динамическая конфигурация из Environment Variables
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ КОНФИГУРАЦИИ
let SUPABASE_CONFIG = null;
let API_CONFIG = null;
let APP_CONFIG = null;

// 🔄 ЗАГРУЗКА КОНФИГУРАЦИИ ИЗ API
async function loadConfigFromAPI() {
    try {
        console.log('🔧 Загружаю конфигурацию из API...');
        
        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const serverConfig = await response.json();
        
        // Инициализируем конфигурацию из серверных данных
        SUPABASE_CONFIG = {
            url: serverConfig.supabase.url,
            anonKey: serverConfig.supabase.anonKey
        };
        
        API_CONFIG = {
            cardsUrl: serverConfig.api.cardsUrl,
            cardsFallbackUrl: `https://cdn.jsdelivr.net/gh/${getGitHubRepoFromUrl(serverConfig.api.cardsUrl)}@main/cards.json`,
            cardsLocalFallback: './cards.json',
            paymentUrl: serverConfig.api.paymentUrl,
            
            // Настройки загрузки карт
            requestTimeout: 15000,
            cacheTimeout: 24 * 60 * 60 * 1000,
            maxRetries: 3,
            retryDelay: 2000
        };
        
        APP_CONFIG = {
            freeQuestionsLimit: serverConfig.app.freeQuestionsLimit,
            premiumPrice: serverConfig.app.premiumPrice,
            premiumDuration: 30,
            sessionTimeout: 24 * 60 * 60 * 1000,
            
            // Анимации и эффекты
            typewriterSpeed: 30,
            cardFlipDuration: 500,
            sparkleCount: 5,
            loadingDelay: 2000,
            
            // Настройки кэширования
            enableCaching: true,
            cacheVersion: '2.0',
            maxHistoryItems: 100,
            maxCacheSize: 5 * 1024 * 1024,
            
            // Тексты интерфейса
            texts: {
                welcome: 'Добро пожаловать в мистический мир карт Таро 🔮',
                noQuestions: 'Пожалуйста, задайте вопрос',
                questionsEnded: 'У вас закончились бесплатные вопросы. Оформите премиум для неограниченного доступа!',
                generating: 'Генерирую персональное предсказание...',
                cardsThinking: 'Карты размышляют... 🃏',
                cardsWhispering: 'Карты шепчут тайны... ✨',
                cardDrawn: 'Карта вытянута! Узнайте что она означает...',
                loadingCards: 'Загружаю колоду карт...',
                cardsReady: 'Карты готовы к предсказанию!',
                connectionError: 'Проблема с подключением. Проверьте интернет.',
                tryAgain: 'Попробуйте еще раз'
            },
            
            // Уведомления
            notifications: {
                cardsCached: '🃏 Карты обновлены!',
                historyCleared: '📝 История очищена',
                dataShared: '📤 Данные отправлены в бота',
                error: '❌ Произошла ошибка',
                success: '✅ Операция выполнена успешно'
            }
        };
        
        console.log('✅ Конфигурация загружена из API');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки конфигурации из API:', error);
        return false;
    }
}

// 🔄 ФОЛЛБЭК КОНФИГУРАЦИЯ (если API недоступен)
function loadFallbackConfig() {
    console.log('⚠️ Используется фоллбэк конфигурация');
    
    SUPABASE_CONFIG = {
        url: 'https://your-fallback-project.supabase.co',
        anonKey: 'your-fallback-anon-key'
    };
    
    API_CONFIG = {
        cardsUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/tarot-web-app/main/cards.json',
        cardsFallbackUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/tarot-web-app@main/cards.json',
        cardsLocalFallback: './cards.json',
        paymentUrl: 'https://digital.wildberries.ru/offer/491728',
        requestTimeout: 15000,
        cacheTimeout: 24 * 60 * 60 * 1000,
        maxRetries: 3,
        retryDelay: 2000
    };
    
    APP_CONFIG = {
        freeQuestionsLimit: 3,
        premiumPrice: 299,
        premiumDuration: 30,
        sessionTimeout: 24 * 60 * 60 * 1000,
        typewriterSpeed: 30,
        cardFlipDuration: 500,
        sparkleCount: 5,
        loadingDelay: 2000,
        enableCaching: true,
        cacheVersion: '2.0',
        maxHistoryItems: 100,
        maxCacheSize: 5 * 1024 * 1024,
        texts: {
            welcome: 'Добро пожаловать в мистический мир карт Таро 🔮',
            noQuestions: 'Пожалуйста, задайте вопрос',
            questionsEnded: 'У вас закончились бесплатные вопросы. Оформите премиум для неограниченного доступа!',
            generating: 'Генерирую персональное предсказание...',
            cardsThinking: 'Карты размышляют... 🃏',
            cardsWhispering: 'Карты шепчут тайны... ✨',
            cardDrawn: 'Карта вытянута! Узнайте что она означает...',
            loadingCards: 'Загружаю колоду карт...',
            cardsReady: 'Карты готовы к предсказанию!',
            connectionError: 'Проблема с подключением. Проверьте интернет.',
            tryAgain: 'Попробуйте еще раз'
        },
        notifications: {
            cardsCached: '🃏 Карты обновлены!',
            historyCleared: '📝 История очищена',
            dataShared: '📤 Данные отправлены в бота',
            error: '❌ Произошла ошибка',
            success: '✅ Операция выполнена успешно'
        }
    };
}

// 🚀 ИНИЦИАЛИЗАЦИЯ КОНФИГУРАЦИИ
async function initializeConfig() {
    const configLoaded = await loadConfigFromAPI();
    
    if (!configLoaded) {
        loadFallbackConfig();
    }
    
    // Добавляем статические данные, которые не меняются
    window.TABLES = {
        userProfiles: 'tarot_user_profiles',
        questions: 'tarot_questions',
        answers: 'tarot_answers',
        dailyCards: 'tarot_daily_cards',
        spreads: 'tarot_spreads',
        reviews: 'tarot_reviews'
    };
    
    window.FALLBACK_CARDS = [
        {
            id: "FB_0",
            name: "Загадочная карта",
            symbol: "🔮",
            meaningUpright: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
            meaningReversed: "Возможно, стоит попробовать позже.",
            meaning: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
            image: "./images/cards/default.jpg",
            type: "Фоллбэк",
            element: "Эфир"
        },
        {
            id: "FB_1",
            name: "Маг",
            symbol: "⚡",
            meaningUpright: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
            meaningReversed: "Злоупотребление силой, самообман, недостаток энергии.",
            meaning: "Сила воли, мастерство, концентрация.",
            image: "./images/cards/magician.jpg",
            type: "Старшие Арканы",
            element: "Воздух"
        }
    ];
    
    window.SPREADS_CONFIG = {
        threeCard: {
            name: 'Прошлое-Настоящее-Будущее',
            description: 'Классический расклад для понимания ситуации',
            cardCount: 3,
            positions: [
                { name: 'Прошлое', description: 'Что привело к текущей ситуации' },
                { name: 'Настоящее', description: 'Текущее состояние дел' },
                { name: 'Будущее', description: 'Возможное развитие событий' }
            ]
        },
        celticCross: {
            name: 'Кельтский крест',
            description: 'Подробный анализ ситуации',
            cardCount: 5,
            positions: [
                { name: 'Суть вопроса', description: 'Основа ситуации' },
                { name: 'Препятствие', description: 'Что мешает или помогает' },
                { name: 'Прошлое', description: 'Корни ситуации' },
                { name: 'Возможное будущее', description: 'Вероятный исход' },
                { name: 'Совет', description: 'Рекомендация карт' }
            ]
        }
    };
    
    // Делаем конфигурацию доступной глобально
    window.SUPABASE_CONFIG = SUPABASE_CONFIG;
    window.API_CONFIG = API_CONFIG;
    window.APP_CONFIG = APP_CONFIG;
    
    console.log('🔧 Конфигурация инициализирована');
    return true;
}

// 🛠️ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getGitHubRepoFromUrl(url) {
    try {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : 'YOUR_USERNAME/tarot-web-app';
    } catch (error) {
        return 'YOUR_USERNAME/tarot-web-app';
    }
}

// 🔍 ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ КОНФИГУРАЦИИ
function getSupabaseConfig() {
    return SUPABASE_CONFIG;
}

function getAPIConfig() {
    return API_CONFIG;
}

function getAppConfig() {
    return APP_CONFIG;
}

// 🧪 ФУНКЦИЯ ДЛЯ ОТЛАДКИ
function debugConfig() {
    console.log('🔧 Текущая конфигурация:', {
        supabase: !!SUPABASE_CONFIG,
        api: !!API_CONFIG,
        app: !!APP_CONFIG,
        supabaseUrl: SUPABASE_CONFIG?.url ? 'Настроен' : 'Не настроен',
        cardsUrl: API_CONFIG?.cardsUrl ? 'Настроен' : 'Не настроен'
    });
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeConfig,
        getSupabaseConfig,
        getAPIConfig,
        getAppConfig,
        debugConfig
    };
}

// Экспорт функций для глобального доступа
window.initializeConfig = initializeConfig;
window.getSupabaseConfig = getSupabaseConfig;
window.getAPIConfig = getAPIConfig;
window.getAppConfig = getAppConfig;
window.debugConfig = debugConfig;

// 📊 НАЗВАНИЯ ТАБЛИЦ В SUPABASE
const TABLES = {
    userProfiles: 'tarot_user_profiles',
    questions: 'tarot_questions', 
    answers: 'tarot_answers',
    dailyCards: 'tarot_daily_cards',
    spreads: 'tarot_spreads',
    reviews: 'tarot_reviews'
};

// 🔗 API КОНФИГУРАЦИЯ (публичные endpoints)
const API_CONFIG = {
    // n8n вебхуки для бизнес-логики и ИИ-предсказаний
    generatePrediction: 'https://romanmedn8n.ru/webhook/tarot-prediction',
    
    // 🃏 КАРТЫ ТАРО - загрузка с GitHub (публичные URL)
    cardsUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/tarot-web-app/main/cards.json',
    
    // Резервный URL через jsDelivr CDN для надежности
    cardsFallbackUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/tarot-web-app@main/cards.json',
    
    // Локальный фоллбэк (если GitHub недоступен)
    cardsLocalFallback: './cards.json',
    
    // ⚙️ Настройки загрузки карт
    requestTimeout: 15000, // 15 секунд на запрос
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 часа кэш
    maxRetries: 3,
    retryDelay: 2000,
    
    // 💳 URL для оплаты премиум-подписки
    paymentUrl: 'https://digital.wildberries.ru/offer/491728'
};

// 📱 TELEGRAM КОНФИГУРАЦИЯ (публичная часть)
const TELEGRAM_CONFIG = {
    botUsername: 'YourTarotBot' // Замените на username вашего бота
    // ⚠️ botToken НЕ должен быть в клиентском коде!
};

// ⚙️ НАСТРОЙКИ ПРИЛОЖЕНИЯ
const APP_CONFIG = {
    // Лимиты и подписка
    freeQuestionsLimit: 3,
    premiumPrice: 299,
    premiumDuration: 30, // дней
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 часа
    
    // Анимации и эффекты
    typewriterSpeed: 30, // скорость печатного эффекта
    cardFlipDuration: 500, // длительность переворота карты
    sparkleCount: 5, // количество блесток
    loadingDelay: 2000, // задержка имитации "мышления" карт
    
    // Настройки кэширования
    enableCaching: true,
    cacheVersion: '2.0',
    maxHistoryItems: 100,
    maxCacheSize: 5 * 1024 * 1024, // 5MB
    
    // Тексты интерфейса
    texts: {
        welcome: 'Добро пожаловать в мистический мир карт Таро 🔮',
        noQuestions: 'Пожалуйста, задайте вопрос',
        questionsEnded: 'У вас закончились бесплатные вопросы. Оформите премиум для неограниченного доступа!',
        generating: 'Генерирую персональное предсказание...',
        cardsThinking: 'Карты размышляют... 🃏',
        cardsWhispering: 'Карты шепчут тайны... ✨',
        cardDrawn: 'Карта вытянута! Узнайте что она означает...',
        loadingCards: 'Загружаю колоду карт...',
        cardsReady: 'Карты готовы к предсказанию!',
        connectionError: 'Проблема с подключением. Проверьте интернет.',
        tryAgain: 'Попробуйте еще раз'
    },
    
    // Уведомления
    notifications: {
        cardsCached: '🃏 Карты обновлены!',
        historyCleared: '📝 История очищена',
        dataShared: '📤 Данные отправлены в бота',
        error: '❌ Произошла ошибка',
        success: '✅ Операция выполнена успешно'
    }
};

// 🃏 ФОЛЛБЭК КАРТЫ (на случай проблем с загрузкой)
const FALLBACK_CARDS = [
    {
        id: "FB_0",
        name: "Загадочная карта",
        symbol: "🔮",
        meaningUpright: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
        meaningReversed: "Возможно, стоит попробовать позже.",
        meaning: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
        image: "./images/cards/default.jpg",
        type: "Фоллбэк",
        element: "Эфир"
    },
    {
        id: "FB_1",
        name: "Маг",
        symbol: "⚡",
        meaningUpright: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
        meaningReversed: "Злоупотребление силой, самообман, недостаток энергии.",
        meaning: "Сила воли, мастерство, концентрация.",
        image: "./images/cards/magician.jpg",
        type: "Старшие Арканы",
        element: "Воздух"
    },
    {
        id: "FB_2",
        name: "Верховная Жрица",
        symbol: "🌙",
        meaningUpright: "Интуиция, тайны, внутренний голос. Время прислушаться к своей мудрости.",
        meaningReversed: "Скрытые мотивы, недостаток внутреннего голоса.",
        meaning: "Интуиция, тайны, внутренний голос.",
        image: "./images/cards/high_priestess.jpg",
        type: "Старшие Арканы",
        element: "Вода"
    }
];

// 📋 РАСКЛАДЫ КАРТ
const SPREADS_CONFIG = {
    // Простой расклад из 3 карт
    threeCard: {
        name: 'Прошлое-Настоящее-Будущее',
        description: 'Классический расклад для понимания ситуации',
        cardCount: 3,
        positions: [
            { name: 'Прошлое', description: 'Что привело к текущей ситуации' },
            { name: 'Настоящее', description: 'Текущее состояние дел' },
            { name: 'Будущее', description: 'Возможное развитие событий' }
        ]
    },
    
    // Расклад "Кельтский крест" (упрощенный)
    celticCross: {
        name: 'Кельтский крест',
        description: 'Подробный анализ ситуации',
        cardCount: 5,
        positions: [
            { name: 'Суть вопроса', description: 'Основа ситуации' },
            { name: 'Препятствие', description: 'Что мешает или помогает' },
            { name: 'Прошлое', description: 'Корни ситуации' },
            { name: 'Возможное будущее', description: 'Вероятный исход' },
            { name: 'Совет', description: 'Рекомендация карт' }
        ]
    },
    
    // Расклад для отношений
    relationship: {
        name: 'Расклад отношений',
        description: 'Анализ отношений между двумя людьми',
        cardCount: 3,
        positions: [
            { name: 'Ваши чувства', description: 'Ваше отношение к ситуации' },
            { name: 'Чувства партнера', description: 'Отношение другого человека' },
            { name: 'Перспективы', description: 'Будущее отношений' }
        ]
    }
};

// 🎨 НАСТРОЙКИ ТЕМЫ И СТИЛЕЙ
const THEME_CONFIG = {
    colors: {
        primary: '#6366f1', // Индиго
        secondary: '#8b5cf6', // Фиолетовый
        accent: '#f59e0b', // Янтарный
        background: '#0f0f23', // Темно-синий
        surface: '#1e1e3f', // Поверхность
        text: '#e2e8f0', // Светло-серый текст
        textSecondary: '#94a3b8', // Вторичный текст
        success: '#10b981', // Зеленый
        warning: '#f59e0b', // Оранжевый
        error: '#ef4444', // Красный
        gold: '#ffd700' // Золотой для премиум
    },
    
    animations: {
        fast: '200ms',
        normal: '300ms',
        slow: '500ms',
        sparkle: '1000ms',
        typewriter: '50ms'
    }
};

// 🔧 ОТЛАДОЧНЫЕ ФУНКЦИИ (для разработки)
const DEBUG_CONFIG = {
    enabled: false, // Включить в development режиме
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    mockData: false, // Использовать mock данные
    skipAnimations: false, // Пропускать анимации для тестирования
    showPerformanceMetrics: false
};

// 📈 АНАЛИТИКА И МЕТРИКИ
const ANALYTICS_CONFIG = {
    enabled: true,
    trackEvents: [
        'card_drawn',
        'question_asked',
        'spread_completed',
        'premium_purchased',
        'app_launched'
    ],
    sessionTimeout: 30 * 60 * 1000 // 30 минут
};

// 🔒 ВАЖНАЯ ИНФОРМАЦИЯ О БЕЗОПАСНОСТИ
console.log(`
🔒 БЕЗОПАСНОСТЬ:
- Все приватные ключи должны быть в Environment Variables на Vercel
- Service Role Key НЕ должен быть в клиентском коде  
- Bot Token доступен только серверным функциям
- Anon Key безопасен для клиентского использования
`);

// Экспорт для использования в других файлах (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        TABLES,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        FALLBACK_CARDS,
        SPREADS_CONFIG,
        THEME_CONFIG,
        DEBUG_CONFIG,
        ANALYTICS_CONFIG
    };
}

// 📊 НАЗВАНИЯ ТАБЛИЦ В SUPABASE
const TABLES = {
    userProfiles: 'tarot_user_profiles',
    questions: 'tarot_questions', 
    answers: 'tarot_answers',
    dailyCards: 'tarot_daily_cards',
    spreads: 'tarot_spreads',
    reviews: 'tarot_reviews'
};

// 🔗 API КОНФИГУРАЦИЯ
const API_CONFIG = {
    // n8n вебхуки для бизнес-логики и ИИ-предсказаний
    createUser: 'https://romanmedn8n.ru/webhook/tarot-create-user',
    saveProfile: 'https://romanmedn8n.ru/webhook/tarot-save-profile',
    getProfile: 'https://romanmedn8n.ru/webhook/tarot-get-profile',
    saveQuestion: 'https://romanmedn8n.ru/webhook/tarot-save-question',
    saveAnswer: 'https://romanmedn8n.ru/webhook/tarot-save-answer',
    saveDailyCard: 'https://romanmedn8n.ru/webhook/tarot-save-daily-card',
    getHistory: 'https://romanmedn8n.ru/webhook/tarot-get-history',
    updateSubscription: 'https://romanmedn8n.ru/webhook/tarot-update-subscription',
    generatePrediction: 'https://romanmedn8n.ru/webhook/tarot-prediction',
    
    // 🃏 КАРТЫ ТАРО - загрузка с GitHub (быстро и надежно)
    cardsUrl: 'https://raw.githubusercontent.com/YOUR_USERNAME/tarot-web-app/main/cards.json',
    
    // Резервный URL через jsDelivr CDN для надежности
    cardsFallbackUrl: 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/tarot-web-app@main/cards.json',
    
    // Локальный фоллбэк (если GitHub недоступен)
    cardsLocalFallback: './cards.json',
    
    // ⚙️ Настройки загрузки карт
    requestTimeout: 15000, // 15 секунд на запрос
    cacheTimeout: 24 * 60 * 60 * 1000, // 24 часа кэш
    maxRetries: 3,
    retryDelay: 2000,
    
    // 💳 URL для оплаты премиум-подписки
    paymentUrl: 'https://digital.wildberries.ru/offer/491728'
};

// 📱 TELEGRAM КОНФИГУРАЦИЯ
const TELEGRAM_CONFIG = {
    botToken: 'YOUR_BOT_TOKEN', // Замените на токен вашего бота
    botUsername: 'YourTarotBot' // Замените на username вашего бота
};

// ⚙️ НАСТРОЙКИ ПРИЛОЖЕНИЯ
const APP_CONFIG = {
    // Лимиты и подписка
    freeQuestionsLimit: 3,
    premiumPrice: 299,
    premiumDuration: 30, // дней
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 часа
    
    // Анимации и эффекты
    typewriterSpeed: 30, // скорость печатного эффекта
    cardFlipDuration: 500, // длительность переворота карты
    sparkleCount: 5, // количество блесток
    loadingDelay: 2000, // задержка имитации "мышления" карт
    
    // Настройки кэширования
    enableCaching: true,
    cacheVersion: '2.0',
    maxHistoryItems: 100,
    maxCacheSize: 5 * 1024 * 1024, // 5MB
    
    // Тексты интерфейса
    texts: {
        welcome: 'Добро пожаловать в мистический мир карт Таро 🔮',
        noQuestions: 'Пожалуйста, задайте вопрос',
        questionsEnded: 'У вас закончились бесплатные вопросы. Оформите премиум для неограниченного доступа!',
        generating: 'Генерирую персональное предсказание...',
        cardsThinking: 'Карты размышляют... 🃏',
        cardsWhispering: 'Карты шепчут тайны... ✨',
        cardDrawn: 'Карта вытянута! Узнайте что она означает...',
        loadingCards: 'Загружаю колоду карт...',
        cardsReady: 'Карты готовы к предсказанию!',
        connectionError: 'Проблема с подключением. Проверьте интернет.',
        tryAgain: 'Попробуйте еще раз'
    },
    
    // Уведомления
    notifications: {
        cardsCached: '🃏 Карты обновлены!',
        historyCleared: '📝 История очищена',
        dataShared: '📤 Данные отправлены в бота',
        error: '❌ Произошла ошибка',
        success: '✅ Операция выполнена успешно'
    }
};

// 🃏 ФОЛЛБЭК КАРТЫ (на случай проблем с загрузкой)
const FALLBACK_CARDS = [
    {
        id: "FB_0",
        name: "Загадочная карта",
        symbol: "🔮",
        meaningUpright: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
        meaningReversed: "Возможно, стоит попробовать позже.",
        meaning: "Карты временно недоступны, но энергия Вселенной все равно с вами.",
        image: "./images/cards/default.jpg",
        type: "Фоллбэк",
        element: "Эфир"
    },
    {
        id: "FB_1",
        name: "Маг",
        symbol: "⚡",
        meaningUpright: "Сила воли, мастерство, концентрация. У вас есть все необходимое для достижения целей.",
        meaningReversed: "Злоупотребление силой, самообман, недостаток энергии.",
        meaning: "Сила воли, мастерство, концентрация.",
        image: "./images/cards/magician.jpg",
        type: "Старшие Арканы",
        element: "Воздух"
    },
    {
        id: "FB_2",
        name: "Верховная Жрица",
        symbol: "🌙",
        meaningUpright: "Интуиция, тайны, внутренний голос. Время прислушаться к своей мудрости.",
        meaningReversed: "Скрытые мотивы, недостаток внутреннего голоса.",
        meaning: "Интуиция, тайны, внутренний голос.",
        image: "./images/cards/high_priestess.jpg",
        type: "Старшие Арканы",
        element: "Вода"
    }
];

// 📋 РАСКЛАДЫ КАРТ
const SPREADS_CONFIG = {
    // Простой расклад из 3 карт
    threeCard: {
        name: 'Прошлое-Настоящее-Будущее',
        description: 'Классический расклад для понимания ситуации',
        cardCount: 3,
        positions: [
            { name: 'Прошлое', description: 'Что привело к текущей ситуации' },
            { name: 'Настоящее', description: 'Текущее состояние дел' },
            { name: 'Будущее', description: 'Возможное развитие событий' }
        ]
    },
    
    // Расклад "Кельтский крест" (упрощенный)
    celticCross: {
        name: 'Кельтский крест',
        description: 'Подробный анализ ситуации',
        cardCount: 5,
        positions: [
            { name: 'Суть вопроса', description: 'Основа ситуации' },
            { name: 'Препятствие', description: 'Что мешает или помогает' },
            { name: 'Прошлое', description: 'Корни ситуации' },
            { name: 'Возможное будущее', description: 'Вероятный исход' },
            { name: 'Совет', description: 'Рекомендация карт' }
        ]
    },
    
    // Расклад для отношений
    relationship: {
        name: 'Расклад отношений',
        description: 'Анализ отношений между двумя людьми',
        cardCount: 3,
        positions: [
            { name: 'Ваши чувства', description: 'Ваше отношение к ситуации' },
            { name: 'Чувства партнера', description: 'Отношение другого человека' },
            { name: 'Перспективы', description: 'Будущее отношений' }
        ]
    }
};

// 🎨 НАСТРОЙКИ ТЕМЫ И СТИЛЕЙ
const THEME_CONFIG = {
    colors: {
        primary: '#6366f1', // Индиго
        secondary: '#8b5cf6', // Фиолетовый
        accent: '#f59e0b', // Янтарный
        background: '#0f0f23', // Темно-синий
        surface: '#1e1e3f', // Поверхность
        text: '#e2e8f0', // Светло-серый текст
        textSecondary: '#94a3b8', // Вторичный текст
        success: '#10b981', // Зеленый
        warning: '#f59e0b', // Оранжевый
        error: '#ef4444', // Красный
        gold: '#ffd700' // Золотой для премиум
    },
    
    animations: {
        fast: '200ms',
        normal: '300ms',
        slow: '500ms',
        sparkle: '1000ms',
        typewriter: '50ms'
    }
};

// 🔧 ОТЛАДОЧНЫЕ ФУНКЦИИ (для разработки)
const DEBUG_CONFIG = {
    enabled: false, // Включить в development режиме
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    mockData: false, // Использовать mock данные
    skipAnimations: false, // Пропускать анимации для тестирования
    showPerformanceMetrics: false
};

// 📈 АНАЛИТИКА И МЕТРИКИ
const ANALYTICS_CONFIG = {
    enabled: true,
    trackEvents: [
        'card_drawn',
        'question_asked',
        'spread_completed',
        'premium_purchased',
        'app_launched'
    ],
    sessionTimeout: 30 * 60 * 1000 // 30 минут
};

// Экспорт для использования в других файлах (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUPABASE_CONFIG,
        TABLES,
        API_CONFIG,
        TELEGRAM_CONFIG,
        APP_CONFIG,
        FALLBACK_CARDS,
        SPREADS_CONFIG,
        THEME_CONFIG,
        DEBUG_CONFIG,
        ANALYTICS_CONFIG
    };
}
