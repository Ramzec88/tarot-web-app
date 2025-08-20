// config.js - Исправленная конфигурация для Шёпот карт
// ========================================================================

console.log('🔧 Загрузка config.js...');

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ КОНФИГУРАЦИИ
window.SUPABASE_CONFIG = null;
window.API_CONFIG = null;
window.APP_CONFIG = null;
window.TABLES = {
    userProfiles: 'tarot_user_profiles',
    dailyCards: 'tarot_daily_cards',
    reviews: 'tarot_reviews',
    spreads: 'tarot_spreads',
    questions: 'tarot_questions',
    answers: 'tarot_answers'
};
window.TELEGRAM_CONFIG = {
    botUsername: 'volshebstvoVid_bot',
    webAppUrl: 'https://tarot-web-app-one.vercel.app',
    supportBot: '@Helppodarok_bot'
};
window.FALLBACK_CARDS = [];
window.SPREADS_CONFIG = {};

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
async function initializeConfig() {
    console.log('🔧 Инициализация конфигурации...');

    try {
        // 1. Сначала устанавливаем fallback конфигурации
        setupFallbackConfigs();
        
        // 2. Пытаемся загрузить реальную конфигурацию из API
        const apiLoaded = await loadConfigFromAPI();
        
        // 3. Настраиваем дополнительные конфигурации
        setupAdditionalConfigs();
        
        console.log('✅ Конфигурация успешно инициализирована');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации конфигурации:', error);
        // Убеждаемся, что хотя бы fallback установлены
        setupFallbackConfigs();
        return false;
    }
}

// 🔄 ЗАГРУЗКА КОНФИГУРАЦИИ ИЗ API
async function loadConfigFromAPI() {
    try {
        console.log('🌐 Попытка загрузки конфигурации из API...');

        // Определяем URL для API (работает и в dev, и в production)
        const apiUrl = window.location.hostname === 'localhost' 
            ? '/api/config'  // Для локальной разработки
            : `${window.location.origin}/api/config`; // Для Vercel

        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            cache: 'no-cache' // Всегда получаем свежую конфигурацию
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Конфигурация загружена из API');

            // Проверяем успешность ответа
            if (data.success === false) {
                console.warn('⚠️ API вернул ошибку, используем fallback');
                // Используем fallback из ответа сервера
                if (data.fallback) {
                    setupConfigFromData(data.fallback);
                    return true;
                }
                return false;
            }

            // Устанавливаем конфигурацию из успешного ответа
            setupConfigFromData(data);
            return true;

        } else {
            console.warn('⚠️ API вернул ошибку HTTP:', response.status, response.statusText);
            return false;
        }

    } catch (error) {
        console.warn('⚠️ Ошибка загрузки из API (используем fallback):', error.message);
        return false;
    }
}

// 🔧 ФУНКЦИЯ УСТАНОВКИ КОНФИГУРАЦИИ ИЗ ДАННЫХ
function setupConfigFromData(data) {
    // Устанавливаем Supabase конфигурацию
    if (data.supabase && data.supabase.url && data.supabase.anonKey) {
        window.SUPABASE_CONFIG = {
            url: data.supabase.url,
            anonKey: data.supabase.anonKey
        };
        console.log('✅ Supabase конфигурация загружена:', data.supabase.url);
    } else {
        console.warn('⚠️ Supabase конфигурация неполная');
    }

    // Устанавливаем API конфигурацию
    if (data.api) {
        window.API_CONFIG = {
            n8nWebhookUrl: data.api.n8nWebhookUrl || '',
            cardsUrl: data.api.cardsUrl || '',
            paymentUrl: data.api.paymentUrl || '',
            timeout: 10000,
            retryAttempts: 3
        };
        console.log('✅ API конфигурация загружена');
    }

    // Устанавливаем конфигурацию приложения
    if (data.app) {
        window.APP_CONFIG = {
            ...getDefaultAppConfig(),
            freeQuestionsLimit: data.app.freeQuestionsLimit || 3,
            premiumPrice: data.app.premiumPrice || 299,
            version: data.app.version || '1.0.0',
            supportBot: data.app.supportBot || '@Helppodarok_bot'
        };
        console.log('✅ App конфигурация загружена');
    }
}

