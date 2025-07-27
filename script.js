// script.js - Исправленная версия с рабочими табами
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let supabase = null;
let supabaseReady = false;
let supabaseConnectionRetries = 0;
const MAX_SUPABASE_RETRIES = 3;
let currentUser = null;
let appState = {
    currentTab: 'daily',
    questionsLeft: 3,
    isPremium: false
};

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ
async function initApp() {
    try {
        console.log('🔮 Инициализация Tarot Web App...');
        
        // 1. Настройка обработчиков событий для табов
        setupTabEventListeners();
        
        // 2. Инициализация Telegram WebApp
        initTelegramWebApp();
        
        // 3. Инициализация Supabase
        await initSupabase();
        
        // 4. Загрузка пользовательских данных
        await loadUserData();
        
        // 5. Настройка других обработчиков событий
        setupOtherEventListeners();
        
        // 6. Показ приветственного экрана для новых пользователей
        checkAndShowWelcome();
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        showErrorMessage('Ошибка загрузки приложения. Перезагрузите страницу.');
    }
}

// 🔗 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ ТАБОВ
function setupTabEventListeners() {
    console.log('🔗 Настройка обработчиков табов...');
    
    // Получаем все табы
    const navTabs = document.querySelectorAll('.nav-tab');
    
    if (navTabs.length === 0) {
        console.error('❌ Табы не найдены в DOM');
        return;
    }
    
    // Добавляем обработчики для каждого таба
    navTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            const tabName = this.getAttribute('data-tab');
            if (tabName) {
                console.log(`🔄 Переключение на таб: ${tabName}`);
                switchTab(tabName);
            }
        });
    });
    
    console.log(`✅ Обработчики добавлены для ${navTabs.length} табов`);
}

// 🔄 ПЕРЕКЛЮЧЕНИЕ МЕЖДУ ТАБАМИ
function switchTab(tabName) {
    try {
        console.log(`🔄 Переключение на таб: ${tabName}`);
        
        // 1. Обновляем состояние приложения
        appState.currentTab = tabName;
        
        // 2. Убираем активный класс со всех табов
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // 3. Добавляем активный класс текущему табу
        const currentTabElement = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentTabElement) {
            currentTabElement.classList.add('active');
        }
        
        // 4. Скрываем все контенты табов
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });
        
        // 5. Показываем контент нужного таба
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        } else {
            console.warn(`⚠️ Контент для таба ${tabName} не найден`);
        }
        
        // 6. Выполняем специфичную логику для таба
        handleTabSpecificLogic(tabName);
        
        // 7. Уведомляем Telegram WebApp о смене контента
        if (window.Telegram?.WebApp) {
            window.Telegram.WebApp.expand();
        }
        
        console.log(`✅ Таб ${tabName} активирован`);
        
    } catch (error) {
        console.error(`❌ Ошибка переключения таба ${tabName}:`, error);
    }
}

// 🎯 СПЕЦИФИЧНАЯ ЛОГИКА ДЛЯ КАЖДОГО ТАБА
function handleTabSpecificLogic(tabName) {
    switch (tabName) {
        case 'daily':
            handleDailyTab();
            break;
        case 'question':
            handleQuestionTab();
            break;
        case 'spreads':
            handleSpreadsTab();
            break;
        case 'history':
            handleHistoryTab();
            break;
        case 'reviews':
            handleReviewsTab();
            break;
        case 'premium':
            handlePremiumTab();
            break;
        default:
            console.warn(`⚠️ Неизвестный таб: ${tabName}`);
    }
}

// 📅 ЛОГИКА ТАБА "КАРТА ДНЯ"
function handleDailyTab() {
    console.log('📅 Обработка таба "Карта дня"');
    // Здесь можно добавить логику загрузки карты дня
    checkTodayCard();
}

// ❓ ЛОГИКА ТАБА "ВОПРОС"
function handleQuestionTab() {
    console.log('❓ Обработка таба "Вопрос"');
    updateQuestionsCounter();
}

// 🃏 ЛОГИКА ТАБА "РАСКЛАДЫ"
function handleSpreadsTab() {
    console.log('🃏 Обработка таба "Расклады"');
    // Проверяем Premium статус для доступа к раскладам
    if (!appState.isPremium) {
        showPremiumRequired();
    }
}

// 📖 ЛОГИКА ТАБА "ИСТОРИЯ"
function handleHistoryTab() {
    console.log('📖 Обработка таба "История"');
    loadUserHistory();
}

// ⭐ ЛОГИКА ТАБА "ОТЗЫВЫ"
function handleReviewsTab() {
    console.log('⭐ Обработка таба "Отзывы"');
    loadReviews();
}

// 👑 ЛОГИКА ТАБА "PREMIUM"
function handlePremiumTab() {
    console.log('👑 Обработка таба "Premium"');
    // Логика отображения Premium возможностей
}

