// script.js - Исправленная версия с рабочими табами и корректной инициализацией
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (инициализация в config.js или в функциях init)
let currentUser = null; // Будет заполнен из initTelegramUser
let appState = {
    currentTab: 'daily',
    questionsLeft: 3, // Будет перезаписано из данных пользователя
    isPremium: false  // Будет перезаписано из данных пользователя
};

// 🚀 ГЛАВНАЯ ФУНКЦИЯ ИНИЦИАЛИЗАЦИИ ПРИЛОЖЕНИЯ
async function initApp() {
    try {
        console.log('🔮 Инициализация Tarot Web App...');

        // 1. Убедиться, что Supabase-библиотека загружена и клиент инициализирован
        //    (Supabase клиент теперь инициализируется в initSupabase() в supabase-functions.js)
        await ensureSupabaseLibrary(); // Убеждаемся, что window.supabase доступен
        // Теперь client.js будет вызывать initSupabase() из supabase-functions.js

        // 2. Инициализация Telegram WebApp
        initTelegramWebApp();

        // 3. Инициализация пользователя (через supabase-functions.js)
        //    ЭТОТ ВЫЗОВ ТЕПЕРЬ ОТВЕЧАЕТ ЗА ПОЛУЧЕНИЕ currentUser И ОБНОВЛЕНИЕ appState
        currentUser = await initTelegramUser(); // Вызов функции из supabase-functions.js
        
        if (currentUser) {
            console.log('✅ Пользовательский профиль загружен/создан.');
            // appState.questionsLeft и appState.isPremium должны быть уже обновлены в initTelegramUser()
            // через window.appState и window.updateUI()
            updateUI(); // Обновляем UI после получения данных пользователя
        } else {
            console.warn('⚠️ Не удалось инициализировать пользователя. Работаем в гостевом режиме.');
            // Если пользователь не инициализирован (например, нет Telegram ID),
            // оставляем appState по умолчанию или загружаем из localStorage
            const localData = localStorage.getItem('tarot_user_data');
            if (localData) {
                const parsedData = JSON.parse(localData);
                appState.questionsLeft = parsedData.questionsLeft || APP_CONFIG.freeQuestionsLimit;
                appState.isPremium = parsedData.isPremium || false;
            }
            updateUI(); // Обновляем UI с текущим (возможно, дефолтным) состоянием
        }
        
        // 4. Настройка обработчиков событий для табов (должны быть готовы до показа окна)
        setupTabEventListeners();

        // 5. Показ приветственного экрана для новых пользователей
        checkAndShowWelcome();

        // 6. Настройка других обработчиков событий
        setupOtherEventListeners();
        
        console.log('✅ Приложение успешно инициализировано');

    } catch (error) {
        console.error('❌ Ошибка инициализации приложения:', error);
        showErrorMessage('Ошибка загрузки приложения. Перезагрузите страницу.');
    }
}

// 🔗 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ ДЛЯ ТАБОВ
function setupTabEventListeners() {
    console.log('🔗 Настройка обработчиков табов...');

    const navTabs = document.querySelectorAll('.nav-tab');

    if (navTabs.length === 0) {
        console.error('❌ Табы не найдены в DOM');
        return;
    }

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

        appState.currentTab = tabName;

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });

        const currentTabElement = document.querySelector(`[data-tab="${tabName}"]`);
        if (currentTabElement) {
            currentTabElement.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
            content.style.display = 'none';
        });

        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
            targetContent.style.display = 'block';
        } else {
            console.warn(`⚠️ Контент для таба ${tabName} не найден`);
        }

        handleTabSpecificLogic(tabName);

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
    checkTodayCard(); // Вызов функции для проверки карты дня
}

// ❓ ЛОГИКА ТАБА "ВОПРОС"
function handleQuestionTab() {
    console.log('❓ Обработка таба "Вопрос"');
    updateQuestionsCounter();
    // Показываем/скрываем баннер подписки, если вопросов не осталось
    const subscriptionBanner = document.getElementById('subscription-banner-question');
    if (subscriptionBanner) {
        if (!appState.isPremium && appState.questionsLeft <= 0) {
            subscriptionBanner.style.display = 'block';
        } else {
            subscriptionBanner.style.display = 'none';
        }
    }
    // Скрываем уточняющий вопрос и ответ при переходе на вкладку
    document.getElementById('follow-up-section').style.display = 'none';
    document.getElementById('followup-answer-section').style.display = 'none';
    document.getElementById('first-answer-section').style.display = 'none';
}

// 🃏 ЛОГИКА ТАБА "РАСКЛАДЫ"
function handleSpreadsTab() {
    console.log('🃏 Обработка таба "Расклады"');
    // Проверяем Premium статус для доступа к раскладам
    if (!appState.isPremium) {
        showPremiumRequired('spreads'); // Передаем, откуда пришел запрос
    }
    // Скрываем детали расклада при переходе на вкладку
    document.getElementById('spread-detail').style.display = 'none';
    document.querySelectorAll('.spreads-grid .spread-card').forEach(card => card.style.display = 'block');
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
    // Логика отображения Premium возможностей - уже на странице Premium
}

