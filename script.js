// script.js - Исправленные функции навигации и инициализации
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let supabase = null;
let currentUser = null;
let tg = null;

// Карты и состояние приложения
let TAROT_CARDS_CACHE = [];
let CARDS_LOADED = false;
let CARDS_LOADING_PROMISE = null;

// Состояние UI
let dailyCardDrawn = false;
let currentSpread = { cards: [], interpretations: [] };
let history = [];
let currentTab = 'daily';

// Система восстановления
let recoveryAttempts = 0;
const MAX_RECOVERY_ATTEMPTS = 3;

// 🚀 УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App v2.1');
    
    try {
        // Проверяем готовность конфигурации
        console.log('🔧 Проверка конфигурации...');
        if (!window.isConfigReady || !window.isConfigReady()) {
            console.log('⚠️ Конфигурация не готова, инициализирую...');
            if (window.initializeConfig) {
                await window.initializeConfig();
            } else {
                throw new Error('Система конфигурации недоступна');
            }
        }
        
        // Инициализация Telegram WebApp
        const telegramReady = initTelegramWebApp();
        
        // Инициализация Supabase
        const supabaseReady = initSupabase();
        
        // Загрузка карт
        const cardsPromise = loadCardsFromGitHub();
        
        // Инициализация пользователя
        if (supabaseReady && telegramReady) {
            currentUser = await initTelegramUser();
            if (currentUser) {
                console.log(`👤 Пользователь: ${currentUser.first_name || currentUser.username}`);
                console.log(`🎫 Бесплатных вопросов: ${currentUser.free_predictions_left}`);
                console.log(`⭐ Премиум: ${currentUser.is_subscribed ? 'Да' : 'Нет'}`);
            }
        } else {
            // Создаем тестового пользователя для отладки
            currentUser = createTestUser();
        }
        
        // Ждем загрузки карт
        await cardsPromise;
        
        // Загрузка истории
        if (supabase && currentUser) {
            await loadUserHistoryFromSupabase();
        } else {
            loadLocalHistory();
        }
        
        // Инициализация UI
        initEventListeners();
        initNavigation();
        updateUserInterface();
        
        // Переключаемся на стартовую вкладку
        const savedTab = sessionStorage.getItem('currentTab') || 'daily';
        switchTab(savedTab);
        
        // Проверяем статус карты дня
        await checkDailyCardStatus();
        
        // Запускаем систему автовосстановления
        setupAutoRecovery();
        
        console.log('✅ Приложение готово к работе');
        console.log(`🃏 Доступно карт: ${TAROT_CARDS_CACHE.length}`);
        
        showNotification(
            window.APP_CONFIG?.texts?.cardsReady || 'Карты готовы!', 
            'success'
        );
        
        // Сбрасываем счетчик попыток восстановления
        recoveryAttempts = 0;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        handleInitializationError(error);
    }
}

// 🔧 УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    try {
        console.log('📱 Инициализация Telegram WebApp...');
        
        if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            
            // Настройка WebApp
            tg.ready();
            tg.expand();
            
            // Применяем тему Telegram
            if (tg.themeParams) {
                document.documentElement.style.setProperty('--tg-bg-color', tg.themeParams.bg_color || '#1a1a2e');
                document.documentElement.style.setProperty('--tg-text-color', tg.themeParams.text_color || '#ffffff');
                document.documentElement.style.setProperty('--tg-hint-color', tg.themeParams.hint_color || '#999999');
                document.documentElement.style.setProperty('--tg-button-color', tg.themeParams.button_color || '#6366f1');
            }
            
            // Обработка кнопки "Назад"
            tg.BackButton.onClick(() => {
                if (currentTab !== 'daily') {
                    switchTab('daily');
                } else {
                    tg.close();
                }
            });
            
            console.log('✅ Telegram WebApp инициализирован');
            return true;
            
        } else {
            console.warn('⚠️ Приложение запущено вне Telegram');
            
            // Создаем заглушку для тестирования
            window.tg = {
                initDataUnsafe: {
                    user: {
                        id: Math.floor(Math.random() * 1000000) + 100000,
                        first_name: 'Тестовый пользователь',
                        username: 'test_user'
                    }
                },
                ready: () => {},
                expand: () => {},
                close: () => console.log('🚪 Telegram WebApp закрыт (эмуляция)'),
                BackButton: {
                    show: () => {},
                    hide: () => {},
                    onClick: () => {}
                },
                themeParams: {
                    bg_color: '#1a1a2e',
                    text_color: '#ffffff'
                }
            };
            
            tg = window.tg;
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram:', error);
        return false;
    }
}

