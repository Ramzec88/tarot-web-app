export default function handler(req, res) {
    const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_ROLE_KEY',
        'TELEGRAM_BOT_TOKEN',
        'N8N_WEBHOOK_BASE',
        'GITHUB_CARDS_URL'
    ];
    
    const status = {};
    requiredVars.forEach(varName => {
        status[varName] = !!process.env[varName];
    });
    
    const allConfigured = Object.values(status).every(Boolean);
    
    res.status(200).json({
        configured: allConfigured,
        details: status,
        missing: requiredVars.filter(varName => !process.env[varName])
    });
}
