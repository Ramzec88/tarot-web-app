// script.js - Основная логика Tarot Web App (ИСПРАВЛЕННАЯ ВЕРСИЯ)

// Глобальные переменные
let supabase;
let tg;
let currentUser = null;
let questionsLeft = 3;
let dailyCardDrawn = false;
let isPremium = false;
let history = [];
let currentQuestionId = null;
let selectedRating = 0;
let hasLaunched = false; // Заменяем localStorage
let userName = '';
let userBirthdate = '';

// Инициализация приложения
async function initApp() {
    console.log('🔮 Инициализация Tarot Web App');
    
    try {
        // Инициализация Supabase
        if (typeof window.supabase !== 'undefined' && SUPABASE_CONFIG) {
            supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase инициализирован');
        }
        
        // Инициализация Telegram Web App
        initTelegramWebApp();
        
        // Загрузка пользователя
        await loadCurrentUser();
        
        // Инициализация UI
        initEventListeners();
        
        // Установка начального таба
        switchTab('daily');
        
        // Проверка на первый запуск
        checkFirstLaunch();
        
        console.log('✅ Приложение готово к работе');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        // Fallback для тестирования без Supabase
        initOfflineMode();
        initEventListeners();
        switchTab('daily');
    }
}

// Инициализация Telegram Web App
function initTelegramWebApp() {
    if (window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const user = tg.initDataUnsafe?.user;
        if (user) {
            console.log('👤 Telegram пользователь:', user);
            currentUser = {
                telegram_id: user.id,
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name
            };
        }
        
        tg.MainButton.setText('💳 Купить Premium за 299₽');
        tg.MainButton.onClick(() => {
            if (API_CONFIG && API_CONFIG.paymentUrl) {
                tg.openLink(API_CONFIG.paymentUrl);
            }
        });
        
        tg.setHeaderColor('#1a1a2e');
        tg.setBackgroundColor('#1a1a2e');
        
    } else {
        console.log('🔧 Режим разработки (без Telegram)');
        currentUser = {
            telegram_id: Math.floor(Math.random() * 1000000) + 12345,
            username: 'test_user',
            first_name: 'Test User'
        };
    }
}

// Оффлайн режим для тестирования
function initOfflineMode() {
    console.log('🔧 Запуск в оффлайн режиме');
    currentUser = {
        telegram_id: Math.floor(Math.random() * 1000000) + 12345,
        username: 'test_user',
        first_name: 'Test User'
    };
    updateSubscriptionStatus(false);
}

