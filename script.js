// Исправленная инициализация Supabase в script.js
// ========================================================================

// 🌐 ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ SUPABASE
let supabase = null;
let supabaseReady = false;
let supabaseConnectionRetries = 0;
const MAX_SUPABASE_RETRIES = 3;

// 🗄️ УЛУЧШЕННАЯ ИНИЦИАЛИЗАЦИЯ SUPABASE
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
        return handleSupabaseInitError(error);
    }
}

// 🔒 БЕЗОПАСНОЕ ПОЛУЧЕНИЕ КОНФИГУРАЦИИ SUPABASE
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
        
        // Проверяем переменные окружения
        const envConfig = {
            url: getEnvVar('SUPABASE_URL'),
            anonKey: getEnvVar('SUPABASE_ANON_KEY')
        };
        
        if (envConfig.url && envConfig.anonKey) {
            return envConfig;
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ Ошибка получения конфигурации Supabase:', error);
        return null;
    }
}

// 📚 ПРОВЕРКА ЗАГРУЗКИ БИБЛИОТЕКИ SUPABASE
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
                // Небольшая задержка для инициализации
                setTimeout(() => resolve(true), 100);
            };
            
            script.onerror = () => {
                console.error('❌ Не удалось загрузить библиотеку Supabase');
                resolve(false);
            };
            
            document.head.appendChild(script);
            
            // Таймаут на случай зависания
            setTimeout(() => {
                if (typeof window.supabase === 'undefined') {
                    console.error('⏰ Таймаут загрузки библиотеки Supabase');
                    resolve(false);
                }
            }, 10000);
        });
        
    } catch (error) {
        console.error('❌ Ошибка проверки библиотеки Supabase:', error);
        return false;
    }
}

// ✅ ВАЛИДАЦИЯ КОНФИГУРАЦИИ SUPABASE
function validateSupabaseConfig(config) {
    try {
        // Проверяем наличие обязательных полей
        if (!config || !config.url || !config.anonKey) {
            console.error('❌ Отсутствуют обязательные поля конфигурации Supabase');
            return false;
        }
        
        // Проверяем корректность URL
        try {
            const url = new URL(config.url);
            if (!url.hostname.includes('supabase')) {
                console.warn('⚠️ URL не похож на Supabase URL');
            }
        } catch (urlError) {
            console.error('❌ Некорректный URL Supabase:', urlError);
            return false;
        }
        
        // Проверяем формат ключа
        if (config.anonKey.length < 50) {
            console.error('❌ Anon key слишком короткий');
            return false;
        }
        
        // Проверяем, что это действительно anon key
        if (!config.anonKey.startsWith('eyJ')) {
            console.error('❌ Anon key имеет неверный формат');
            return false;
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка валидации конфигурации Supabase:', error);
        return false;
    }
}

// 🔍 ТЕСТИРОВАНИЕ СОЕДИНЕНИЯ SUPABASE
async function testSupabaseConnection() {
    try {
        console.log('🔍 Тестирование соединения с Supabase...');
        
        if (!supabase) {
            throw new Error('Клиент Supabase не инициализирован');
        }
        
        // Простой запрос для проверки соединения
        const { data, error } = await supabase
            .from('tarot_user_profiles')
            .select('count')
            .limit(1);
        
        if (error) {
            // Если таблица не существует, это тоже OK - соединение работает
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                console.log('✅ Соединение с Supabase работает (таблицы не настроены)');
                return true;
            }
            
            console.warn('⚠️ Ошибка при тестировании Supabase:', error.message);
            return false;
        }
        
        console.log('✅ Соединение с Supabase успешно протестировано');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка тестирования соединения Supabase:', error);
        
        // Если это сетевая ошибка, попробуем повторить
        if (error.message.includes('fetch') && supabaseConnectionRetries < MAX_SUPABASE_RETRIES) {
            supabaseConnectionRetries++;
            console.log(`🔄 Повторная попытка соединения (${supabaseConnectionRetries}/${MAX_SUPABASE_RETRIES})...`);
            
            await new Promise(resolve => setTimeout(resolve, 2000)); // Ждем 2 секунды
            return await testSupabaseConnection();
        }
        
        return false;
    }
}

// 📡 НАСТРОЙКА ОБРАБОТЧИКОВ СОБЫТИЙ SUPABASE
function setupSupabaseEventHandlers() {
    try {
        if (!supabase) return;
        
        // Обработчик изменения аутентификации
        supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Изменение состояния аутентификации:', event);
            
            switch (event) {
                case 'SIGNED_IN':
                    console.log('✅ Пользователь вошел в систему');
                    break;
                case 'SIGNED_OUT':
                    console.log('👋 Пользователь вышел из системы');
                    break;
                case 'TOKEN_REFRESHED':
                    console.log('🔄 Токен обновлен');
                    break;
            }
        });
        
        console.log('📡 Обработчики событий Supabase настроены');
        
    } catch (error) {
        console.error('❌ Ошибка настройки обработчиков Supabase:', error);
    }
}