// 🔧 УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ SUPABASE
function initSupabase() {
    try {
        console.log('🗄️ Инициализация Supabase...');
        
        const config = window.getSupabaseConfig ? window.getSupabaseConfig() : window.SUPABASE_CONFIG;
        
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Конфигурация Supabase отсутствует, работаем в автономном режиме');
            return false;
        }
        
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Библиотека Supabase не загружена');
            return false;
        }
        
        // Проверяем корректность URL
        try {
            new URL(config.url);
        } catch {
            console.error('❌ Некорректный URL Supabase');
            return false;
        }
        
        // Создаем клиент Supabase
        supabase = window.supabase.createClient(config.url, config.anonKey);
        
        // Тестируем соединение (асинхронно)
        testSupabaseConnection();
        
        console.log('✅ Supabase клиент создан');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 🔍 ТЕСТИРОВАНИЕ СОЕДИНЕНИЯ SUPABASE
async function testSupabaseConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        if (error) {
            console.warn('⚠️ Supabase недоступен:', error.message);
        } else {
            console.log('✅ Supabase подключен и доступен');
        }
    } catch (error) {
        console.warn('⚠️ Ошибка тестирования Supabase:', error);
    }
}

// 👤 СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ
function createTestUser() {
    const testUser = {
        user_id: tg?.initDataUnsafe?.user?.id || Math.floor(Math.random() * 1000000) + 100000,
        first_name: tg?.initDataUnsafe?.user?.first_name || 'Тестовый пользователь',
        username: tg?.initDataUnsafe?.user?.username || 'test_user',
        free_predictions_left: window.APP_CONFIG?.freeQuestionsLimit || 3,
        is_subscribed: false,
        created_at: new Date().toISOString()
    };
    
    console.log('👤 Создан тестовый пользователь:', testUser);
    return testUser;
}

// 🎯 ИСПРАВЛЕННАЯ СИСТЕМА НАВИГАЦИИ
function initNavigation() {
    try {
        console.log('🧭 Инициализация навигации...');
        
        // Получаем все вкладки навигации
        const navTabs = document.querySelectorAll('.nav-tab[data-tab], .nav-tab.premium-tab[data-tab]');
        
        if (navTabs.length === 0) {
            console.warn('⚠️ Элементы навигации не найдены');
            return false;
        }
        
        // Добавляем обработчики событий
        navTabs.forEach((tab, index) => {
            const tabName = tab.getAttribute('data-tab');
            
            if (!tabName) {
                console.warn(`⚠️ Вкладка ${index} не имеет атрибута data-tab`);
                return;
            }
            
            // Удаляем старые обработчики
            tab.replaceWith(tab.cloneNode(true));
            const newTab = document.querySelectorAll('.nav-tab[data-tab], .nav-tab.premium-tab[data-tab]')[index];
            
            newTab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log(`🔄 Переключение на вкладку: ${tabName}`);
                switchTab(tabName);
            });
            
            // Добавляем визуальную обратную связь
            newTab.addEventListener('touchstart', () => {
                newTab.style.transform = 'scale(0.95)';
            });
            
            newTab.addEventListener('touchend', () => {
                newTab.style.transform = 'scale(1)';
            });
        });
        
        console.log(`✅ Навигация инициализирована для ${navTabs.length} вкладок`);
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации навигации:', error);
        return false;
    }
}

// 🔄 ИСПРАВЛЕННАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ ВКЛАДОК
function switchTab(tabName) {
    try {
        console.log(`🔄 Переключение на вкладку: ${tabName}`);
        
        // Проверяем существование вкладки
        const tabContent = document.getElementById(`${tabName}-tab`);
        if (!tabContent) {
            console.error(`❌ Контент вкладки ${tabName} не найден`);
            // Пытаемся переключиться на дефолтную вкладку
            if (tabName !== 'daily') {
                return switchTab('daily');
            }
            return false;
        }
        
        // Скрываем все вкладки
        const allTabs = document.querySelectorAll('.tab-content');
        allTabs.forEach(tab => {
            tab.classList.remove('active');
            tab.style.display = 'none';
        });
        
        // Убираем активный класс с навигации
        const allNavTabs = document.querySelectorAll('.nav-tab');
        allNavTabs.forEach(navTab => {
            navTab.classList.remove('active');
        });
        
        // Показываем выбранную вкладку
        tabContent.classList.add('active');
        tabContent.style.display = 'block';
        
        // Активируем соответствующую кнопку навигации
        const activeNavTab = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeNavTab) {
            activeNavTab.classList.add('active');
        } else {
            console.warn(`⚠️ Кнопка навигации для ${tabName} не найдена`);
        }
        
        // Сохраняем текущую вкладку
        currentTab = tabName;
        sessionStorage.setItem('currentTab', tabName);
        
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
        
        console.log(`✅ Переключено на вкладку: ${tabName}`);
        return true;
        
    } catch (error) {
        console.error(`❌ Ошибка переключения вкладки ${tabName}:`, error);
        
        // Попытка аварийного восстановления
        try {
            const dailyTab = document.getElementById('daily-tab');
            if (dailyTab) {
                dailyTab.classList.add('active');
                dailyTab.style.display = 'block';
                currentTab = 'daily';
                sessionStorage.setItem('currentTab', 'daily');
                console.log('🚑 Аварийное переключение на главную вкладку');
                return true;
            }
        } catch (recoveryError) {
            console.error('❌ Критическая ошибка навигации:', recoveryError);
        }
        
        return false;
    }
}

// 🎬 ДЕЙСТВИЯ СПЕЦИФИЧНЫЕ ДЛЯ ВКЛАДОК
function handleTabSpecificActions(tabName) {
    switch (tabName) {
        case 'daily':
            // Проверяем статус карты дня
            checkDailyCardStatus();
            break;
            
        case 'question':
            // Фокус на поле ввода вопроса
            setTimeout(() => {
                const questionInput = document.getElementById('question-input');
                if (questionInput) {
                    questionInput.focus();
                }
            }, 300);
            break;
            
        case 'history':
            // Обновляем историю
            refreshHistory();
            break;
            
        case 'premium':
            // Обновляем информацию о подписке
            updatePremiumInfo();
            break;
            
        default:
            break;
    }
}

// 🔄 СИСТЕМА АВТОВОССТАНОВЛЕНИЯ
function setupAutoRecovery() {
    console.log('🛡️ Настройка системы автовосстановления...');
    
    // Проверка каждые 30 секунд
    setInterval(async () => {
        try {
            // Проверяем конфигурацию
            if (window.isConfigReady && !window.isConfigReady()) {
                console.warn('🔄 Конфигурация повреждена, восстанавливаю...');
                if (window.emergencyConfigRecovery) {
                    window.emergencyConfigRecovery();
                }
            }
            
            // Проверяем загрузку карт
            if (TAROT_CARDS_CACHE.length === 0 && recoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
                console.warn('🔄 Карты отсутствуют, перезагружаю...');
                recoveryAttempts++;
                await loadCardsFromGitHub();
            }
            
            // Проверяем состояние навигации
            if (!document.querySelector('.nav-tab.active')) {
                console.warn('🔄 Навигация повреждена, восстанавливаю...');
                switchTab(currentTab || 'daily');
            }
            
        } catch (error) {
            console.warn('⚠️ Ошибка автовосстановления:', error);
        }
    }, 30000);
}