// 📱 ИНИЦИАЛИЗАЦИЯ TELEGRAM WEBAPP
function initTelegramWebApp() {
    console.log('📱 Инициализация Telegram WebApp...');

    try {
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;

            tg.ready();
            tg.expand();
            tg.enableClosingConfirmation();

            document.documentElement.style.setProperty('--tg-theme-bg-color', tg.backgroundColor || '#1a1a2e');
            document.documentElement.style.setProperty('--tg-theme-text-color', tg.textColor || '#ffffff');
            
            // Здесь мы больше не устанавливаем currentUser, это делает initTelegramUser из supabase-functions.js
            console.log('✅ Telegram WebApp инициализирован');
        } else {
            console.warn('⚠️ Telegram WebApp недоступен (возможно, запуск вне Telegram)');
            // Для локального тестирования вне Telegram:
            // Создаем фиктивный объект Telegram WebApp
            window.Telegram = {
                WebApp: {
                    initDataUnsafe: {
                        user: {
                            id: 'test_user_id_123', // Используем UUID
                            first_name: 'Тест',
                            last_name: 'Пользователь',
                            username: 'testuser',
                            language_code: 'ru'
                        }
                    },
                    ready: () => console.log('Mock Telegram WebApp ready.'),
                    expand: () => console.log('Mock Telegram WebApp expanded.'),
                    enableClosingConfirmation: () => console.log('Mock Telegram WebApp closing confirmation enabled.'),
                    showAlert: (message) => { // Исправляем showPopup ошибку
                        console.log(`[Mock Telegram WebApp ALERT]: ${message}`);
                        alert(message); // Используем обычный alert для ПК
                    },
                    backgroundColor: '#1a1a2e',
                    textColor: '#ffffff'
                }
            };
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Telegram WebApp:', error);
    }
}

// 🗄️ ИНИЦИАЛИЗАЦИЯ SUPABASE (ЭТА ФУНКЦИЯ ТЕПЕРЬ НАХОДИТСЯ В supabase-functions.js)
// Её вызов происходит из initTelegramUser() или напрямую из других функций,
// если supabase-functions.js экспортирует initSupabase.
// Убедимся, что supabase-functions.js инициализирует глобальный объект supabase
async function ensureSupabaseLibrary() {
    // Проверяем, загружена ли библиотека Supabase
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
        console.log('✅ Библиотека Supabase уже загружена');
        return true;
    }

    console.log('📚 Загружаю библиотеку Supabase...');

    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/dist/umd/supabase.min.js';
        script.async = true;

        script.onload = () => {
            console.log('✅ Библиотека Supabase загружена');
            // После загрузки библиотеки, вызываем initSupabase из supabase-functions.js
            if (typeof window.initSupabase === 'function') { // Предполагаем, что initSupabase глобально доступен
                const supabaseClientReady = window.initSupabase();
                if (supabaseClientReady) {
                    console.log('✅ Supabase клиент инициализирован через supabase-functions.js');
                    resolve(true);
                } else {
                    console.error('❌ Не удалось инициализировать Supabase клиент через supabase-functions.js');
                    resolve(false);
                }
            } else {
                console.warn('⚠️ Функция initSupabase не найдена глобально. Проверьте supabase-functions.js');
                resolve(false);
            }
        };

        script.onerror = () => {
            console.error('❌ Не удалось загрузить библиотеку Supabase');
            resolve(false);
        };

        document.head.appendChild(script);

        setTimeout(() => {
            resolve(false);
        }, 10000); // Таймаут на случай зависания
    });
}


// 🎨 ОБНОВЛЕНИЕ ИНТЕРФЕЙСА (сделаем её глобальной для доступа из supabase-functions.js)
window.updateUI = function() { // Делаем глобальной
    console.log('🎨 Обновление UI...');
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
    console.log('✅ UI обновлен.');
}

// 🔧 НАСТРОЙКА ДРУГИХ ОБРАБОТЧИКОВ СОБЫТИЙ
function setupOtherEventListeners() {
    console.log('🔧 Настройка дополнительных обработчиков событий...');

    // Обработчик кнопки задать вопрос
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', handleAskQuestion);
    }
    // Обработчик кнопки уточняющего вопроса
    const followUpBtn = document.getElementById('follow-up-btn');
    if (followUpBtn) {
        followUpBtn.addEventListener('click', handleFollowUpQuestion);
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

    // Обработчики для карточек раскладов
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            const spreadType = this.getAttribute('data-spread');
            selectSpread(spreadType);
        });
    });

    // Обработчики кнопок баннеров
    document.querySelectorAll('.banner-buttons .btn').forEach(button => {
        button.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            if (tab) switchTab(tab);
        });
    });

    // Обработчик отправки отзыва
    const submitReviewBtn = document.getElementById('submit-review-btn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', handleSubmitReview);
    }

    // Обработчик звезд рейтинга
    const ratingStars = document.getElementById('rating-stars');
    if (ratingStars) {
        ratingStars.addEventListener('click', handleRatingClick);
    }

    // Обработчики для модального окна профиля (если есть)
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const skipProfileBtn = document.getElementById('skip-profile-btn');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    if (skipProfileBtn) {
        skipProfileBtn.addEventListener('click', skipProfile);
    }

    // Добавляем обработчики для открытия детальной истории (нужно добавить модальное окно в index.html)
    const historyList = document.getElementById('history-list');
    if (historyList) {
        historyList.addEventListener('click', function(event) {
            const historyItem = event.target.closest('.history-item');
            if (historyItem) {
                const historyItemId = historyItem.dataset.id;
                const historyItemType = historyItem.dataset.type;
                if (historyItemId && historyItemType) {
                    showHistoryDetail(historyItemId, historyItemType);
                }
            }
        });
    }

    console.log('✅ Дополнительные обработчики настроены.');
}

// ГЛОБАЛЬНАЯ КАРТОЧКА ДНЯ
let currentDailyCard = null;

