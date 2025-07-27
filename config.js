// config.js - Обновленная конфигурация
// ========================================================================

// Глобальные переменные для конфигурации (будут заполнены после инициализации)
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
}; // Определяем TABLES сразу, без predictions
window.TELEGRAM_CONFIG = {
    botUsername: 'ShepotKartBot',
    webAppUrl: 'https://tarot-web-app-one.vercel.app', // Укажите ваш фактический URL на Vercel
    supportBot: '@Helppodark_bot'
};
window.FALLBACK_CARDS = getDefaultCards(); // Загружаем дефолтные карты
window.SPREADS_CONFIG = getDefaultSpreads(); // Загружаем дефолтные расклады


// 🔧 ИНИЦИАЛИЗАЦИЯ КОНФИГУРАЦИИ С ПОЛНОЙ ВАЛИДАЦИЕЙ
async function initializeConfig() {
    console.log('🔧 Инициализация конфигурации Шёпот Карт...');

    try {
        // Загружаем конфигурацию из API
        const apiConfigSuccess = await loadConfigFromAPI();

        // Если загрузка из API не удалась, используем fallback
        if (!apiConfigSuccess) {
            console.warn('⚠️ Не удалось загрузить конфигурацию из API, использую FALLBACK...');
            setupFallbackConfigs();
        }

        // Валидируем все конфигурации
        const isValid = validateAllConfigs();

        if (isValid) {
            console.log('✅ Конфигурация успешно инициализирована');
            return true;
        } else {
            console.error('❌ Критическая ошибка: Конфигурация невалидна!');
            emergencyConfigRecovery(); // Если конфиг невалиден, переходим в аварийный режим
            return false;
        }

    } catch (error) {
        console.error('❌ Критическая ошибка инициализации конфигурации:', error);
        emergencyConfigRecovery();
        return false;
    }
}