// Загрузка текущего пользователя
async function loadCurrentUser() {
    if (!currentUser || !supabase) return;
    
    try {
        const { data: existingUser, error } = await supabase
            .from(TABLES.userProfiles)
            .select('*')
            .eq('telegram_id', currentUser.telegram_id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        if (existingUser) {
            currentUser = { ...currentUser, ...existingUser };
            questionsLeft = existingUser.free_questions_left || 0;
            isPremium = existingUser.is_premium && new Date(existingUser.premium_expires_at) > new Date();
            
            const today = new Date().toISOString().split('T')[0];
            dailyCardDrawn = existingUser.daily_card_drawn_date === today;
            
        } else {
            await createNewUser();
        }
        
        updateSubscriptionStatus(isPremium);
        updateQuestionsDisplay();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
    }
}

// Создание нового пользователя
async function createNewUser() {
    try {
        const { data, error } = await supabase
            .from(TABLES.userProfiles)
            .insert([{
                telegram_id: currentUser.telegram_id,
                username: currentUser.username,
                first_name: currentUser.first_name,
                is_premium: false,
                free_questions_left: APP_CONFIG.freeQuestionsLimit
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        currentUser = { ...currentUser, ...data };
        questionsLeft = APP_CONFIG.freeQuestionsLimit;
        isPremium = false;
        
        console.log('✅ Новый пользователь создан');
        
    } catch (error) {
        console.error('❌ Ошибка создания пользователя:', error);
    }
}

// Обновление отображения статуса подписки
function updateSubscriptionStatus(hasPremium) {
    const statusEl = document.getElementById('subscription-status');
    if (!statusEl) return;
    
    isPremium = hasPremium;
    
    if (hasPremium) {
        statusEl.innerHTML = `
            <span class="status-icon">👑</span>
            <span class="status-text">Премиум активен</span>
        `;
        statusEl.classList.add('premium');
        questionsLeft = 999;
        
        if (tg && tg.MainButton) {
            tg.MainButton.hide();
        }
    } else {
        statusEl.innerHTML = `
            <span class="status-icon">🆓</span>
            <span class="status-text">Бесплатная версия</span>
        `;
        statusEl.classList.remove('premium');
        
        if (tg && tg.MainButton) {
            tg.MainButton.show();
        }
    }
}

// Обновление отображения количества вопросов
function updateQuestionsDisplay() {
    const questionsCountEl = document.getElementById('questions-count');
    if (questionsCountEl) {
        questionsCountEl.textContent = isPremium ? '∞' : questionsLeft;
    }
}

// Инициализация обработчиков событий
function initEventListeners() {
    console.log('🎯 Инициализация обработчиков событий');
    
    // Основные табы
    const mainTabs = document.querySelectorAll('.nav-tabs .nav-tab');
    console.log('Найдено основных табов:', mainTabs.length);
    
    mainTabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        console.log('Настройка таба:', tabName);
        
        // Удаляем старые обработчики
        tab.replaceWith(tab.cloneNode(true));
    });
    
    // Добавляем новые обработчики для основных табов
    document.querySelectorAll('.nav-tabs .nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabName = this.getAttribute('data-tab');
            console.log('🔄 Переключение на основной таб:', tabName);
            
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Вторичные табы
    const secondaryTabs = document.querySelectorAll('.nav-tabs-secondary .nav-tab');
    console.log('Найдено вторичных табов:', secondaryTabs.length);
    
    secondaryTabs.forEach(tab => {
        const tabName = tab.getAttribute('data-tab');
        console.log('Настройка вторичного таба:', tabName);
        
        // Удаляем старые обработчики
        tab.replaceWith(tab.cloneNode(true));
    });
    
    // Добавляем новые обработчики для вторичных табов
    document.querySelectorAll('.nav-tabs-secondary .nav-tab').forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const tabName = this.getAttribute('data-tab');
            console.log('🔄 Переключение на вторичный таб:', tabName);
            
            if (tabName) {
                switchTab(tabName);
            }
        });
    });
    
    // Обработчик для карты дня
    const dailyCard = document.getElementById('daily-card');
    if (dailyCard) {
        dailyCard.addEventListener('click', drawDailyCard);
    }
    
    // Обработчик для кнопки "Получить ответ"
    const askBtn = document.getElementById('ask-btn');
    if (askBtn) {
        askBtn.addEventListener('click', askQuestion);
    }
    
    // Обработчик для кнопки "Уточнить"
    const followUpBtn = document.getElementById('follow-up-btn');
    if (followUpBtn) {
        followUpBtn.addEventListener('click', askFollowUpQuestion);
    }
    
    // Обработчик для кнопки отправки отзыва
    const submitReviewBtn = document.getElementById('submit-review-btn');
    if (submitReviewBtn) {
        submitReviewBtn.addEventListener('click', submitReview);
    }
    
    // Обработчик для кнопки очистки истории
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', clearHistory);
    }
    
    // Enter для полей ввода
    const questionInput = document.getElementById('question-input');
    if (questionInput) {
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askQuestion();
            }
        });
    }
    
    const followUpInput = document.getElementById('follow-up-input');
    if (followUpInput) {
        followUpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                askFollowUpQuestion();
            }
        });
    }
    
    // Обработчики для рейтинга отзывов
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            selectedRating = parseInt(this.dataset.rating);
            updateStarsDisplay();
        });
        
        star.addEventListener('mouseover', function() {
            const rating = parseInt(this.dataset.rating);
            highlightStars(rating);
        });
    });
    
    const starsContainer = document.getElementById('rating-stars');
    if (starsContainer) {
        starsContainer.addEventListener('mouseleave', function() {
            updateStarsDisplay();
        });
    }
    
    // Обработчики для раскладов
    document.querySelectorAll('.spread-card').forEach(card => {
        card.addEventListener('click', function() {
            const spreadType = this.getAttribute('data-spread');
            if (spreadType) {
                openSpread(spreadType);
            }
        });
    });
    
    // Обработчики для элементов истории  
    document.addEventListener('click', function(e) {
        if (e.target.closest('.history-item')) {
            const historyItem = e.target.closest('.history-item');
            const itemId = historyItem.getAttribute('data-id');
            if (itemId) {
                viewHistoryItem(itemId);
            }
        }
    });
    
    console.log('✅ Обработчики событий настроены');
}

