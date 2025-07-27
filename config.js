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
// Финальное исправление навигации для структуры "Шёпот Карт"
// ========================================================================

// 🎯 ИСПРАВЛЕННАЯ СИСТЕМА НАВИГАЦИИ (под вашу HTML структуру)
function initNavigation() {
    try {
        console.log('🧭 Инициализация навигации...');
        
        // Получаем все вкладки навигации (включая основные и вторичные)
        const navTabs = document.querySelectorAll('.nav-tab[data-tab]');
        
        if (navTabs.length === 0) {
            console.warn('⚠️ Элементы навигации не найдены');
            return false;
        }
        
        console.log(`🔍 Найдено ${navTabs.length} вкладок навигации`);
        
        // Добавляем обработчики событий для каждой вкладки
        navTabs.forEach((tab, index) => {
            const tabName = tab.getAttribute('data-tab');
            
            if (!tabName) {
                console.warn(`⚠️ Вкладка ${index} не имеет атрибута data-tab`);
                return;
            }
            
            // Удаляем старые обработчики (если есть) и добавляем новые
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            // Добавляем обработчик клика
            newTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🔄 Клик по вкладке: ${tabName}`);
                switchTab(tabName);
            });
            
            // Добавляем визуальную обратную связь для мобильных устройств
            newTab.addEventListener('touchstart', (e) => {
                newTab.style.transform = 'scale(0.95)';
                newTab.style.opacity = '0.8';
            });
            
            newTab.addEventListener('touchend', (e) => {
                newTab.style.transform = 'scale(1)';
                newTab.style.opacity = '1';
            });
            
            // Предотвращаем выделение текста при двойном тапе
            newTab.addEventListener('selectstart', (e) => {
                e.preventDefault();
            });
            
            console.log(`✅ Обработчики добавлены для вкладки: ${tabName}`);
        });
        
        console.log(`✅ Навигация инициализирована для ${navTabs.length} вкладок`);
        
        // Проверяем наличие всех контент-областей
        const expectedTabs = ['daily', 'question', 'spreads', 'history', 'reviews', 'premium'];
        const missingTabs = [];
        
        expectedTabs.forEach(tabName => {
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (!tabContent) {
                missingTabs.push(tabName);
            }
        });
        
        if (missingTabs.length > 0) {
            console.warn(`⚠️ Отсутствуют контент-области для вкладок: ${missingTabs.join(', ')}`);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации навигации:', error);
        return false;
    }
}

// 🔄 УЛУЧШЕННАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
function switchTab(tabName) {
    try {
        console.log(`🔄 Переключение на вкладку: ${tabName}`);
        
        // Проверяем существование контент-области
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (!tabContent) {
            console.error(`❌ Контент вкладки ${tabName} не найден`);
            
            // Пытаемся переключиться на дефолтную вкладку
            if (tabName !== 'daily') {
                console.log('🔄 Попытка переключения на главную вкладку');
                return switchTab('daily');
            }
            return false;
        }
        
        // Скрываем все контент-области
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });
        
        // Убираем активный класс со всех кнопок навигации
        const allNavTabs = document.querySelectorAll('.nav-tab');
        allNavTabs.forEach(navTab => {
            navTab.classList.remove('active');
        });
        
        // Показываем выбранную контент-область
        tabContent.classList.add('active');
        tabContent.style.display = 'block';
        
        // Активируем соответствующую кнопку навигации
        const activeNavTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeNavTab) {
            activeNavTab.classList.add('active');
            console.log(`✅ Активирована кнопка навигации для ${tabName}`);
        } else {
            console.warn(`⚠️ Кнопка навигации для ${tabName} не найдена`);
        }
        
        // Сохраняем текущую вкладку
        currentTab = tabName;
        try {
            sessionStorage.setItem('currentTab', tabName);
        } catch (storageError) {
            console.warn('⚠️ Не удалось сохранить вкладку в sessionStorage:', storageError);
        }
        
        // Обновляем кнопку "Назад" в Telegram
        if (tg && tg.BackButton) {
            if (tabName === 'daily') {
                tg.BackButton.hide();
            } else {
                tg.BackButton.show();
            }
        }
        
        // Выполняем действия специфичные для вкладки
        handleTabSpecificActions(tabName);
        
        // Логируем успешное переключение
        console.log(`✅ Успешно переключено на вкладку: ${tabName}`);
        
        // Отправляем событие для других частей приложения
        window.dispatchEvent(new CustomEvent('tabChanged', { 
            detail: { tabName, timestamp: Date.now() } 
        }));
        
        return true;
        
    } catch (error) {
        console.error(`❌ Ошибка переключения вкладки ${tabName}:`, error);
        
        // Попытка аварийного восстановления
        return performEmergencyTabRecovery(tabName);
    }
}

// 🚑 АВАРИЙНОЕ ВОССТАНОВЛЕНИЕ НАВИГАЦИИ
function performEmergencyTabRecovery(failedTabName) {
    try {
        console.log(`🚑 Аварийное восстановление навигации после ошибки с ${failedTabName}`);
        
        // Пытаемся найти любую доступную вкладку
        const availableTabs = ['daily', 'question', 'spreads', 'history'];
        
        for (const tabName of availableTabs) {
            const tabContent = document.getElementById(`${tabName}-tab`);
            if (tabContent) {
                // Принудительно показываем найденную вкладку
                document.querySelectorAll('.tab-content').forEach(tab => {
                    tab.classList.remove('active');
                    tab.style.display = 'none';
                });
                
                tabContent.classList.add('active');
                tabContent.style.display = 'block';
                
                // Обновляем навигацию
                document.querySelectorAll('.nav-tab').forEach(nav => nav.classList.remove('active'));
                const navTab = document.querySelector(`[data-tab="${tabName}"]`);
                if (navTab) {
                    navTab.classList.add('active');
                }
                
                currentTab = tabName;
                sessionStorage.setItem('currentTab', tabName);
                
                console.log(`🚑 Аварийное восстановление: переключено на ${tabName}`);
                
                // Показываем уведомление пользователю
                showNotification('Восстановлена работа навигации', 'warning');
                
                return true;
            }
        }
        
        // Если ничего не нашли, создаем минимальный интерфейс
        console.error('💥 Критическая ошибка: не найдено ни одной рабочей вкладки');
        createEmergencyInterface();
        return false;
        
    } catch (recoveryError) {
        console.error('💥 Критическая ошибка аварийного восстановления:', recoveryError);
        createEmergencyInterface();
        return false;
    }
}

// 🆘 СОЗДАНИЕ АВАРИЙНОГО ИНТЕРФЕЙСА
function createEmergencyInterface() {
    try {
        const container = document.querySelector('.container') || document.body;
        
        container.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif; color: #333;">
                <h2 style="color: #e74c3c;">🔮 Шёпот Карт</h2>
                <p style="margin: 20px 0;">Произошла ошибка навигации</p>
                <button onclick="location.reload()" 
                        style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">
                    Перезагрузить приложение
                </button>
                <div style="margin-top: 30px; font-size: 14px; color: #666;">
                    <p>Если проблема повторяется:</p>
                    <ol style="text-align: left; max-width: 300px; margin: 10px auto;">
                        <li>Очистите кэш браузера</li>
                        <li>Перезапустите Telegram</li>
                        <li>Сообщите о проблеме разработчику</li>
                    </ol>
                </div>
            </div>
        `;
        
        console.log('🆘 Создан аварийный интерфейс');
        
    } catch (error) {
        console.error('💥 Не удалось создать аварийный интерфейс:', error);
    }
}

// 🎬 ДЕЙСТВИЯ СПЕЦИФИЧНЫЕ ДЛЯ ВКЛАДОК (расширенная версия)
function handleTabSpecificActions(tabName) {
    try {
        console.log(`🎬 Выполнение действий для вкладки: ${tabName}`);
        
        switch (tabName) {
            case 'daily':
                // Проверяем статус карты дня
                if (typeof checkDailyCardStatus === 'function') {
                    checkDailyCardStatus();
                }
                // Скрываем кнопку "Назад"
                if (tg && tg.BackButton) {
                    tg.BackButton.hide();
                }
                break;
                
            case 'question':
                // Фокус на поле ввода вопроса
                setTimeout(() => {
                    const questionInput = document.getElementById('question-input') || 
                                       document.querySelector('textarea[placeholder*="вопрос"]') ||
                                       document.querySelector('.question-textarea');
                    if (questionInput) {
                        questionInput.focus();
                        console.log('🎯 Фокус установлен на поле ввода вопроса');
                    }
                }, 300);
                break;
                
            case 'spreads':
                // Проверяем доступность раскладов
                if (typeof loadSpreadsContent === 'function') {
                    loadSpreadsContent();
                }
                break;
                
            case 'history':
                // Обновляем историю
                if (typeof refreshHistory === 'function') {
                    refreshHistory();
                } else if (typeof renderHistory === 'function') {
                    renderHistory();
                }
                break;
                
            case 'reviews':
                // Загружаем отзывы (если есть функция)
                if (typeof loadReviews === 'function') {
                    loadReviews();
                }
                break;
                
            case 'premium':
                // Обновляем информацию о подписке
                if (typeof updatePremiumInfo === 'function') {
                    updatePremiumInfo();
                }
                // Проверяем статус подписки
                if (currentUser && currentUser.is_subscribed) {
                    console.log('💎 Пользователь уже имеет Premium подписку');
                }
                break;
                
            default:
                console.log(`ℹ️ Нет специфичных действий для вкладки: ${tabName}`);
                break;
        }
        
    } catch (error) {
        console.warn(`⚠️ Ошибка выполнения действий для вкладки ${tabName}:`, error);
    }
}

// 🔍 ДИАГНОСТИКА НАВИГАЦИИ
function diagnoseNavigation() {
    console.log('🔍 Диагностика навигации:');
    
    // Проверяем кнопки навигации
    const navTabs = document.querySelectorAll('.nav-tab[data-tab]');
    console.log(`- Найдено кнопок навигации: ${navTabs.length}`);
    
    navTabs.forEach((tab, index) => {
        const tabName = tab.getAttribute('data-tab');
        const hasContent = !!document.getElementById(`${tabName}-tab`);
        const isActive = tab.classList.contains('active');
        console.log(`  ${index + 1}. ${tabName}: контент=${hasContent}, активна=${isActive}`);
    });
    
    // Проверяем контент-области
    const contentTabs = document.querySelectorAll('.tab-content');
    console.log(`- Найдено контент-областей: ${contentTabs.length}`);
    
    contentTabs.forEach((tab, index) => {
        const isActive = tab.classList.contains('active');
        const isVisible = tab.style.display !== 'none';
        console.log(`  ${index + 1}. ${tab.id}: активна=${isActive}, видима=${isVisible}`);
    });
    
    // Текущее состояние
    console.log(`- Текущая вкладка: ${currentTab}`);
    console.log(`- Сохранена в storage: ${sessionStorage.getItem('currentTab')}`);
    
    return {
        navButtons: navTabs.length,
        contentAreas: contentTabs.length,
        currentTab: currentTab,
        savedTab: sessionStorage.getItem('currentTab')
    };
}

// 🧪 ТЕСТИРОВАНИЕ НАВИГАЦИИ
function testNavigation() {
    console.log('🧪 Тестирование навигации...');
    
    const tabs = ['daily', 'question', 'spreads', 'history', 'reviews', 'premium'];
    const results = {};
    
    tabs.forEach(tabName => {
        try {
            const success = switchTab(tabName);
            results[tabName] = success;
            console.log(`${success ? '✅' : '❌'} ${tabName}: ${success ? 'OK' : 'FAILED'}`);
        } catch (error) {
            results[tabName] = false;
            console.log(`❌ ${tabName}: ERROR - ${error.message}`);
        }
    });
    
    // Возвращаемся на главную
    switchTab('daily');
    
    return results;
}

// 📤 ЭКСПОРТ ФУНКЦИЙ
window.switchTab = switchTab;
window.initNavigation = initNavigation;
window.diagnoseNavigation = diagnoseNavigation;
window.testNavigation = testNavigation;
window.handleTabSpecificActions = handleTabSpecificActions;

// 🎯 АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ (если DOM готов)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
} else {
    // DOM уже готов
    setTimeout(initNavigation, 100);
}
