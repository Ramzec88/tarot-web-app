// config.js - Исправленная конфигурация
// ========================================================================

console.log('🔧 Загрузка config.js...');

// Глобальные переменные для конфигурации
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
    botUsername: 'ShepotKartBot',
    webAppUrl: 'https://tarot-web-app-one.vercel.app', // Замените на ваш URL
    supportBot: '@Helppodark_bot'
};
window.FALLBACK_CARDS = [];
window.SPREADS_CONFIG = {};

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ КОНФИГУРАЦИИ
async function initializeConfig() {
    console.log('🔧 Инициализация конфигурации...');

    try {
        // Сначала устанавливаем fallback конфигурации
        setupFallbackConfigs();
        
        // Затем пытаемся загрузить из API
        await loadConfigFromAPI();
        
        // Устанавливаем дополнительные конфигурации
        setupAdditionalConfigs();
        
        console.log('✅ Конфигурация успешно инициализирована');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации конфигурации:', error);
        setupFallbackConfigs(); // На всякий случай
        return false;
    }
}

// 🔄 ЗАГРУЗКА КОНФИГУРАЦИИ ИЗ API
async function loadConfigFromAPI() {
    try {
        console.log('🌐 Попытка загрузки конфигурации из API...');

        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const config = await response.json();
            console.log('✅ Конфигурация загружена из API');

            if (config.supabase) {
                window.SUPABASE_CONFIG = config.supabase;
                console.log('✅ Supabase конфигурация загружена');
            }

            if (config.api) {
                window.API_CONFIG = {
                    n8nWebhookUrl: config.api.n8nWebhookUrl || 'https://your-n8n.app/webhook/tarot',
                    cardsUrl: config.api.cardsUrl || 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
                    paymentUrl: config.api.paymentUrl || 'https://www.wildberries.ru/catalog/199937445/detail.aspx',
                    timeout: 10000,
                    retryAttempts: 3
                };
                console.log('✅ API конфигурация загружена');
            }

            if (config.app) {
                window.APP_CONFIG = {
                    ...getDefaultAppConfig(),
                    freeQuestionsLimit: config.app.freeQuestionsLimit || 3,
                    premiumPrice: config.app.premiumPrice || 299
                };
                console.log('✅ App конфигурация загружена');
            }

            return true;
        } else {
            console.warn('⚠️ API недоступен, используем fallback конфигурацию');
            return false;
        }

    } catch (error) {
        console.warn('⚠️ Ошибка загрузки из API:', error);
        return false;
    }
}

// 🛡️ УСТАНОВКА FALLBACK КОНФИГУРАЦИЙ
function setupFallbackConfigs() {
    console.log('🛡️ Установка fallback конфигураций...');

    if (!window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG = {
            url: 'https://your-project.supabase.co', // Замените на ваш URL
            anonKey: 'your-anon-key' // Замените на ваш ключ
        };
    }

    if (!window.API_CONFIG) {
        window.API_CONFIG = {
            n8nWebhookUrl: 'https://your-n8n.app/webhook/tarot',
            cardsUrl: 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
            paymentUrl: 'https://www.wildberries.ru/catalog/199937445/detail.aspx',
            timeout: 10000,
            retryAttempts: 3
        };
    }

    if (!window.APP_CONFIG) {
        window.APP_CONFIG = getDefaultAppConfig();
    }
}

// 🎯 ДОПОЛНИТЕЛЬНЫЕ КОНФИГУРАЦИИ
function setupAdditionalConfigs() {
    // Устанавливаем fallback карты
    if (!window.FALLBACK_CARDS || window.FALLBACK_CARDS.length === 0) {
        window.FALLBACK_CARDS = getDefaultCards();
    }

    // Устанавливаем расклады
    if (!window.SPREADS_CONFIG || Object.keys(window.SPREADS_CONFIG).length === 0) {
        window.SPREADS_CONFIG = getDefaultSpreads();
    }
}

