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

        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            timeout: 5000
        });

        if (response.ok) {
            const config = await response.json();
            console.log('✅ Конфигурация загружена из API');

            // Устанавливаем Supabase конфигурацию
            if (config.supabase) {
                window.SUPABASE_CONFIG = {
                    url: config.supabase.url,
                    anonKey: config.supabase.anonKey
                };
                console.log('✅ Supabase конфигурация загружена');
            }

            // Устанавливаем API конфигурацию
            if (config.api) {
                window.API_CONFIG = {
                    n8nWebhookUrl: config.api.n8nWebhookUrl,
                    cardsUrl: config.api.cardsUrl,
                    paymentUrl: config.api.paymentUrl,
                    timeout: 10000,
                    retryAttempts: 3
                };
                console.log('✅ API конфигурация загружена');
            }

            // Устанавливаем конфигурацию приложения
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
            console.warn('⚠️ API вернул ошибку:', response.status);
            return false;
        }

    } catch (error) {
        console.warn('⚠️ Ошибка загрузки из API (используем fallback):', error.message);
        return false;
    }
}

// 🛡️ УСТАНОВКА FALLBACK КОНФИГУРАЦИЙ
function setupFallbackConfigs() {
    console.log('🛡️ Установка fallback конфигураций...');

    // Fallback Supabase конфигурация (тестовые значения)
    if (!window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG = {
            url: 'https://your-project.supabase.co',
            anonKey: 'your-anon-key'
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

// 🃏 КАРТЫ ТАРО ПО УМОЛЧАНИЮ
function getDefaultCards() {
    return [
        {
            id: 1,
            name: 'Дурак',
            arcana: 'major',
            number: 0,
            keywords: ['начало', 'свобода', 'приключение'],
            description: 'Карта новых начинаний, спонтанности и свободы выбора.',
            image: '🃏',
            meanings: {
                upright: 'Новые возможности, свобода, приключения',
                reversed: 'Неосторожность, безрассудство, хаос'
            }
        },
        {
            id: 2,
            name: 'Маг',
            arcana: 'major',
            number: 1,
            keywords: ['воля', 'творчество', 'мастерство'],
            description: 'Карта силы воли, творческих способностей и умения воплощать идеи в реальность.',
            image: '🎩',
            meanings: {
                upright: 'Уверенность, навыки, концентрация',
                reversed: 'Манипуляции, слабость воли, обман'
            }
        },
        {
            id: 3,
            name: 'Жрица',
            arcana: 'major',
            number: 2,
            keywords: ['интуиция', 'тайна', 'знание'],
            description: 'Карта внутренней мудрости, интуиции и скрытых знаний.',
            image: '🔮',
            meanings: {
                upright: 'Интуиция, тайные знания, духовность',
                reversed: 'Игнорирование интуиции, поверхностность'
            }
        },
        {
            id: 4,
            name: 'Императрица',
            arcana: 'major',
            number: 3,
            keywords: ['плодородие', 'творчество', 'изобилие'],
            description: 'Карта творческой энергии, материнской заботы и изобилия.',
            image: '👸',
            meanings: {
                upright: 'Творчество, изобилие, материнство',
                reversed: 'Зависимость, чрезмерная опека, блоки в творчестве'
            }
        },
        {
            id: 5,
            name: 'Император',
            arcana: 'major',
            number: 4,
            keywords: ['власть', 'стабильность', 'лидерство'],
            description: 'Карта власти, порядка, стабильности и отцовской фигуры.',
            image: '👑',
            meanings: {
                upright: 'Лидерство, стабильность, авторитет',
                reversed: 'Тирания, жёсткость, потеря контроля'
            }
        },
        {
            id: 6,
            name: 'Солнце',
            arcana: 'major',
            number: 19,
            keywords: ['радость', 'успех', 'энергия'],
            description: 'Карта радости, успеха, позитивной энергии и счастья.',
            image: '☀️',
            meanings: {
                upright: 'Радость, успех, жизненная энергия',
                reversed: 'Чрезмерный оптимизм, отсутствие реализма'
            }
        },
        {
            id: 7,
            name: 'Луна',
            arcana: 'major',
            number: 18,
            keywords: ['иллюзия', 'интуиция', 'подсознание'],
            description: 'Карта иллюзий, скрытых страхов и работы с подсознанием.',
            image: '🌙',
            meanings: {
                upright: 'Интуиция, психические способности, циклы',
                reversed: 'Иллюзии, обман, страхи'
            }
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

console.log('✅ Config.js загружен');
