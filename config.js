// config.js - Исправленная конфигурация с обработкой ошибок
// ========================================================================

// 🔧 БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ КОНФИГУРАЦИИ
async function initializeConfig() {
    console.log('🔧 Инициализация конфигурации...');
    
    try {
        // 🗄️ КОНФИГУРАЦИЯ SUPABASE
        if (typeof window.SUPABASE_CONFIG === 'undefined') {
            window.SUPABASE_CONFIG = {
                url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
                anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key-here'
            };
            console.log('⚠️ Использую фоллбэк конфигурацию Supabase');
        }

        // 🔗 КОНФИГУРАЦИЯ API
        if (typeof window.API_CONFIG === 'undefined') {
            window.API_CONFIG = {
                n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://your-n8n.app/webhook/tarot',
                cardsUrl: 'https://raw.githubusercontent.com/username/tarot-cards/main/cards.json',
                timeout: 10000,
                retryAttempts: 3
            };
            console.log('⚠️ Использую фоллбэк конфигурацию API');
        }

        // 📱 КОНФИГУРАЦИЯ ПРИЛОЖЕНИЯ
        if (typeof window.APP_CONFIG === 'undefined') {
            window.APP_CONFIG = {
                appName: 'Шёпот Карт',
                version: '1.0.0',
                freeQuestionsLimit: 3,
                maxHistoryItems: 50,
                cacheExpiry: 24 * 60 * 60 * 1000, // 24 часа
                
                texts: {
                    loading: 'Карты шепчут...',
                    cardsReady: 'Карты готовы!',
                    error: 'Что-то пошло не так...',
                    noInternet: 'Проверьте соединение с интернетом'
                },
                
                premium: {
                    monthly: {
                        price: 299,
                        currency: 'RUB',
                        description: 'Месячная подписка'
                    },
                    yearly: {
                        price: 2999,
                        currency: 'RUB', 
                        description: 'Годовая подписка'
                    }
                }
            };
            console.log('⚠️ Использую фоллбэк конфигурацию приложения');
        }

        // 📊 КОНФИГУРАЦИЯ ТАБЛИЦ SUPABASE
        if (typeof window.TABLES === 'undefined') {
            window.TABLES = {
                users: 'users',
                predictions: 'predictions',
                daily_cards: 'daily_cards',
                subscriptions: 'subscriptions'
            };
        }

        // 🔮 КОНФИГУРАЦИЯ TELEGRAM
        if (typeof window.TELEGRAM_CONFIG === 'undefined') {
            window.TELEGRAM_CONFIG = {
                botUsername: 'your_tarot_bot',
                webAppUrl: 'https://your-app.vercel.app',
                allowedUpdates: ['message', 'callback_query', 'inline_query']
            };
        }

        // 🎴 ФОЛЛБЭК КАРТЫ (если GitHub недоступен)
        if (typeof window.FALLBACK_CARDS === 'undefined') {
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
                },
                {
                    id: "FB_2", 
                    name: "Жрица",
                    symbol: "🌙",
                    meaningUpright: "Интуиция, тайные знания, внутренняя мудрость.",
                    meaningReversed: "Секреты, скрытые мотивы, недостаток интуиции.",
                    meaning: "Интуиция, тайные знания, внутренняя мудрость.",
                    image: "./images/cards/high-priestess.jpg",
                    type: "Старшие Арканы",
                    element: "Вода"
                }
            ];
        }

        // 🎯 КОНФИГУРАЦИЯ РАСКЛАДОВ
        if (typeof window.SPREADS_CONFIG === 'undefined') {
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
                },
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
        }

        // ✅ ПРОВЕРКА ЦЕЛОСТНОСТИ КОНФИГУРАЦИИ
        const configChecks = [
            { name: 'SUPABASE_CONFIG', obj: window.SUPABASE_CONFIG, required: ['url'] },
            { name: 'API_CONFIG', obj: window.API_CONFIG, required: ['cardsUrl'] },
            { name: 'APP_CONFIG', obj: window.APP_CONFIG, required: ['appName', 'version'] },
            { name: 'FALLBACK_CARDS', obj: window.FALLBACK_CARDS, required: [] }
        ];

        let configValid = true;
        for (const check of configChecks) {
            if (!check.obj) {
                console.error(`❌ ${check.name} отсутствует`);
                configValid = false;
                continue;
            }

            for (const field of check.required) {
                if (!check.obj[field]) {
                    console.error(`❌ ${check.name}.${field} отсутствует`);
                    configValid = false;
                }
            }
        }

        if (configValid) {
            console.log('✅ Конфигурация успешно инициализирована и проверена');
        } else {
            console.warn('⚠️ Конфигурация инициализирована с предупреждениями');
        }

        // 📊 ОТЛАДОЧНАЯ ИНФОРМАЦИЯ
        if (window.location.hostname === 'localhost' || window.location.search.includes('debug=true')) {
            console.log('🔧 Отладочная информация конфигурации:');
            console.log('- Supabase URL:', window.SUPABASE_CONFIG.url ? 'Настроен' : 'Отсутствует');
            console.log('- n8n Webhook:', window.API_CONFIG.n8nWebhookUrl ? 'Настроен' : 'Отсутствует');
            console.log('- Карты URL:', window.API_CONFIG.cardsUrl ? 'Настроен' : 'Отсутствует');
            console.log('- Фоллбэк карт:', window.FALLBACK_CARDS.length);
        }

        return configValid;

    } catch (error) {
        console.error('❌ Критическая ошибка инициализации конфигурации:', error);
        
        // Экстренная минимальная конфигурация
        window.APP_CONFIG = {
            appName: 'Шёпот Карт',
            version: '1.0.0',
            freeQuestionsLimit: 3
        };
        
        window.FALLBACK_CARDS = [
            {
                id: "EMERGENCY",
                name: "Аварийная карта",
                symbol: "⚠️", 
                meaning: "Приложение запущено в аварийном режиме",
                type: "Системная"
            }
        ];

        return false;
    }
}