// 🃏 ОБРАБОТЧИКИ ИГРОВОЙ ЛОГИКИ
async function handleAskQuestion() {
    console.log('❓ Обработка вопроса...');

    const questionInput = document.getElementById('question-input');
    if (!questionInput) return;

    const question = questionInput.value.trim();
    if (!question) {
        showErrorMessage('Пожалуйста, введите вопрос');
        return;
    }

    if (!currentUser) {
        showErrorMessage('Не удалось идентифицировать пользователя. Попробуйте перезагрузить приложение или обратиться в поддержку.');
        return;
    }

    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showPremiumRequired('question');
        return;
    }

    // Отключаем кнопку и показываем лоадер
    const askBtn = document.getElementById('ask-btn');
    askBtn.disabled = true;
    document.getElementById('question-loading').style.display = 'block';

    try {
        // Показываем контейнер ответа
        document.getElementById('first-answer-section').style.display = 'block';
        document.getElementById('first-ai-container').innerHTML = `<div class="ai-prediction"><div class="ai-header"><span class="ai-icon">🤖</span><div class="ai-title">ИИ-толкование</div></div><div class="ai-content generating-text">${APP_CONFIG.texts.loading}</div></div>`;

        // Вытягиваем одну карту
        const drawnCards = drawRandomCards(1);
        const card = drawnCards[0];
        const isReversed = Math.random() < 0.5; // Случайный разворот

        // Обновляем UI карты
        const answerCardElement = document.getElementById('answer-card');
        answerCardElement.innerHTML = `
            <div class="card-name">${card.name} ${isReversed ? ' (перевернутая)' : ''}</div>
            <img src="${isReversed ? card.imageReversed || card.image : card.imageUpright || card.image}" alt="${card.name}" class="card-image">
            <div class="card-meaning">${isReversed ? card.meaningReversed : card.meaningUpright}</div>
        `;
        answerCardElement.classList.add('flipped');

        // Получаем ИИ-предсказание
        const aiPrediction = await sendPredictionToN8N(currentUser.user_id, question, [{...card, isReversed}], 'question');
        document.getElementById('first-ai-container').innerHTML = `
            <div class="ai-prediction">
                <div class="ai-header"><span class="ai-icon">🤖</span><div class="ai-title">ИИ-толкование</div></div>
                <div class="ai-content">${aiPrediction}</div>
            </div>
        `;

        // Сохраняем сессию вопроса
        await saveCompleteQuestionSession(currentUser.user_id, question, [{card: card, isReversed: isReversed}], aiPrediction, 'question');

        if (!appState.isPremium) {
            appState.questionsLeft--;
            updateQuestionsCounter();
        }

        questionInput.value = ''; // Очищаем поле ввода
        document.getElementById('question-loading').style.display = 'none';
        askBtn.disabled = false;

        // Показываем блок уточняющего вопроса
        document.getElementById('follow-up-section').style.display = 'block';

    } catch (error) {
        console.error('❌ Ошибка при обработке вопроса:', error);
        showErrorMessage('Произошла ошибка при получении ответа. Попробуйте позже.');
        document.getElementById('question-loading').style.display = 'none';
        askBtn.disabled = false;
    }
}

async function handleFollowUpQuestion() {
    console.log('❓ Обработка уточняющего вопроса...');

    const followUpInput = document.getElementById('follow-up-input');
    if (!followUpInput) return;

    const followUpQuestion = followUpInput.value.trim();
    if (!followUpQuestion) {
        showErrorMessage('Пожалуйста, введите уточняющий вопрос');
        return;
    }

    if (!currentUser) {
        showErrorMessage('Не удалось идентифицировать пользователя. Попробуйте перезагрузить приложение или обратиться в поддержку.');
        return;
    }

    if (!appState.isPremium && appState.questionsLeft <= 0) {
        showPremiumRequired('question');
        return;
    }

    const followUpBtn = document.getElementById('follow-up-btn');
    followUpBtn.disabled = true;
    document.getElementById('followup-loading').style.display = 'block';

    try {
        document.getElementById('followup-answer-section').style.display = 'block';
        document.getElementById('followup-ai-container').innerHTML = `<div class="ai-prediction"><div class="ai-header"><span class="ai-icon">🤖</span><div class="ai-title">ИИ-толкование</div></div><div class="ai-content generating-text">${APP_CONFIG.texts.loading}</div></div>`;

        const drawnCards = drawRandomCards(1);
        const card = drawnCards[0];
        const isReversed = Math.random() < 0.5;

        const followupAnswerCardElement = document.getElementById('followup-answer-card');
        followupAnswerCardElement.innerHTML = `
            <div class="card-name">${card.name} ${isReversed ? ' (перевернутая)' : ''}</div>
            <img src="${isReversed ? card.imageReversed || card.image : card.imageUpright || card.image}" alt="${card.name}" class="card-image">
            <div class="card-meaning">${isReversed ? card.meaningReversed : card.meaningUpright}</div>
        `;
        followupAnswerCardElement.classList.add('flipped');

        const aiPrediction = await sendPredictionToN8N(currentUser.user_id, followUpQuestion, [{...card, isReversed}], 'follow_up');
        document.getElementById('followup-ai-container').innerHTML = `
            <div class="ai-prediction">
                <div class="ai-header"><span class="ai-icon">🤖</span><div class="ai-title">ИИ-толкование</div></div>
                <div class="ai-content">${aiPrediction}</div>
            </div>
        `;

        await saveCompleteQuestionSession(currentUser.user_id, followUpQuestion, [{card: card, isReversed: isReversed}], aiPrediction, 'follow_up');

        if (!appState.isPremium) {
            appState.questionsLeft--;
            updateQuestionsCounter();
        }

        followUpInput.value = '';
        document.getElementById('followup-loading').style.display = 'none';
        followUpBtn.disabled = false;

    } catch (error) {
        console.error('❌ Ошибка при обработке уточняющего вопроса:', error);
        showErrorMessage('Произошла ошибка при получении уточняющего ответа. Попробуйте позже.');
        document.getElementById('followup-loading').style.display = 'none';
        followUpBtn.disabled = false;
    }
}


