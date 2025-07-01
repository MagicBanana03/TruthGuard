// This file has been refactored into modular components.
// Please use the new modular structure in static/js/history/ instead.
// This file is kept for reference only and should not be loaded.

console.warn('This script has been deprecated. Please use the modular history components instead.');

document.addEventListener('DOMContentLoaded', function() {
    loadStatistics();
});

function loadStatistics() {
    // Show loading state
    document.getElementById('total-articles').textContent = '...';
    document.getElementById('avg-factuality').textContent = '...';
    
    // Try multiple endpoints to get article data
    const endpoints = [
        '/get_articles?items_per_page=1000&include_breakdowns=true',
        '/api/articles',
        '/articles',
        '/history'
    ];
    
    tryEndpoints(endpoints, 0);
}

function tryEndpoints(endpoints, index) {
    if (index >= endpoints.length) {
        // All endpoints failed, try to load from local storage or show mock data
        console.warn('All endpoints failed, attempting to load sample data');
        loadSampleData();
        return;
    }
    
    const endpoint = endpoints[index];
    console.log(`Trying endpoint: ${endpoint}`);
    
    fetch(endpoint)
        .then(response => {
            console.log(`Response from ${endpoint}:`, response.status);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Articles data received:', data);
            const articles = data.articles || data.data || data || [];
            console.log('Number of articles:', articles.length);
            
            if (articles.length === 0) {
                showNoDataMessage();
                return;
            }
            
            const statisticsData = calculateStatistics(articles);
            console.log('Statistics calculated:', statisticsData);
            
            // Store for modal access
            window.currentStatistics = statisticsData;
            window.currentPage = 1;
            window.articlesPerPage = 5;
            
            updateMainStats(statisticsData);
            updateFactualityDistribution(statisticsData);
            updateWeeklyActivity(statisticsData);
            updateTopSources(statisticsData);
            updateQuickInsights(statisticsData);
            updateRecentSummaries(statisticsData);
            updateFactualityAnalysis(statisticsData);
        })
        .catch(error => {
            console.error(`Error with endpoint ${endpoint}:`, error);
            // Try next endpoint
            tryEndpoints(endpoints, index + 1);
        });
}

function loadSampleData() {
    console.log('Loading sample data for demonstration');
    
    // Generate sample data based on current date
    const now = new Date();
    const sampleArticles = [
        {
            id: 1,
            title: "Climate Change Report Shows Accelerating Trends",
            summary: "A comprehensive analysis of global climate data reveals that warming trends are accelerating faster than previously predicted, with significant implications for policy makers.",
            factuality_score: 85,
            factuality_level: "Very High",
            analysis_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            input_type: "link",
            link: "https://example-news.com/climate-report",
            factuality_breakdown: [
                "Multiple peer-reviewed scientific sources cited from reputable climate research institutions",
                "Data cross-referenced with IPCC reports and NASA climate monitoring systems",
                "Methodology transparently described with statistical confidence intervals provided",
                "Authors have established credentials in climate science with no apparent conflicts of interest",
                "Findings consistent with broader scientific consensus on climate change acceleration"
            ]
        },
        {
            id: 2,
            title: "New Technology Breakthrough in Renewable Energy",
            summary: "Scientists announce a major breakthrough in solar panel efficiency, potentially revolutionizing the renewable energy sector with 40% improved energy conversion rates.",
            factuality_score: 78,
            factuality_level: "High",
            analysis_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            input_type: "link",
            link: "https://tech-today.com/solar-breakthrough",
            factuality_breakdown: [
                "Research published in peer-reviewed journal with detailed experimental methodology",
                "Results independently verified by multiple laboratories",
                "Some claims require additional long-term testing for commercial viability",
                "Source publication has strong reputation in materials science reporting"
            ]
        },
        {
            id: 3,
            title: "Economic Indicators Point to Steady Growth",
            summary: "Latest economic data suggests moderate but consistent growth across multiple sectors, with unemployment rates reaching new lows in several regions.",
            factuality_score: 72,
            factuality_level: "High",
            analysis_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
            input_type: "text",
            link: null,
            factuality_breakdown: [
                "Data sourced from official government statistics and central bank reports",
                "Trends supported by multiple independent economic research organizations",
                "Some regional variations not fully accounted for in broad generalizations",
                "Timeframe for analysis is appropriate for detecting meaningful trends"
            ]
        },
        {
            id: 4,
            title: "Health Study Reveals Benefits of Mediterranean Diet",
            summary: "A long-term study following 10,000 participants shows significant health benefits associated with Mediterranean diet patterns, including reduced cardiovascular risk.",
            factuality_score: 91,
            factuality_level: "Very High",
            analysis_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
            input_type: "link",
            link: "https://health-journal.com/mediterranean-study",
            factuality_breakdown: [
                "Large-scale longitudinal study with robust sample size and extended follow-up period",
                "Methodology includes proper control groups and accounts for confounding variables",
                "Results published in highly respected medical journal with rigorous peer review",
                "Findings replicate and extend previous research on Mediterranean diet benefits",
                "Statistical analysis appropriate with clear confidence intervals and effect sizes reported"
            ]
        },
        {
            id: 5,
            title: "Space Mission Successfully Reaches Mars Orbit",
            summary: "International space agency confirms successful orbital insertion of new Mars exploration mission, setting stage for next phase of planetary research.",
            factuality_score: 88,
            factuality_level: "Very High",
            analysis_date: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            input_type: "link",
            link: "https://space-news.org/mars-mission",
            factuality_breakdown: [
                "Information confirmed by official space agency communications and press releases",
                "Technical details verified through multiple independent aerospace reporting sources",
                "Mission timeline and objectives consistent with previously published plans",
                "No conflicting reports from other credible space monitoring organizations"
            ]
        }
    ];
    
    const statisticsData = calculateStatistics(sampleArticles);
    console.log('Sample statistics calculated:', statisticsData);
    
    // Store for modal access
    window.currentStatistics = statisticsData;
    window.currentPage = 1;
    window.articlesPerPage = 5;
    
    updateMainStats(statisticsData);
    updateFactualityDistribution(statisticsData);
    updateWeeklyActivity(statisticsData);
    updateTopSources(statisticsData);
    updateQuickInsights(statisticsData);
    updateRecentSummaries(statisticsData);
    updateFactualityAnalysis(statisticsData);
    
    // Show notification that sample data is being used
    showNotification('Using sample data for demonstration. Analyze real articles to see your actual statistics.', 'info');
}