// 📱 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    console.log('📱 Инициализация Telegram WebApp...');
    
    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Настройка интерфейса
            tg.ready();
            tg.expand();
            tg.enableClosingConfirmation();
            
            // Установка темы
            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || '#1a1a2e');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor || '#ffffff');
            
            // Получение данных пользователя
            if (tg.initDataUnsafe?.user) {
                currentUser = tg.initDataUnsafe.user;
                console.log('✅ Данные Telegram пользователя получены:', currentUser.first_name);
            }
            
            console.log('✅ Telegram WebApp инициализирован');
        } else {
            console.warn('⚠️ Telegram WebApp недоступен (возможно, запуск вне Telegram)');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 🗄️ ИНИЦИАЛИЗАЦИЯ SUPABASE
async function initSupabase() {
    try {
        console.log('🗄️ Инициализация Supabase...');
        
        // Получаем конфигурацию
        const config = getSupabaseConfigSafely();
        if (!config) {
            console.warn('⚠️ Конфигурация Supabase недоступна, работаем в автономном режиме');
            return false;
        }
        
        // Проверяем загрузку библиотеки Supabase
        if (!await ensureSupabaseLibrary()) {
            console.error('❌ Библиотека Supabase недоступна');
            return false;
        }
        
        // Валидируем конфигурацию
        if (!validateSupabaseConfig(config)) {
            console.error('❌ Некорректная конфигурация Supabase');
            return false;
        }
        
        // Создаем клиент Supabase
        supabase = window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            },
            realtime: {
                params: {
                    eventsPerSecond: 2
                }
            }
        });
        
        // Тестируем соединение
        const connectionTest = await testSupabaseConnection();
        if (connectionTest) {
            supabaseReady = true;
            console.log('✅ Supabase успешно инициализирован и подключен');
            
            // Настраиваем обработчики событий
            setupSupabaseEventHandlers();
            
            return true;
        } else {
            console.warn('⚠️ Supabase инициализирован, но соединение недоступно');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 🔧 ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ SUPABASE
function getSupabaseConfigSafely() {
    try {
        // Проверяем функцию получения конфигурации
        if (typeof window.getSupabaseConfig === 'function') {
            const config = window.getSupabaseConfig();
            if (config && config.url && config.anonKey) {
                return config;
            }
        }
        
        // Проверяем глобальную переменную
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
            return window.SUPABASE_CONFIG;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Ошибка получения конфигурации Supabase:', error);
        return null;
    }
}

async function ensureSupabaseLibrary() {
    try {
        // Проверяем, загружена ли библиотека
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            console.log('✅ Библиотека Supabase уже загружена');
            return true;
        }
        
        console.log('📚 Загружаю библиотеку Supabase...');
        
        // Пытаемся загрузить библиотеку динамически
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
            script.async = true;
            
            script.onload = () => {
                console.log('✅ Библиотека Supabase загружена');
                setTimeout(() => resolve(true), 100);
            };
            
            script.onerror = () => {
                console.error('❌ Не удалось загрузить библиотеку Supabase');
                resolve(false);
            };
            
            document.head.appendChild(script);
            
            // Таймаут на случай зависания
            setTimeout(() => {
                resolve(false);
            }, 10000);
        });
        
    } catch (error) {
        console.error('❌ Ошибка загрузки библиотеки Supabase:', error);
        return false;
    }
}

function validateSupabaseConfig(config) {
    if (!config || typeof config !== 'object') {
        console.error('❌ Конфигурация Supabase пуста или некорректна');
        return false;
    }
    
    if (!config.url || !config.anonKey) {
        console.error('❌ Отсутствуют обязательные поля конфигурации Supabase');
        return false;
    }
    
    if (!isValidUrl(config.url)) {
        console.error('❌ Некорректный URL Supabase');
        return false;
    }
    
    return true;
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch {
        return false;
    }
}

async function testSupabaseConnection() {
    try {
        console.log('🧪 Тестирование соединения Supabase...');
        
        // Простой тест подключения
        const { data, error } = await supabase
            .from('tarot_user_profiles')
            .select('user_id')
            .limit(1);
        
        // Если таблица не существует, это нормально для тестирования
        if (error && !error.message.includes('does not exist')) {
            console.warn('⚠️ Предупреждение соединения Supabase:', error.message);
            return false;
        }
        
        console.log('✅ Соединение Supabase работает');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка тестирования соединения Supabase:', error);
        return false;
    }
}

function setupSupabaseEventHandlers() {
    // Настройка обработчиков событий Supabase
    console.log('🔗 Настройка обработчиков событий Supabase...');
}