// 🌐 ЗАГРУЗКА КОНФИГУРАЦИИ ИЗ API
async function loadConfigFromAPI() {
    try {
        console.log('🌐 Попытка загрузки конфигурации из API...');

        const response = await fetch('/api/config', { // Используем относительный путь, Vercel сам перенаправит
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const config = await response.json();

            // Устанавливаем полученные конфигурации в глобальные переменные
            // Проверяем наличие свойств перед присвоением
            if (config.supabase) {
                window.SUPABASE_CONFIG = config.supabase;
                console.log('✅ Supabase конфигурация загружена из API');
            }

            if (config.api) {
                window.API_CONFIG = {
                    n8nWebhookUrl: config.api.n8nWebhookUrl || getEnvVar('N8N_WEBHOOK_URL', 'https://your-n8n.app/webhook/tarot'),
                    cardsUrl: config.api.cardsUrl || getEnvVar('GITHUB_CARDS_URL', 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json'),
                    paymentUrl: config.api.paymentUrl || 'https://www.wildberries.ru/catalog/199937445/detail.aspx', // Используем ваш URL Wildberries
                    timeout: 10000,
                    retryAttempts: 3
                };
                console.log('✅ API конфигурация загружена из API');
            }

            if (config.app) {
                window.APP_CONFIG = {
                    ...getDefaultAppConfig(), // Начнем с дефолтных значений
                    freeQuestionsLimit: config.app.freeQuestionsLimit || 3,
                    premiumPrice: config.app.premiumPrice || 299
                };
                console.log('✅ App конфигурация загружена из API');
            }

            // TABLES, TELEGRAM_CONFIG, FALLBACK_CARDS, SPREADS_CONFIG не приходят из /api/config
            // Они будут использовать свои дефолтные значения, что сейчас нормально.

            return true;
        } else {
            console.warn(`⚠️ API config вернул статус: ${response.status}`);
            return false;
        }

    } catch (error) {
        console.warn('⚠️ Ошибка при загрузке конфигурации из API:', error);
        return false;
    }
}

// 🛡️ УСТАНОВКА FALLBACK КОНФИГУРАЦИЙ (для случаев, когда API недоступно)
function setupFallbackConfigs() {
    // Если SUPABASE_CONFIG еще не установлен из API, используем env vars или заглушки
    if (!window.SUPABASE_CONFIG) {
        window.SUPABASE_CONFIG = {
            url: getEnvVar('SUPABASE_URL', 'https://your-project.supabase.co'),
            anonKey: getEnvVar('SUPABASE_ANON_KEY', 'your-anon-key-here')
        };
        console.log('⚠️ Использую fallback конфигурацию Supabase');
    }

    // Если API_CONFIG еще не установлен из API, используем env vars или заглушки
    if (!window.API_CONFIG) {
        window.API_CONFIG = {
            n8nWebhookUrl: getEnvVar('N8N_WEBHOOK_URL', 'https://your-n8n.app/webhook/tarot'),
            cardsUrl: getEnvVar('GITHUB_CARDS_URL', 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json'),
            timeout: 10000,
            retryAttempts: 3
        };
        console.log('⚠️ Использую fallback конфигурацию API');
    }

    // Если APP_CONFIG еще не установлен из API, используем дефолтные значения
    if (!window.APP_CONFIG) {
        window.APP_CONFIG = getDefaultAppConfig();
        console.log('⚠️ Использую fallback конфигурацию приложения');
    }

    // TABLES, TELEGRAM_CONFIG, FALLBACK_CARDS, SPREADS_CONFIG всегда будут инициализированы
    // либо при их объявлении в начале файла, либо здесь, если их нет.
    // Учитывая, что они уже объявлены в начале файла, эти if'ы могут быть излишни,
    // но оставляем для безопасности, если структура файла изменится.
    if (!window.TABLES) {
        window.TABLES = {
            userProfiles: 'tarot_user_profiles',
            dailyCards: 'tarot_daily_cards',
            reviews: 'tarot_reviews',
            spreads: 'tarot_spreads',
            questions: 'tarot_questions',
            answers: 'tarot_answers'
        };
        console.log('⚠️ Использую fallback конфигурацию таблиц');
    }

    if (!window.TELEGRAM_CONFIG) {
        window.TELEGRAM_CONFIG = {
            botUsername: 'ShepotKartBot',
            webAppUrl: getEnvVar('VERCEL_URL', 'https://your-app.vercel.app'),
            supportBot: '@Helppodark_bot'
        };
        console.log('⚠️ Использую fallback конфигурацию Telegram');
    }

    if (!window.FALLBACK_CARDS || window.FALLBACK_CARDS.length === 0) {
        window.FALLBACK_CARDS = getDefaultCards();
        console.log('⚠️ Использую fallback карты');
    }

    if (!window.SPREADS_CONFIG || Object.keys(window.SPREADS_CONFIG).length === 0) {
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

// 🃏 КАРТЫ ПО УМОЛЧАНИЮ (это должно быть в отдельном файле, или убедитесь, что cards.json загружается)
// Для целей тестирования, если cards.json не грузится по API_CONFIG.cardsUrl,
// это будет использоваться как запасной вариант.
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
        // ... (добавьте сюда другие карты, если это ваш реальный дефолтный список)
        // Для сейчас достаточно первых 5-10 карт, чтобы не засорять файл.
        // Если cards.json всегда будет локальным, то эта функция может быть удалена,
        // а приложение будет просто загружать cards.json.
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
        { name: 'TABLES', obj: window.TABLES, required: ['userProfiles', 'dailyCards', 'reviews', 'spreads', 'questions', 'answers'] }, // Обновлен список обязательных таблиц
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
            if (!isValidUrl(validation.obj.n8nWebhookUrl)) { // Проверяем и n8nWebhookUrl
                console.error('❌ API_CONFIG.n8nWebhookUrl имеет неверный формат');
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

        // Также установить базовые значения для Supabase и API, чтобы избежать ошибок
        window.SUPABASE_CONFIG = { url: 'http://localhost', anonKey: 'emergency_key' };
        window.API_CONFIG = { n8nWebhookUrl: 'http://localhost', cardsUrl: 'http://localhost' };
        window.TABLES = {
            userProfiles: 'tarot_user_profiles', dailyCards: 'tarot_daily_cards',
            reviews: 'tarot_reviews', spreads: 'tarot_spreads',
            questions: 'tarot_questions', answers: 'tarot_answers'
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
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
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
        console.warn('⚠️ SUPABASE_CONFIG не инициализирован. Инициализация конфигов могла не завершиться.');
        return null;
    }
    return window.SUPABASE_CONFIG;
}

function getAPIConfig() {
    if (!window.API_CONFIG) {
        console.warn('⚠️ API_CONFIG не инициализирован. Инициализация конфигов могла не завершиться.');
        return null;
    }
    return window.API_CONFIG;
}

function getAppConfig() {
    if (!window.APP_CONFIG) {
        console.warn('⚠️ APP_CONFIG не инициализирован. Инициализация конфигов могла не завершиться.');
        return null;
    }
    return window.APP_CONFIG;
}

function getTablesConfig() {
    if (!window.TABLES) {
        console.warn('⚠️ TABLES не инициализирован.');
        return null;
    }
    return window.TABLES;
}

function getTelegramConfig() {
    if (!window.TELEGRAM_CONFIG) {
        console.warn('⚠️ TELEGRAM_CONFIG не инициализирован.');
        return null;
    }
    return window.TELEGRAM_CONFIG;
}

function getFallbackCards() {
    if (!window.FALLBACK_CARDS) {
        console.warn('⚠️ FALLBACK_CARDS не инициализирован.');
        return [];
    }
    return window.FALLBACK_CARDS;
}

function getSpreadsConfig() {
    if (!window.SPREADS_CONFIG) {
        console.warn('⚠️ SPREADS_CONFIG не инициализирован.');
        return null;
    }
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

// 🔄 ПЕРЕЗАГРУЗКА КОНФИГУРАЦИИ
async function reloadConfig() {
    console.log('🔄 Перезагрузка конфигурации...');

    // Очищаем глобальные переменные, чтобы они были переинициализированы
    window.SUPABASE_CONFIG = null;
    window.API_CONFIG = null;
    window.APP_CONFIG = null;
    // Остальные, как TABLES, TELEGRAM_CONFIG, FALLBACK_CARDS, SPREADS_CONFIG
    // имеют дефолтные значения или будут переопределены, если их нет.

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
        spreads: window.SPREADS_CONFIG ? Object.keys(window.SPREADS_CONFIG).length : 0,
        SUPABASE_CONFIG: window.SUPABASE_CONFIG,
        API_CONFIG: window.API_CONFIG,
        APP_CONFIG: window.APP_CONFIG,
        TABLES: window.TABLES,
        TELEGRAM_CONFIG: window.TELEGRAM_CONFIG,
        FALLBACK_CARDS: window.FALLBACK_CARDS,
        SPREADS_CONFIG: window.SPREADS_CONFIG
    });
}

// 📤 ЭКСПОРТ (для модульной системы, если используется)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeConfig,
        getSupabaseConfig,
        getAPIConfig,
        getAppConfig,
        getTablesConfig,
        getTelegramConfig,
        getFallbackCards,
        getSpreadsConfig,
        debugConfig,
        reloadConfig,
        isConfigReady,
        emergencyConfigRecovery
    };
}

// 🏁 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
// Эта функция будет вызвана при загрузке DOM
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🏁 DOM готов, запускаю initializeConfig()...');
        initializeConfig().then(success => {
            if (success) {
                console.log('Конфигурация успешно установлена.');
            } else {
                console.error('Не удалось полностью инициализировать конфигурацию.');
            }
        });
    });
}