// 🚨 ОБРАБОТКА ОШИБОК ИНИЦИАЛИЗАЦИИ
function handleInitializationError(error) {
    console.error('🚨 Критическая ошибка инициализации:', error);
    
    try {
        // Показываем сообщение пользователю
        showNotification(
            'Возникла проблема при загрузке. Пожалуйста, обновите страницу.',
            'error'
        );
        
        // Пытаемся запустить в автономном режиме
        initOfflineMode();
        
        // Инициализируем базовую навигацию
        initEventListeners();
        switchTab('daily');
        
    } catch (fallbackError) {
        console.error('❌ Критическая ошибка fallback режима:', fallbackError);
        
        // Последняя попытка - показать базовое сообщение
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: sans-serif;">
                <h2>🔮 Шёпот Карт</h2>
                <p>Приложение временно недоступно</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px;">
                    Обновить страницу
                </button>
            </div>
        `;
    }
}

// 🌐 АВТОНОМНЫЙ РЕЖИМ
function initOfflineMode() {
    console.log('🌐 Инициализация автономного режима...');
    
    // Используем фоллбэк карты
    TAROT_CARDS_CACHE = window.FALLBACK_CARDS || [];
    CARDS_LOADED = true;
    
    // Создаем базового пользователя
    if (!currentUser) {
        currentUser = createTestUser();
    }
    
    // Загружаем локальную историю
    loadLocalHistory();
    
    console.log('✅ Автономный режим активирован');
}

// 📊 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ПОЛЬЗОВАТЕЛЯ
function updateUserInterface() {
    try {
        if (!currentUser) return;
        
        // Обновляем статус подписки
        const statusElement = document.getElementById('subscription-status');
        if (statusElement) {
            const statusIcon = statusElement.querySelector('.status-icon');
            const statusText = statusElement.querySelector('.status-text');
            
            if (currentUser.is_subscribed) {
                statusIcon.textContent = '⭐';
                statusText.textContent = 'Premium';
                statusElement.classList.add('premium');
            } else {
                statusIcon.textContent = '🌑';
                statusText.textContent = `Базовая (${currentUser.free_predictions_left} вопросов)`;
                statusElement.classList.remove('premium');
            }
        }
        
        console.log('✅ Интерфейс пользователя обновлен');
        
    } catch (error) {
        console.error('❌ Ошибка обновления интерфейса:', error);
    }
}

// 🔄 ОБНОВЛЕНИЕ ИСТОРИИ
function refreshHistory() {
    // Реализация обновления истории
    console.log('🔄 Обновление истории...');
}

// 💎 ОБНОВЛЕНИЕ ИНФОРМАЦИИ PREMIUM
function updatePremiumInfo() {
    // Реализация обновления Premium информации
    console.log('💎 Обновление Premium информации...');
}

// 📤 ЭКСПОРТ ФУНКЦИЙ
window.switchTab = switchTab;
window.initApp = initApp;
window.initTelegramWebApp = initTelegramWebApp;
window.initSupabase = initSupabase;
window.updateUserInterface = updateUserInterface;

// Исправленная система сохранения и загрузки истории
// ========================================================================

// 💾 УЛУЧШЕННАЯ СИСТЕМА СОХРАНЕНИЯ ИСТОРИИ
async function saveToHistory(data) {
    try {
        console.log('💾 Сохранение в историю...', data);
        
        // Валидация данных
        if (!data || typeof data !== 'object') {
            throw new Error('Некорректные данные для сохранения');
        }
        
        // Создаем объект истории
        const historyItem = {
            id: generateHistoryId(),
            timestamp: new Date().toISOString(),
            type: data.type || 'question',
            question: data.question || '',
            cards: Array.isArray(data.cards) ? data.cards : [],
            interpretation: data.interpretation || '',
            user_id: currentUser?.user_id || 'anonymous',
            session_id: getSessionId(),
            metadata: {
                userAgent: navigator.userAgent,
                timestamp: Date.now(),
                version: window.APP_CONFIG?.version || '1.0.0'
            }
        };
        
        // Попытка сохранения в Supabase
        let savedToSupabase = false;
        if (supabase && currentUser && currentUser.user_id !== 'anonymous') {
            try {
                const { data: savedData, error } = await supabase
                    .from('predictions')
                    .insert([historyItem])
                    .select();
                
                if (error) {
                    console.warn('⚠️ Ошибка сохранения в Supabase:', error);
                    throw error;
                }
                
                console.log('✅ История сохранена в Supabase');
                savedToSupabase = true;
                
                // Обновляем локальную историю данными из БД
                if (savedData && savedData.length > 0) {
                    updateLocalHistory(savedData[0]);
                }
                
            } catch (supabaseError) {
                console.warn('⚠️ Supabase недоступен, сохраняю локально:', supabaseError.message);
                throw supabaseError;
            }
        }
        
        // Если не удалось сохранить в Supabase, сохраняем локально
        if (!savedToSupabase) {
            await saveToLocalHistory(historyItem);
            console.log('✅ История сохранена локально');
        }
        
        // Обновляем глобальную переменную истории
        history.unshift(historyItem);
        
        // Ограничиваем размер истории в памяти
        if (history.length > (window.APP_CONFIG?.maxHistoryItems || 50)) {
            history = history.slice(0, window.APP_CONFIG?.maxHistoryItems || 50);
        }
        
        // Обновляем UI если на странице истории
        if (currentTab === 'history') {
            renderHistory();
        }
        
        // Уведомляем об успешном сохранении
        showNotification('Предсказание сохранено в истории', 'success');
        
        return historyItem;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения истории:', error);
        
        // Показываем пользователю сообщение об ошибке
        showNotification('Не удалось сохранить в историю', 'error');
        
        // Пытаемся аварийное сохранение в localStorage
        try {
            const emergencyData = {
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                data: data,
                error: error.message
            };
            
            let emergencyHistory = [];
            const stored = localStorage.getItem('emergency_history');
            if (stored) {
                emergencyHistory = JSON.parse(stored);
            }
            
            emergencyHistory.unshift(emergencyData);
            emergencyHistory = emergencyHistory.slice(0, 10); // Только последние 10
            
            localStorage.setItem('emergency_history', JSON.stringify(emergencyHistory));
            console.log('🚑 Аварийное сохранение выполнено');
            
        } catch (emergencyError) {
            console.error('💥 Критическая ошибка аварийного сохранения:', emergencyError);
        }
        
        throw error;
    }
}

// 💾 СОХРАНЕНИЕ В ЛОКАЛЬНУЮ ИСТОРИЮ
async function saveToLocalHistory(historyItem) {
    try {
        let localHistory = [];
        
        // Загружаем существующую историю
        const stored = localStorage.getItem('tarot_history');
        if (stored) {
            try {
                localHistory = JSON.parse(stored);
                if (!Array.isArray(localHistory)) {
                    localHistory = [];
                }
            } catch (parseError) {
                console.warn('⚠️ Поврежденная локальная история, создаю новую');
                localHistory = [];
            }
        }
        
        // Добавляем новый элемент
        localHistory.unshift(historyItem);
        
        // Ограничиваем размер
        const maxItems = window.APP_CONFIG?.maxHistoryItems || 50;
        if (localHistory.length > maxItems) {
            localHistory = localHistory.slice(0, maxItems);
        }
        
        // Сохраняем обратно
        localStorage.setItem('tarot_history', JSON.stringify(localHistory));
        
        // Обновляем статистику
        updateHistoryStats(localHistory.length);
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения в localStorage:', error);
        throw error;
    }
}

// 📥 ЗАГРУЗКА ИСТОРИИ ИЗ SUPABASE
async function loadUserHistoryFromSupabase() {
    try {
        console.log('📥 Загрузка истории из Supabase...');
        
        if (!supabase || !currentUser) {
            throw new Error('Supabase или пользователь недоступны');
        }
        
        const { data, error } = await supabase
            .from('predictions')
            .select('*')
            .eq('user_id', currentUser.user_id)
            .order('timestamp', { ascending: false })
            .limit(window.APP_CONFIG?.maxHistoryItems || 50);
        
        if (error) {
            console.warn('⚠️ Ошибка загрузки истории из Supabase:', error);
            throw error;
        }
        
        // Обновляем глобальную историю
        history = data || [];
        
        // Синхронизируем с локальной историей
        await syncWithLocalHistory(history);
        
        console.log(`✅ Загружено ${history.length} записей истории из Supabase`);
        
        // Обновляем UI
        if (currentTab === 'history') {
            renderHistory();
        }
        
        return history;
        
    } catch (error) {
        console.warn('⚠️ Не удалось загрузить историю из Supabase, загружаю локальную:', error);
        return await loadLocalHistory();
    }
}

// 📱 ЗАГРУЗКА ЛОКАЛЬНОЙ ИСТОРИИ
async function loadLocalHistory() {
    try {
        console.log('📱 Загрузка локальной истории...');
        
        const stored = localStorage.getItem('tarot_history');
        if (!stored) {
            console.log('📝 Локальная история пуста');
            history = [];
            return history;
        }
        
        const localHistory = JSON.parse(stored);
        if (!Array.isArray(localHistory)) {
            throw new Error('Некорректный формат локальной истории');
        }
        
        // Валидируем и очищаем записи
        history = localHistory.filter(item => {
            return item && 
                   typeof item === 'object' && 
                   item.id && 
                   item.timestamp;
        });
        
        // Сортируем по времени (новые первыми)
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        console.log(`✅ Загружено ${history.length} записей локальной истории`);
        
        // Обновляем UI
        if (currentTab === 'history') {
            renderHistory();
        }
        
        return history;
        
    } catch (error) {
        console.error('❌ Ошибка загрузки локальной истории:', error);
        history = [];
        return history;
    }
}

// 🔄 СИНХРОНИЗАЦИЯ С ЛОКАЛЬНОЙ ИСТОРИЕЙ
async function syncWithLocalHistory(serverHistory) {
    try {
        console.log('🔄 Синхронизация истории...');
        
        const localHistory = await loadLocalHistory();
        
        // Создаем карту серверных записей по ID
        const serverMap = new Map(serverHistory.map(item => [item.id, item]));
        
        // Находим локальные записи, которых нет на сервере
        const localOnlyItems = localHistory.filter(item => !serverMap.has(item.id));
        
        if (localOnlyItems.length > 0) {
            console.log(`📤 Найдено ${localOnlyItems.length} локальных записей для синхронизации`);
            
            // Пытаемся загрузить их на сервер
            for (const item of localOnlyItems) {
                try {
                    await saveToSupabase(item);
                } catch (uploadError) {
                    console.warn(`⚠️ Не удалось синхронизировать запись ${item.id}:`, uploadError);
                }
            }
        }
        
        // Обновляем локальную историю серверными данными
        const mergedHistory = [...serverHistory, ...localOnlyItems];
        mergedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Сохраняем обновленную историю локально
        localStorage.setItem('tarot_history', JSON.stringify(mergedHistory));
        
        console.log('✅ Синхронизация завершена');
        return mergedHistory;
        
    } catch (error) {
        console.error('❌ Ошибка синхронизации истории:', error);
        return serverHistory; // Возвращаем серверную историю в случае ошибки
    }
}

// 💾 СОХРАНЕНИЕ В SUPABASE
async function saveToSupabase(historyItem) {
    if (!supabase) {
        throw new Error('Supabase недоступен');
    }
    
    const { data, error } = await supabase
        .from('predictions')
        .insert([historyItem])
        .select();
    
    if (error) {
        throw error;
    }
    
    return data;
}

// 🎨 ОТОБРАЖЕНИЕ ИСТОРИИ
function renderHistory() {
    try {
        console.log('🎨 Отображение истории...');
        
        const historyContainer = document.querySelector('#history-tab .history-list');
        if (!historyContainer) {
            console.warn('⚠️ Контейнер истории не найден');
            return;
        }
        
        // Очищаем контейнер
        historyContainer.innerHTML = '';
        
        if (history.length === 0) {
            historyContainer.innerHTML = `
                <div class="empty-history">
                    <div class="empty-icon">📜</div>
                    <div class="empty-text">История предсказаний пуста</div>
                    <div class="empty-subtext">Задайте свой первый вопрос картам</div>
                </div>
            `;
            return;
        }
        
        // Группируем по дням
        const groupedHistory = groupHistoryByDate(history);
        
        // Отображаем каждую группу
        Object.entries(groupedHistory).forEach(([date, items]) => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'history-date-group';
            
            dateGroup.innerHTML = `
                <div class="history-date-header">${formatHistoryDate(date)}</div>
                <div class="history-items">
                    ${items.map(item => renderHistoryItem(item)).join('')}
                </div>
            `;
            
            historyContainer.appendChild(dateGroup);
        });
        
        console.log(`✅ Отображено ${history.length} записей истории`);
        
    } catch (error) {
        console.error('❌ Ошибка отображения истории:', error);
        
        const historyContainer = document.querySelector('#history-tab .history-list');
        if (historyContainer) {
            historyContainer.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <div class="error-text">Ошибка загрузки истории</div>
                    <button onclick="refreshHistory()" class="retry-button">Попробовать снова</button>
                </div>
            `;
        }
    }
}