// 🚨 ОБРАБОТКА ОШИБОК ИНИЦИАЛИЗАЦИИ SUPABASE
function handleSupabaseInitError(error) {
    try {
        console.error('🚨 Обработка ошибки инициализации Supabase:', error);
        
        // Определяем тип ошибки
        const errorType = getSupabaseErrorType(error);
        
        switch (errorType) {
            case 'network':
                console.warn('🌐 Сетевая ошибка - работаем в автономном режиме');
                return false;
                
            case 'config':
                console.error('⚙️ Ошибка конфигурации - проверьте настройки');
                return false;
                
            case 'auth':
                console.error('🔐 Ошибка аутентификации - проверьте ключи');
                return false;
                
            default:
                console.error('❓ Неизвестная ошибка Supabase');
                return false;
        }
        
    } catch (handlerError) {
        console.error('❌ Ошибка в обработчике ошибок Supabase:', handlerError);
        return false;
    }
}

// 🔍 ОПРЕДЕЛЕНИЕ ТИПА ОШИБКИ SUPABASE
function getSupabaseErrorType(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('fetch') || message.includes('network') || message.includes('cors')) {
        return 'network';
    }
    
    if (message.includes('invalid') || message.includes('key') || message.includes('token')) {
        return 'auth';
    }
    
    if (message.includes('url') || message.includes('config')) {
        return 'config';
    }
    
    return 'unknown';
}

// 🔄 ПЕРЕПОДКЛЮЧЕНИЕ К SUPABASE
async function reconnectSupabase() {
    try {
        console.log('🔄 Попытка переподключения к Supabase...');
        
        supabaseReady = false;
        supabaseConnectionRetries = 0;
        
        const result = await initSupabase();
        
        if (result) {
            console.log('✅ Переподключение к Supabase успешно');
            
            // Уведомляем приложение о восстановлении соединения
            window.dispatchEvent(new CustomEvent('supabase-reconnected'));
        } else {
            console.warn('⚠️ Переподключение к Supabase не удалось');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка переподключения к Supabase:', error);
        return false;
    }
}

// 📊 ПОЛУЧЕНИЕ СТАТУСА SUPABASE
function getSupabaseStatus() {
    return {
        ready: supabaseReady,
        connected: !!supabase,
        retries: supabaseConnectionRetries,
        lastError: null, // Можно добавить отслеживание последней ошибки
        config: {
            hasUrl: !!(window.SUPABASE_CONFIG?.url),
            hasKey: !!(window.SUPABASE_CONFIG?.anonKey),
            urlValid: window.SUPABASE_CONFIG?.url ? isValidUrl(window.SUPABASE_CONFIG.url) : false
        }
    };
}

// 🧪 ТЕСТОВЫЕ ФУНКЦИИ SUPABASE
async function testSupabaseOperations() {
    if (!supabase || !supabaseReady) {
        console.warn('⚠️ Supabase не готов для тестирования');
        return false;
    }
    
    try {
        console.log('🧪 Тестирование операций Supabase...');
        
        // Тест чтения
        const { data: readData, error: readError } = await supabase
            .from('tarot_user_profiles')
            .select('user_id')
            .limit(1);
        
        if (readError && !readError.message.includes('does not exist')) {
            console.error('❌ Ошибка чтения:', readError);
            return false;
        }
        
        console.log('✅ Операции чтения работают');
        
        // Здесь можно добавить другие тесты (запись, обновление и т.д.)
        
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка тестирования операций Supabase:', error);
        return false;
    }
}

// 🔧 УТИЛИТЫ ДЛЯ РАБОТЫ С SUPABASE
function getSupabaseClient() {
    if (!supabaseReady || !supabase) {
        console.warn('⚠️ Supabase клиент недоступен');
        return null;
    }
    return supabase;
}

function isSupabaseReady() {
    return supabaseReady && !!supabase;
}

// 📋 ЭКСПОРТ ФУНКЦИЙ SUPABASE
window.supabaseManager = {
    init: initSupabase,
    isReady: isSupabaseReady,
    getClient: getSupabaseClient,
    getStatus: getSupabaseStatus,
    reconnect: reconnectSupabase,
    test: testSupabaseOperations
};