// 👤 ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
async function loadUserData() {
    console.log('👤 Загрузка данных пользователя...');
    
    try {
        // Если есть Telegram пользователь
        if (currentUser?.id) {
            // Загружаем данные из Supabase или localStorage
            const userData = await getUserProfile(currentUser.id);
            if (userData) {
                appState.questionsLeft = userData.questionsLeft || 3;
                appState.isPremium = userData.isPremium || false;
                updateUI();
            }
        } else {
            // Загружаем из localStorage для тестирования вне Telegram
            const localData = localStorage.getItem('tarot_user_data');
            if (localData) {
                const parsedData = JSON.parse(localData);
                appState.questionsLeft = parsedData.questionsLeft || 3;
                appState.isPremium = parsedData.isPremium || false;
                updateUI();
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
    }
}

async function getUserProfile(userId) {
    if (!supabaseReady) {
        console.warn('⚠️ Supabase не готов, данные пользователя недоступны');
        return null;
    }
    
    try {
        const { data, error } = await supabase
            .from('tarot_user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Ошибка получения профиля пользователя:', error);
        return null;
    }
}

// 🎨 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА
function updateUI() {
    // Обновление счетчика вопросов
    const questionsCounter = document.getElementById('questions-count');
    if (questionsCounter) {
        questionsCounter.textContent = appState.questionsLeft;
    }
    
    // Обновление статуса подписки
    const subscriptionStatus = document.getElementById('subscription-status');
    if (subscriptionStatus) {
        if (appState.isPremium) {
            subscriptionStatus.classList.add('premium');
            subscriptionStatus.innerHTML = `
                <span class="status-icon">✨</span>
                <span class="status-text">Premium активен</span>
            `;
        } else {
            subscriptionStatus.classList.remove('premium');
            subscriptionStatus.innerHTML = `
                <span class="status-icon">🌑</span>
                <span class="status-text">Базовая версия</span>
            `;
        }
    }
}

// 🔧 НАСТРОЙКА ДРУГИХ ОБРАБОТЧИКОВ СОБЫТИЙ
function setupOtherEventListeners() {
    console.log('🔧 Настройка дополнительных обработчиков событий...');
    
    // Обработчик кнопки задать вопрос
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', handleAskQuestion);
    }
    
    // Обработчик карты дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', handleDailyCardClick);
    }
    
    // Обработчик кнопки очистки истории
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', handleClearHistory);
    }
}

// 🃏 ОБРАБОТЧИКИ ИГРОВОЙ ЛОГИКИ
function handleAskQuestion() {
    console.log('❓ Обработка вопроса...');
    
    const questionInput = document.getElementById('question-input');
    if (!questionInput) return;
    
    const question = questionInput.value.trim();
    if (!question) {
        showErrorMessage('Пожалуйста, введите вопрос');
        return;
    }
    
    if (appState.questionsLeft <= 0 && !appState.isPremium) {
        showPremiumRequired();
        return;
    }
    
    // Логика обработки вопроса
    processQuestion(question);
}

function handleDailyCardClick() {
    console.log('📅 Обработка клика по карте дня...');
    // Логика открытия карты дня
    drawDailyCard();
}

function handleClearHistory() {
    console.log('🗑️ Очистка истории...');
    if (confirm('Вы уверены, что хотите очистить всю историю?')) {
        clearUserHistory();
    }
}

// 🎮 ИГРОВАЯ ЛОГИКА (заглушки)
async function checkTodayCard() {
    console.log('📅 Проверка карты дня...');
    // Здесь будет логика проверки карты дня
}

async function drawDailyCard() {
    console.log('🃏 Вытягивание карты дня...');
    // Здесь будет логика вытягивания карты дня
}

async function processQuestion(question) {
    console.log('🔮 Обработка вопроса:', question);
    // Здесь будет логика обработки вопроса
}

function updateQuestionsCounter() {
    const counter = document.getElementById('questions-count');
    if (counter) {
        counter.textContent = appState.questionsLeft;
    }
}

async function loadUserHistory() {
    console.log('📖 Загрузка истории пользователя...');
    // Здесь будет логика загрузки истории
}

async function loadReviews() {
    console.log('⭐ Загрузка отзывов...');
    // Здесь будет логика загрузки отзывов
}

async function clearUserHistory() {
    console.log('🗑️ Очистка истории пользователя...');
    // Здесь будет логика очистки истории
}

// 🚨 ОБРАБОТКА ОШИБОК
function showErrorMessage(message) {
    console.error('🚨 Ошибка:', message);
    
    // Простое уведомление (можно заменить на модальное окно)
    if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
}

function showPremiumRequired() {
    console.log('👑 Требуется Premium');
    switchTab('premium');
}

// 🎉 ПРИВЕТСТВЕННЫЙ ЭКРАН
function checkAndShowWelcome() {
    // Проверяем, новый ли пользователь
    const hasSeenWelcome = localStorage.getItem('tarot_seen_welcome');
    if (!hasSeenWelcome && !currentUser) {
        console.log('👋 Показ приветственного экрана...');
        // Здесь можно показать приветственный экран
        localStorage.setItem('tarot_seen_welcome', 'true');
    }
}

// 🌟 ЭКСПОРТ ДЛЯ ОТЛАДКИ
window.tarotApp = {
    switchTab,
    appState,
    currentUser,
    supabaseReady,
    initApp
};

console.log('📜 Script.js загружен, ожидание DOM...');