async function handleDailyCardClick() {
    console.log('📅 Обработка клика по карте дня...');

    if (!currentUser) {
        showErrorMessage('Для получения карты дня необходима инициализация пользователя. Попробуйте перезагрузить приложение.');
        return;
    }

    const dailyCardElement = document.getElementById('daily-card');
    const dailyLoadingElement = document.getElementById('daily-loading');
    dailyCardElement.classList.add('loading-state');
    dailyLoadingElement.style.display = 'block';

    try {
        const existingCard = await getTodayDailyCard(currentUser.user_id);

        if (existingCard) {
            currentDailyCard = existingCard.card_data;
            const aiPrediction = existingCard.ai_prediction;
            
            console.log('✅ Карта дня уже была вытянута сегодня.');
            renderDailyCard(currentDailyCard, aiPrediction);
            dailyLoadingElement.style.display = 'none';
            dailyCardElement.classList.remove('loading-state');
            return;
        }

        const drawnCard = drawRandomCards(1)[0];
        const isReversed = Math.random() < 0.5;
        const cardData = {...drawnCard, isReversed: isReversed}; // Сохраняем состояние перевернутости

        // Получаем ИИ-предсказание перед сохранением
        const aiPrediction = await sendPredictionToN8N(currentUser.user_id, 'Карта дня', [cardData], 'daily');

        await saveCompleteDailyCardSession(currentUser.user_id, cardData, aiPrediction); // В supabase-functions.js есть функция, принимающая AI-предсказание

        currentDailyCard = cardData; // Обновляем глобальную переменную
        renderDailyCard(currentDailyCard, aiPrediction);

    } catch (error) {
        console.error('❌ Ошибка при вытягивании карты дня:', error);
        showErrorMessage('Не удалось получить карту дня. Попробуйте еще раз.');
    } finally {
        dailyLoadingElement.style.display = 'none';
        dailyCardElement.classList.remove('loading-state');
    }
}

// 📅 РЕНДЕРИНГ КАРТЫ ДНЯ
function renderDailyCard(card, aiPrediction) {
    const dailyCardElement = document.getElementById('daily-card');
    const dailyAiContainer = document.getElementById('daily-ai-container');
    const dailyInfoBanner = document.getElementById('daily-info-banner');

    if (!dailyCardElement || !dailyAiContainer || !dailyInfoBanner) {
        console.error('Элементы UI для карты дня не найдены.');
        return;
    }

    dailyCardElement.classList.add('flipped');
    dailyCardElement.innerHTML = `
        <div class="card-name">${card.name} ${card.isReversed ? ' (перевернутая)' : ''}</div>
        <img src="${card.isReversed ? card.imageReversed || card.image : card.imageUpright || card.image}" alt="${card.name}" class="card-image">
        <div class="card-meaning">${card.isReversed ? card.meaningReversed : card.meaningUpright}</div>
    `;

    // Показываем ИИ-толкование
    dailyAiContainer.innerHTML = `
        <div class="ai-prediction">
            <div class="ai-header"><span class="ai-icon">🤖</span><div class="ai-title">ИИ-толкование</div></div>
            <div class="ai-content">${aiPrediction || 'Толкование не предоставлено.'}</div>
        </div>
    `;
    dailyAiContainer.style.display = 'block';
    dailyInfoBanner.style.display = 'flex'; // Показываем баннер

    // Добавляем клик по карте, чтобы показывать/скрывать AI-толкование
    dailyCardElement.onclick = () => {
        dailyAiContainer.style.display = dailyAiContainer.style.display === 'none' ? 'block' : 'none';
    };
}


async function checkTodayCard() {
    console.log('📅 Проверка карты дня...');
    if (!currentUser) {
        console.warn('⚠️ Пользователь не инициализирован, не могу проверить карту дня.');
        document.getElementById('daily-loading').style.display = 'none';
        document.getElementById('daily-card').classList.remove('loading-state');
        return;
    }
    
    const existingCard = await getTodayDailyCard(currentUser.user_id);
    if (existingCard) {
        console.log('✅ Карта дня на сегодня уже есть, отображаю...');
        currentDailyCard = existingCard.card_data;
        renderDailyCard(currentDailyCard, existingCard.ai_prediction);
    } else {
        console.log('⏳ Карты дня на сегодня нет. Ожидаю вытягивания...');
        // Скрываем AI-контейнер и показываем бэк карты
        document.getElementById('daily-ai-container').style.display = 'none';
        document.getElementById('daily-info-banner').style.display = 'none';
        const dailyCardElement = document.getElementById('daily-card');
        dailyCardElement.classList.remove('flipped');
        dailyCardElement.innerHTML = `
            <div class="card-back">
                <div class="card-symbol">🔮</div>
                <div class="card-text">Нажмите, чтобы<br>узнать карту дня</div>
            </div>
        `;
    }
}