// Переключение табов
function switchTab(tab) {
    console.log('🔄 Переключение на таб:', tab);
    
    // Скрываем все контенты табов
    const allTabContents = document.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // Убираем активный класс со всех табов
    const allTabs = document.querySelectorAll('.nav-tab');
    allTabs.forEach(navTab => {
        navTab.classList.remove('active');
    });
    
    // Показываем нужный контент
    const targetContent = document.getElementById(tab + '-tab');
    if (targetContent) {
        targetContent.classList.add('active');
        console.log('✅ Контент показан для:', tab);
    } else {
        console.error('❌ Контент не найден для таба:', tab);
    }
    
    // Активируем нужный таб
    const targetTab = document.querySelector(`[data-tab="${tab}"]`);
    if (targetTab) {
        targetTab.classList.add('active');
        console.log('✅ Таб активирован:', tab);
    } else {
        console.error('❌ Таб не найден:', tab);
    }
    
    // Специальная логика для разных табов
    if (tab === 'history') {
        loadHistory();
    } else if (tab === 'reviews') {
        loadReviews();
    } else if (tab === 'premium') {
        console.log('👑 Пользователь посетил Premium страницу');
    }
}

// Сброс карты к дефолтному состоянию
function resetCardToDefault(cardElement) {
    if (!cardElement) return;
    
    // Удаляем анимацию флипа если была
    cardElement.classList.remove('flipped');
    
    // Очищаем от старых блесток
    const sparkles = cardElement.querySelectorAll('.sparkle');
    sparkles.forEach(sparkle => sparkle.remove());
    
    // Возвращаем дефолтный вид карты
    cardElement.innerHTML = `
        <div class="card-back">
            <div class="card-symbol">🔮</div>
            <div class="card-text">Ваш ответ</div>
        </div>
    `;
}

