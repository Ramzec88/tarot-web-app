// script.js - Исправленная логика приложения "Шёпот карт"
// ========================================================================

console.log('📜 Загрузка script.js...');

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
let supabase = null;
let currentUser = null;
let appState = {
    currentTab: 'daily',
    questionsLeft: 3,
    isPremium: false,
    isInitialized: false,
    currentRating: 0,
    dailyCardUsed: false
};

// 🚫 ФЛАГИ СОСТОЯНИЯ
let isInitializing = false;
let supabaseInitialized = false;

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ
async function initApp() {
    console.log('🔮 Инициализация приложения...');
    
    if (appState.isInitialized || isInitializing) {
        console.log('⚠️ Приложение уже инициализировано');
        return;
    }
    
    isInitializing = true;

    try {
        // Показываем состояние загрузки
        showLoadingState();
        
        // 1. Ждём готовности конфигурации (максимум 3 секунды)
        await waitForConfig();
        
        // 2. Инициализируем базовый UI без зависимостей
        initBasicUI();
        
        // 3. Инициализируем Telegram WebApp
        initTelegramWebApp();
        
        // 4. Пытаемся инициализировать Supabase (не критично)
        await initSupabaseOnce();
        
        // 5. Инициализируем пользователя
        await initUser();
        
        // 6. Настраиваем обработчики событий
        setupEventListeners();
        
        // 7. Обновляем UI
        updateUI();
        
        // 8. Скрываем состояние загрузки
        hideLoadingState();
        
        // 9. Проверяем приветствие (опционально)
        setTimeout(checkAndShowWelcome, 1000);
        
        appState.isInitialized = true;
        isInitializing = false;
        
        console.log('✅ Приложение успешно инициализировано');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        isInitializing = false;
        
        // Показываем базовый UI даже при ошибках
        initBasicUI();
        setupEventListeners();
        hideLoadingState();
        
        showErrorMessage('Не удалось полностью загрузить приложение. Некоторые функции могут быть недоступны.');
    }
}