// 🔍 ФУНКЦИИ ДЛЯ ПОЛУЧЕНИЯ КОНФИГУРАЦИИ (с проверками)
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

// 🧪 ФУНКЦИЯ ДЛЯ ОТЛАДКИ КОНФИГУРАЦИИ
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
    
    return {
        initialized: !!(window.SUPABASE_CONFIG && window.API_CONFIG && window.APP_CONFIG),
        timestamp: new Date().toISOString()
    };
}

// 🔄 ПЕРЕЗАГРУЗКА КОНФИГУРАЦИИ
async function reloadConfig() {
    console.log('🔄 Перезагрузка конфигурации...');
    
    // Очищаем существующую конфигурацию
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

// 📋 ПРОВЕРКА ГОТОВНОСТИ КОНФИГУРАЦИИ
function isConfigReady() {
    return !!(
        window.SUPABASE_CONFIG &&
        window.API_CONFIG &&
        window.APP_CONFIG &&
        window.FALLBACK_CARDS
    );
}

// 🛠️ ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getGitHubRepoFromUrl(url) {
    try {
        const match = url.match(/github\.com\/([^\/]+\/[^\/]+)/);
        return match ? match[1] : 'YOUR_USERNAME/tarot-web-app';
    } catch (error) {
        console.warn('⚠️ Ошибка парсинга GitHub URL:', error);
        return 'YOUR_USERNAME/tarot-web-app';
    }
}

function validateURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

// 🔐 БЕЗОПАСНОЕ ПОЛУЧЕНИЕ ПЕРЕМЕННЫХ ОКРУЖЕНИЯ
function getEnvVar(name, defaultValue = '') {
    try {
        // Пытаемся получить из process.env (если доступно)
        if (typeof process !== 'undefined' && process.env && process.env[name]) {
            return process.env[name];
        }
        
        // Пытаемся получить из глобальных переменных
        if (typeof window !== 'undefined' && window[name]) {
            return window[name];
        }
        
        // Возвращаем значение по умолчанию
        return defaultValue;
    } catch (error) {
        console.warn(`⚠️ Ошибка получения переменной ${name}:`, error);
        return defaultValue;
    }
}

// 📊 СТАТИСТИКА КОНФИГУРАЦИИ
function getConfigStats() {
    return {
        totalConfigs: 6,
        loadedConfigs: [
            !!window.SUPABASE_CONFIG,
            !!window.API_CONFIG,
            !!window.APP_CONFIG,
            !!window.TABLES,
            !!window.TELEGRAM_CONFIG,
            !!window.FALLBACK_CARDS
        ].filter(Boolean).length,
        fallbackCardsCount: window.FALLBACK_CARDS ? window.FALLBACK_CARDS.length : 0,
        spreadsCount: window.SPREADS_CONFIG ? Object.keys(window.SPREADS_CONFIG).length : 0,
        lastInitialized: new Date().toISOString()
    };
}

// 🚨 ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ
function emergencyConfigRecovery() {
    console.warn('🚨 Запуск экстренного восстановления конфигурации...');
    
    try {
        // Минимально необходимая конфигурация для работы
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
                id: "EMERGENCY_1",
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

// 🔄 АВТОМАТИЧЕСКАЯ ПРОВЕРКА И ВОССТАНОВЛЕНИЕ
function setupConfigWatchdog() {
    setInterval(() => {
        if (!isConfigReady()) {
            console.warn('⚠️ Конфигурация повреждена, восстанавливаю...');
            emergencyConfigRecovery();
        }
    }, 30000); // Проверка каждые 30 секунд
}

// 📤 ЭКСПОРТ ДЛЯ ИСПОЛЬЗОВАНИЯ В ДРУГИХ ФАЙЛАХ
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeConfig,
        getSupabaseConfig,
        getAPIConfig, 
        getAppConfig,
        debugConfig,
        reloadConfig,
        isConfigReady,
        getConfigStats,
        emergencyConfigRecovery,
        setupConfigWatchdog
    };
}

// 🏁 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        initializeConfig().then(success => {
            if (success) {
                console.log('🎉 Конфигурация готова к использованию');
                setupConfigWatchdog();
            } else {
                console.warn('⚠️ Конфигурация инициализирована с ошибками');
                emergencyConfigRecovery();
            }
        });
    });
}

// 🔧 ГЛОБАЛЬНЫЕ ФУНКЦИИ ДЛЯ ОТЛАДКИ
if (typeof window !== 'undefined') {
    window.debugTarotConfig = debugConfig;
    window.reloadTarotConfig = reloadConfig;
    window.getTarotConfigStats = getConfigStats;
}