// Карта дня
async function drawDailyCard() {
    if (dailyCardDrawn) {
        showNotification('Карта дня уже была вытянута сегодня!');
        return;
    }
    
    const card = document.getElementById('daily-card');
    const loading = document.getElementById('daily-loading');
    
    if (!card || !loading) return;
    
    loading.style.display = 'block';
    card.style.pointerEvents = 'none';
    
    addSparkles(card);
    
    try {
        setTimeout(async () => {
            const randomCard = getRandomCard();
            
            card.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            card.classList.add('flipped');
            loading.style.display = 'none';
            dailyCardDrawn = true;
            
            await saveDailyCardToSupabase(randomCard);
            
            setTimeout(async () => {
                const aiPrediction = await generateAIPredictionToContainer('daily-ai-container', 'daily', randomCard, '');
                
                // Обновляем историю с ИИ-предсказанием
                if (history.length > 0) {
                    history[0].aiPrediction = aiPrediction;
                }
                
                setTimeout(() => {
                    const banner = document.getElementById('daily-info-banner');
                    if (banner) {
                        banner.style.display = 'block';
                    }
                }, 2000);
            }, 1000);
            
            addToLocalHistory('daily', 'Карта дня', '', [randomCard]);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Ошибка при вытягивании карты дня:', error);
        loading.style.display = 'none';
        card.style.pointerEvents = 'auto';
    }
}

// Задать вопрос
function askQuestion() {
    console.log('🎯 Нажата кнопка "Задать вопрос"');
    
    const questionInput = document.getElementById('question-input');
    if (!questionInput) {
        console.error('❌ Поле ввода вопроса не найдено');
        return;
    }
    
    const question = questionInput.value.trim();
    console.log('📝 Текст вопроса:', question);
    
    if (!question) {
        showNotification('Пожалуйста, задайте вопрос');
        return;
    }
    
    if (questionsLeft <= 0 && !isPremium) {
        console.log('❌ Вопросы закончились');
        checkAndShowSubscriptionBanner();
        return;
    }
    
    console.log('✅ Запуск предсказания для вопроса:', question);
    performPrediction(question, false);
}

// Задать уточняющий вопрос
function askFollowUpQuestion() {
    const followUpInput = document.getElementById('follow-up-input');
    if (!followUpInput) return;
    
    const question = followUpInput.value.trim();
    if (!question) {
        showNotification('Пожалуйста, задайте уточняющий вопрос');
        return;
    }
    
    if (questionsLeft <= 0 && !isPremium) {
        checkAndShowSubscriptionBanner();
        return;
    }
    
    performPrediction(question, true);
}

// Выполнение предсказания
async function performPrediction(question, isFollowUp) {
    console.log('🔮 Начало предсказания для:', question, 'isFollowUp:', isFollowUp);
    
    const answerSection = isFollowUp ? 
        document.getElementById('followup-answer-section') : 
        document.getElementById('first-answer-section');
    const answerCard = isFollowUp ? 
        document.getElementById('followup-answer-card') : 
        document.getElementById('answer-card');
    const loading = isFollowUp ? 
        document.getElementById('followup-loading') : 
        document.getElementById('question-loading');
    const askBtn = document.getElementById('ask-btn');
    const followUpBtn = document.getElementById('follow-up-btn');
    
    if (!answerSection || !answerCard || !loading) {
        console.error('❌ Элементы интерфейса не найдены');
        return;
    }
    
    try {
        // Сброс состояния карты к дефолтному виду
        resetCardToDefault(answerCard);
        
        // Очистка предыдущих ИИ-предсказаний
        if (!isFollowUp) {
            const firstAiContainer = document.getElementById('first-ai-container');
            if (firstAiContainer) {
                firstAiContainer.innerHTML = '';
            }
        } else {
            const followupAiContainer = document.getElementById('followup-ai-container');
            if (followupAiContainer) {
                followupAiContainer.innerHTML = '';
            }
        }
        
        answerSection.style.display = 'block';
        loading.style.display = 'block';
        if (askBtn) askBtn.disabled = true;
        if (followUpBtn) followUpBtn.disabled = true;
        
        if (!isFollowUp) {
            const followUpSection = document.getElementById('follow-up-section');
            const followupAnswerSection = document.getElementById('followup-answer-section');
            const subscriptionBanner = document.getElementById('subscription-banner-question');
            
            if (followUpSection) followUpSection.style.display = 'none';
            if (followupAnswerSection) followupAnswerSection.style.display = 'none';
            if (subscriptionBanner) subscriptionBanner.style.display = 'none';
            
            // Очистка контейнера уточняющего ответа при новом основном вопросе
            const followupAiContainer = document.getElementById('followup-ai-container');
            if (followupAiContainer) {
                followupAiContainer.innerHTML = '';
            }
        }
        
        addSparkles(answerCard);
        
        const questionRecord = await saveQuestionToSupabase(question, isFollowUp);
        currentQuestionId = questionRecord?.id;
        
        setTimeout(async () => {
            const randomCard = getRandomCard();
            
            answerCard.innerHTML = `
                <div class="card-name">${randomCard.name}</div>
                <img src="${randomCard.image}" alt="${randomCard.name}" class="card-image" onerror="this.style.display='none'">
                <div class="card-symbol">${randomCard.symbol}</div>
                <div class="card-meaning">${randomCard.meaning}</div>
            `;
            
            loading.style.display = 'none';
            if (askBtn) askBtn.disabled = false;
            if (followUpBtn) followUpBtn.disabled = false;
            
            setTimeout(async () => {
                const aiContainerId = isFollowUp ? 'followup-ai-container' : 'first-ai-container';
                const aiPrediction = await generateAIPredictionToContainer(aiContainerId, 'question', randomCard, question);
                
                if (currentQuestionId) {
                    await saveAnswerToSupabase(currentQuestionId, randomCard, aiPrediction);
                }
                
                // Обновляем последнюю запись в истории с ИИ-предсказанием
                if (history.length > 0) {
                    history[0].aiPrediction = aiPrediction;
                }
                
                if (!isFollowUp) {
                    setTimeout(() => {
                        const followUpSection = document.getElementById('follow-up-section');
                        if (followUpSection) {
                            followUpSection.style.display = 'block';
                        }
                    }, 1500);
                }
                
                setTimeout(() => {
                    checkAndShowSubscriptionBanner();
                }, 2000);
                
            }, 1000);
            
            if (!isPremium) {
                questionsLeft--;
                await updateUserQuestionsInSupabase();
                updateQuestionsDisplay();
            }
            
            if (isFollowUp) {
                document.getElementById('follow-up-input').value = '';
            } else {
                document.getElementById('question-input').value = '';
            }
            
            addToLocalHistory('question', isFollowUp ? 'Уточняющий вопрос' : 'Вопрос', question, [randomCard]);
            
        }, 2500);
        
    } catch (error) {
        console.error('❌ Ошибка в performPrediction:', error);
        if (loading) loading.style.display = 'none';
        if (askBtn) askBtn.disabled = false;
        if (followUpBtn) followUpBtn.disabled = false;
        showNotification('Произошла ошибка. Попробуйте еще раз.');
    }
}

// Получение случайной карты
function getRandomCard() {
    return TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
}

// Генерация ИИ-предсказания в конкретный контейнер
async function generateAIPredictionToContainer(containerId, type, card, question = '') {
    const container = document.getElementById(containerId);
    if (!container) return '';
    
    const aiBlock = document.createElement('div');
    aiBlock.className = 'ai-prediction';
    aiBlock.innerHTML = `
        <div class="ai-header">
            <div class="ai-icon">🤖</div>
            <div class="ai-title">ИИ-толкование</div>
        </div>
        <div class="ai-content">
            <div class="generating-text">Генерирую персональное предсказание...</div>
        </div>
    `;
    
    container.appendChild(aiBlock);
    
    try {
        const prediction = generatePredictionText(type, card, question);
        
        setTimeout(() => {
            const aiContent = aiBlock.querySelector('.ai-content');
            typeWriter(aiContent, prediction, 30);
        }, 2000);
        
        return prediction;
    } catch (error) {
        console.error('❌ Ошибка ИИ-предсказания:', error);
        const prediction = generatePredictionText(type, card, question);
        
        setTimeout(() => {
            const aiContent = aiBlock.querySelector('.ai-content');
            typeWriter(aiContent, prediction, 50);
        }, 2000);
        
        return prediction;
    }
}

// Генерация предсказания (фоллбэк)
function generatePredictionText(type, card, question) {
    const predictions = {
        daily: [
            `Сегодня карта "${card.name}" говорит о том, что вас ждет особенный день. ${card.meaning.toLowerCase()} Звезды советуют обратить внимание на новые возможности, которые появятся во второй половине дня.`,
            `Энергия карты "${card.name}" окружает вас сегодня мощной аурой. ${card.meaning.toLowerCase()} Этот день принесет важные озарения в личной сфере.`,
            `"${card.name}" раскрывает перед вами завесу будущего на сегодня. ${card.meaning.toLowerCase()} Планеты благоволят к решительным действиям в первой половине дня.`
        ],
        question: [
            `Отвечая на ваш вопрос "${question}", карта "${card.name}" открывает глубокую истину. ${card.meaning.toLowerCase()} Вселенная показывает, что ключ к решению находится в ваших руках.`,
            `Ваш вопрос "${question}" резонирует с энергией карты "${card.name}". ${card.meaning.toLowerCase()} Духовные наставники советуют проявить терпение - ответ придет в течение 3-7 дней.`,
            `Карта "${card.name}" дает четкий ответ на "${question}": ${card.meaning.toLowerCase()} Время действовать настанет в период растущей луны.`
        ]
    };
    
    const typeArray = predictions[type] || predictions.daily;
    return typeArray[Math.floor(Math.random() * typeArray.length)];
}

// Проверка и показ баннера подписки
function checkAndShowSubscriptionBanner() {
    if (!isPremium && questionsLeft <= 0) {
        const banner = document.getElementById('subscription-banner-question');
        if (banner) {
            banner.style.display = 'block';
            setTimeout(() => {
                banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        }
    }
}

// Проверка первого запуска
function checkFirstLaunch() {
    if (!hasLaunched) {
        showWelcomeModal();
    }
}

// Показ приветственного модального окна
function showWelcomeModal() {
    const modal = document.createElement('div');
    modal.className = 'welcome-modal';
    modal.innerHTML = `
        <div class="welcome-modal-content">
            <div class="welcome-header">
                <h2>✨ Добро пожаловать в Шепот карт ✨</h2>
                <p>Давайте знакомиться! Укажите ваши данные для более точных предсказаний</p>
            </div>
            <div class="welcome-form">
                <div class="form-group">
                    <label for="user-name">👤 Ваше имя:</label>
                    <input type="text" id="user-name" class="welcome-input" placeholder="Введите ваше имя">
                </div>
                <div class="form-group">
                    <label for="user-birthdate">🎂 Дата рождения:</label>
                    <input type="date" id="user-birthdate" class="welcome-input">
                </div>
                <div class="form-group privacy-note">
                    <p>🔒 Ваши данные сохраняются в текущей сессии и используются только для персонализации предсказаний</p>
                </div>
            </div>
            <div class="welcome-footer">
                <button class="btn btn-secondary" onclick="skipWelcome()">Пропустить</button>
                <button class="btn" onclick="saveWelcomeData()">Сохранить и продолжить</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Сохранение данных приветствия
function saveWelcomeData() {
    const nameInput = document.getElementById('user-name');
    const birthdateInput = document.getElementById('user-birthdate');
    
    const inputName = nameInput ? nameInput.value.trim() : '';
    const inputBirthdate = birthdateInput ? birthdateInput.value : '';
    
    if (inputName) {
        userName = inputName;
        if (currentUser) {
            currentUser.display_name = inputName;
        }
    }
    
    if (inputBirthdate) {
        userBirthdate = inputBirthdate;
        if (currentUser) {
            currentUser.birthdate = inputBirthdate;
        }
    }
    
    hasLaunched = true;
    closeWelcomeModal();
    
    if (inputName) {
        showNotification(`Добро пожаловать, ${inputName}! Карты готовы ответить на ваши вопросы ✨`);
    }
}

// Пропустить приветствие
function skipWelcome() {
    hasLaunched = true;
    closeWelcomeModal();
}

// Закрытие приветственного модального окна
function closeWelcomeModal() {
    const modal = document.querySelector('.welcome-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Вспомогательные функции
function showNotification(message) {
    if (tg && tg.showAlert) {
        tg.showAlert(message);
    } else {
        alert(message);
    }
}

function typeWriter(element, text, speed = 50) {
    if (!element) return;
    element.innerHTML = '';
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

function addSparkles(element) {
    if (!element) return;
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.className = 'sparkle';
            sparkle.textContent = '✨';
            sparkle.style.left = Math.random() * 100 + '%';
            sparkle.style.top = Math.random() * 100 + '%';
            element.appendChild(sparkle);
            
            setTimeout(() => {
                sparkle.remove();
            }, 2000);
        }, i * 200);
    }
}

// Добавление в локальную историю
function addToLocalHistory(type, title, question, cards, aiPrediction = '') {
    const now = new Date();
    const historyItem = {
        id: Date.now(),
        date: now.toLocaleDateString('ru-RU'),
        time: now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now.getTime(),
        type: type,
        title: title,
        question: question,
        cards: cards,
        aiPrediction: aiPrediction // Добавляем ИИ-предсказание
    };
    
    history.unshift(historyItem);
    
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    history = history.filter(item => item.timestamp > oneMonthAgo);
    
    if (history.length > 100) {
        history = history.slice(0, 100);
    }
    
    console.log('📝 Добавлен в историю:', historyItem);
}

// Функции истории
async function loadHistory() {
    renderHistory();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <div class="empty-icon">🔮</div>
                <p>История раскладов за последний месяц пуста.<br>Начните с карты дня или задайте вопрос!</p>
            </div>
        `;
        return;
    }
    
    const groupedHistory = {};
    history.forEach(item => {
        if (!groupedHistory[item.date]) {
            groupedHistory[item.date] = [];
        }
        groupedHistory[item.date].push(item);
    });
    
    let historyHTML = '';
    Object.keys(groupedHistory).forEach(date => {
        historyHTML += `<div class="history-date-group">
            <div class="history-date-header">${date}</div>`;
        
        groupedHistory[date].forEach(item => {
            // Определяем иконку в зависимости от типа
            const typeIcon = item.type === 'daily' ? '🌅' : '❓';
            const typeColor = item.type === 'daily' ? '#ffd700' : '#667eea';
            
            historyHTML += `
                <div class="history-item" data-id="${item.id}" style="border-left-color: ${typeColor}">
                    <div class="history-header">
                        <div class="history-type">
                            <span class="history-icon">${typeIcon}</span>
                            ${item.title}
                        </div>
                        <div class="history-time">${item.time}</div>
                    </div>
                    ${item.question ? `<div class="history-question">"${item.question}"</div>` : ''}
                    <div class="history-cards">
                        ${item.cards.map(card => `
                            <div class="history-mini-card">${card.symbol} ${card.name}</div>
                        `).join('')}
                    </div>
                    <div class="history-actions">
                        <button class="history-btn" onclick="viewHistoryDetail('${item.id}')">
                            📖 Подробнее
                        </button>
                        ${item.aiPrediction ? `
                            <button class="history-btn" onclick="sendToTelegram('${item.id}')">
                                📤 В Telegram
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        historyHTML += '</div>';
    });
    
    historyList.innerHTML = historyHTML;
}

// Подробный просмотр элемента истории
function viewHistoryDetail(id) {
    const item = history.find(h => h.id == id);
    if (!item) return;
    
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'history-modal';
    modal.innerHTML = `
        <div class="history-modal-content">
            <div class="history-modal-header">
                <h3>${item.type === 'daily' ? '🌅' : '❓'} ${item.title}</h3>
                <button class="history-modal-close" onclick="closeHistoryModal()">&times;</button>
            </div>
            <div class="history-modal-body">
                <div class="history-detail-date">📅 ${item.date} в ${item.time}</div>
                
                ${item.question ? `
                    <div class="history-detail-question">
                        <strong>❓ Вопрос:</strong>
                        <p>"${item.question}"</p>
                    </div>
                ` : ''}
                
                <div class="history-detail-cards">
                    <strong>🃏 Карты:</strong>
                    ${item.cards.map(card => `
                        <div class="history-detail-card">
                            <div class="card-header">
                                <span class="card-symbol-large">${card.symbol}</span>
                                <span class="card-name-large">${card.name}</span>
                            </div>
                            <div class="card-meaning-detail">${card.meaning}</div>
                        </div>
                    `).join('')}
                </div>
                
                ${item.aiPrediction ? `
                    <div class="history-detail-prediction">
                        <strong>🤖 ИИ-толкование:</strong>
                        <p>${item.aiPrediction}</p>
                    </div>
                ` : ''}
            </div>
            <div class="history-modal-footer">
                <button class="btn btn-secondary" onclick="closeHistoryModal()">Закрыть</button>
                ${item.aiPrediction ? `
                    <button class="btn" onclick="sendToTelegram('${item.id}')">📤 Отправить в Telegram</button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Анимация появления
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Закрытие модального окна истории
function closeHistoryModal() {
    const modal = document.querySelector('.history-modal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.remove();
        }, 300);
    }
}

// Отправка в Telegram
function sendToTelegram(id) {
    const item = history.find(h => h.id == id);
    if (!item) return;
    
    let message = `🔮 ${item.title}\n`;
    message += `📅 ${item.date} в ${item.time}\n\n`;
    
    if (item.question) {
        message += `❓ Вопрос: "${item.question}"\n\n`;
    }
    
    message += `🃏 Карты:\n`;
    item.cards.forEach(card => {
        message += `${card.symbol} ${card.name}\n${card.meaning}\n\n`;
    });
    
    if (item.aiPrediction) {
        message += `🤖 ИИ-толкование:\n${item.aiPrediction}`;
    }
    
    if (tg && tg.showAlert) {
        // В Telegram Web App можем отправить данные в бота
        tg.sendData(JSON.stringify({
            type: 'history_share',
            data: item
        }));
        tg.showAlert('Данные отправлены в бота!');
    } else {
        // Фоллбэк - копируем в буфер обмена
        navigator.clipboard.writeText(message).then(() => {
            showNotification('Текст скопирован в буфер обмена!');
        }).catch(() => {
            showNotification('Не удалось скопировать текст');
        });
    }
}

function viewHistoryItem(id) {
    // Старая функция - теперь перенаправляем на новую
    viewHistoryDetail(id);
}

function clearHistory() {
    if (confirm('Удалить всю историю раскладов за последний месяц?')) {
        history = [];
        renderHistory();
    }
}

// Функции для отзывов
async function loadReviews() {
    console.log('📝 Загрузка отзывов');
}

async function submitReview() {
    const reviewText = document.getElementById('review-text');
    const anonymousCheckbox = document.getElementById('anonymous-review');
    
    if (!reviewText || !selectedRating) {
        showNotification('Пожалуйста, поставьте оценку и напишите отзыв');
        return;
    }
    
    const text = reviewText.value.trim();
    if (!text) {
        showNotification('Пожалуйста, напишите текст отзыва');
        return;
    }
    
    try {
        // Здесь будет отправка отзыва в Supabase
        console.log('📝 Отправка отзыва:', {
            rating: selectedRating,
            text: text,
            anonymous: anonymousCheckbox ? anonymousCheckbox.checked : false
        });
        
        showNotification('Спасибо за отзыв!');
        
        // Очищаем форму
        reviewText.value = '';
        selectedRating = 0;
        updateStarsDisplay();
        if (anonymousCheckbox) anonymousCheckbox.checked = false;
        
    } catch (error) {
        console.error('❌ Ошибка отправки отзыва:', error);
        showNotification('Ошибка при отправке отзыва');
    }
}

function updateStarsDisplay() {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < selectedRating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.style.color = '#ffd700';
        } else {
            star.style.color = '#444';
        }
    });
}

// Функции для раскладов
function openSpread(spreadType) {
    console.log('🃏 Открытие расклада:', spreadType);
    if (!isPremium) {
        checkAndShowSubscriptionBanner();
        return;
    }
    showNotification('Расклады будут доступны в следующем обновлении!');
}

function closeSpread() {
    console.log('🃏 Закрытие расклада');
}

function drawSpread() {
    console.log('🃏 Создание расклада');
}

// Функции-заглушки для Supabase
async function saveDailyCardToSupabase(card) {
    console.log('💾 Сохранение карты дня:', card.name);
    if (!supabase || !currentUser) return null;
    
    try {
        const { data, error } = await supabase
            .from(TABLES.dailyCards)
            .insert([{
                user_id: currentUser.telegram_id,
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                drawn_date: new Date().toISOString().split('T')[0]
            }]);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return null;
    }
}

async function saveQuestionToSupabase(question, isFollowUp) {
    console.log('💾 Сохранение вопроса:', question);
    if (!supabase || !currentUser) return { id: Date.now() };
    
    try {
        const { data, error } = await supabase
            .from(TABLES.questions)
            .insert([{
                user_id: currentUser.telegram_id,
                question_text: question,
                is_follow_up: isFollowUp,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return { id: Date.now() };
    }
}

async function saveAnswerToSupabase(questionId, card, aiPrediction) {
    console.log('💾 Сохранение ответа для вопроса:', questionId);
    if (!supabase || !currentUser) return null;
    
    try {
        const { data, error } = await supabase
            .from(TABLES.answers)
            .insert([{
                question_id: questionId,
                user_id: currentUser.telegram_id,
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                ai_prediction: aiPrediction,
                created_at: new Date().toISOString()
            }]);
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа:', error);
        return null;
    }
}

async function updateUserQuestionsInSupabase() {
    console.log('💾 Обновление количества вопросов:', questionsLeft);
    if (!supabase || !currentUser) return;
    
    try {
        const { error } = await supabase
            .from(TABLES.userProfiles)
            .update({ free_questions_left: questionsLeft })
            .eq('telegram_id', currentUser.telegram_id);
        
        if (error) throw error;
    } catch (error) {
        console.error('❌ Ошибка обновления количества вопросов:', error);
    }
}

// Проверка работы
console.log('🔮 Script.js (полная исправленная версия) загружен успешно!');