// 🛡️ УСТАНОВКА FALLBACK КОНФИГУРАЦИЙ
function setupFallbackConfigs() {
    console.log('🛡️ Установка fallback конфигураций...');

    // Fallback Supabase конфигурация (рабочие значения)
    if (!window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG = {
            url: 'https://xqtokipsfzywippmvpgp.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxdG9raXBzZnp5d2lwcG12cGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzEwNzAyNDQsImV4cCI6MjA0NjY0NjI0NH0.GgwhQgjWLrOj4zYoL6S7_3iuYdO4ufcRsAWY_wqtTkY'
        };
    }

    // Fallback API конфигурация
    if (!window.API_CONFIG) {
        window.API_CONFIG = {
            n8nWebhookUrl: 'https://your-n8n.app/webhook/tarot',
            cardsUrl: 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
            paymentUrl: 'https://www.wildberries.ru/catalog/199937445/detail.aspx',
            timeout: 10000,
            retryAttempts: 3
        };
    }

    // Fallback конфигурация приложения
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = getDefaultAppConfig();
    }

    // Fallback карты Таро
    if (!window.FALLBACK_CARDS || window.FALLBACK_CARDS.length === 0) {
        window.FALLBACK_CARDS = getDefaultCards();
    }

    // Fallback расклады
    if (!window.SPREADS_CONFIG || Object.keys(window.SPREADS_CONFIG).length === 0) {
        window.SPREADS_CONFIG = getDefaultSpreads();
    }

    console.log('✅ Fallback конфигурации установлены');
}

// 🎨 ДОПОЛНИТЕЛЬНЫЕ НАСТРОЙКИ
function setupAdditionalConfigs() {
    // Здесь можно добавить дополнительную логику настройки
    console.log('🎨 Настройка дополнительных конфигураций...');
}

// 📋 ПОЛУЧЕНИЕ КОНФИГУРАЦИИ ПО УМОЛЧАНИЮ
function getDefaultAppConfig() {
    return {
        appName: 'Шёпот карт',
        version: '1.0.0',
        freeQuestionsLimit: 3,
        premiumPrice: 299,
        premiumDuration: 30, // дней
        welcomeMessage: 'Добро пожаловать в мир мистических предсказаний!',
        supportUrl: 'https://t.me/Helppodarok_bot',
        language: 'ru',
        theme: 'dark',
        features: {
            dailyCard: true,
            questions: true,
            spreads: true,
            history: true,
            reviews: true,
            premium: true
        }
    };
}

// 🃏 КАРТЫ ТАРО ПО УМОЛЧАНИЮ - ОБНОВЛЕННЫЕ С ПРАВИЛЬНЫМИ СИМВОЛАМИ
function getDefaultCards() {
    return [
        {
            id: "MA_0",
            name: "Дурак",
            symbol: "🔮",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=🔮",
            meaningUpright: "Начало, невинность, спонтанность, свободный дух",
            meaningReversed: "Безрассудство, наивность, риск",
            description: "Карта новых начинаний и свободы выбора. Сегодня звезды благоволят вашим смелым решениям и спонтанным поступкам."
        },
        {
            id: "MA_1",
            name: "Маг",
            symbol: "🔮",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=🔮",
            meaningUpright: "Сила воли, проявление, вдохновение",
            meaningReversed: "Манипуляция, обман, неиспользованные таланты",
            description: "Карта силы воли и творческих способностей. У вас есть все инструменты для достижения цели."
        },
        {
            id: "MA_2",
            name: "Верховная Жрица",
            symbol: "🌙",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=🌙",
            meaningUpright: "Интуиция, тайны, внутренний голос",
            meaningReversed: "Потаённость, отстранённость, иллюзии",
            description: "Карта интуиции и скрытых знаний. Прислушайтесь к своему внутреннему голосу."
        },
        {
            id: "MA_3",
            name: "Императрица",
            symbol: "👑",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=👑",
            meaningUpright: "Изобилие, материнство, природа",
            meaningReversed: "Излишества, зависимость, застой",
            description: "Карта творческой энергии и изобилия. Время расцвета и плодородных идей."
        },
        {
            id: "MA_4",
            name: "Император",
            symbol: "⚔️",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=⚔️",
            meaningUpright: "Структура, стабильность, авторитет",
            meaningReversed: "Жесткость, контроль, деспотизм",
            description: "Карта стабильности и порядка. Время укрепить свои позиции и проявить лидерство."
        },
        {
            id: "MA_17",
            name: "Звезда",
            symbol: "⭐",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=⭐",
            meaningUpright: "Надежда, вдохновение, исцеление",
            meaningReversed: "Пессимизм, разочарование",
            description: "Карта надежды и вдохновения. Впереди вас ждут светлые перспективы и новые возможности."
        },
        {
            id: "MA_19",
            name: "Солнце",
            symbol: "☀️",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=☀️",
            meaningUpright: "Радость, успех, жизненная сила",
            meaningReversed: "Сомнение, эго",
            description: "Карта радости и успеха. Сегодня день полон позитивной энергии и благоприятных возможностей."
        },
        {
            id: "MA_18",
            name: "Луна",
            symbol: "🌙",
            image: "https://via.placeholder.com/180x270/8A2BE2/FFFFFF?text=🌙",
            meaningUpright: "Иллюзии, интуиция, страхи",
            meaningReversed: "Ясность, прозрение",
            description: "Карта тайн и интуиции. Доверьтесь внутреннему голосу, но будьте осторожны с иллюзиями."
        }
    ];
}

