// Обновленные функции для безопасной работы через n8n API

// Создание/обновление пользователя через API
async function createOrUpdateUser() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(API_CONFIG.createUser, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser.telegram_id,
                username: currentUser.username,
                first_name: currentUser.first_name,
                last_name: currentUser.last_name
            })
        });
        
        if (!response.ok) throw new Error('Failed to create/update user');
        
        const userData = await response.json();
        currentUser = { ...currentUser, ...userData };
        questionsLeft = userData.free_questions_left || 0;
        isPremium = userData.is_premium;
        
        updateSubscriptionStatus(isPremium);
        updateQuestionsDisplay();
        
        console.log('✅ Пользователь создан/обновлен через API');
        
    } catch (error) {
        console.error('❌ Ошибка создания/обновления пользователя:', error);
        // Fallback на локальную инициализацию
        initOfflineMode();
    }
}

// Сохранение карты дня через API
async function saveDailyCardToAPI(card) {
    if (!currentUser) return;
    
    try {
        const response = await fetch(API_CONFIG.saveDailyCard, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser.telegram_id,
                card_name: card.name,
                card_symbol: card.symbol,
                card_meaning: card.meaning,
                drawn_date: new Date().toISOString().split('T')[0]
            })
        });
        
        if (!response.ok) throw new Error('Failed to save daily card');
        
        console.log('✅ Карта дня сохранена через API');
        
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
    }
}

// Сохранение вопроса через API
async function saveQuestionToAPI(question, isFollowUp = false) {
    if (!currentUser) return null;
    
    try {
        const response = await fetch(API_CONFIG.saveQuestion, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser.telegram_id,
                question_text: question,
                is_follow_up: isFollowUp,
                created_at: new Date().toISOString()
            })
        });
        
        if (!response.ok) throw new Error('Failed to save question');
        
        const questionData = await response.json();
        console.log('✅ Вопрос сохранен через API:', questionData.id);
        
        return questionData;
        
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return { id: Date.now() }; // Fallback ID
    }
}

// Получение истории через API
async function loadHistoryFromAPI() {
    if (!currentUser) return;
    
    try {
        const response = await fetch(`${API_CONFIG.getHistory}?telegram_id=${currentUser.telegram_id}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) throw new Error('Failed to load history');
        
        const historyData = await response.json();
        
        // Преобразуем данные из API в локальный формат
        history = historyData.map(item => ({
            id: item.id,
            date: new Date(item.created_at).toLocaleDateString('ru-RU'),
            time: new Date(item.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            timestamp: new Date(item.created_at).getTime(),
            type: item.type || 'question',
            title: item.question_text ? 'Вопрос' : 'Карта дня',
            question: item.question_text || '',
            cards: item.cards || []
        }));
        
        renderHistory();
        console.log('✅ История загружена через API');
        
    } catch (error) {
        console.error('❌ Ошибка загрузки истории:', error);
        // Показываем локальную историю
        renderHistory();
    }
}

// Обновление подписки через API
async function updateSubscriptionViaAPI(subscriptionCode) {
    if (!currentUser) return false;
    
    try {
        const response = await fetch(API_CONFIG.updateSubscription, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser.telegram_id,
                subscription_code: subscriptionCode
            })
        });
        
        if (!response.ok) throw new Error('Failed to update subscription');
        
        const result = await response.json();
        
        if (result.success) {
            isPremium = true;
            questionsLeft = 999;
            updateSubscriptionStatus(true);
            updateQuestionsDisplay();
            
            showNotification('🎉 Premium подписка активирована!');
            console.log('✅ Подписка активирована через API');
            return true;
        } else {
            showNotification('❌ Неверный код подписки');
            return false;
        }
        
    } catch (error) {
        console.error('❌ Ошибка активации подписки:', error);
        showNotification('❌ Ошибка активации подписки');
        return false;
    }
}

// Генерация предсказания через n8n + OpenAI
async function generateAIPredictionViaAPI(type, card, question = '') {
    try {
        const response = await fetch(API_CONFIG.generatePrediction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: currentUser?.telegram_id,
                type: type, // 'daily' или 'question'
                card: {
                    name: card.name,
                    symbol: card.symbol,
                    meaning: card.meaning
                },
                question: question,
                user_context: {
                    is_premium: isPremium,
                    questions_asked: (APP_CONFIG.freeQuestionsLimit - questionsLeft)
                }
            })
        });
        
        if (!response.ok) throw new Error('Failed to generate prediction');
        
        const predictionData = await response.json();
        
        console.log('✅ ИИ-предсказание получено через API');
        return predictionData.prediction || generatePredictionText(type, card, question);
        
    } catch (error) {
        console.error('❌ Ошибка генерации ИИ-предсказания:', error);
        // Fallback на локальную генерацию
        return generatePredictionText(type, card, question);
    }
}

// Обновленная функция инициализации пользователя
async function loadCurrentUser() {
    if (!currentUser) return;
    
    try {
        // Вместо прямого обращения к Supabase используем API
        await createOrUpdateUser();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки пользователя:', error);
        initOfflineMode();
    }
}

// Обновленная функция сохранения карты дня
async function saveDailyCardToSupabase(card) {
    await saveDailyCardToAPI(card);
}

// Обновленная функция сохранения вопроса
async function saveQuestionToSupabase(question, isFollowUp) {
    return await saveQuestionToAPI(question, isFollowUp);
}

// Обновленная функция генерации ИИ-предсказания
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
        // Получаем предсказание через API
        const prediction = await generateAIPredictionViaAPI(type, card, question);
        
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

// Обновленная функция загрузки истории
async function loadHistory() {
    await loadHistoryFromAPI();
}