// 📊 ГРУППИРОВКА ИСТОРИИ ПО ДАТАМ
function groupHistoryByDate(historyItems) {
    const groups = {};
    
    historyItems.forEach(item => {
        try {
            const date = new Date(item.timestamp).toISOString().split('T')[0];
            if (!groups[date]) {
                groups[date] = [];
            }
            groups[date].push(item);
        } catch (error) {
            console.warn('⚠️ Некорректная дата в записи истории:', item);
        }
    });
    
    return groups;
}

// 📅 ФОРМАТИРОВАНИЕ ДАТЫ ДЛЯ ИСТОРИИ
function formatHistoryDate(dateString) {
    try {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (dateString === today.toISOString().split('T')[0]) {
            return 'Сегодня';
        } else if (dateString === yesterday.toISOString().split('T')[0]) {
            return 'Вчера';
        } else {
            return date.toLocaleDateString('ru-RU', { 
                day: 'numeric', 
                month: 'long',
                year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
            });
        }
    } catch (error) {
        console.warn('⚠️ Ошибка форматирования даты:', dateString);
        return dateString;
    }
}

// 🎴 ОТОБРАЖЕНИЕ ЭЛЕМЕНТА ИСТОРИИ
function renderHistoryItem(item) {
    const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const typeIcon = getTypeIcon(item.type);
    const cardNames = Array.isArray(item.cards) ? 
        item.cards.map(card => typeof card === 'string' ? card : card.name).join(', ') : 
        'Неизвестная карта';
    
    return `
        <div class="history-item" onclick="viewHistoryDetail('${item.id}')">
            <div class="history-item-header">
                <span class="history-type-icon">${typeIcon}</span>
                <span class="history-time">${time}</span>
            </div>
            <div class="history-question">${truncateText(item.question || 'Карта дня', 60)}</div>
            <div class="history-cards">${truncateText(cardNames, 40)}</div>
        </div>
    `;
}