// 🎴 РАСКЛАДЫ ПО УМОЛЧАНИЮ
function getDefaultSpreads() {
    return {
        daily: {
            name: 'Карта дня',
            description: 'Ежедневное предсказание и совет',
            cards: [
                { name: 'Карта дня', description: 'Основная энергия и совет на день' }
            ],
            isPremium: false
        },
        simple: {
            name: 'Простой ответ',
            description: 'Прямой ответ на ваш вопрос',
            cards: [
                { name: 'Ответ', description: 'Основной ответ на ваш вопрос' }
            ],
            isPremium: false
        },
        love: {
            name: 'Любовь',
            description: 'Расклад на отношения и любовь',
            cards: [
                { name: 'Вы', description: 'Ваше состояние в отношениях' },
                { name: 'Партнёр', description: 'Состояние и чувства партнёра' },
                { name: 'Отношения', description: 'Общая динамика и перспективы' }
            ],
            isPremium: true
        },
        career: {
            name: 'Карьера',
            description: 'Профессиональные вопросы и развитие',
            cards: [
                { name: 'Текущая ситуация', description: 'Где вы находитесь сейчас' },
                { name: 'Возможности', description: 'Что вам доступно' },
                { name: 'Результат', description: 'К чему это приведёт' }
            ],
            isPremium: true
        },
        decision: {
            name: 'Принятие решения',
            description: 'Поможет сделать правильный выбор',
            cards: [
                { name: 'Вариант А', description: 'Первый вариант развития событий' },
                { name: 'Вариант Б', description: 'Второй вариант развития событий' }
            ],
            isPremium: false
        }
    };
}

// 📊 ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ КОНФИГУРАЦИИ
function getSupabaseConfig() {
    return window.SUPABASE_CONFIG;
}

function getAPIConfig() {
    return window.API_CONFIG;
}

function getAppConfig() {
    return window.APP_CONFIG;
}

function getTablesConfig() {
    return window.TABLES;
}

function getTelegramConfig() {
    return window.TELEGRAM_CONFIG;
}

function getFallbackCards() {
    return window.FALLBACK_CARDS;
}

function getSpreadsConfig() {
    return window.SPREADS_CONFIG;
}

// ✅ ПРОВЕРКА ГОТОВНОСТИ КОНФИГУРАЦИИ
function isConfigReady() {
    const ready = !!(
        window.SUPABASE_CONFIG &&
        window.API_CONFIG &&
        window.APP_CONFIG &&
        window.FALLBACK_CARDS &&
        window.FALLBACK_CARDS.length > 0 &&
        window.TABLES &&
        window.TELEGRAM_CONFIG &&
        window.SPREADS_CONFIG &&
        Object.keys(window.SPREADS_CONFIG).length > 0
    );
    
    if (!ready) {
        console.warn('⚠️ Конфигурация не готова:', {
            supabase: !!window.SUPABASE_CONFIG,
            api: !!window.API_CONFIG,
            app: !!window.APP_CONFIG,
            cards: window.FALLBACK_CARDS ? window.FALLBACK_CARDS.length : 0,
            tables: !!window.TABLES,
            telegram: !!window.TELEGRAM_CONFIG,
            spreads: window.SPREADS_CONFIG ? Object.keys(window.SPREADS_CONFIG).length : 0
        });
    }
    
    return ready;
}

// 🔧 ОТЛАДКА КОНФИГУРАЦИИ
function debugConfig() {
    console.log('🔧 Состояние конфигурации:', {
        supabase: !!window.SUPABASE_CONFIG,
        api: !!window.API_CONFIG,
        app: !!window.APP_CONFIG,
        tables: !!window.TABLES,
        telegram: !!window.TELEGRAM_CONFIG,
        fallbackCards: window.FALLBACK_CARDS ? window.FALLBACK_CARDS.length : 0,
        spreads: window.SPREADS_CONFIG ? Object.keys(window.SPREADS_CONFIG).length : 0,
        isReady: isConfigReady()
    });
    
    if (window.SUPABASE_CONFIG) {
        console.log('Supabase URL:', window.SUPABASE_CONFIG.url);
    }
    if (window.API_CONFIG) {
        console.log('N8N Webhook:', window.API_CONFIG.n8nWebhookUrl);
    }
}

// 🌟 ЭКСПОРТ ФУНКЦИЙ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.initializeConfig = initializeConfig;
window.getSupabaseConfig = getSupabaseConfig;
window.getAPIConfig = getAPIConfig;
window.getAppConfig = getAppConfig;
window.getTablesConfig = getTablesConfig;
window.getTelegramConfig = getTelegramConfig;
window.getFallbackCards = getFallbackCards;
window.getSpreadsConfig = getSpreadsConfig;
window.isConfigReady = isConfigReady;
window.debugConfig = debugConfig;

// 🏁 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🏁 DOM готов, инициализирую конфигурацию...');
    await initializeConfig();
    console.log('✅ Конфигурация готова');
});

// Запасная инициализация для случаев, когда DOMContentLoaded уже прошел
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeConfig);
} else {
    initializeConfig();
}

console.log('✅ Config.js загружен');