// 🔄 ПОКАЗАТЬ СОСТОЯНИЕ ЗАГРУЗКИ
function showLoadingState() {
    // Создаем простой индикатор загрузки если его нет
    let loader = document.getElementById('app-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'app-loader';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            color: white;
            font-family: Arial, sans-serif;
        `;
        loader.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 48px; margin-bottom: 20px;">🔮</div>
                <div style="font-size: 20px; color: #ffd700;">Шёпот карт</div>
                <div style="font-size: 14px; margin-top: 10px; opacity: 0.7;">Загрузка...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
}

// 🫥 СКРЫТЬ СОСТОЯНИЕ ЗАГРУЗКИ
function hideLoadingState() {
    const loader = document.getElementById('app-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 300);
    }
}

// 🎨 ИНИЦИАЛИЗАЦИЯ БАЗОВОГО UI
function initBasicUI() {
    console.log('🎨 Инициализация базового UI...');
    
    try {
        // Убеждаемся что активная вкладка видна
        const dailyTab = document.getElementById('daily-tab');
        if (dailyTab) {
            dailyTab.classList.add('active');
        }
        
        // Активируем первую кнопку таба
        const firstTabBtn = document.querySelector('.nav-tab[data-tab="daily"]');
        if (firstTabBtn) {
            firstTabBtn.classList.add('active');
        }
        
        // Инициализируем счетчик символов для textarea
        initCharCounters();
        
        // Инициализируем звездочки рейтинга
        initRatingStars();
        
        console.log('✅ Базовый UI инициализирован');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации базового UI:', error);
    }
}

// ⏰ ОЖИДАНИЕ ГОТОВНОСТИ КОНФИГУРАЦИИ
async function waitForConfig() {
    console.log('⏰ Ожидание готовности конфигурации...');
    
    let attempts = 0;
    const maxAttempts = 30; // 3 секунды максимум
    
    while (attempts < maxAttempts) {
        if (window.isConfigReady && window.isConfigReady()) {
            console.log('✅ Конфигурация готова');
            return;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    console.warn('⚠️ Конфигурация не загружена за 3 сек, продолжаем без неё');
}

// 🔧 ИНИЦИАЛИЗАЦИЯ SUPABASE
async function initSupabaseOnce() {
    if (supabaseInitialized) {
        console.log('✅ Supabase уже инициализирован');
        return true;
    }
    
    console.log('🔧 Инициализация Supabase...');
    
    try {
        // Проверяем библиотеку Supabase
        if (typeof window.supabase === 'undefined') {
            console.warn('⚠️ Библиотека Supabase не загружена');
            return false;
        }
        
        // Проверяем конфигурацию
        const config = window.getSupabaseConfig ? window.getSupabaseConfig() : null;
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Конфигурация Supabase недоступна');
            return false;
        }
        
        // Инициализируем клиент
        supabase = window.supabase.createClient(config.url, config.anonKey, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
        
        supabaseInitialized = true;
        console.log('✅ Supabase инициализирован успешно');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 📱 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    console.log('📱 Инициализация Telegram WebApp...');
    
    try {
        if (window.Telegram && window.Telegram.WebApp) {
            const tg = window.Telegram.WebApp;
            
            // Настройка темы (только если поддерживается)
            try {
                if (tg.version >= '6.1') {
                    tg.setHeaderColor('#1a1a2e');
                    tg.setBackgroundColor('#16213e');
                }
            } catch (error) {
                console.log('ℹ️ Цвета темы не поддерживаются в этой версии');
            }
            
            // Базовые настройки
            tg.ready();
            tg.expand();
            
            // Настройка главной кнопки
            if (tg.MainButton) {
                tg.MainButton.hide();
            }
            
            console.log('✅ Telegram WebApp инициализирован');
            
        } else {
            console.log('ℹ️ Приложение запущено вне Telegram');
        }
        
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 👤 ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЯ
async function initUser() {
    console.log('👤 Инициализация пользователя...');
    
    try {
        // Получаем данные пользователя из Telegram или localStorage
        let userData = loadUserData();
        
        if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
            const tgUser = window.Telegram.WebApp.initDataUnsafe.user;
            if (tgUser) {
                userData = {
                    id: tgUser.id,
                    firstName: tgUser.first_name,
                    lastName: tgUser.last_name,
                    username: tgUser.username,
                    languageCode: tgUser.language_code
                };
                saveUserData(userData);
            }
        }
        
        // Если нет данных пользователя, создаем анонимного
        if (!userData) {
            userData = {
                id: 'anonymous_' + Date.now(),
                firstName: 'Гость',
                isAnonymous: true
            };
        }
        
        currentUser = userData;
        
        // Загружаем состояние приложения
        const savedState = loadAppState();
        if (savedState) {
            appState = { ...appState, ...savedState };
        }
        
        console.log('✅ Пользователь инициализирован:', currentUser);
        
    } catch (error) {
        console.error('❌ Ошибка инициализации пользователя:', error);
        
        // Fallback пользователь
        currentUser = {
            id: 'fallback_user',
            firstName: 'Пользователь',
            isAnonymous: true
        };
    }
}

// 🎛️ НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ
function setupEventListeners() {
    console.log('🎛️ Настройка обработчиков событий...');
    
    try {
        // ОСНОВНОЕ: Обработчики табов
        const tabButtons = document.querySelectorAll('.nav-tab[data-tab]');
        tabButtons.forEach(button => {
            // Удаляем старые обработчики
            button.removeEventListener('click', handleTabClick);
            // Добавляем новые
            button.addEventListener('click', handleTabClick);
        });
        
        // Карта дня
        const dailyCard = document.getElementById('daily-card');
        if (dailyCard) {
            dailyCard.removeEventListener('click', handleDailyCardClick);
            dailyCard.addEventListener('click', handleDailyCardClick);
        }
        
        // Кнопка вопроса
        const askBtn = document.getElementById('ask-btn');
        if (askBtn) {
            askBtn.removeEventListener('click', handleAskQuestion);
            askBtn.addEventListener('click', handleAskQuestion);
        }
        
        // Enter в поле вопроса
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            questionInput.removeEventListener('keypress', handleQuestionKeypress);
            questionInput.addEventListener('keypress', handleQuestionKeypress);
            questionInput.addEventListener('input', updateCharCounter);
        }

        // Кнопка уточняющего вопроса
        const followupBtn = document.getElementById('followup-btn');
        if (followupBtn) {
            followupBtn.removeEventListener('click', handleFollowupQuestion);
            followupBtn.addEventListener('click', handleFollowupQuestion);
        }

        // Расклады
        const spreadCards = document.querySelectorAll('.spread-card[data-spread]');
        spreadCards.forEach(card => {
            card.removeEventListener('click', handleSpreadClick);
            card.addEventListener('click', handleSpreadClick);
        });

        // Premium кнопка
        const buyPremiumBtn = document.getElementById('buy-premium');
        if (buyPremiumBtn) {
            buyPremiumBtn.removeEventListener('click', handlePremiumPurchase);
            buyPremiumBtn.addEventListener('click', handlePremiumPurchase);
        }

        // Обработчики профиля
        setupProfileEventListeners();

        // Обработчики отзывов
        setupReviewEventListeners();

        console.log('✅ Обработчики событий настроены');
        
    } catch (error) {
        console.error('❌ Ошибка настройки обработчиков событий:', error);
    }
}

// 🎯 ОБРАБОТЧИК КЛИКА ПО ТАБУ
function handleTabClick(event) {
    const tabName = event.currentTarget.getAttribute('data-tab');
    if (tabName) {
        switchTab(tabName);
    }
}

// 🔄 ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
function switchTab(tabName) {
    console.log('🔄 Переключение на вкладку:', tabName);
    
    try {
        // Проверяем существование вкладки
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (!targetTab) {
            console.error(`❌ Вкладка ${tabName}-tab не найдена`);
            return;
        }

        // Убираем активность со всех табов
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Активируем нужную кнопку и контент
        const tabButton = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
        
        if (tabButton) {
            tabButton.classList.add('active');
        }
        
        targetTab.classList.add('active');
        
        // Обновляем состояние
        appState.currentTab = tabName;
        saveAppState();
        
        // Вызываем специальные обработчики для определенных вкладок
        if (tabName === 'history') {
            loadHistoryData();
        }
        
        console.log('✅ Вкладка переключена на:', tabName);
        
    } catch (error) {
        console.error('❌ Ошибка переключения вкладки:', error);
    }
}

// 🔮 ОБРАБОТЧИК КЛИКА ПО КАРТЕ ДНЯ
async function handleDailyCardClick() {
    console.log('🔮 Клик по карте дня');
    
    try {
        if (appState.dailyCardUsed) {
            showMessage('Карта дня уже была получена сегодня!', 'info');
            return;
        }
        
        // Показываем загрузку
        const loadingElement = document.getElementById('daily-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        // Получаем случайную карту
        const card = getRandomCard();
        
        // Показываем карту с задержкой для эффекта
        setTimeout(() => {
            const cardElement = document.getElementById('daily-card');
            if (cardElement) {
                cardElement.innerHTML = `
                    <div class="card-front">
                        <div class="card-symbol">${card.symbol}</div>
                        <div class="card-name">${card.name}</div>
                    </div>
                `;
                cardElement.classList.add('flipped');
            }
            
            // Скрываем загрузку
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            // Показываем толкование
            const interpretationElement = document.getElementById('daily-interpretation');
            if (interpretationElement) {
                interpretationElement.textContent = card.interpretation;
            }
            
            const aiContainer = document.getElementById('daily-ai-container');
            if (aiContainer) {
                aiContainer.style.display = 'block';
            }
            
        }, 1500);
        
        // Отмечаем что карта использована
        appState.dailyCardUsed = true;
        saveAppState();
        
        console.log('✅ Карта дня показана:', card.name);
        
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        showErrorMessage('Не удалось получить карту дня');
        
        const loadingElement = document.getElementById('daily-loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
    }
}

// ❓ ОБРАБОТЧИК KEYPRESS ДЛЯ ПОЛЯ ВОПРОСА
function handleQuestionKeypress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleAskQuestion();
    }
}

// ❓ ОБРАБОТЧИК ВОПРОСА
async function handleAskQuestion() {
    console.log('❓ Обработка вопроса');
    
    try {
        const questionInput = document.getElementById('question-input');
        const question = questionInput ? questionInput.value.trim() : '';
        
        if (!question) {
            showMessage('Пожалуйста, введите вопрос', 'warning');
            return;
        }
        
        if (question.length < 10) {
            showMessage('Вопрос слишком короткий. Опишите ситуацию подробнее.', 'warning');
            return;
        }
        
        if (appState.questionsLeft <= 0 && !appState.isPremium) {
            showMessage('У вас закончились бесплатные вопросы. Оформите Premium!', 'warning');
            switchTab('premium');
            return;
        }
        
        // Показываем загрузку
        const loadingElement = document.getElementById('question-loading');
        if (loadingElement) {
            loadingElement.style.display = 'block';
        }
        
        // Скрываем предыдущие результаты
        const answerSection = document.getElementById('first-answer-section');
        const followUpSection = document.getElementById('follow-up-section');
        if (answerSection) answerSection.style.display = 'none';
        if (followUpSection) followUpSection.style.display = 'none';
        
        // Получаем ответ (пока что локально)
        const answer = await getAnswerToQuestion(question);
        
        // Показываем ответ с задержкой
        setTimeout(() => {
            if (loadingElement) {
                loadingElement.style.display = 'none';
            }
            
            if (answerSection) {
                answerSection.style.display = 'block';
                
                // Карта ответа
                const answerCard = document.getElementById('answer-card');
                if (answerCard) {
                    answerCard.innerHTML = `
                        <div class="card-front">
                            <div class="card-symbol">${answer.card.symbol}</div>
                            <div class="card-name">${answer.card.name}</div>
                        </div>
                    `;
                    answerCard.classList.add('flipped');
                }
                
                // ИИ толкование
                const aiContainer = document.getElementById('first-ai-container');
                if (aiContainer) {
                    aiContainer.innerHTML = `
                        <div class="ai-answer-header">
                            <h4>🤖 Ответ на ваш вопрос</h4>
                        </div>
                        <div class="ai-answer-box">${answer.interpretation}</div>
                    `;
                }
                
                // Показываем блок уточняющего вопроса
                setTimeout(() => {
                    if (followUpSection) {
                        followUpSection.style.display = 'block';
                    }
                }, 1000);
            }
        }, 2000);
        
        // Уменьшаем количество вопросов
        if (!appState.isPremium) {
            appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
            updateUI();
            saveAppState();
        }
        
        // Очищаем поле ввода
        if (questionInput) {
            questionInput.value = '';
            updateCharCounter({ target: questionInput });
        }
        
        console.log('✅ Вопрос обработан');
        
    } catch (error) {
        console.error('❌ Ошибка обработки вопроса:', error);
        showErrorMessage('Не удалось получить ответ на вопрос');
        
        const loadingElement = document.getElementById('question-loading');
        if (loadingElement) loadingElement.style.display = 'none';
    }
}

// 🔍 ОБРАБОТЧИК УТОЧНЯЮЩЕГО ВОПРОСА
async function handleFollowupQuestion() {
    console.log('🔍 Обработка уточняющего вопроса');
    
    try {
        const followupInput = document.getElementById('followup-input');
        const question = followupInput ? followupInput.value.trim() : '';
        
        if (!question) {
            showMessage('Пожалуйста, введите уточняющий вопрос', 'warning');
            return;
        }
        
        if (appState.questionsLeft <= 0 && !appState.isPremium) {
            showMessage('У вас закончились бесплатные вопросы. Оформите Premium!', 'warning');
            switchTab('premium');
            return;
        }
        
        const followupBtn = document.getElementById('followup-btn');
        if (followupBtn) {
            followupBtn.disabled = true;
            followupBtn.innerHTML = '<span>🔮</span><span>Получаю ответ...</span>';
        }
        
        // Получаем уточняющий ответ
        const answer = await getAnswerToQuestion(question);
        
        setTimeout(() => {
            // Добавляем новый блок с ответом
            const followUpSection = document.getElementById('follow-up-section');
            if (followUpSection) {
                const answerDiv = document.createElement('div');
                answerDiv.className = 'ai-answer-container';
                answerDiv.innerHTML = `
                    <div class="ai-answer-header">
                        <h4>🔮 Уточнение: ${answer.card.name}</h4>
                    </div>
                    <div class="ai-answer-box">${answer.interpretation}</div>
                `;
                followUpSection.appendChild(answerDiv);
            }
            
            // Восстанавливаем кнопку
            if (followupBtn) {
                followupBtn.disabled = false;
                followupBtn.innerHTML = '<span>🔮</span><span>Узнать подробнее</span>';
            }
            
            // Очищаем поле
            if (followupInput) {
                followupInput.value = '';
            }
            
            // Уменьшаем количество вопросов
            if (!appState.isPremium) {
                appState.questionsLeft = Math.max(0, appState.questionsLeft - 1);
                updateUI();
                saveAppState();
            }
        }, 1500);
        
    } catch (error) {
        console.error('❌ Ошибка обработки уточняющего вопроса:', error);
        showErrorMessage('Не удалось получить уточняющий ответ');
        
        const followupBtn = document.getElementById('followup-btn');
        if (followupBtn) {
            followupBtn.disabled = false;
            followupBtn.innerHTML = '<span>🔮</span><span>Узнать подробнее</span>';
        }
    }
}

// 🎴 ОБРАБОТЧИК КЛИКА ПО РАСКЛАДУ
function handleSpreadClick(event) {
    const spreadType = event.currentTarget.getAttribute('data-spread');
    
    if (!spreadType) return;
    
    // Проверяем премиум расклады
    const premiumSpreads = ['spiritual', 'future', 'celtic'];
    if (premiumSpreads.includes(spreadType) && !appState.isPremium) {
        showMessage('Этот расклад доступен только в Premium версии', 'warning');
        switchTab('premium');
        return;
    }
    
    console.log('🎴 Выбран расклад:', spreadType);
    performSpread(spreadType);
}

// 🔮 ВЫПОЛНЕНИЕ РАСКЛАДА
async function performSpread(spreadType) {
    try {
        const spreadResult = document.getElementById('spread-result');
        const spreadCards = document.getElementById('spread-cards');
        const spreadInterpretation = document.getElementById('spread-interpretation');
        
        if (!spreadResult || !spreadCards || !spreadInterpretation) return;
        
        // Показываем результат
        spreadResult.style.display = 'block';
        
        // Очищаем предыдущие карты
        spreadCards.innerHTML = '';
        
        // Определяем количество карт для расклада
        const cardCount = getSpreadCardCount(spreadType);
        const cards = [];
        
        // Генерируем карты
        for (let i = 0; i < cardCount; i++) {
            const card = getRandomCard();
            cards.push(card);
            
            const cardElement = document.createElement('div');
            cardElement.className = 'tarot-card';
            cardElement.innerHTML = `
                <div class="card-front">
                    <div class="card-symbol">${card.symbol}</div>
                    <div class="card-name">${card.name}</div>
                </div>
            `;
            spreadCards.appendChild(cardElement);
        }
        
        // Генерируем толкование
        const interpretation = generateSpreadInterpretation(spreadType, cards);
        spreadInterpretation.innerHTML = interpretation;
        
        // Прокручиваем к результату
        spreadResult.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('❌ Ошибка выполнения расклада:', error);
        showErrorMessage('Не удалось выполнить расклад');
    }
}

// 📊 КОЛИЧЕСТВО КАРТ ДЛЯ РАСКЛАДА
function getSpreadCardCount(spreadType) {
    const counts = {
        love: 3,
        career: 3,
        health: 2,
        spiritual: 4,
        future: 5,
        celtic: 10
    };
    return counts[spreadType] || 3;
}

// 📝 ГЕНЕРАЦИЯ ТОЛКОВАНИЯ РАСКЛАДА
function generateSpreadInterpretation(spreadType, cards) {
    const interpretations = {
        love: `
            <h4>💕 Расклад на любовь</h4>
            <p><strong>Прошлое:</strong> ${cards[0].name} говорит о ${cards[0].interpretation}</p>
            <p><strong>Настоящее:</strong> ${cards[1].name} указывает на текущие чувства и отношения.</p>
            <p><strong>Будущее:</strong> ${cards[2].name} предсказывает развитие ваших романтических отношений.</p>
        `,
        career: `
            <h4>💼 Расклад на карьеру</h4>
            <p><strong>Текущая ситуация:</strong> ${cards[0].name} показывает ваше положение на работе.</p>
            <p><strong>Препятствия:</strong> ${cards[1].name} указывает на возможные трудности.</p>
            <p><strong>Результат:</strong> ${cards[2].name} предсказывает исход ваших карьерных планов.</p>
        `,
        health: `
            <h4>🌿 Расклад на здоровье</h4>
            <p><strong>Физическое состояние:</strong> ${cards[0].name} отражает ваше здоровье.</p>
            <p><strong>Рекомендации:</strong> ${cards[1].name} дает совет для улучшения самочувствия.</p>
        `
    };
    
    return interpretations[spreadType] || `<p>Карты показывают важные аспекты вашей ситуации.</p>`;
}

// 💳 ОБРАБОТЧИК ПОКУПКИ ПРЕМИУМА
function handlePremiumPurchase(event) {
    event.preventDefault();
    
    console.log('💳 Попытка покупки Premium');
    
    // Пока что просто показываем сообщение
    showMessage('Функция оплаты будет доступна в следующем обновлении! 🚀', 'info');
    
    // В будущем здесь будет интеграция с платежной системой
    // Для тестирования можно временно активировать Premium
    if (confirm('Активировать Premium для тестирования?')) {
        appState.isPremium = true;
        appState.questionsLeft = 999;
        saveAppState();
        updateUI();
        showMessage('Premium активирован! 👑', 'success');
    }
}

// 📜 ЗАГРУЗКА ДАННЫХ ИСТОРИИ
function loadHistoryData() {
    console.log('📜 Загрузка истории...');
    
    try {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        // Получаем сохраненную историю
        const history = getHistoryFromStorage();
        
        if (history.length === 0) {
            historyList.innerHTML = `
                <div class="history-empty">
                    <div class="empty-icon">📜</div>
                    <h4>История пуста</h4>
                    <p>Ваши гадания будут сохраняться здесь</p>
                </div>
            `;
            return;
        }
        
        // Отображаем историю
        historyList.innerHTML = history.map(item => `
            <div class="history-item">
                <div class="history-header-item">
                    <div class="history-type">
                        <span class="history-icon">${item.icon}</span>
                        <span>${item.type}</span>
                    </div>
                    <div class="history-date">${item.date}</div>
                </div>
                <div class="history-preview">${item.preview}</div>
                ${item.card ? `
                    <div class="history-card">
                        <span class="history-mini-card">${item.card.symbol}</span>
                        <span>${item.card.name}</span>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
    }
}

// 🎯 ОБНОВЛЕНИЕ UI
function updateUI() {
    console.log('🎯 Обновление UI...');
    
    try {
        // Обновляем статус подписки
        const statusElement = document.getElementById('subscription-status');
        if (statusElement) {
            const statusIcon = statusElement.querySelector('.status-icon');
            const statusText = statusElement.querySelector('.status-text');
            
            if (appState.isPremium) {
                if (statusIcon) statusIcon.textContent = '👑';
                if (statusText) statusText.textContent = 'Premium активен';
                statusElement.className = 'subscription-status premium';
            } else {
                if (statusIcon) statusIcon.textContent = '🆓';
                if (statusText) statusText.textContent = 'Бесплатная версия';
                statusElement.className = 'subscription-status';
            }
        }
        
        // Обновляем счетчик вопросов
        const questionsCountElement = document.getElementById('questions-count');
        if (questionsCountElement) {
            questionsCountElement.textContent = appState.isPremium ? '∞' : appState.questionsLeft;
        }
        
        const questionsLeftElement = document.getElementById('questions-left');
        if (questionsLeftElement) {
            if (appState.isPremium) {
                questionsLeftElement.textContent = '(Premium)';
            } else {
                questionsLeftElement.textContent = `(осталось: ${appState.questionsLeft})`;
            }
        }
        
        console.log('✅ UI обновлен');
        
    } catch (error) {
        console.error('❌ Ошибка обновления UI:', error);
    }
}

// 🔧 ИНИЦИАЛИЗАЦИЯ СЧЕТЧИКОВ СИМВОЛОВ
function initCharCounters() {
    try {
        const questionInput = document.getElementById('question-input');
        if (questionInput) {
            updateCharCounter({ target: questionInput });
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации счетчиков:', error);
    }
}

// 🔢 ОБНОВЛЕНИЕ СЧЕТЧИКА СИМВОЛОВ
function updateCharCounter(event) {
    try {
        const input = event.target;
        const maxLength = input.getAttribute('maxlength') || 500;
        const currentLength = input.value.length;
        
        const counter = document.getElementById('char-count');
        if (counter) {
            counter.textContent = currentLength;
            
            // Меняем цвет при приближении к лимиту
            const parent = counter.parentElement;
            if (parent) {
                if (currentLength > maxLength * 0.9) {
                    parent.style.color = '#ef4444';
                } else if (currentLength > maxLength * 0.7) {
                    parent.style.color = '#f59e0b';
                } else {
                    parent.style.color = '#a0a0a0';
                }
            }
        }
    } catch (error) {
        console.error('❌ Ошибка обновления счетчика:', error);
    }
}

// ⭐ ИНИЦИАЛИЗАЦИЯ ЗВЕЗДОЧЕК РЕЙТИНГА
function initRatingStars() {
    try {
        const stars = document.querySelectorAll('.star[data-rating]');
        stars.forEach(star => {
            star.addEventListener('click', handleStarClick);
        });
    } catch (error) {
        console.error('❌ Ошибка инициализации звездочек:', error);
    }
}

// ⭐ ОБРАБОТЧИК КЛИКА ПО ЗВЕЗДОЧКЕ
function handleStarClick(event) {
    const rating = parseInt(event.target.getAttribute('data-rating'));
    appState.currentRating = rating;
    
    // Обновляем визуальное состояние звездочек
    const stars = document.querySelectorAll('.star[data-rating]');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

// 📝 НАСТРОЙКА ОБРАБОТЧИКОВ ОТЗЫВОВ
function setupReviewEventListeners() {
    try {
        const submitReviewBtn = document.getElementById('submit-review');
        if (submitReviewBtn) {
            submitReviewBtn.removeEventListener('click', handleSubmitReview);
            submitReviewBtn.addEventListener('click', handleSubmitReview);
        }
    } catch (error) {
        console.error('❌ Ошибка настройки обработчиков отзывов:', error);
    }
}

// 📝 ОБРАБОТЧИК ОТПРАВКИ ОТЗЫВА
function handleSubmitReview() {
    try {
        const reviewText = document.getElementById('review-text');
        const text = reviewText ? reviewText.value.trim() : '';
        
        if (!text) {
            showMessage('Пожалуйста, напишите отзыв', 'warning');
            return;
        }
        
        if (appState.currentRating === 0) {
            showMessage('Пожалуйста, поставьте оценку', 'warning');
            return;
        }
        
        // Сохраняем отзыв (пока что локально)
        const review = {
            rating: appState.currentRating,
            text: text,
            date: new Date().toISOString(),
            userName: currentUser?.firstName || 'Пользователь'
        };
        
        console.log('📝 Отзыв отправлен:', review);
        
        showMessage('Спасибо за ваш отзыв! ⭐', 'success');
        
        // Очищаем форму
        if (reviewText) reviewText.value = '';
        appState.currentRating = 0;
        
        const stars = document.querySelectorAll('.star[data-rating]');
        stars.forEach(star => star.classList.remove('active'));
        
    } catch (error) {
        console.error('❌ Ошибка отправки отзыва:', error);
        showErrorMessage('Не удалось отправить отзыв');
    }
}

// 🤖 ПОЛУЧЕНИЕ ОТВЕТА НА ВОПРОС
async function getAnswerToQuestion(question) {
    console.log('🤖 Получение ответа на вопрос:', question);
    
    try {
        // Пока что возвращаем локальный ответ
        // В будущем здесь будет запрос к n8n
        const card = getRandomCard();
        
        const interpretations = [
            `Карта ${card.name} говорит о том, что ваш вопрос "${question}" требует терпения и мудрости. ${card.interpretation}`,
            `В ответ на ваш вопрос карты показывают ${card.name}. Это знак того, что решение уже близко. ${card.interpretation}`,
            `${card.name} в ответе на "${question}" символизирует новые возможности. ${card.interpretation}`
        ];
        
        return {
            card: card,
            interpretation: interpretations[Math.floor(Math.random() * interpretations.length)]
        };
        
    } catch (error) {
        console.error('❌ Ошибка получения ответа:', error);
        throw error;
    }
}

// 🎲 ПОЛУЧЕНИЕ СЛУЧАЙНОЙ КАРТЫ
function getRandomCard() {
    const cards = getFallbackCards();
    if (cards && cards.length > 0) {
        return cards[Math.floor(Math.random() * cards.length)];
    }
    
    // Fallback карта если нет конфигурации
    return {
        name: "Звезда",
        symbol: "⭐",
        interpretation: "Карта надежды и вдохновения. Сегодня звезды благоволят вашим начинаниям."
    };
}

// ✅ Получение fallback-карт без рекурсии
function getFallbackCards() {
    // Сначала пробуем получить из конфигурации
    if (window.getFallbackCards && typeof window.getFallbackCards === 'function') {
        try {
            const configCards = window.getFallbackCards();
            if (configCards && configCards.length > 0) {
                return configCards;
            }
        } catch (error) {
            console.warn('⚠️ Ошибка получения карт из конфигурации:', error);
        }
    }
    
    // Fallback набор карт
    return [
        {
            name: "Звезда",
            symbol: "🌟",
            interpretation: "Карта надежды и вдохновения. Время для осуществления мечтаний."
        },
        {
            name: "Солнце",
            symbol: "☀️",
            interpretation: "Символ радости и успеха. Впереди светлые времена."
        },
        {
            name: "Луна",
            symbol: "🌙",
            interpretation: "Карта интуиции и тайн. Доверьтесь внутреннему голосу."
        },
        {
            name: "Маг",
            symbol: "🧙",
            interpretation: "Вы обладаете силой для новых начинаний."
        },
        {
            name: "Императрица",
            symbol: "👸",
            interpretation: "Период творчества и плодородия. Время для создания нового."
        },
        {
            name: "Император",
            symbol: "👑",
            interpretation: "Сила и стабильность. Вы контролируете ситуацию."
        },
        {
            name: "Влюбленные",
            symbol: "💕",
            interpretation: "Важный выбор в отношениях. Слушайте свое сердце."
        },
        {
            name: "Колесо Фортуны",
            symbol: "🎡",
            interpretation: "Перемены неизбежны. Удача поворачивается к вам лицом."
        },
        {
            name: "Справедливость",
            symbol: "⚖️",
            interpretation: "Время для честности и справедливых решений."
        },
        {
            name: "Отшельник",
            symbol: "🕯️",
            interpretation: "Период внутреннего поиска. Мудрость приходит изнутри."
        }
    ];
}

// 📜 ПОЛУЧЕНИЕ ИСТОРИИ ИЗ ЛОКАЛЬНОГО ХРАНИЛИЩА
function getHistoryFromStorage() {
    try {
        const history = localStorage.getItem('tarot_history');
        return history ? JSON.parse(history) : [];
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        return [];
    }
}

// 💾 СОХРАНЕНИЕ В ИСТОРИЮ
function saveToHistory(type, data) {
    try {
        const history = getHistoryFromStorage();
        const newItem = {
            id: Date.now(),
            type: type,
            date: new Date().toLocaleDateString('ru-RU'),
            icon: getHistoryIcon(type),
            preview: data.preview || data.question || 'Гадание',
            card: data.card,
            interpretation: data.interpretation,
            timestamp: Date.now()
        };
        
        history.unshift(newItem);
        
        // Ограничиваем историю 50 записями
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem('tarot_history', JSON.stringify(history));
    } catch (error) {
        console.error('❌ Ошибка сохранения в историю:', error);
    }
}

// 🎭 ПОЛУЧЕНИЕ ИКОНКИ ДЛЯ ТИПА ИСТОРИИ
function getHistoryIcon(type) {
    const icons = {
        'daily': '🌅',
        'question': '❓',
        'spread': '🎴',
        'followup': '🔍'
    };
    return icons[type] || '🔮';
}

// 🔍 ПРОВЕРКА И ПОКАЗ ПРИВЕТСТВИЯ
function checkAndShowWelcome() {
    console.log('🔍 Проверка приветствия...');
    try {
        const hasShownWelcome = localStorage.getItem('tarot_welcome_shown');
        if (!hasShownWelcome && currentUser && currentUser.isAnonymous) {
            // Показать модальное окно приветствия если оно есть
            const welcomeModal = document.getElementById('profile-modal');
            if (welcomeModal) {
                welcomeModal.style.display = 'flex';
                // Небольшая задержка для плавного появления
                setTimeout(() => {
                    welcomeModal.classList.add('show');
                }, 100);
            }
        }
    } catch (error) {
        console.error('❌ Ошибка проверки приветствия:', error);
    }
}

// ================= ПРОФИЛЬ: ФУНКЦИИ =================

// 📋 ОБРАБОТКА ПРОФИЛЯ - ЗАКРЫТИЕ МОДАЛЬНОГО ОКНА
function closeProfileModal() {
    console.log('🚪 Закрытие модального окна профиля...');
    try {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            // Добавляем класс для анимации закрытия
            profileModal.classList.add('hide');
            // Через время анимации скрываем окно
            setTimeout(() => {
                profileModal.style.display = 'none';
                profileModal.classList.remove('show', 'hide');
            }, 300);
            // Отмечаем, что приветствие показано
            localStorage.setItem('tarot_welcome_shown', 'true');
            console.log('✅ Модальное окно профиля закрыто');
        }
    } catch (error) {
        console.error('❌ Ошибка закрытия модального окна:', error);
    }
}

// 📋 ОБРАБОТКА ОТПРАВКИ ФОРМЫ ПРОФИЛЯ
async function handleProfileSubmit(event) {
    event.preventDefault();
    console.log('📋 Обработка отправки формы профиля...');
    try {
        const submitBtn = document.getElementById('save-profile-btn');
        const displayNameInput = document.getElementById('display-name');
        const birthDateInput = document.getElementById('birth-date');
        
        // Показываем состояние загрузки
        if (submitBtn) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span>⏳</span><span>Сохраняем...</span>';
        }
        
        // Получаем данные из формы
        const profileData = {
            displayName: displayNameInput ? displayNameInput.value.trim() : '',
            birthDate: birthDateInput ? birthDateInput.value : '',
            createdAt: new Date().toISOString()
        };
        
        console.log('📝 Данные профиля:', profileData);
        
        // Валидация
        if (!profileData.displayName) {
            showErrorMessage('Пожалуйста, введите ваше имя');
            return;
        }
        
        if (profileData.displayName.length < 2) {
            showErrorMessage('Имя должно содержать не менее 2 символов');
            return;
        }
        
        // Сохраняем данные локально
        saveUserData(profileData);
        
        // Обновляем глобальные данные пользователя
        if (currentUser) {
            currentUser.displayName = profileData.displayName;
            currentUser.birthDate = profileData.birthDate;
            currentUser.isAnonymous = false;
        }
        
        // Пытаемся сохранить в Supabase (если доступен)
        try {
            if (supabase && currentUser && currentUser.id) {
                console.log('💾 Сохранение профиля в Supabase...');
                // Здесь можно добавить сохранение в Supabase
            }
        } catch (supabaseError) {
            console.warn('⚠️ Не удалось сохранить в Supabase:', supabaseError);
        }
        
        // Показываем сообщение об успехе
        showMessage(`Добро пожаловать, ${profileData.displayName}! 🎉`, 'success');
        
        // Закрываем модальное окно
        setTimeout(() => {
            closeProfileModal();
        }, 1000);
        
        console.log('✅ Профиль успешно сохранен');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения профиля:', error);
        showErrorMessage('Произошла ошибка при сохранении профиля');
    } finally {
        // Убираем состояние загрузки
        const submitBtn = document.getElementById('save-profile-btn');
        if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>✨</span><span>Начать гадание</span>';
        }
    }
}

// 📋 ОБРАБОТКА КНОПКИ "ПРОПУСТИТЬ"
function handleProfileSkip() {
    console.log('⏭️ Пропуск заполнения профиля...');
    try {
        // Показываем сообщение
        showMessage('Вы можете заполнить профиль позже в настройках', 'info');
        // Закрываем модальное окно
        closeProfileModal();
        console.log('✅ Профиль пропущен');
    } catch (error) {
        console.error('❌ Ошибка при пропуске профиля:', error);
    }
}

// 🎛️ НАСТРОЙКА ОБРАБОТЧИКОВ ПРОФИЛЯ
function setupProfileEventListeners() {
    console.log('🎛️ Настройка обработчиков профиля...');
    try {
        // Форма профиля
        const profileForm = document.getElementById('profile-form');
        if (profileForm) {
            profileForm.removeEventListener('submit', handleProfileSubmit);
            profileForm.addEventListener('submit', handleProfileSubmit);
        }
        
        // Кнопка "Начать гадание"
        const saveProfileBtn = document.getElementById('save-profile-btn');
        if (saveProfileBtn) {
            saveProfileBtn.removeEventListener('click', handleProfileClick);
            saveProfileBtn.addEventListener('click', handleProfileClick);
        }
        
        // Кнопка "Пропустить"
        const skipProfileBtn = document.getElementById('skip-profile-btn');
        if (skipProfileBtn) {
            skipProfileBtn.removeEventListener('click', handleProfileSkip);
            skipProfileBtn.addEventListener('click', handleProfileSkip);
        }
        
        // Закрытие по клику на оверлей
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) {
            profileModal.removeEventListener('click', handleModalOverlayClick);
            profileModal.addEventListener('click', handleModalOverlayClick);
        }
        
        console.log('✅ Обработчики профиля настроены');
    } catch (error) {
        console.error('❌ Ошибка настройки обработчиков профиля:', error);
    }
}

// 🖱️ ОБРАБОТЧИК КЛИКА ПО КНОПКЕ ПРОФИЛЯ
function handleProfileClick(event) {
    // Если это не submit формы, вызываем обработчик вручную
    if (event.target.type !== 'submit') {
        event.preventDefault();
        handleProfileSubmit(event);
    }
}

// 🖱️ ОБРАБОТЧИК КЛИКА ПО ОВЕРЛЕЮ МОДАЛЬНОГО ОКНА
function handleModalOverlayClick(event) {
    // Закрываем только если клик был именно на оверлей, а не на контент
    if (event.target === event.currentTarget) {
        handleProfileSkip();
    }
}

// 🔔 ПОКАЗАТЬ СООБЩЕНИЕ
function showMessage(message, type = 'info') {
    console.log(`🔔 Сообщение (${type}):`, message);
    
    try {
        // Создаем элемент сообщения
        const messageDiv = document.createElement('div');
        messageDiv.className = `app-message app-message-${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : type === 'success' ? '#10b981' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            max-width: 90%;
            text-align: center;
            font-size: 14px;
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        // Убираем сообщение через 3 секунды
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 3000);
        
    } catch (error) {
        console.error('❌ Ошибка показа сообщения:', error);
    }
}

// ❌ ПОКАЗАТЬ СООБЩЕНИЕ ОБ ОШИБКЕ
function showErrorMessage(message) {
    showMessage(message, 'error');
}

// 💾 ФУНКЦИИ СОХРАНЕНИЯ/ЗАГРУЗКИ ДАННЫХ
function saveUserData(userData) {
    try {
        localStorage.setItem('tarot_user_data', JSON.stringify(userData));
    } catch (error) {
        console.error('❌ Ошибка сохранения данных пользователя:', error);
    }
}

function loadUserData() {
    try {
        const data = localStorage.getItem('tarot_user_data');
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('❌ Ошибка загрузки данных пользователя:', error);
        return null;
    }
}

function saveAppState() {
    try {
        const stateToSave = {
            questionsLeft: appState.questionsLeft,
            isPremium: appState.isPremium,
            dailyCardUsed: appState.dailyCardUsed,
            lastCardDate: new Date().toDateString(),
            currentTab: appState.currentTab
        };
        localStorage.setItem('tarot_app_state', JSON.stringify(stateToSave));
    } catch (error) {
        console.error('❌ Ошибка сохранения состояния:', error);
    }
}

function loadAppState() {
    try {
        const data = localStorage.getItem('tarot_app_state');
        if (data) {
            const savedState = JSON.parse(data);
            // Проверяем, не новый ли день для сброса карты дня
            const today = new Date().toDateString();
            if (savedState.lastCardDate !== today) {
                savedState.dailyCardUsed = false;
            }
            return savedState;
        }
        return null;
    } catch (error) {
        console.error('❌ Ошибка загрузки состояния:', error);
        return null;
    }
}

// 🔧 ОТЛАДОЧНЫЕ ФУНКЦИИ
function debugApp() {
    console.log('🔧 Состояние приложения:', {
        appState: appState,
        currentUser: currentUser,
        supabaseInitialized: supabaseInitialized,
        isInitializing: isInitializing,
        configReady: window.isConfigReady ? window.isConfigReady() : false
    });
}

// 🌟 ЭКСПОРТ В ГЛОБАЛЬНУЮ ОБЛАСТЬ
window.tarotApp = {
    initApp,
    switchTab,
    appState,
    currentUser,
    updateUI,
    handleDailyCardClick,
    handleAskQuestion,
    showMessage,
    showErrorMessage,
    debugApp,
    saveAppState,
    getRandomCard,
    getFallbackCards,
    saveToHistory,
    loadHistoryData
};

// 🏁 АВТОМАТИЧЕСКИЙ ЗАПУСК
let appStarted = false;

document.addEventListener('DOMContentLoaded', function() {
    if (appStarted) {
        console.log('⚠️ Приложение уже запущено');
        return;
    }
    
    console.log('🏁 DOM готов, запускаю приложение...');
    appStarted = true;
    
    // Небольшая задержка для загрузки всех ресурсов
    setTimeout(() => {
        initApp();
    }, 100);
});

// Дополнительная проверка если DOM уже готов
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(() => {
        if (!appStarted) {
            console.log('🏁 DOM уже готов, запускаю приложение...');
            appStarted = true;
            initApp();
        }
    }, 50);
}

console.log('✅ Script.js загружен полностью');)