// 🎭 ПОЛУЧЕНИЕ ИКОНКИ ТИПА
function getTypeIcon(type) {
    const icons = {
        'daily': '🌅',
        'question': '❓',
        'spread': '🔮',
        'relationship': '💕',
        'celtic': '🍀'
    };
    return icons[type] || '🎴';
}

// ✂️ ОБРЕЗКА ТЕКСТА
function truncateText(text, maxLength) {
    if (!text || typeof text !== 'string') return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 🔄 ОБНОВЛЕНИЕ ИСТОРИИ
async function refreshHistory() {
    try {
        console.log('🔄 Обновление истории...');
        
        showNotification('Обновление истории...', 'info');
        
        if (supabase && currentUser) {
            await loadUserHistoryFromSupabase();
        } else {
            await loadLocalHistory();
        }
        
        renderHistory();
        showNotification('История обновлена', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка обновления истории:', error);
        showNotification('Ошибка обновления истории', 'error');
    }
}

// 📊 ОБНОВЛЕНИЕ СТАТИСТИКИ ИСТОРИИ
function updateHistoryStats(count) {
    const statsElement = document.querySelector('.history-stats');
    if (statsElement) {
        statsElement.textContent = `Всего предсказаний: ${count}`;
    }
}

// 🆔 ГЕНЕРАЦИЯ ID ДЛЯ ИСТОРИИ
function generateHistoryId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 🔐 ПОЛУЧЕНИЕ ID СЕССИИ
function getSessionId() {
    let sessionId = sessionStorage.getItem('session_id');
    if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('session_id', sessionId);
    }
    return sessionId;
}

// 📤 ОБНОВЛЕНИЕ ЛОКАЛЬНОЙ ИСТОРИИ
function updateLocalHistory(newItem) {
    try {
        // Добавляем или обновляем элемент в глобальной истории
        const existingIndex = history.findIndex(item => item.id === newItem.id);
        if (existingIndex >= 0) {
            history[existingIndex] = newItem;
        } else {
            history.unshift(newItem);
        }
        
        // Сохраняем в localStorage
        localStorage.setItem('tarot_history', JSON.stringify(history));
        
    } catch (error) {
        console.error('❌ Ошибка обновления локальной истории:', error);
    }
}

// 🗑️ ОЧИСТКА ИСТОРИИ
async function clearHistory() {
    try {
        if (!confirm('Вы уверены, что хотите очистить всю историю? Это действие нельзя отменить.')) {
            return;
        }
        
        console.log('🗑️ Очистка истории...');
        
        // Очищаем глобальную переменную
        history = [];
        
        // Очищаем localStorage
        localStorage.removeItem('tarot_history');
        
        // Очищаем в Supabase (если доступно)
        if (supabase && currentUser) {
            const { error } = await supabase
                .from('predictions')
                .delete()
                .eq('user_id', currentUser.user_id);
                
            if (error) {
                console.warn('⚠️ Ошибка очистки истории в Supabase:', error);
            }
        }
        
        // Обновляем UI
        renderHistory();
        showNotification('История очищена', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка очистки истории:', error);
        showNotification('Ошибка очистки истории', 'error');
    }
}

// 📤 ЭКСПОРТ ФУНКЦИЙ
window.saveToHistory = saveToHistory;
window.loadUserHistoryFromSupabase = loadUserHistoryFromSupabase;
window.loadLocalHistory = loadLocalHistory;
window.renderHistory = renderHistory;
window.refreshHistory = refreshHistory;
window.clearHistory = clearHistory;
