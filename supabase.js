// supabase.js - Интеграция с Supabase для Tarot Web App
// ========================================================================

console.log('🔗 Загрузка Supabase интеграции...');

// 🌐 ИНИЦИАЛИЗАЦИЯ SUPABASE КЛИЕНТА
let supabaseClient = null;

async function initializeSupabase() {
    try {
        console.log('🔗 Инициализация Supabase...');
        
        const config = window.getSupabaseConfig();
        
        if (!config || !config.url || !config.anonKey) {
            console.warn('⚠️ Supabase конфигурация не найдена, работаем в автономном режиме');
            return false;
        }

        // Проверяем, не являются ли это тестовые значения
        if (config.url.includes('your-project') || config.anonKey.includes('your-anon')) {
            console.warn('⚠️ Обнаружены placeholder значения Supabase, работаем в автономном режиме');
            return false;
        }

        // Инициализируем клиент Supabase
        if (typeof window.supabase !== 'undefined') {
            supabaseClient = window.supabase.createClient(config.url, config.anonKey, {
                auth: {
                    persistSession: false, // Не сохраняем сессию для анонимного использования
                    autoRefreshToken: false
                },
                db: {
                    schema: 'public'
                },
                global: {
                    headers: {
                        'x-application': 'tarot-web-app'
                    }
                }
            });
            
            console.log('✅ Supabase клиент инициализирован:', config.url);
            
            // Проверяем подключение
            const { data, error } = await supabaseClient
                .from('tarot_user_profiles')
                .select('count', { count: 'exact', head: true });
                
            if (error) {
                console.warn('⚠️ Ошибка подключения к Supabase:', error.message);
                return false;
            }
            
            console.log('✅ Подключение к Supabase проверено успешно');
            return true;
            
        } else {
            console.warn('⚠️ Библиотека Supabase не найдена, загружаем...');
            
            // Пытаемся загрузить библиотеку динамически
            try {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                script.onload = () => {
                    console.log('✅ Supabase библиотека загружена');
                    // Повторная попытка инициализации
                    setTimeout(() => initializeSupabase(), 100);
                };
                document.head.appendChild(script);
                return false;
            } catch (loadError) {
                console.error('❌ Ошибка загрузки Supabase библиотеки:', loadError);
                return false;
            }
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        return false;
    }
}

// 📝 ФУНКЦИИ ДЛЯ РАБОТЫ С ПОЛЬЗОВАТЕЛЯМИ
async function createUserProfile(telegramId, username = null) {
    if (!supabaseClient) {
        console.warn('⚠️ Supabase недоступен, сохраняем локально');
        return saveUserProfileLocally(telegramId, username);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .insert([
                {
                    telegram_id: telegramId,
                    username: username,
                    is_premium: false,
                    questions_used: 0,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Профиль пользователя создан:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка создания профиля:', error);
        return saveUserProfileLocally(telegramId, username);
    }
}

async function getUserProfile(telegramId) {
    if (!supabaseClient) {
        return getUserProfileLocally(telegramId);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        return data || await createUserProfile(telegramId);
    } catch (error) {
        console.error('❌ Ошибка получения профиля:', error);
        return getUserProfileLocally(telegramId);
    }
}

async function updateUserProfile(telegramId, updates) {
    if (!supabaseClient) {
        return updateUserProfileLocally(telegramId, updates);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_user_profiles')
            .update(updates)
            .eq('telegram_id', telegramId)
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Профиль обновлен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка обновления профиля:', error);
        return updateUserProfileLocally(telegramId, updates);
    }
}

// 🃏 ФУНКЦИИ ДЛЯ РАБОТЫ С ЕЖЕДНЕВНЫМИ КАРТАМИ
async function saveDailyCard(telegramId, cardData) {
    if (!supabaseClient) {
        return saveDailyCardLocally(telegramId, cardData);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_daily_cards')
            .insert([
                {
                    telegram_id: telegramId,
                    card_id: cardData.id,
                    card_name: cardData.name,
                    interpretation: cardData.interpretation,
                    date: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Ежедневная карта сохранена:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения карты дня:', error);
        return saveDailyCardLocally(telegramId, cardData);
    }
}

async function getDailyCard(telegramId, date = null) {
    if (!supabaseClient) {
        return getDailyCardLocally(telegramId, date);
    }

    try {
        const targetDate = date || new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabaseClient
            .from('tarot_daily_cards')
            .select('*')
            .eq('telegram_id', telegramId)
            .eq('date', targetDate)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка получения карты дня:', error);
        return getDailyCardLocally(telegramId, date);
    }
}

// ❓ ФУНКЦИИ ДЛЯ РАБОТЫ С ВОПРОСАМИ
async function saveQuestion(telegramId, questionText) {
    if (!supabaseClient) {
        return saveQuestionLocally(telegramId, questionText);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_questions')
            .insert([
                {
                    telegram_id: telegramId,
                    question_text: questionText,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Вопрос сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения вопроса:', error);
        return saveQuestionLocally(telegramId, questionText);
    }
}

async function saveAnswer(questionId, cardData, interpretation) {
    if (!supabaseClient) {
        return saveAnswerLocally(questionId, cardData, interpretation);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_answers')
            .insert([
                {
                    question_id: questionId,
                    card_id: cardData.id,
                    card_name: cardData.name,
                    interpretation: interpretation,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Ответ сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения ответа:', error);
        return saveAnswerLocally(questionId, cardData, interpretation);
    }
}

// ⭐ ФУНКЦИИ ДЛЯ РАБОТЫ С ОТЗЫВАМИ
async function saveReview(telegramId, rating, reviewText) {
    if (!supabaseClient) {
        return saveReviewLocally(telegramId, rating, reviewText);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_reviews')
            .insert([
                {
                    telegram_id: telegramId,
                    rating: rating,
                    review_text: reviewText,
                    created_at: new Date().toISOString()
                }
            ])
            .select()
            .single();

        if (error) throw error;
        
        console.log('✅ Отзыв сохранен:', data);
        return data;
    } catch (error) {
        console.error('❌ Ошибка сохранения отзыва:', error);
        return saveReviewLocally(telegramId, rating, reviewText);
    }
}

async function getReviews(limit = 10) {
    if (!supabaseClient) {
        return getReviewsLocally(limit);
    }

    try {
        const { data, error } = await supabaseClient
            .from('tarot_reviews')
            .select('rating, review_text, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка получения отзывов:', error);
        return getReviewsLocally(limit);
    }
}

// 📚 ФУНКЦИИ ДЛЯ РАБОТЫ С ИСТОРИЕЙ
async function getUserHistory(telegramId, limit = 20) {
    if (!supabaseClient) {
        return getUserHistoryLocally(telegramId, limit);
    }

    try {
        // Получаем историю вопросов с ответами
        const { data: questionsData, error: questionsError } = await supabaseClient
            .from('tarot_questions')
            .select(`
                id,
                question_text,
                created_at,
                tarot_answers (
                    card_name,
                    interpretation,
                    created_at
                )
            `)
            .eq('telegram_id', telegramId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (questionsError) throw questionsError;

        // Получаем историю ежедневных карт
        const { data: dailyCardsData, error: dailyCardsError } = await supabaseClient
            .from('tarot_daily_cards')
            .select('*')
            .eq('telegram_id', telegramId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (dailyCardsError) throw dailyCardsError;

        return {
            questions: questionsData || [],
            dailyCards: dailyCardsData || []
        };
    } catch (error) {
        console.error('❌ Ошибка получения истории:', error);
        return getUserHistoryLocally(telegramId, limit);
    }
}

// 💾 ЛОКАЛЬНЫЕ FALLBACK ФУНКЦИИ
function saveUserProfileLocally(telegramId, username) {
    const profile = {
        telegram_id: telegramId,
        username: username,
        is_premium: false,
        questions_used: 0,
        created_at: new Date().toISOString()
    };
    
    localStorage.setItem(`tarot_profile_${telegramId}`, JSON.stringify(profile));
    return profile;
}

function getUserProfileLocally(telegramId) {
    const stored = localStorage.getItem(`tarot_profile_${telegramId}`);
    return stored ? JSON.parse(stored) : null;
}

function updateUserProfileLocally(telegramId, updates) {
    const profile = getUserProfileLocally(telegramId) || saveUserProfileLocally(telegramId);
    const updated = { ...profile, ...updates };
    localStorage.setItem(`tarot_profile_${telegramId}`, JSON.stringify(updated));
    return updated;
}

function saveDailyCardLocally(telegramId, cardData) {
    const dailyCard = {
        telegram_id: telegramId,
        card_id: cardData.id,
        card_name: cardData.name,
        interpretation: cardData.interpretation,
        date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString()
    };
    
    localStorage.setItem(`tarot_daily_${telegramId}_${dailyCard.date}`, JSON.stringify(dailyCard));
    return dailyCard;
}

function getDailyCardLocally(telegramId, date) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem(`tarot_daily_${telegramId}_${targetDate}`);
    return stored ? JSON.parse(stored) : null;
}

function saveQuestionLocally(telegramId, questionText) {
    const question = {
        id: Date.now(),
        telegram_id: telegramId,
        question_text: questionText,
        created_at: new Date().toISOString()
    };
    
    const questions = getQuestionsLocally(telegramId);
    questions.push(question);
    localStorage.setItem(`tarot_questions_${telegramId}`, JSON.stringify(questions));
    return question;
}

function getQuestionsLocally(telegramId) {
    const stored = localStorage.getItem(`tarot_questions_${telegramId}`);
    return stored ? JSON.parse(stored) : [];
}

function saveAnswerLocally(questionId, cardData, interpretation) {
    const answer = {
        id: Date.now(),
        question_id: questionId,
        card_id: cardData.id,
        card_name: cardData.name,
        interpretation: interpretation,
        created_at: new Date().toISOString()
    };
    
    const answers = getAnswersLocally();
    answers.push(answer);
    localStorage.setItem('tarot_answers', JSON.stringify(answers));
    return answer;
}

function getAnswersLocally() {
    const stored = localStorage.getItem('tarot_answers');
    return stored ? JSON.parse(stored) : [];
}

function saveReviewLocally(telegramId, rating, reviewText) {
    const review = {
        id: Date.now(),
        telegram_id: telegramId,
        rating: rating,
        review_text: reviewText,
        created_at: new Date().toISOString()
    };
    
    const reviews = getReviewsLocally();
    reviews.push(review);
    localStorage.setItem('tarot_reviews', JSON.stringify(reviews));
    return review;
}

function getReviewsLocally(limit = 10) {
    const stored = localStorage.getItem('tarot_reviews');
    const reviews = stored ? JSON.parse(stored) : [];
    return reviews
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, limit);
}

function getUserHistoryLocally(telegramId, limit = 20) {
    const questions = getQuestionsLocally(telegramId);
    const answers = getAnswersLocally();
    const dailyCards = [];
    
    // Собираем ежедневные карты из localStorage
    for (let i = 0; i < 30; i++) { // Проверяем последние 30 дней
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const card = getDailyCardLocally(telegramId, dateStr);
        if (card) dailyCards.push(card);
    }
    
    // Связываем вопросы с ответами
    const questionsWithAnswers = questions.map(question => {
        const questionAnswers = answers.filter(answer => answer.question_id === question.id);
        return {
            ...question,
            tarot_answers: questionAnswers
        };
    });
    
    return {
        questions: questionsWithAnswers.slice(0, limit),
        dailyCards: dailyCards.slice(0, limit)
    };
}

// 🔧 УТИЛИТЫ
function isSupabaseConnected() {
    return supabaseClient !== null;
}

function getConnectionStatus() {
    return {
        connected: isSupabaseConnected(),
        mode: isSupabaseConnected() ? 'online' : 'offline',
        client: supabaseClient ? 'initialized' : 'not_initialized'
    };
}

// 🌟 ЭКСПОРТ ФУНКЦИЙ
window.TarotDB = {
    // Инициализация
    initialize: initializeSupabase,
    isConnected: isSupabaseConnected,
    getStatus: getConnectionStatus,
    
    // Пользователи
    createUserProfile,
    getUserProfile,
    updateUserProfile,
    
    // Ежедневные карты
    saveDailyCard,
    getDailyCard,
    
    // Вопросы и ответы
    saveQuestion,
    saveAnswer,
    
    // Отзывы
    saveReview,
    getReviews,
    
    // История
    getUserHistory
};

// Проверяем экспорт
console.log('✅ Supabase интеграция загружена');
console.log('🔧 TarotDB экспортирован:', typeof window.TarotDB);
console.log('📋 Доступные методы:', Object.keys(window.TarotDB));

// Уведомляем о готовности
if (typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('TarotDB-ready', { 
        detail: { 
            timestamp: new Date().toISOString(),
            methods: Object.keys(window.TarotDB)
        }
    }));
}
