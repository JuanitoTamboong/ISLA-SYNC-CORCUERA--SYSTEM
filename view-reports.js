// View Reports page - extracted from report.js view mode
// Uses UMD Supabase - supabase.createClient global

const SUPABASE_URL = 'https://xdiywmptyhwkcsibiqnq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkaXl3bXB0eWh3a2NzaWJpcW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NjM4MDksImV4cCI6MjA5MDEzOTgwOX0.vzWbydm_9CMxAH7z0rg3vOKTqLp6FOBLe9T1MMzpdds';

document.addEventListener('DOMContentLoaded', async function() {
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(currentUserStr);
    if (!user.id) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
        return;
    }
    
    // New report button
    const newReportBtn = document.querySelector('.new-report-btn');
    newReportBtn.onclick = () => window.location.href = 'report.html';  // Now pure submit
    
    // Load reports
    const reportsList = document.getElementById('reports-list');
    reportsList.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">Loading reports...</p>';
    await loadUserReports(supabaseClient, user.id);
    
    // Back button
    document.querySelector('.header i').onclick = () => window.history.back();
});

async function loadUserReports(supabaseClient, userId) {
    const reportsList = document.getElementById('reports-list');
    const { data: reports, error } = await supabaseClient
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (error || !reports?.length) {
        reportsList.innerHTML = '<p style="text-align:center;color:#666;padding:40px;">No reports yet. <button class="submit" style="margin-top:10px;" onclick="window.location.href=\'report.html\'">Submit First Report</button></p>';
        return;
    }
    
    reportsList.innerHTML = reports.map(report => `
        <div class="report-card">
            <div class="report-header">
                <h4>${report.reference}</h4>
                <span class="status ${report.status}">${report.status.toUpperCase()}</span>
            </div>
            <p>${report.description.substring(0,100)}${report.description.length > 100 ? '...' : ''}</p>
            ${report.image_url ? `<img src="${report.image_url}" alt="Evidence" onerror="this.style.display='none'">` : ''}
            <div class="report-footer">
                <small>${new Date(report.created_at).toLocaleDateString()}</small>
                ${report.location ? `<small style="display:block;">📍 ${report.location_address || report.location}</small>` : ''}
            </div>
        </div>
    `).join('');
}