function drawRandomCards(count) {
    const allCards = window.ALL_TAROT_CARDS || window.FALLBACK_CARDS;
    if (!allCards || allCards.length === 0) {
        console.error('❌ Карты Таро не загружены!');
        throw new Error('Карты Таро не загружены');
    }

    const shuffled = allCards.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 📚 ЗАГРУЗКА ИСТОРИИ ПОЛЬЗОВАТЕЛЯ
async function loadUserHistory() {
    console.log('📖 Загрузка истории пользователя...');
    const historyListElement = document.getElementById('history-list');
    if (!historyListElement) return;

    historyListElement.innerHTML = ''; // Очищаем историю

    if (!currentUser) {
        historyListElement.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">⚠️</div>
                <p>Не удалось загрузить историю. Пользователь не идентифицирован.</p>
            </div>
        `;
        console.warn('⚠️ Пользователь не идентифицирован, история недоступна.');
        return;
    }

    try {
        const history = await getUserHistory(currentUser.user_id, APP_CONFIG.maxHistoryItems);

        if (history.length === 0) {
            historyListElement.innerHTML = `
                <div class="empty-history">
                    <div class="empty-icon">🔮</div>
                    <p>Здесь будет храниться история ваших раскладов</p>
                </div>
            `;
            return;
        }

        let currentGroupDate = '';
        history.forEach(item => {
            const itemDate = new Date(item.created_at).toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            if (itemDate !== currentGroupDate) {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'history-date-header';
                dateHeader.textContent = itemDate;
                historyListElement.appendChild(dateHeader);
                currentGroupDate = itemDate;
            }

            const itemElement = document.createElement('div');
            itemElement.className = 'history-item';
            itemElement.dataset.id = item.id;
            itemElement.dataset.type = item.type; // 'daily', 'question', 'spread'

            let typeText = '';
            let mainText = '';
            let cardsHtml = '';
            let icon = '📖';

            if (item.type === 'daily') {
                typeText = 'Карта дня';
                icon = '☀️';
                const card = item.card_data;
                mainText = card.name + (card.isReversed ? ' (перевернутая)' : '');
                cardsHtml = `<div class="history-mini-card">${card.symbol || '🔮'} ${card.name}</div>`;
            } else if (item.type === 'question' && item.tarot_answers && item.tarot_answers.length > 0) {
                typeText = 'Вопрос';
                icon = '❓';
                mainText = item.question_text;
                item.tarot_answers.forEach(answer => {
                    if (answer.cards_drawn && answer.cards_drawn.length > 0) {
                        answer.cards_drawn.forEach(cardData => {
                            const card = cardData.card;
                            cardsHtml += `<div class="history-mini-card">${card.symbol || '🔮'} ${card.name}</div>`;
                        });
                    }
                });
            } else if (item.type === 'spread') {
                typeText = `Расклад: ${item.spread_name}`;
                icon = '🃏';
                mainText = item.question || 'Без вопроса';
                if (item.cards_data && item.cards_data.length > 0) {
                    item.cards_data.forEach(cardPos => {
                        const card = cardPos.card;
                        cardsHtml += `<div class="history-mini-card">${card.symbol || '🔮'} ${card.name}</div>`;
                    });
                }
            } else {
                return; // Пропускаем некорректные записи
            }

            itemElement.innerHTML = `
                <div class="history-header">
                    <div class="history-type">${icon} ${typeText}</div>
                    <div class="history-time">${new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div class="history-question">"${mainText}"</div>
                <div class="history-cards">${cardsHtml}</div>
            `;
            historyListElement.appendChild(itemElement);
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        historyListElement.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">😔</div>
                <p>Произошла ошибка при загрузке истории. Попробуйте позже.</p>
            </div>
        `;
    }
}

async function showHistoryDetail(id, type) {
    console.log(`Показ детали истории: ID=${id}, Тип=${type}`);
    if (!currentUser) {
        showErrorMessage('Пользователь не идентифицирован для показа истории.');
        return;
    }

    let detailItem = null;
    try {
        if (type === 'daily') {
            const { data, error } = await supabase.from(TABLES.dailyCards).select('*').eq('id', id).single();
            if (error) throw error;
            detailItem = data;
        } else if (type === 'question') {
            const { data, error } = await supabase.from(TABLES.questions).select(`*, tarot_answers(*)`).eq('id', id).single();
            if (error) throw error;
            detailItem = data;
        } else if (type === 'spread') {
            const { data, error } = await supabase.from(TABLES.spreads).select('*').eq('id', id).single();
            if (error) throw error;
            detailItem = data;
        }

        if (!detailItem) {
            showErrorMessage('Запись истории не найдена.');
            return;
        }

        // Создаем модальное окно динамически
        const modal = document.createElement('div');
        modal.className = 'history-modal';
        modal.innerHTML = `
            <div class="history-modal-content">
                <div class="history-modal-header">
                    <h3>Детали предсказания</h3>
                    <button class="history-modal-close">✖</button>
                </div>
                <div class="history-modal-body">
                    <div class="history-detail-date">${new Date(detailItem.created_at).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    
                    ${detailItem.question_text ? `
                    <div class="history-detail-question">
                        <strong>Ваш вопрос:</strong>
                        <p>"${detailItem.question_text}"</p>
                    </div>` : ''}

                    <div class="history-detail-cards">
                        <strong>Выпавшие карты:</strong>
                        ${renderDetailCards(detailItem, type)}
                    </div>

                    ${detailItem.ai_prediction ? `
                    <div class="history-detail-prediction">
                        <strong>ИИ-толкование:</strong>
                        <p>${detailItem.ai_prediction}</p>
                    </div>` : ''}

                    ${detailItem.spread_name ? `
                    <div class="history-detail-spread">
                        <strong>Тип расклада:</strong>
                        <p>${detailItem.spread_name}</p>
                    </div>` : ''}
                </div>
                <div class="history-modal-footer">
                    <button class="btn btn-secondary history-modal-close">Закрыть</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('show'), 10); // Показать с анимацией

        modal.querySelectorAll('.history-modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300); // Удалить после анимации
            });
        });

    } catch (error) {
        console.error('Ошибка при показе деталей истории:', error);
        showErrorMessage('Не удалось загрузить детали предсказания.');
    }
}

function renderDetailCards(item, type) {
    let cards = [];
    if (type === 'daily') {
        cards.push(item.card_data);
    } else if (type === 'question' && item.tarot_answers && item.tarot_answers.length > 0) {
        // Объединяем карты из всех ответов (для основного и уточняющего вопросов)
        item.tarot_answers.forEach(answer => {
            if (answer.cards_drawn) {
                cards = cards.concat(answer.cards_drawn);
            }
        });
    } else if (type === 'spread') {
        cards = item.cards_data;
    }

    return cards.map(cardItem => {
        const card = cardItem.card || cardItem; // Могут быть как {card: {}, isReversed: true} так и просто {}
        const isReversed = cardItem.isReversed || false;
        const positionName = cardItem.position_name || ''; // Для раскладов
        const positionDescription = cardItem.position_description || ''; // Для раскладов

        return `
            <div class="history-detail-card">
                <div class="card-header">
                    <span class="card-symbol-large">${card.symbol || '🔮'}</span>
                    <span class="card-name-large">${card.name} ${isReversed ? ' (перевернутая)' : ''}</span>
                </div>
                ${positionName ? `<div class="card-position-name">${positionName}${positionDescription ? `: ${positionDescription}` : ''}</div>` : ''}
                <div class="card-meaning-detail">
                    ${isReversed ? card.meaningReversed : card.meaningUpright}
                </div>
            </div>
        `;
    }).join('');
}


async function handleClearHistory() {
    console.log('🗑️ Очистка истории...');
    if (!currentUser) {
        showErrorMessage('Не удалось идентифицировать пользователя.');
        return;
    }

    if (confirm('Вы уверены, что хотите очистить всю историю? Это действие необратимо.')) {
        try {
            // Удаляем все записи истории для пользователя
            const { error: dailyError } = await supabase.from(TABLES.dailyCards).delete().eq('user_id', currentUser.user_id);
            const { error: questionsError } = await supabase.from(TABLES.questions).delete().eq('user_id', currentUser.user_id);
            const { error: spreadsError } = await supabase.from(TABLES.spreads).delete().eq('user_id', currentUser.user_id);
            const { error: answersError } = await supabase.from(TABLEs.answers).delete().eq('user_id', currentUser.user_id); // Удаляем ответы тоже

            if (dailyError || questionsError || spreadsError || answersError) {
                throw new Error('Ошибка при очистке данных в базе данных.');
            }

            loadUserHistory(); // Перезагружаем историю после очистки
            showSuccessMessage('История успешно очищена!');

        } catch (error) {
            console.error('❌ Ошибка очистки истории пользователя:', error);
            showErrorMessage('Не удалось очистить историю. Попробуйте позже.');
        }
    }
}


// УПРАВЛЕНИЕ РАСКЛАДАМИ
let selectedSpread = null;

function selectSpread(spreadType) {
    console.log(`Выбран расклад: ${spreadType}`);
    selectedSpread = SPREADS_CONFIG[spreadType];

    if (!selectedSpread) {
        console.error('Неизвестный тип расклада:', spreadType);
        showErrorMessage('Неизвестный расклад. Попробуйте другой.');
        return;
    }

    if (!appState.isPremium) {
        showPremiumRequired('spreads');
        return;
    }

    // Показываем детали расклада и скрываем сетку
    document.querySelectorAll('.spreads-grid .spread-card').forEach(card => card.style.display = 'none');
    
    const spreadDetail = document.getElementById('spread-detail');
    const spreadTitle = document.getElementById('spread-title');
    const spreadCardsContainer = document.getElementById('spread-cards-container');
    const drawSpreadBtn = document.getElementById('draw-spread-btn');

    spreadTitle.textContent = selectedSpread.name;
    spreadCardsContainer.innerHTML = ''; // Очищаем контейнер

    // Создаем слоты для карт
    selectedSpread.positions.forEach((pos, index) => {
        const slot = document.createElement('div');
        slot.className = 'spread-position'; // Добавляем класс для стилизации позиции
        slot.innerHTML = `
            <div class="spread-card-slot" data-index="${index}">
                <div class="card-back">
                    <div class="card-symbol">🔮</div>
                    <div class="card-text">Позиция ${index + 1}</div>
                </div>
            </div>
            <div class="position-label">
                <strong>${pos.name}</strong>
                <small>${pos.description}</small>
            </div>
        `;
        spreadCardsContainer.appendChild(slot);
    });

    // Устанавливаем макет для контейнера карт
    spreadCardsContainer.className = 'spread-cards-container'; // Сбрасываем старые классы макетов
    if (selectedSpread.layout === 'cross') { // Если у расклада есть свойство layout
        spreadCardsContainer.classList.add('spread-layout-cross');
    } else if (selectedSpread.layout === 'celtic') {
        spreadCardsContainer.classList.add('spread-layout-celtic');
    } else if (selectedSpread.layout === 'week') {
        spreadCardsContainer.classList.add('spread-layout-week');
    } else {
        spreadCardsContainer.classList.add('spread-layout-horizontal'); // Дефолтный
    }

    spreadDetail.style.display = 'block';
    drawSpreadBtn.style.display = 'block'; // Показываем кнопку "Сделать расклад"
}

function closeSpread() {
    selectedSpread = null;
    document.getElementById('spread-detail').style.display = 'none';
    document.querySelectorAll('.spreads-grid .spread-card').forEach(card => card.style.display = 'block');
    document.getElementById('spread-cards-container').innerHTML = ''; // Очищаем
    document.getElementById('spread-loading').style.display = 'none';
    document.getElementById('draw-spread-btn').disabled = false;
}

async function drawSpread() {
    console.log('✨ Делаю расклад...');

    if (!selectedSpread) {
        showErrorMessage('Сначала выберите тип расклада.');
        return;
    }

    if (!currentUser) {
        showErrorMessage('Для выполнения расклада необходима инициализация пользователя.');
        return;
    }

    if (!appState.isPremium) {
        showPremiumRequired('spreads');
        return;
    }

    const drawSpreadBtn = document.getElementById('draw-spread-btn');
    const spreadLoading = document.getElementById('spread-loading');
    drawSpreadBtn.disabled = true;
    spreadLoading.style.display = 'block';

    try {
        const questionInput = document.createElement('textarea'); // Создаем временный textarea для вопроса
        questionInput.value = prompt('Введите ваш вопрос для этого расклада (необязательно):');
        const question = questionInput.value.trim();

        const drawnCards = drawRandomCards(selectedSpread.cardCount);
        const cardsWithPositions = [];

        // Анимация раскрытия карт и подготовка данных
        for (let i = 0; i < selectedSpread.cardCount; i++) {
            const card = drawnCards[i];
            const isReversed = Math.random() < 0.5;
            const positionInfo = selectedSpread.positions[i];

            const cardData = {
                card: card,
                isReversed: isReversed,
                position_name: positionInfo.name,
                position_description: positionInfo.description
            };
            cardsWithPositions.push(cardData);

            const cardSlot = document.querySelector(`.spread-card-slot[data-index="${i}"]`);
            if (cardSlot) {
                cardSlot.innerHTML = `
                    <div class="spread-card-revealed">
                        <div class="card-name">${card.name} ${isReversed ? ' (перевернутая)' : ''}</div>
                        <img src="${isReversed ? card.imageReversed || card.image : card.imageUpright || card.image}" alt="${card.name}" class="card-image">
                        <div class="card-meaning">${isReversed ? card.meaningReversed : card.meaningUpright}</div>
                        <div class="position-context">
                            <strong>${positionInfo.name}</strong>
                            <small>${positionInfo.description}</small>
                        </div>
                    </div>
                `;
                cardSlot.classList.add('revealing'); // Добавляем класс для анимации
                await new Promise(resolve => setTimeout(resolve, 300)); // Пауза для анимации
            }
        }

        // Получаем общее ИИ-толкование для всего расклада
        let aiSummary = '';
        if (currentUser) {
            aiSummary = await sendPredictionToN8N(currentUser.user_id, question, cardsWithPositions, selectedSpread.name);
        }

        // Показываем кнопку "Показать интерпретации"
        const interpretationsBtn = document.createElement('button');
        interpretationsBtn.className = 'btn show-interpretations-btn';
        interpretationsBtn.textContent = 'Показать толкования расклада 🤖';
        interpretationsBtn.addEventListener('click', () => showSpreadInterpretationsModal(cardsWithPositions, aiSummary, question));
        document.getElementById('spread-cards-container').appendChild(interpretationsBtn);


        // Сохраняем расклад в Supabase
        await saveSpreadToSupabase(currentUser.user_id, selectedSpread.name, cardsWithPositions, question);

        showSuccessMessage(`Расклад "${selectedSpread.name}" готов!`);

    } catch (error) {
        console.error('❌ Ошибка при выполнении расклада:', error);
        showErrorMessage('Произошла ошибка при создании расклада. Попробуйте позже.');
    } finally {
        spreadLoading.style.display = 'none';
        drawSpreadBtn.disabled = false;
        drawSpreadBtn.style.display = 'none'; // Скрываем кнопку "Сделать расклад" после его выполнения
    }
}

function showSpreadInterpretationsModal(cardsWithPositions, aiSummary, question) {
    const modal = document.createElement('div');
    modal.className = 'interpretations-modal';
    modal.innerHTML = `
        <div class="interpretations-modal-content">
            <div class="interpretations-modal-header">
                <h3>Толкование расклада "${selectedSpread.name}"</h3>
                <button class="interpretations-modal-close">✖</button>
            </div>
            <div class="interpretations-modal-body">
                ${question ? `<div class="spread-question-display"><strong>Ваш вопрос:</strong> "${question}"</div>` : ''}

                ${cardsWithPositions.map(item => `
                    <div class="interpretation-item">
                        <div class="interpretation-card-info">
                            <span class="interpretation-card-symbol">${item.card.symbol || '🔮'}</span>
                            <div class="interpretation-card-details">
                                <h4>${item.card.name} ${item.isReversed ? ' (перевернутая)' : ''}</h4>
                                <p class="position-name">Позиция: ${item.position_name} - ${item.position_description}</p>
                                <p class="card-basic-meaning">Базовое значение: ${item.isReversed ? item.card.meaningReversed : item.card.meaningUpright}</p>
                            </div>
                        </div>
                        <div class="interpretation-text">
                            ${item.ai_prediction || 'Индивидуальное толкование отсутствует.'}
                        </div>
                    </div>
                `).join('')}

                ${aiSummary ? `
                <div class="spread-summary">
                    <h4>Общий совет от карт:</h4>
                    <p>${aiSummary}</p>
                </div>` : ''}

            </div>
            <div class="history-modal-footer">
                <button class="btn btn-secondary interpretations-modal-close">Закрыть</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    modal.querySelectorAll('.interpretations-modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            modal.classList.remove('show');
            setTimeout(() => modal.remove(), 300);
        });
    });
}


