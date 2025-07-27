// config.js - Исправленная конфигурация с надежной обработкой ошибок
// ========================================================================

// 🔧 ИНИЦИАЛИЗАЦИЯ КОНФИГУРАЦИИ С ПОЛНОЙ ВАЛИДАЦИЕЙ
async function initializeConfig() {
    console.log('🔧 Инициализация конфигурации Шёпот Карт...');
    
    try {
        // Загружаем конфигурацию из API если возможно
        await loadConfigFromAPI();
        
        // Проверяем и устанавливаем fallback конфигурации
        setupFallbackConfigs();
        
        // Валидируем все конфигурации
        const isValid = validateAllConfigs();
        
        if (isValid) {
            console.log('✅ Конфигурация успешно инициализирована');
            return true;
        } else {
            console.warn('⚠️ Конфигурация инициализирована с предупреждениями');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка инициализации конфигурации:', error);
        
        // Аварийное восстановление
        emergencyConfigRecovery();
        return false;
    }
}

// 🌐 ЗАГРУЗКА КОНФИГУРАЦИИ ИЗ API
async function loadConfigFromAPI() {
    try {
        console.log('🌐 Попытка загрузки конфигурации из API...');
        
        // Пытаемся загрузить публичную конфигурацию
        const response = await fetch('/api/config', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const config = await response.json();
            
            // Устанавливаем полученные конфигурации
            if (config.supabase) {
                window.SUPABASE_CONFIG = config.supabase;
                console.log('✅ Supabase конфигурация загружена из API');
            }
            
            if (config.api) {
                window.API_CONFIG = {
                    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://your-n8n.app/webhook/tarot',
                    cardsUrl: config.api.cardsUrl || 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
                    paymentUrl: config.api.paymentUrl,
                    timeout: 10000,
                    retryAttempts: 3
                };
                console.log('✅ API конфигурация загружена из API');
            }
            
            if (config.app) {
                window.APP_CONFIG = {
                    ...getDefaultAppConfig(),
                    freeQuestionsLimit: config.app.freeQuestionsLimit || 3,
                    premiumPrice: config.app.premiumPrice || 299
                };
                console.log('✅ App конфигурация загружена из API');
            }
            
            return true;
        }
        
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить конфигурацию из API:', error);
    }
    
    return false;
}

// 🛡️ УСТАНОВКА FALLBACK КОНФИГУРАЦИЙ
function setupFallbackConfigs() {
    // 🗄️ КОНФИГУРАЦИЯ SUPABASE
    if (!window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG = {
            url: getEnvVar('SUPABASE_URL', 'https://your-project.supabase.co'),
            anonKey: getEnvVar('SUPABASE_ANON_KEY', 'your-anon-key-here')
        };
        console.log('⚠️ Использую fallback конфигурацию Supabase');
    }

    // 🔗 КОНФИГУРАЦИЯ API
    if (!window.API_CONFIG) {
        window.API_CONFIG = {
            n8nWebhookUrl: getEnvVar('N8N_WEBHOOK_URL', 'https://your-n8n.app/webhook/tarot'),
            cardsUrl: getEnvVar('GITHUB_CARDS_URL', 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json'),
            timeout: 10000,
            retryAttempts: 3
        };
        console.log('⚠️ Использую fallback конфигурацию API');
    }

    // 📱 КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = getDefaultAppConfig();
        console.log('⚠️ Использую fallback конфигурацию приложения');
    }
    
    // 📋 КОНФИГУРАЦИЯ ТАБЛИЦ SUPABASE
    if (!window.TABLES) {
        window.TABLES = {
            userProfiles: 'tarot_user_profiles',
            predictions: 'tarot_predictions',
            dailyCards: 'tarot_daily_cards',
            reviews: 'tarot_reviews',
            spreads: 'tarot_spreads'
        };
        console.log('⚠️ Использую fallback конфигурацию таблиц');
    }
    
    // 📱 КОНФИГУРАЦИЯ TELEGRAM
    if (!window.TELEGRAM_CONFIG) {
        window.TELEGRAM_CONFIG = {
            botUsername: 'ShepotKartBot',
            webAppUrl: getEnvVar('VERCEL_URL', 'https://your-app.vercel.app'),
            supportBot: '@Helppodark_bot'
        };
        console.log('⚠️ Использую fallback конфигурацию Telegram');
    }
    
    // 🃏 FALLBACK КАРТЫ
    if (!window.FALLBACK_CARDS) {
        window.FALLBACK_CARDS = getDefaultCards();
        console.log('⚠️ Использую fallback карты');
    }
    
    // 🔮 КОНФИГУРАЦИЯ РАСКЛАДОВ
    if (!window.SPREADS_CONFIG) {
        window.SPREADS_CONFIG = getDefaultSpreads();
        console.log('⚠️ Использую fallback расклады');
    }
}

// 📱 КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ ПО УМОЛЧАНИЮ
function getDefaultAppConfig() {
    return {
        appName: 'Шёпот Карт',
        version: '1.0.0',
        freeQuestionsLimit: 3,
        maxHistoryItems: 50,
        cacheExpiry: 24 * 60 * 60 * 1000, // 24 часа
        
        texts: {
            loading: 'Карты шепчут...',
            cardsReady: 'Карты готовы!',
            error: 'Произошла ошибка',
            noConnection: 'Нет соединения',
            tryAgain: 'Попробовать снова',
            premium: 'Премиум',
            free: 'Бесплатно',
            subscribe: 'Оформить подписку',
            questionsLeft: 'Остались вопросы:',
            noQuestionsLeft: 'Бесплатные вопросы закончились'
        },
        
        ui: {
            animationDuration: 300,
            showAnimations: true,
            vibrationEnabled: true,
            notificationDuration: 3000
        }
    };
}

// 🃏 КАРТЫ ПО УМОЛЧАНИЮ
function getDefaultCards() {
    return [
        {
            id: "FOOL",
            name: "Дурак",
            symbol: "🃏",
            meaning: "Новые начинания, спонтанность, свобода",
            type: "Старший аркан",
            number: 0
        },
        {
            id: "MAGICIAN",
            name: "Маг",
            symbol: "🎩",
            meaning: "Сила воли, мастерство, концентрация",
            type: "Старший аркан",
            number: 1
        },
        {
            id: "HIGH_PRIESTESS",
            name: "Верховная жрица",
            symbol: "🌙",
            meaning: "Интуиция, тайны, внутренняя мудрость",
            type: "Старший аркан",
            number: 2
        },
        {
            id: "EMPRESS",
            name: "Императрица",
            symbol: "👑",
            meaning: "Плодородие, женственность, изобилие",
            type: "Старший аркан",
            number: 3
        },
        {
            id: "EMPEROR",
            name: "Император",
            symbol: "⚡",
            meaning: "Власть, контроль, стабильность",
            type: "Старший аркан",
            number: 4
        }
    ];
}

// 🔮 РАСКЛАДЫ ПО УМОЛЧАНИЮ
function getDefaultSpreads() {
    return {
        simple: {
            name: 'Простой расклад',
            description: 'Одна карта на вопрос',
            cardCount: 1,
            positions: [
                { name: 'Ответ', description: 'Основной ответ на ваш вопрос' }
            ]
        },
        three_cards: {
            name: 'Три карты',
            description: 'Прошлое, настоящее, будущее',
            cardCount: 3,
            positions: [
                { name: 'Прошлое', description: 'Что привело к текущей ситуации' },
                { name: 'Настоящее', description: 'Ваше текущее положение' },
                { name: 'Будущее', description: 'Возможное развитие событий' }
            ]
        },
        love: {
            name: 'Любовный расклад',
            description: 'Отношения и чувства',
            cardCount: 2,
            positions: [
                { name: 'Ваши чувства', description: 'Что вы чувствуете' },
                { name: 'Чувства партнера', description: 'Что чувствует другой' }
            ]
        }
    };
}

// ✅ ВАЛИДАЦИЯ ВСЕХ КОНФИГУРАЦИЙ
function validateAllConfigs() {
    const validations = [
        { name: 'SUPABASE_CONFIG', obj: window.SUPABASE_CONFIG, required: ['url', 'anonKey'] },
        { name: 'API_CONFIG', obj: window.API_CONFIG, required: ['n8nWebhookUrl', 'cardsUrl'] },
        { name: 'APP_CONFIG', obj: window.APP_CONFIG, required: ['appName', 'version', 'freeQuestionsLimit'] },
        { name: 'TABLES', obj: window.TABLES, required: ['userProfiles', 'predictions'] },
        { name: 'FALLBACK_CARDS', obj: window.FALLBACK_CARDS, required: [] }
    ];

    let allValid = true;
    
    for (const validation of validations) {
        if (!validation.obj) {
            console.error(`❌ ${validation.name} отсутствует`);
            allValid = false;
            continue;
        }

        for (const field of validation.required) {
            if (!validation.obj[field]) {
                console.error(`❌ ${validation.name}.${field} отсутствует или пуст`);
                allValid = false;
            }
        }
        
        // Дополнительные проверки
        if (validation.name === 'SUPABASE_CONFIG') {
            if (!isValidUrl(validation.obj.url)) {
                console.error('❌ SUPABASE_CONFIG.url имеет неверный формат');
                allValid = false;
            }
        }
        
        if (validation.name === 'API_CONFIG') {
            if (!isValidUrl(validation.obj.cardsUrl)) {
                console.error('❌ API_CONFIG.cardsUrl имеет неверный формат');
                allValid = false;
            }
        }
    }

    return allValid;
}

// 🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ
function emergencyConfigRecovery() {
    console.warn('🚨 Запуск экстренного восстановления конфигурации...');
    
    try {
        window.APP_CONFIG = {
            appName: 'Шёпот Карт',
            version: '1.0.0-emergency',
            freeQuestionsLimit: 1,
            texts: {
                loading: 'Загрузка...',
                error: 'Ошибка',
                cardsReady: 'Готово'
            }
        };

        window.FALLBACK_CARDS = [
            {
                id: "EMERGENCY",
                name: "Звезда Надежды",
                symbol: "⭐",
                meaning: "Даже в трудные времена есть свет в конце туннеля",
                type: "Экстренная"
            }
        ];

        window.SPREADS_CONFIG = {
            simple: {
                name: 'Простой расклад',
                description: 'Одна карта на вопрос',
                cardCount: 1,
                positions: [{ name: 'Ответ', description: 'Основной ответ на вопрос' }]
            }
        };

        console.log('✅ Экстренная конфигурация применена');
        return true;
        
    } catch (error) {
        console.error('❌ Критическая ошибка экстренного восстановления:', error);
        return false;
    }
}

// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getEnvVar(name, defaultValue = '') {
    try {
        // Проверяем переменные окружения (если доступны)
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
        
        // Проверяем глобальные переменные
        if (typeof window !== 'undefined' && window[name]) {
            return window[name];
        }
        
        return defaultValue;
        
    } catch (error) {
        console.warn(`⚠️ Ошибка получения переменной ${name}:`, error);
        return defaultValue;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

// 📊 ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ КОНФИГУРАЦИИ
function getSupabaseConfig() {
    if (!window.SUPABASE_CONFIG) {
        console.warn('⚠️ SUPABASE_CONFIG не инициализирован');
        return null;
    }
    return window.SUPABASE_CONFIG;
}

function getAPIConfig() {
    if (!window.API_CONFIG) {
        console.warn('⚠️ API_CONFIG не инициализирован');
        return null;
    }
    return window.API_CONFIG;
}

function getAppConfig() {
    if (!window.APP_CONFIG) {
        console.warn('⚠️ APP_CONFIG не инициализирован');
        return null;
    }
    return window.APP_CONFIG;
}

// ✅ ПРОВЕРКА ГОТОВНОСТИ
function isConfigReady() {
    return !!(
        window.SUPABASE_CONFIG &&
        window.API_CONFIG &&
        window.APP_CONFIG &&
        window.FALLBACK_CARDS &&
        window.TABLES
    );
}

// 🔄 ПЕРЕЗАГРУЗКА КОНФИГУРАЦИИ
async function reloadConfig() {
    console.log('🔄 Перезагрузка конфигурации...');
    
    // Очищаем
    delete window.SUPABASE_CONFIG;
    delete window.API_CONFIG;
    delete window.APP_CONFIG;
    delete window.TABLES;
    delete window.TELEGRAM_CONFIG;
    delete window.FALLBACK_CARDS;
    delete window.SPREADS_CONFIG;
    
    // Инициализируем заново
    return await initializeConfig();
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

// 📤 ЭКСПОРТ
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeConfig,
        getSupabaseConfig,
        getAPIConfig,
        getAppConfig,
        debugConfig,
        reloadConfig,
        isConfigReady,
        emergencyConfigRecovery
    };
}

// 🏁 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🏁 DOM готов, инициализирую конфигурацию...');
        initializeConfig();
    });
}