function calculateStatistics(articles) {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Basic stats
    const totalArticles = articles.length;
    const articlesThisWeek = articles.filter(article => 
        new Date(article.analysis_date) > oneWeekAgo
    ).length;
    const articlesThisMonth = articles.filter(article => 
        new Date(article.analysis_date) > oneMonthAgo
    ).length;
    
    // Factuality stats
    const validScores = articles
        .map(article => article.factuality_score)
        .filter(score => score !== null && score !== undefined && !isNaN(score));
    
    const avgFactuality = validScores.length > 0 
        ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length 
        : 0;
    
    const highestFactuality = validScores.length > 0 
        ? Math.max(...validScores) 
        : 0;

    const lowestFactuality = validScores.length > 0 
        ? Math.min(...validScores) 
        : 0;
    
    // Factuality distribution
    const distribution = {
        very_high: validScores.filter(score => score >= 80).length,
        high: validScores.filter(score => score >= 60 && score < 80).length,
        mixed: validScores.filter(score => score >= 40 && score < 60).length,
        low: validScores.filter(score => score < 40).length
    };

    // Recent articles with summaries (paginated)
    const allArticles = articles
        .sort((a, b) => new Date(b.analysis_date) - new Date(a.analysis_date))
        .map(article => ({
            id: article.id,
            title: article.title,
            summary: article.summary,
            factuality_score: article.factuality_score,
            factuality_level: article.factuality_level,
            analysis_date: article.analysis_date,
            link: article.link,
            factuality_breakdown: article.factuality_breakdown || []
        }));
    
    // For backward compatibility, keep recent_articles as first 5
    const recentArticles = allArticles.slice(0, 5);

    // Factuality score trends
    const scoreRanges = [
        { range: '90-100%', count: validScores.filter(score => score >= 90).length },
        { range: '80-89%', count: validScores.filter(score => score >= 80 && score < 90).length },
        { range: '70-79%', count: validScores.filter(score => score >= 70 && score < 80).length },
        { range: '60-69%', count: validScores.filter(score => score >= 60 && score < 70).length },
        { range: '50-59%', count: validScores.filter(score => score >= 50 && score < 60).length },
        { range: '40-49%', count: validScores.filter(score => score >= 40 && score < 50).length },
        { range: '30-39%', count: validScores.filter(score => score >= 30 && score < 40).length },
        { range: '20-29%', count: validScores.filter(score => score >= 20 && score < 30).length },
        { range: '10-19%', count: validScores.filter(score => score >= 10 && score < 20).length },
        { range: '0-9%', count: validScores.filter(score => score < 10).length }
    ];
    
    // Source analysis
    const sourceMap = new Map();
    articles.forEach(article => {
        if (article.link) {
            try {
                const domain = new URL(article.link).hostname;
                if (!sourceMap.has(domain)) {
                    sourceMap.set(domain, { count: 0, scores: [] });
                }
                sourceMap.get(domain).count++;
                if (article.factuality_score !== null && article.factuality_score !== undefined) {
                    sourceMap.get(domain).scores.push(article.factuality_score);
                }
            } catch (e) {
                // Invalid URL, skip
            }
        }
    });
    
    const topSources = Array.from(sourceMap.entries())
        .map(([domain, data]) => ({
            domain,
            count: data.count,
            avg_factuality: data.scores.length > 0 
                ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length 
                : 0
        }))
        .sort((a, b) => b.count - a.count);
    
    // Weekly activity (last 7 days)
    const weeklyActivity = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    articles.forEach(article => {
        const articleDate = new Date(article.analysis_date);
        const daysDiff = Math.floor((now - articleDate) / (24 * 60 * 60 * 1000));
        if (daysDiff < 7) {
            const dayOfWeek = (articleDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
            weeklyActivity[dayOfWeek]++;
        }
    });
    
    // Most active day
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const maxActivityIndex = weeklyActivity.indexOf(Math.max(...weeklyActivity));
    const mostActiveDay = weeklyActivity[maxActivityIndex] > 0 ? dayNames[maxActivityIndex] : 'None';
    
    // Streak calculation (simplified - consecutive days with analysis)
    const sortedDates = articles
        .map(article => new Date(article.analysis_date).toDateString())
        .filter((date, index, array) => array.indexOf(date) === index)
        .sort((a, b) => new Date(b) - new Date(a));
    
    let streak = 0;
    let currentDate = new Date();
    for (let i = 0; i < sortedDates.length; i++) {
        const checkDate = new Date(currentDate);
        checkDate.setDate(checkDate.getDate() - i);
        if (sortedDates.includes(checkDate.toDateString())) {
            streak++;
        } else {
            break;
        }
    }
    
    // Personal score calculation
    let personalScore = 'F';
    if (avgFactuality >= 90) personalScore = 'A+';
    else if (avgFactuality >= 85) personalScore = 'A';
    else if (avgFactuality >= 80) personalScore = 'A-';
    else if (avgFactuality >= 75) personalScore = 'B+';
    else if (avgFactuality >= 70) personalScore = 'B';
    else if (avgFactuality >= 65) personalScore = 'B-';
    else if (avgFactuality >= 60) personalScore = 'C+';
    else if (avgFactuality >= 55) personalScore = 'C';
    else if (avgFactuality >= 50) personalScore = 'C-';
    else if (avgFactuality >= 40) personalScore = 'D';
    
    return {
        total_articles: totalArticles,
        articles_this_week: articlesThisWeek,
        articles_this_month: articlesThisMonth,
        avg_factuality: avgFactuality,
        factuality_trend: articlesThisWeek > 0 ? 'Active' : 'No recent activity',
        streak: streak,
        streak_status: streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} strong!` : 'Start your streak!',
        unique_sources: sourceMap.size,
        diversity_score: sourceMap.size > 10 ? 'Excellent' : sourceMap.size > 5 ? 'Good' : sourceMap.size > 2 ? 'Fair' : 'Limited',
        factuality_distribution: distribution,
        weekly_activity: weeklyActivity,
        top_sources: topSources,
        most_active_day: mostActiveDay,
        highest_factuality: highestFactuality,
        lowest_factuality: lowestFactuality,
        personal_score: personalScore,
        recent_articles: recentArticles,
        all_articles: allArticles,
        score_ranges: scoreRanges
    };
}

function updateMainStats(data) {
    document.getElementById('total-articles').textContent = data.total_articles || 0;
    document.getElementById('articles-change').textContent = `+${data.articles_this_week || 0} this week`;
    
    document.getElementById('avg-factuality').textContent = `${Math.round(data.avg_factuality || 0)}%`;
    document.getElementById('factuality-trend').textContent = data.factuality_trend || 'No change';
    
    document.getElementById('analysis-streak').textContent = data.streak || 0;
    document.getElementById('streak-status').textContent = data.streak_status || 'Keep going!';
    
    document.getElementById('sources-analyzed').textContent = data.unique_sources || 0;
    document.getElementById('sources-diversity').textContent = data.diversity_score || 'N/A';
}

function updateFactualityDistribution(data) {
    const distribution = data.factuality_distribution || {};
    document.getElementById('very-high-count').textContent = distribution.very_high || 0;
    document.getElementById('high-count').textContent = distribution.high || 0;
    document.getElementById('mixed-count').textContent = distribution.mixed || 0;
    document.getElementById('low-count').textContent = distribution.low || 0;
}

function updateWeeklyActivity(data) {
    const container = document.getElementById('weekly-activity');
    const weeklyData = data.weekly_activity || [0, 0, 0, 0, 0, 0, 0];
    
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxActivity = Math.max(...weeklyData, 1);
    
    container.innerHTML = days.map((day, index) => {
        const count = weeklyData[index] || 0;
        const percentage = (count / maxActivity) * 100;
        
        return `
            <div class="flex items-center justify-between">
                <span class="text-gray-300 text-sm w-8">${day}</span>
                <div class="flex-1 mx-3 bg-gray-700 rounded-full h-2">
                    <div class="bg-gradient-to-r from-purple-400 to-cyan-400 h-2 rounded-full transition-all duration-500"
                         style="width: ${percentage}%;"></div>
                </div>
                <span class="text-gray-300 text-sm w-6">${count}</span>
            </div>
        `;
    }).join('');
}

function updateRecentSummaries(data) {
    const container = document.getElementById('recent-summaries');
    const allArticles = data.all_articles || data.recent_articles || [];
    
    if (allArticles.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-400">
                <i class="fas fa-file-alt text-2xl mb-2"></i>
                <p>No article summaries available</p>
                <p class="text-xs mt-2 text-cyan-400">Analyze articles to see them here</p>
            </div>
        `;
        return;
    }
    
    // Pagination logic
    const currentPage = window.currentPage || 1;
    const articlesPerPage = window.articlesPerPage || 5;
    const totalPages = Math.ceil(allArticles.length / articlesPerPage);
    const startIndex = (currentPage - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const currentPageArticles = allArticles.slice(startIndex, endIndex);
    
    container.innerHTML = `
        <div class="space-y-4 mb-6" id="articles-list">
            ${currentPageArticles.map((article, index) => {
                const actualIndex = startIndex + index; // Calculate actual index for breakdown modal
                const factualityScore = article.factuality_score || 0;
                const factualityLevel = article.factuality_level || 'Unknown';
                const scoreColor = factualityScore >= 80 ? 'text-green-400' : 
                                  factualityScore >= 60 ? 'text-yellow-400' : 
                                  factualityScore >= 40 ? 'text-orange-400' : 'text-red-400';
                
                const levelBadgeClass = factualityScore >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                                       factualityScore >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                       factualityScore >= 40 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                                       'bg-red-500/20 text-red-300 border-red-500/30';
                
                const hostname = article.link ? (() => {
                    try {
                        return new URL(article.link).hostname;
                    } catch {
                        return 'Invalid URL';
                    }
                })() : null;
                
                return `
                    <div class="bg-black/30 rounded-lg p-4 border border-gray-700 hover:border-cyan-400/50 transition-colors cursor-pointer" 
                         onclick="showArticleBreakdown(${actualIndex})">
                        <div class="flex items-start justify-between mb-2">
                            <h4 class="text-white font-medium text-sm line-clamp-2 flex-1 pr-2">
                                ${article.title || 'Untitled Article'}
                            </h4>
                            <div class="flex flex-col items-end space-y-1 flex-shrink-0">
                                <span class="${scoreColor} font-bold text-sm">
                                    ${factualityScore}%
                                </span>
                                <span class="px-2 py-1 ${levelBadgeClass} text-xs font-medium rounded-full border whitespace-nowrap">
                                    ${factualityLevel}
                                </span>
                            </div>
                        </div>
                        <p class="text-gray-300 text-xs mb-2 line-clamp-3">
                            ${article.summary || 'No summary available'}
                        </p>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-gray-500">
                                ${new Date(article.analysis_date).toLocaleDateString()}
                            </span>
                            ${hostname ? `
                                <span class="text-cyan-400 truncate max-w-32">
                                    ${hostname}
                                </span>
                            ` : ''}
                        </div>
                        <div class="mt-2 pt-2 border-t border-gray-600">
                            <span class="text-cyan-400 text-xs flex items-center">
                                <i class="fas fa-eye mr-1"></i>
                                Click to view detailed breakdown
                            </span>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
        
        <!-- Pagination Controls -->
        ${totalPages > 1 ? `
            <div class="pt-4 border-t border-gray-600">
                <!-- Mobile-first layout -->
                <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <!-- Results count -->
                    <div class="text-sm text-gray-400 text-center sm:text-left">
                        Showing ${startIndex + 1}-${Math.min(endIndex, allArticles.length)} of ${allArticles.length} articles
                    </div>
                    
                    <!-- Pagination buttons -->
                    <div class="flex items-center justify-center space-x-1 sm:space-x-2">
                        <!-- Previous button -->
                        <button onclick="changePage(${currentPage - 1})" 
                                class="flex items-center px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border border-gray-600 rounded hover:border-cyan-400 text-gray-300 hover:text-white transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                                ${currentPage === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left mr-1"></i>
                            <span class="hidden sm:inline">Previous</span>
                            <span class="sm:hidden">Prev</span>
                        </button>
                        
                        <!-- Page numbers - responsive display -->
                        <div class="flex items-center space-x-1">
                            ${generatePaginationPages(currentPage, totalPages).map(pageNum => {
                                if (pageNum === '...') {
                                    return `<span class="px-2 py-1 text-xs sm:text-sm text-gray-500">...</span>`;
                                }
                                return `
                                    <button onclick="changePage(${pageNum})" 
                                            class="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border rounded transition-colors cursor-pointer ${pageNum === currentPage 
                                                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' 
                                                : 'border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-white'}">
                                        ${pageNum}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        
                        <!-- Next button -->
                        <button onclick="changePage(${currentPage + 1})" 
                                class="flex items-center px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border border-gray-600 rounded hover:border-cyan-400 text-gray-300 hover:text-white transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed cursor' : ''}"
                                ${currentPage === totalPages ? 'disabled' : ''}>
                            <span class="hidden sm:inline">Next</span>
                            <span class="sm:hidden">Next</span>
                            <i class="fas fa-chevron-right ml-1"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Mobile page info -->
                <div class="mt-2 text-center sm:hidden">
                    <span class="text-xs text-gray-500">
                        Page ${currentPage} of ${totalPages}
                    </span>
                </div>
            </div>
        ` : ''}
    `;
}

function showArticleBreakdown(articleIndex) {
    const allArticles = window.currentStatistics?.all_articles || window.currentStatistics?.recent_articles || [];
    const article = allArticles[articleIndex];
    
    if (!article) {
        console.error('Article not found');
        return;
    }
    
    console.log('Article data:', article);
    console.log('Article breakdown:', article.factuality_breakdown);
    
    // For sample data or when the endpoint fails, use the article data directly
    // Only try to fetch additional details if we have a real article ID
    if (article.id && article.id !== articleIndex) {
        // Fetch full article details
        fetch(`/get_article_details/${article.id}`)
            .then(response => {
                if (!response.ok) {
                    console.warn('Article details endpoint not available, using cached data');
                    return Promise.resolve(article);
                }
                return response.json();
            })
            .then(articleData => {
                console.log('Fetched article data:', articleData);
                displayArticleBreakdown(articleData);
            })
            .catch(error => {
                console.warn('Full article details not available, using summary data:', error);
                displayArticleBreakdown(article);
            });
    } else {
        // Use the article data directly (for sample data or when no ID available)
        console.log('Using article data directly');
        displayArticleBreakdown(article);
    }
}

function changePage(newPage) {
    const allArticles = window.currentStatistics?.all_articles || window.currentStatistics?.recent_articles || [];
    const totalPages = Math.ceil(allArticles.length / (window.articlesPerPage || 5));
    
    if (newPage < 1 || newPage > totalPages) {
        return;
    }
    
    window.currentPage = newPage;
    updateRecentSummaries(window.currentStatistics);
}

// Helper function to generate responsive pagination
function generatePaginationPages(currentPage, totalPages) {
    const isMobile = window.innerWidth < 640; // Tailwind's sm breakpoint
    const maxVisiblePages = isMobile ? 3 : 5;
    let pages = [];
    
    if (totalPages <= maxVisiblePages) {
        // Show all pages if total is small
        for (let i = 1; i <= totalPages; i++) {
            pages.push(i);
        }
    } else {
        // Smart pagination for larger page counts
        const start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const end = Math.min(totalPages, start + maxVisiblePages - 1);
        
        // Always show first page
        if (start > 1) {
            pages.push(1);
            if (start > 2) pages.push('...');
        }
        
        // Show current range
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        // Always show last page
        if (end < totalPages) {
            if (end < totalPages - 1) pages.push('...');
            pages.push(totalPages);
        }
    }
    
    return pages;
}

// Add window resize listener for responsive pagination
window.addEventListener('resize', function() {
    // Debounce resize events
    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(function() {
        if (window.currentStatistics) {
            updateRecentSummaries(window.currentStatistics);
        }
    }, 250);
});

function displayArticleBreakdown(article) {
    const modal = document.getElementById('article-breakdown-modal');
    const content = document.getElementById('breakdown-content');
    
    const factualityScore = article.factuality_score || 0;
    const factualityLevel = article.factuality_level || 'Unknown';
    const scoreColor = factualityScore >= 80 ? 'text-green-400' : 
                      factualityScore >= 60 ? 'text-yellow-400' : 
                      factualityScore >= 40 ? 'text-orange-400' : 'text-red-400';
    
    const levelBadgeClass = factualityScore >= 80 ? 'bg-green-500/20 text-green-300 border-green-500/30' :
                           factualityScore >= 60 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                           factualityScore >= 40 ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                           'bg-red-500/20 text-red-300 border-red-500/30';
    
    const hostname = article.link ? (() => {
        try {
            return new URL(article.link).hostname;
        } catch {
            return 'Invalid URL';
        }
    })() : null;
    
    content.innerHTML = `
        <!-- Article Header -->
        <div class="mb-6 p-4 bg-black/40 rounded-xl border border-gray-600">
            <div class="flex items-start justify-between mb-3">
                <h2 class="text-xl font-semibold text-white line-clamp-2 flex-1 pr-4">
                    ${article.title || 'Untitled Article'}
                </h2>
                <div class="flex flex-col items-end space-y-2 flex-shrink-0">
                    <span class="${scoreColor} font-bold text-2xl">
                        ${factualityScore}%
                    </span>
                    <span class="px-3 py-1 ${levelBadgeClass} text-sm font-medium rounded-full border">
                        ${factualityLevel}
                    </span>
                </div>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-calendar text-cyan-400"></i>
                    <span class="text-gray-300">
                        ${new Date(article.analysis_date).toLocaleString()}
                    </span>
                </div>
                <div class="flex items-center space-x-2">
                    <i class="fas fa-${article.input_type === 'link' ? 'link' : 'clipboard'} text-purple-400"></i>
                    <span class="text-gray-300">
                        ${article.input_type === 'link' ? 'URL Analysis' : 'Text Analysis'}
                    </span>
                </div>
                ${hostname ? `
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-globe text-yellow-400"></i>
                        <span class="text-gray-300 truncate">
                            ${hostname}
                        </span>
                    </div>
                ` : ''}
            </div>
        </div>

        <!-- Analysis Breakdown Table -->
        <div class="bg-black/40 rounded-xl border border-gray-600 overflow-hidden mb-6">
            <div class="p-4 border-b border-gray-600">
                <h3 class="text-lg font-semibold text-white flex items-center">
                    <i class="fas fa-chart-pie text-orange-400 mr-2"></i>
                    Analysis Breakdown
                </h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-black/60">
                        <tr>
                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-300 border-b border-gray-600">Metric</th>
                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-300 border-b border-gray-600">Value</th>
                            <th class="px-4 py-3 text-left text-sm font-medium text-gray-300 border-b border-gray-600">Description</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-700">
                        <tr class="hover:bg-black/20">
                            <td class="px-4 py-3 text-sm text-white font-medium">Factuality Score</td>
                            <td class="px-4 py-3">
                                <span class="${scoreColor} font-bold">${factualityScore}%</span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-300">Overall assessment of factual accuracy</td>
                        </tr>
                        <tr class="hover:bg-black/20">
                            <td class="px-4 py-3 text-sm text-white font-medium">Factuality Level</td>
                            <td class="px-4 py-3">
                                <span class="px-2 py-1 ${levelBadgeClass} text-xs font-medium rounded border">
                                    ${factualityLevel}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-300">Categorical assessment of reliability</td>
                        </tr>
                        <tr class="hover:bg-black/20">
                            <td class="px-4 py-3 text-sm text-white font-medium">Analysis Date</td>
                            <td class="px-4 py-3 text-sm text-gray-300">
                                ${new Date(article.analysis_date).toLocaleDateString()}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-300">When the analysis was performed</td>
                        </tr>
                        <tr class="hover:bg-black/20">
                            <td class="px-4 py-3 text-sm text-white font-medium">Input Type</td>
                            <td class="px-4 py-3 text-sm text-gray-300">
                                ${article.input_type === 'link' ? 'URL' : 'Text'}
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-300">Method of article submission</td>
                        </tr>
                        ${article.link ? `
                            <tr class="hover:bg-black/20">
                                <td class="px-4 py-3 text-sm text-white font-medium">Source</td>
                                <td class="px-4 py-3 text-sm text-cyan-400">
                                    <a href="${article.link}" target="_blank" class="hover:underline flex items-center">
                                        ${hostname}
                                        <i class="fas fa-external-link-alt ml-1 text-xs"></i>
                                    </a>
                                </td>
                                <td class="px-4 py-3 text-sm text-gray-300">Original article source</td>
                            </tr>
                        ` : ''}
                        <tr class="hover:bg-black/20">
                            <td class="px-4 py-3 text-sm text-white font-medium">Content Length</td>
                            <td class="px-4 py-3 text-sm text-gray-300">
                                ${article.summary ? article.summary.length : 0} characters
                            </td>
                            <td class="px-4 py-3 text-sm text-gray-300">Length of analyzed content</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Article Summary -->
        <div class="bg-black/40 rounded-xl border border-gray-600 p-4 mb-6">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center">
                <i class="fas fa-file-text text-green-400 mr-2"></i>
                Article Summary
            </h3>
            <div class="bg-black/30 rounded-lg p-4 border border-gray-700">
                <p class="text-gray-300 leading-relaxed">
                    ${article.summary || 'No summary available for this article.'}
                </p>
            </div>
        </div>

        <!-- Factuality Assessment -->
        <div class="bg-black/40 rounded-xl border border-gray-600 p-4 mb-6">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
                <i class="fas fa-shield-alt text-blue-400 mr-2"></i>
                Factuality Assessment
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bg-black/30 rounded-lg p-4 border border-gray-700">
                    <h4 class="font-medium text-white mb-2">Score Breakdown</h4>
                    <div class="space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="text-gray-300">Accuracy</span>
                            <div class="flex items-center space-x-2">
                                <div class="w-20 bg-gray-700 rounded-full h-2">
                                    <div class="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full" 
                                         style="width: ${factualityScore}%;"></div>
                                </div>
                                <span class="${scoreColor} text-sm font-medium">${factualityScore}%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="bg-black/30 rounded-lg p-4 border border-gray-700">
                    <h4 class="font-medium text-white mb-2">Reliability Level</h4>
                    <div class="flex items-center space-x-3">
                        <span class="px-3 py-2 ${levelBadgeClass} font-medium rounded-lg border">
                            ${factualityLevel}
                        </span>
                        <div class="text-sm text-gray-300">
                            ${getFactualityDescription(factualityScore)}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Detailed Factuality Breakdown -->
        <div class="bg-black/40 rounded-xl border border-gray-600 p-4">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
                <i class="fas fa-list-ul text-orange-400 mr-2"></i>
                Score Explanation & Analysis Factors
            </h3>
            <div class="bg-black/30 rounded-lg p-4 border border-gray-700">
                <p class="text-gray-300 text-sm mb-4">
                    <i class="fas fa-info-circle text-cyan-400 mr-2"></i>
                    The following factors were considered when determining this article's factuality score of <span class="${scoreColor} font-semibold">${factualityScore}%</span>:
                </p>
                ${getFactualityBreakdownSection(article)}
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function getFactualityDescription(score) {
    if (score >= 90) return 'Highly reliable and factually accurate';
    if (score >= 80) return 'Very reliable with strong factual basis';
    if (score >= 70) return 'Generally reliable with good accuracy';
    if (score >= 60) return 'Moderately reliable, some verification needed';
    if (score >= 50) return 'Mixed reliability, careful evaluation required';
    if (score >= 40) return 'Limited reliability, significant concerns';
    if (score >= 30) return 'Low reliability, many factual issues';
    if (score >= 20) return 'Very low reliability, substantial problems';
    return 'Extremely unreliable, major factual errors';
}

function getFactualityBreakdownSection(article) {
    // Try to get detailed breakdown from the article data
    const breakdown = article.factuality_breakdown || article.breakdown || [];
    
    console.log('getFactualityBreakdownSection called with:', article);
    console.log('Breakdown data:', breakdown);
    
    if (breakdown && breakdown.length > 0) {
        console.log('Using actual breakdown data:', breakdown);
        // Display actual breakdown explanations from the database in the same format as results.html
        return `
            <div class="space-y-3">
                ${breakdown.map((explanation, index) => `
                    <div class="bg-black/30 rounded-lg p-4 border-l-4 border-cyan-400/50">
                        <p class="text-gray-300 text-sm leading-relaxed">
                            <span class="font-semibold text-cyan-400">${index + 1}.</span>
                            ${explanation}
                        </p>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p class="text-green-300 text-xs">
                    <i class="fas fa-database mr-1"></i>
                    These are the actual analysis factors from the breakdown table, showing why this article received its factuality score.
                </p>
            </div>
        `;
    } else {
        console.log('No breakdown data found, using fallback explanations');
        // Fallback to score-based generic explanations if no detailed breakdown available
        const factualityScore = article.factuality_score || 0;
        return `
            <div class="space-y-3">
                ${getScoreBasedBreakdown(factualityScore).map((explanation, index) => `
                    <div class="bg-black/30 rounded-lg p-4 border-l-4 border-gray-400/50">
                        <p class="text-gray-300 text-sm leading-relaxed">
                            <span class="font-semibold text-gray-400">${index + 1}.</span>
                            ${explanation}
                        </p>
                    </div>
                `).join('')}
            </div>
            <div class="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <p class="text-yellow-300 text-xs">
                    <i class="fas fa-exclamation-triangle mr-1"></i>
                    Detailed breakdown factors from the original analysis are not available for this article. The explanations above are based on general scoring criteria.
                </p>
            </div>
        `;
    }
}

function getScoreBasedBreakdown(score) {
    if (score >= 80) {
        return [
            `High factuality score (${score}%) indicates the article demonstrates strong adherence to factual reporting standards.`,
            "Content appears to cite credible, verifiable sources and established facts from reliable institutions.",
            "Claims made are consistent with verified information and cross-referenced data from multiple sources.",
            "Language used maintains objectivity without sensationalized or emotionally manipulative phrasing.",
            "Overall assessment suggests this content can be considered reliable and trustworthy for information purposes."
        ];
    } else if (score >= 60) {
        return [
            `Moderate factuality score (${score}%) suggests the article contains a mix of reliable and questionable elements.`,
            "Some claims may be accurate while others require additional verification from independent sources.",
            "Content may lack sufficient sourcing for all statements made, or sources may have varying credibility levels.",
            "Potential for selective reporting, incomplete information, or slight bias in presentation detected.",
            "Readers should cross-reference key claims with additional reliable sources before accepting as fact."
        ];
    } else if (score >= 40) {
        return [
            `Low factuality score (${score}%) indicates significant concerns about the reliability of this content.`,
            "Multiple claims appear to lack proper verification, sourcing, or are contradicted by established facts.",
            "Content may contain misleading statements, exaggerated claims, or selective use of information.",
            "Sources cited may be unreliable, biased, or insufficient to support the claims being made.",
            "High likelihood of misinformation, propaganda elements, or deliberate distortion of facts detected."
        ];
    } else {
        return [
            `Very low factuality score (${score}%) suggests this content contains predominantly false or misleading information.`,
            "Majority of claims appear to be unverified, demonstrably false, or contradicted by reliable evidence.",
            "Content likely contains deliberate misinformation designed to mislead or manipulate readers.",
            "Sources are either absent, fabricated, or come from highly unreliable or discredited outlets.",
            "This content should be considered highly unreliable and potentially harmful to informed decision-making."
        ];
    }
}

function closeBreakdownModal() {
    document.getElementById('article-breakdown-modal').classList.add('hidden');
}

// Store statistics data globally for modal access
window.currentStatistics = null;

function openExportModal() {
    // Set default date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    document.getElementById('export-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
    document.getElementById('export-date-to').value = today.toISOString().split('T')[0];
    
    document.getElementById('export-options-modal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('export-options-modal').classList.add('hidden');
}

function executeExport() {
    const format = document.querySelector('input[name="export-format"]:checked').value;
    const options = {
        overview: document.getElementById('export-overview').checked,
        distribution: document.getElementById('export-distribution').checked,
        activity: document.getElementById('export-activity').checked,
        sources: document.getElementById('export-sources').checked,
        articles: document.getElementById('export-articles').checked,
        insights: document.getElementById('export-insights').checked,
        detailed: document.getElementById('export-detailed').checked,
        charts: document.getElementById('export-charts').checked,
        dateFrom: document.getElementById('export-date-from').value,
        dateTo: document.getElementById('export-date-to').value
    };
    
    if (format === 'pdf') {
        exportToPDF(options);
    } else {
        exportToJSON(options);
    }
    
    closeExportModal();
}

function exportToPDF(options) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const stats = window.currentStatistics;
    
    if (!stats) {
        showNotification('No statistics data available to export', 'error');
        return;
    }
    
    // PDF styling
    const primaryColor = [0, 188, 212]; // Cyan
    const secondaryColor = [156, 39, 176]; // Purple
    const textColor = [64, 64, 64];
    const lightTextColor = [128, 128, 128];
    
    let yPosition = 20;
    const pageWidth = 210;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    
    // Header
    pdf.setFontSize(24);
    pdf.setTextColor(...primaryColor);
    pdf.text('TruthGuard Analysis Report', margin, yPosition);
    
    yPosition += 15;
    pdf.setFontSize(12);
    pdf.setTextColor(...lightTextColor);
    pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, margin, yPosition);
    
    if (options.dateFrom && options.dateTo) {
        yPosition += 8;
        pdf.text(`Date Range: ${options.dateFrom} to ${options.dateTo}`, margin, yPosition);
    }
    
    yPosition += 20;
    
    // Overview Statistics
    if (options.overview) {
        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.text('Overview Statistics', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(11);
        pdf.setTextColor(...textColor);
        
        const overviewData = [
            ['Total Articles Analyzed', stats.total_articles.toString()],
            ['Average Factuality Score', `${Math.round(stats.avg_factuality)}%`],
            ['Articles This Week', stats.articles_this_week.toString()],
            ['Articles This Month', stats.articles_this_month.toString()],
            ['Analysis Streak', `${stats.streak} days`],
            ['Unique Sources', stats.unique_sources.toString()],
            ['Source Diversity', stats.diversity_score],
            ['Personal Score', stats.personal_score]
        ];
        
        overviewData.forEach(([label, value]) => {
            pdf.text(`${label}:`, margin, yPosition);
            pdf.text(value, margin + 80, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
    }
    
    // Factuality Distribution
    if (options.distribution) {
        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.text('Factuality Distribution', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(11);
        pdf.setTextColor(...textColor);
        
        const distribution = stats.factuality_distribution;
        const distributionData = [
            ['Very High (80-100%)', distribution.very_high.toString()],
            ['High (60-79%)', distribution.high.toString()],
            ['Mixed (40-59%)', distribution.mixed.toString()],
            ['Low (0-39%)', distribution.low.toString()]
        ];
        
        distributionData.forEach(([label, value]) => {
            pdf.text(`${label}:`, margin, yPosition);
            pdf.text(value, margin + 80, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
    }
    
    // Top Sources
    if (options.sources && stats.top_sources.length > 0) {
        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.text('Top Sources', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(11);
        pdf.setTextColor(...textColor);
        
        stats.top_sources.slice(0, 10).forEach((source, index) => {
            pdf.text(`${index + 1}. ${source.domain}`, margin, yPosition);
            pdf.text(`${source.count} articles`, margin + 80, yPosition);
            pdf.text(`${Math.round(source.avg_factuality)}% avg`, margin + 120, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
    }
    
    // Quick Insights
    if (options.insights) {
        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.text('Quick Insights', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(11);
        pdf.setTextColor(...textColor);
        
        const insights = [
            ['Most Active Day', stats.most_active_day],
            ['Highest Factuality Score', `${stats.highest_factuality}%`],
            ['Lowest Factuality Score', `${stats.lowest_factuality}%`]
        ];
        
        insights.forEach(([label, value]) => {
            pdf.text(`${label}:`, margin, yPosition);
            pdf.text(value, margin + 80, yPosition);
            yPosition += 7;
        });
        
        yPosition += 15;
    }
    
    // Article Summaries
    if (options.articles && stats.all_articles && stats.all_articles.length > 0) {
        // Check if we need a new page
        if (yPosition > 200) {
            pdf.addPage();
            yPosition = 20;
        }
        
        pdf.setFontSize(16);
        pdf.setTextColor(...primaryColor);
        pdf.text('Recent Articles', margin, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(10);
        pdf.setTextColor(...textColor);
        
        const articlesToShow = options.detailed ? stats.all_articles : stats.all_articles.slice(0, 10);
        
        articlesToShow.forEach((article, index) => {
            // Check if we need a new page for each article
            if (yPosition > 250) {
                pdf.addPage();
                yPosition = 20;
            }
            
            // Article title
            pdf.setFontSize(11);
            pdf.setTextColor(...primaryColor);
            const titleLines = pdf.splitTextToSize(article.title || 'Untitled Article', contentWidth);
            pdf.text(titleLines, margin, yPosition);
            yPosition += titleLines.length * 5 + 3;
            
            // Article details
            pdf.setFontSize(9);
            pdf.setTextColor(...textColor);
            pdf.text(`Score: ${article.factuality_score}% | Level: ${article.factuality_level}`, margin, yPosition);
            yPosition += 5;
            
            if (article.link) {
                const urlLines = pdf.splitTextToSize(`URL: ${article.link}`, contentWidth);
                pdf.text(urlLines, margin, yPosition);
                yPosition += urlLines.length * 4 + 2;
            }
            
            // Summary
            if (article.summary) {
                const summaryLines = pdf.splitTextToSize(article.summary, contentWidth);
                pdf.text(summaryLines, margin, yPosition);
                yPosition += summaryLines.length * 4 + 5;
            }
            
            // Detailed breakdown if requested
            if (options.detailed && article.factuality_breakdown && article.factuality_breakdown.length > 0) {
                pdf.setFontSize(9);
                pdf.setTextColor(...secondaryColor);
                pdf.text('Analysis Factors:', margin, yPosition);
                yPosition += 5;
                
                pdf.setTextColor(...textColor);
                article.factuality_breakdown.forEach((factor, i) => {
                    const factorLines = pdf.splitTextToSize(`${i + 1}. ${factor}`, contentWidth - 10);
                    pdf.text(factorLines, margin + 5, yPosition);
                    yPosition += factorLines.length * 4 + 2;
                });
            }
            
            yPosition += 10;
        });
    }
    
    // Save the PDF
    const fileName = `truthguard_statistics_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
    
    showNotification('PDF export completed successfully!', 'success');
}

function exportToJSON(options) {
    const stats = window.currentStatistics;
    
    if (!stats) {
        showNotification('No statistics data available to export', 'error');
        return;
    }
    
    const exportData = {
        generated_at: new Date().toISOString(),
        date_range: {
            from: options.dateFrom,
            to: options.dateTo
        },
        export_options: options
    };
    
    // Include selected data based on options
    if (options.overview) {
        exportData.overview = {
            total_articles: stats.total_articles,
            avg_factuality: stats.avg_factuality,
            articles_this_week: stats.articles_this_week,
            articles_this_month: stats.articles_this_month,
            streak: stats.streak,
            unique_sources: stats.unique_sources,
            diversity_score: stats.diversity_score,
            personal_score: stats.personal_score
        };
    }
    
    if (options.distribution) {
        exportData.factuality_distribution = stats.factuality_distribution;
    }
    
    if (options.activity) {
        exportData.weekly_activity = stats.weekly_activity;
    }
    
    if (options.sources) {
        exportData.top_sources = stats.top_sources;
    }
    
    if (options.insights) {
        exportData.insights = {
            most_active_day: stats.most_active_day,
            highest_factuality: stats.highest_factuality,
            lowest_factuality: stats.lowest_factuality
        };
    }
    
    if (options.articles && stats.all_articles) {
        exportData.articles = stats.all_articles.map(article => ({
            id: article.id,
            title: article.title,
            analysis_date: article.analysis_date,
            factuality_score: article.factuality_score,
            factuality_level: article.factuality_level,
            input_type: article.input_type,
            link: article.link,
            summary: article.summary,
            factuality_breakdown: options.detailed ? article.factuality_breakdown : undefined
        }));
    }
    
    // Download JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truthguard_statistics_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showNotification('JSON export completed successfully!', 'success');
}

function exportStats() {
    // Legacy function - redirect to new export modal
    openExportModal();
}

function showNoDataMessage() {
    const container = document.querySelector('.max-w-7xl');
    container.innerHTML = `
        <div class="text-center py-12">
            <i class="fas fa-chart-bar text-gray-500 text-6xl mb-6"></i>
            <h3 class="text-2xl font-semibold text-gray-300 mb-4">No Data Available</h3>
            <p class="text-gray-400 text-lg mb-8 max-w-md mx-auto">
                You haven't analyzed any articles yet. Start by analyzing your first article to see statistics here.
            </p>
            <div class="space-y-4">
                <a href="/detector" class="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg">
                    <i class="fas fa-plus"></i>
                    <span>Analyze Your First Article</span>
                </a>
                <div class="text-sm text-gray-500">
                    <p>Once you analyze articles, you'll see:</p>
                    <ul class="list-disc list-inside mt-2 space-y-1">
                        <li>Factuality score trends</li>
                        <li>Source analysis</li>
                        <li>Activity patterns</li>
                        <li>Article summaries</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

function showEndpointNotFoundError() {
    const container = document.querySelector('.max-w-7xl');
    container.innerHTML = `
        <div class="text-center py-12">
            <i class="fas fa-exclamation-triangle text-yellow-400 text-4xl mb-4"></i>
            <h3 class="text-xl font-semibold text-yellow-300 mb-2">Endpoint Not Found</h3>
            <p class="text-gray-400 mb-6">The articles endpoint is not available. This might be a backend configuration issue.</p>
            <div class="bg-black/40 backdrop-blur-lg rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
                <p class="text-sm text-gray-300 mb-2">Debugging info:</p>
                <ul class="text-xs text-gray-400 space-y-1">
                    <li>• Endpoint: <code class="text-cyan-400">/get_articles</code></li>
                    <li>• Status: <code class="text-red-400">404 Not Found</code></li>
                    <li>• Check if the Flask route exists</li>
                </ul>
            </div>
            <div class="space-x-4">
                <button onclick="location.reload()" class="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-redo"></i>
                    <span>Retry</span>
                </button>
                <a href="/detector" class="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-plus"></i>
                    <span>Analyze Article</span>
                </a>
            </div>
        </div>
    `;
}

function showServerError() {
    const container = document.querySelector('.max-w-7xl');
    container.innerHTML = `
        <div class="text-center py-12">
            <i class="fas fa-server text-red-400 text-4xl mb-4"></i>
            <h3 class="text-xl font-semibold text-red-300 mb-2">Server Error</h3>
            <p class="text-gray-400 mb-6">There's an issue with the server. Please try again in a moment.</p>
            <div class="space-x-4">
                <button onclick="location.reload()" class="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-redo"></i>
                    <span>Retry</span>
                </button>
                <a href="/detector" class="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-plus"></i>
                    <span>Analyze Article</span>
                </a>
            </div>
        </div>
    `;
}

function updateTopSources(data) {
    const container = document.getElementById('top-sources');
    const sources = data.top_sources || [];
    
    if (sources.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-400">
                <i class="fas fa-globe text-2xl mb-2"></i>
                <p>No sources analyzed yet</p>
                <p class="text-xs mt-1">Analyze articles with URLs to see source statistics</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sources.slice(0, 5).map((source, index) => `
        <div class="flex items-center justify-between p-3 bg-black/30 rounded-lg">
            <div class="flex items-center space-x-3">
                <span class="text-cyan-400 font-bold">${index + 1}</span>
                <span class="text-gray-300 truncate">${source.domain}</span>
            </div>
            <div class="text-right">
                <div class="text-white font-semibold">${source.count}</div>
                <div class="text-xs text-gray-400">${Math.round(source.avg_factuality)}% avg</div>
            </div>
        </div>
    `).join('');
}

function updateFactualityAnalysis(data) {
    const container = document.getElementById('factuality-analysis');
    const scoreRanges = data.score_ranges || [];
    const maxCount = Math.max(...scoreRanges.map(range => range.count), 1);
    
    if (scoreRanges.every(range => range.count === 0)) {
        container.innerHTML = `
            <div class="text-center py-4 text-gray-400">
                <i class="fas fa-chart-line text-2xl mb-2"></i>
                <p>No factuality data available</p>
            </div>
        `;
        return;
    }
    
    const summaryStats = `
        <div class="grid grid-cols-3 gap-4 mb-4 p-3 bg-black/30 rounded-lg">
            <div class="text-center">
                <div class="text-lg font-bold text-green-400">${data.highest_factuality || 0}%</div>
                <div class="text-xs text-gray-400">Highest</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-bold text-cyan-400">${Math.round(data.avg_factuality || 0)}%</div>
                <div class="text-xs text-gray-400">Average</div>
            </div>
            <div class="text-center">
                <div class="text-lg font-bold text-red-400">${data.lowest_factuality || 0}%</div>
                <div class="text-xs text-gray-400">Lowest</div>
            </div>
        </div>
    `;
    
    const rangesBars = scoreRanges.map(range => {
        const percentage = (range.count / maxCount) * 100;
        const barColor = range.range.startsWith('9') || range.range.startsWith('8') ? 'bg-green-500' :
                        range.range.startsWith('7') || range.range.startsWith('6') ? 'bg-yellow-500' :
                        range.range.startsWith('5') || range.range.startsWith('4') ? 'bg-orange-500' : 'bg-red-500';
        
        // Add factuality level labels
        const levelLabel = range.range.startsWith('9') || range.range.startsWith('8') ? 'Very High' :
                          range.range.startsWith('7') || range.range.startsWith('6') ? 'High' :
                          range.range.startsWith('5') || range.range.startsWith('4') ? 'Mixed' : 'Low';
        
        return `
            <div class="flex items-center justify-between mb-2">
                <div class="flex flex-col w-20">
                    <span class="text-gray-300 text-sm">${range.range}</span>
                    <span class="text-gray-500 text-xs">${levelLabel}</span>
                </div>
                <div class="flex-1 mx-3 bg-gray-700 rounded-full h-2">
                    <div class="${barColor} h-2 rounded-full transition-all duration-500"
                         style="width: ${percentage}%;"></div>
                </div>
                <span class="text-gray-300 text-sm w-6">${range.count}</span>
            </div>
        `;
    }).join('');
    
    container.innerHTML = summaryStats + rangesBars;
}

function updateQuickInsights(data) {
    document.getElementById('most-active-day').textContent = data.most_active_day || '-';
    document.getElementById('highest-factuality').textContent = data.highest_factuality ? `${data.highest_factuality}%` : '-';
    document.getElementById('this-month').textContent = data.articles_this_month || 0;
    document.getElementById('personal-score').textContent = data.personal_score || '-';
}

function showError() {
    const container = document.querySelector('.max-w-7xl');
    container.innerHTML = `
        <div class="text-center py-12">
            <i class="fas fa-exclamation-triangle text-red-400 text-4xl mb-4"></i>
            <h3 class="text-xl font-semibold text-red-300 mb-2">Error Loading Statistics</h3>
            <p class="text-gray-400 mb-6">Unable to load your analysis statistics. Please ensure you have analyzed some articles.</p>
            <div class="space-x-4">
                <button onclick="location.reload()" class="inline-flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-redo"></i>
                    <span>Retry</span>
                </button>
                <a href="/detector" class="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300">
                    <i class="fas fa-plus"></i>
                    <span>Analyze Article</span>
                </a>
            </div>
        </div>
    `;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-20 right-4 z-50 max-w-sm w-full transform transition-all duration-300 translate-x-full';
    
    const bgColor = type === 'success' ? 'bg-green-500/90' : type === 'error' ? 'bg-red-500/90' : 'bg-cyan-500/90';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
    
    notification.innerHTML = `
        <div class="${bgColor} backdrop-blur-lg border border-white/20 rounded-xl p-4 shadow-xl">
            <div class="flex items-center space-x-3">
                <i class="fas ${icon} text-white text-lg"></i>
                <p class="text-white text-sm font-medium">${message}</p>
                <button onclick="this.closest('.fixed').remove()" class="text-white/80 hover:text-white ml-auto">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.remove('translate-x-full'), 100);
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}