// ОТЗЫВЫ
let currentRating = 0;

function handleRatingClick(event) {
    const clickedStar = event.target.closest('.star');
    if (!clickedStar) return;

    const rating = parseInt(clickedStar.dataset.rating);
    currentRating = rating;

    document.querySelectorAll('#rating-stars .star').forEach(star => {
        if (parseInt(star.dataset.rating) <= rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

async function handleSubmitReview() {
    console.log('Отправка отзыва...');
    const reviewText = document.getElementById('review-text').value.trim();
    const isAnonymous = document.getElementById('anonymous-review').checked;

    if (currentRating === 0) {
        showErrorMessage('Пожалуйста, поставьте оценку звездами.');
        return;
    }
    if (!reviewText) {
        showErrorMessage('Пожалуйста, напишите что-нибудь в отзыве.');
        return;
    }

    if (!currentUser) {
        showErrorMessage('Для отправки отзыва необходима инициализация пользователя. Попробуйте перезагрузить приложение.');
        return;
    }

    const submitBtn = document.getElementById('submit-review-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    try {
        await saveReviewToSupabase(currentUser.user_id, currentRating, reviewText, isAnonymous);
        showSuccessMessage('Спасибо за ваш отзыв! Он будет опубликован после модерации.');
        
        // Очищаем форму
        document.getElementById('review-text').value = '';
        document.getElementById('anonymous-review').checked = false;
        currentRating = 0;
        document.querySelectorAll('#rating-stars .star').forEach(star => star.classList.remove('active'));

        loadReviews(); // Перезагружаем отзывы (возможно, ваш новый отзыв не сразу появится, т.к. is_approved=false)
    } catch (error) {
        console.error('Ошибка при отправке отзыва:', error);
        showErrorMessage('Не удалось отправить отзыв. Попробуйте позже.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Отправить отзыв';
    }
}

async function loadReviews() {
    console.log('⭐ Загрузка отзывов...');
    const reviewsListElement = document.getElementById('reviews-list');
    const reviewsTotalElement = document.getElementById('reviews-total');
    if (!reviewsListElement || !reviewsTotalElement) return;

    reviewsListElement.innerHTML = ''; // Очищаем существующие отзывы

    try {
        const reviews = await getApprovedReviews();

        if (reviews.length === 0) {
            reviewsListElement.innerHTML = `
                <div class="empty-history">
                    <div class="empty-icon">🤷‍♀️</div>
                    <p>Пока нет опубликованных отзывов.</p>
                </div>
            `;
            reviewsTotalElement.textContent = '0';
            return;
        }

        reviewsTotalElement.textContent = reviews.length;

        reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            const author = review.is_anonymous ? 'Анонимно' : (review.tarot_user_profiles?.username || review.tarot_user_profiles?.first_name || 'Неизвестно');
            const starsHtml = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const reviewDate = new Date(review.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

            reviewItem.innerHTML = `
                <div class="review-header">
                    <div class="review-author">@${author}</div>
                    <div class="review-rating">${starsHtml}</div>
                    <div class="review-date">${reviewDate}</div>
                </div>
                <div class="review-text">${review.review_text}</div>
            `;
            reviewsListElement.appendChild(reviewItem);
        });

    } catch (error) {
        console.error('❌ Ошибка загрузки отзывов:', error);
        reviewsListElement.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">😔</div>
                <p>Произошла ошибка при загрузке отзывов.</p>
            </div>
        `;
        reviewsTotalElement.textContent = '0';
    }
}


// 🚨 ОБРАБОТКА ОШИБОК И СООБЩЕНИЙ
function showErrorMessage(message) {
    console.error('🚨 Ошибка:', message);
    if (window.Telegram?.WebApp && window.Telegram.WebApp.showAlert) {
        window.Telegram.WebApp.showAlert(message);
    } else {
        alert(message);
    }
}

function showSuccessMessage(message) {
    console.log('✅ Успех:', message);
    if (window.Telegram?.WebApp && window.Telegram.WebApp.showNotification) { // Telegram WebApp notifications
        window.Telegram.WebApp.showNotification({
            message: message,
            type: 'success'
        });
    } else {
        alert(message);
    }
}


function showPremiumRequired(sourceTab = '') {
    console.log(`👑 Требуется Premium (источник: ${sourceTab})`);
    switchTab('premium');
}

// 🎉 ПРИВЕТСТВЕННЫЙ ЭКРАН (профиль пользователя)
function checkAndShowWelcome() {
    // Если пользователь уже видел приветственное окно ИЛИ у него есть имя, не показываем
    const hasSeenWelcome = localStorage.getItem('tarot_seen_welcome_modal');
    if (hasSeenWelcome === 'true' || (currentUser && currentUser.display_name)) { // Предполагаем, что display_name это то, что мы хотим
        console.log('👋 Приветственное окно уже показывалось или имя есть. Пропускаю.');
        return;
    }

    // Показываем модальное окно профиля
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.style.display = 'flex';
        profileModal.classList.add('show');
    } else {
        console.error('❌ Элемент модального окна профиля не найден!');
    }
}

async function saveProfile(event) {
    event.preventDefault();
    console.log('Сохранение профиля...');

    const displayNameInput = document.getElementById('display-name');
    const birthDateInput = document.getElementById('birth-date');

    const displayName = displayNameInput.value.trim();
    const birthDate = birthDateInput.value;

    if (!displayName) {
        showErrorMessage('Пожалуйста, введите ваше имя.');
        return;
    }

    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');

    try {
        if (!currentUser) {
            showErrorMessage('Ошибка: Пользователь не инициализирован для сохранения профиля.');
            return;
        }

        // Обновляем профиль пользователя в Supabase
        await updateUserProfile(currentUser.user_id, {
            display_name: displayName, // Добавим display_name в схему user_profiles
            birth_date: birthDate || null // Если пусто, сохраняем как null
        });

        // Обновляем глобальный объект currentUser
        currentUser.display_name = displayName;
        currentUser.birth_date = birthDate || null;

        localStorage.setItem('tarot_seen_welcome_modal', 'true'); // Отмечаем, что модальное окно показано
        
        showSuccessMessage('Профиль успешно сохранен!');
        closeProfileModal();

    } catch (error) {
        console.error('❌ Ошибка сохранения профиля:', error);
        showErrorMessage('Не удалось сохранить профиль. Попробуйте еще раз.');
    } finally {
        saveBtn.disabled = false;
        saveBtn.classList.remove('loading');
    }
}

function skipProfile() {
    console.log('Пропускаю заполнение профиля.');
    localStorage.setItem('tarot_seen_welcome_modal', 'true');
    closeProfileModal();
}

function closeProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.classList.remove('show');
        profileModal.classList.add('hide'); // Анимация скрытия
        setTimeout(() => {
            profileModal.style.display = 'none';
            profileModal.classList.remove('hide');
        }, 300); // Время анимации
    }
}

// 🌟 ЭКСПОРТ ДЛЯ ОТЛАДКИ И ГЛОБАЛЬНОГО ДОСТУПА
window.tarotApp = {
    switchTab,
    appState,
    currentUser,
    initApp,
    updateUI // Делаем updateUI доступным глобально
};

console.log('📜 Script.js загружен, ожидание DOM...');

// Автоматический запуск app при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    // Убедимся, что config.js уже инициализировался, прежде чем запускать app.
    // initializeConfig в config.js теперь возвращает Promise,
    // так что мы можем дождаться его завершения.
    // Если config.js уже вызывается из index.html, то его initializeConfig()
    // запускается первым. Просто нужно убедиться, что initApp() дождется.
    
    // Проверяем, если initializeConfig уже завершился и установил isConfigReady()
    // Иначе запускаем initApp через небольшую задержку или событие
    const checkConfigAndInit = async () => {
        if (typeof window.isConfigReady === 'function' && window.isConfigReady()) {
            console.log('Конфигурация готова, запускаю initApp()...');
            initApp();
        } else {
            console.warn('Конфигурация еще не готова, откладываю initApp()...');
            // Если config.js еще не успел инициализироваться, ждем
            setTimeout(checkConfigAndInit, 50); // Проверяем каждые 50мс
        }
    };
    checkConfigAndInit();
});
