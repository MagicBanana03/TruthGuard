export class UIUpdater {
    updateMainStats(data) {
        document.getElementById('total-articles').textContent = data.total_articles || 0;
        document.getElementById('articles-change').textContent = `+${data.articles_this_week || 0} this week`;
        
        document.getElementById('avg-factuality').textContent = `${Math.round(data.avg_factuality || 0)}%`;
        document.getElementById('factuality-trend').textContent = data.factuality_trend || 'No change';
        
        document.getElementById('analysis-streak').textContent = data.streak || 0;
        document.getElementById('streak-status').textContent = data.streak_status || 'Keep going!';
        
        document.getElementById('sources-analyzed').textContent = data.unique_sources || 0;
        document.getElementById('sources-diversity').textContent = data.diversity_score || 'N/A';
    }

    updateFactualityDistribution(data) {
        const distribution = data.factuality_distribution || {};
        const container = document.getElementById('factuality-distribution-content');
        
        if (!container) {
            console.warn('Factuality distribution container not found');
            return;
        }
        
        if (data.total_articles === 0) {
            // Show no data message in the distribution section
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-pie-chart text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No articles analyzed yet</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles to see factuality distribution</p>
                </div>
            `;
            return;
        }
        
        // Create the distribution display
        const totalArticles = data.total_articles;
        const veryHigh = distribution.very_high || 0;
        const high = distribution.high || 0;
        const mixed = distribution.mixed || 0;
        const low = distribution.low || 0;
        
        container.innerHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span class="text-gray-300 text-sm">Very High</span>
                    </div>
                    <span class="text-green-400 font-semibold">${veryHigh}</span>
                </div>
                
                <div class="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span class="text-gray-300 text-sm">High</span>
                    </div>
                    <span class="text-yellow-400 font-semibold">${high}</span>
                </div>
                
                <div class="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-orange-500 rounded-full"></div>
                        <span class="text-gray-300 text-sm">Mixed</span>
                    </div>
                    <span class="text-orange-400 font-semibold">${mixed}</span>
                </div>
                
                <div class="flex items-center justify-between p-3 bg-black/30 rounded-lg">
                    <div class="flex items-center space-x-3">
                        <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span class="text-gray-300 text-sm">Low</span>
                    </div>
                    <span class="text-red-400 font-semibold">${low}</span>
                </div>
            </div>
            
            <div class="mt-4 p-3 bg-black/30 rounded-lg">
                <div class="text-center">
                    <div class="text-lg font-bold text-cyan-400 mb-1">${totalArticles}</div>
                    <div class="text-xs text-gray-400">Total Articles Analyzed</div>
                </div>
            </div>
        `;
    }

    updateWeeklyActivity(data) {
        const container = document.getElementById('weekly-activity');
        const weeklyData = data.weekly_activity || [0, 0, 0, 0, 0, 0, 0];
        
        if (data.total_articles === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-calendar-alt text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No activity data yet</p>
                    <p class="text-gray-500 text-xs mt-2">Start analyzing articles to track your weekly activity</p>
                </div>
            `;
            return;
        }
        
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

    updateTopSources(data) {
        const container = document.getElementById('top-sources');
        const sources = data.top_sources || [];
        
        if (sources.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-globe text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No sources analyzed yet</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles with URLs to see source statistics</p>
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

    updateQuickInsights(data) {
        if (data.total_articles === 0) {
            // Update individual insight values with placeholder messages
            document.getElementById('most-active-day').textContent = 'None yet';
            document.getElementById('highest-factuality').textContent = 'N/A';
            document.getElementById('this-month').textContent = '0';
            document.getElementById('personal-score').textContent = 'N/A';
        } else {
            document.getElementById('most-active-day').textContent = data.most_active_day || '-';
            document.getElementById('highest-factuality').textContent = data.highest_factuality ? `${data.highest_factuality}%` : '-';
            document.getElementById('this-month').textContent = data.articles_this_month || 0;
            document.getElementById('personal-score').textContent = data.personal_score || '-';
        }
    }

    updateFactualityAnalysis(data) {
        const container = document.getElementById('factuality-analysis');
        const scoreRanges = data.score_ranges || [];
        
        if (data.total_articles === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-chart-line text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No factuality data available</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles to see score breakdown</p>
                </div>
            `;
            return;
        }
        
        const maxCount = Math.max(...scoreRanges.map(range => range.count), 1);
        
        if (scoreRanges.every(range => range.count === 0)) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-chart-line text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No factuality data available</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles to see score breakdown</p>
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

    showNoDataMessage() {
        // This method is now integrated into individual sections
        // Keep for backward compatibility but don't replace entire container
        console.log('No data found - individual sections will show appropriate messages');
    }

    showError() {
        // Show error state in main sections
        const sections = [
            'recent-summaries',
            'factuality-analysis',
            'top-sources',
            'weekly-activity'
        ];
        
        sections.forEach(sectionId => {
            const container = document.getElementById(sectionId);
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="fas fa-exclamation-triangle text-red-400 text-3xl mb-3"></i>
                        <p class="text-red-300 text-sm">Error loading data</p>
                        <p class="text-gray-500 text-xs mt-2">Please refresh the page or try again later</p>
                    </div>
                `;
            }
        });
        
        // Reset main stats to show zeros
        document.getElementById('total-articles').textContent = '0';
        document.getElementById('avg-factuality').textContent = '0%';
        document.getElementById('analysis-streak').textContent = '0';
        document.getElementById('sources-analyzed').textContent = '0';
    }
}