// 📋 ДЕФОЛТНЫЕ КОНФИГУРАЦИИ
function getDefaultAppConfig() {
    return {
        appName: 'Шёпот карт',
        version: '1.0.0',
        freeQuestionsLimit: 3,
        premiumPrice: 299,
        showWelcomeModal: true,
        enableNotifications: true,
        cacheTimeout: 3600000, // 1 час
        debugMode: false
    };
}

function getDefaultCards() {
    return [
        {
            id: 1,
            name: 'Дурак',
            arcana: 'major',
            number: 0,
            keywords: ['новые начинания', 'спонтанность', 'свобода'],
            description: 'Карта новых начинаний и бесконечных возможностей.',
            image: '🃏'
        },
        {
            id: 2,
            name: 'Маг',
            arcana: 'major',
            number: 1,
            keywords: ['воля', 'мастерство', 'сила'],
            description: 'Карта проявления желаний и реализации планов.',
            image: '🧙‍♂️'
        },
        {
            id: 3,
            name: 'Верховная Жрица',
            arcana: 'major',
            number: 2,
            keywords: ['интуиция', 'тайные знания', 'мудрость'],
            description: 'Карта внутренней мудрости и интуитивного понимания.',
            image: '👸'
        },
        {
            id: 4,
            name: 'Императрица',
            arcana: 'major',
            number: 3,
            keywords: ['плодородие', 'творчество', 'изобилие'],
            description: 'Карта творческой энергии и материнской заботы.',
            image: '👑'
        },
        {
            id: 5,
            name: 'Император',
            arcana: 'major',
            number: 4,
            keywords: ['власть', 'стабильность', 'лидерство'],
            description: 'Карта власти, порядка и мужской энергии.',
            image: '🤴'
        }
    ];
}

function getDefaultSpreads() {
    return {
        daily: {
            name: 'Карта дня',
            description: 'Ежедневное предсказание',
            cards: [{ name: 'Карта дня', description: 'Основная энергия дня' }]
        },
        simple: {
            name: 'Простой ответ',
            description: 'Ответ на вопрос',
            cards: [{ name: 'Ответ', description: 'Основной ответ на вопрос' }]
        },
        love: {
            name: 'Любовь',
            description: 'Расклад на отношения',
            cards: [
                { name: 'Вы', description: 'Ваше состояние в отношениях' },
                { name: 'Партнер', description: 'Состояние партнера' },
                { name: 'Отношения', description: 'Общая динамика отношений' }
            ]
        },
        career: {
            name: 'Карьера',
            description: 'Профессиональные вопросы',
            cards: [
                { name: 'Текущая ситуация', description: 'Где вы сейчас находитесь' },
                { name: 'Возможности', description: 'Что вам доступно' },
                { name: 'Результат', description: 'К чему это приведет' }
            ]
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

// ✅ ПРОВЕРКА ГОТОВНОСТИ
function isConfigReady() {
    return !!(
        window.SUPABASE_CONFIG &&
        window.API_CONFIG &&
        window.APP_CONFIG &&
        window.FALLBACK_CARDS &&
        window.TABLES &&
        window.TELEGRAM_CONFIG &&
        window.SPREADS_CONFIG
    );
}

// 🔧 ОТЛАДКА
function debugConfig() {
    console.log('🔧 Состояние конфигурации:', {
        supabase: !!window.SUPABASE_CONFIG,
        api: !!window.API_CONFIG,
        app: !!window.APP_CONFIG,
        tables: !!window.TABLES,
        telegram: !!window.TELEGRAM_CONFIG,
        fallbackCards: window.FALLBACK_CARDS ? window.FALLBACK_CARDS.length : 0,
        spreads: window.SPREADS_CONFIG ? Object.keys(window.SPREADS_CONFIG).length : 0
    });
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

console.log('✅ Config.js загружен');
