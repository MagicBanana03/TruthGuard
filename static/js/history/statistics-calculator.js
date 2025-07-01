export class StatisticsCalculator {
    calculateStatistics(articles) {
        // Handle empty articles array
        if (!articles || articles.length === 0) {
            return this.getEmptyStatistics();
        }

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
        
        const highestFactuality = validScores.length > 0 ? Math.max(...validScores) : 0;
        const lowestFactuality = validScores.length > 0 ? Math.min(...validScores) : 0;
        
        const streak = this.calculateStreak(articles);
        
        return {
            total_articles: totalArticles,
            articles_this_week: articlesThisWeek,
            articles_this_month: articlesThisMonth,
            avg_factuality: avgFactuality,
            factuality_trend: articlesThisWeek > 0 ? 'Active' : 'No recent activity',
            streak: streak,
            streak_status: this.getStreakStatus(streak),
            unique_sources: this.calculateUniqueSources(articles),
            diversity_score: this.calculateDiversityScore(articles),
            factuality_distribution: this.calculateFactualityDistribution(validScores),
            weekly_activity: this.calculateWeeklyActivity(articles),
            top_sources: this.calculateTopSources(articles),
            most_active_day: this.getMostActiveDay(articles),
            highest_factuality: highestFactuality,
            lowest_factuality: lowestFactuality,
            personal_score: this.calculatePersonalScore(avgFactuality),
            recent_articles: this.getRecentArticles(articles, 5),
            all_articles: this.getAllArticlesSorted(articles),
            score_ranges: this.calculateScoreRanges(validScores)
        };
    }

    getEmptyStatistics() {
        return {
            total_articles: 0,
            articles_this_week: 0,
            articles_this_month: 0,
            avg_factuality: 0,
            factuality_trend: 'No activity yet',
            streak: 0,
            streak_status: 'Start your first analysis!',
            unique_sources: 0,
            diversity_score: 'None',
            factuality_distribution: {
                very_high: 0,
                high: 0,
                mixed: 0,
                low: 0
            },
            weekly_activity: [0, 0, 0, 0, 0, 0, 0],
            top_sources: [],
            most_active_day: 'None',
            highest_factuality: 0,
            lowest_factuality: 0,
            personal_score: 'N/A',
            recent_articles: [],
            all_articles: [],
            score_ranges: [
                { range: '90-100%', count: 0 },
                { range: '80-89%', count: 0 },
                { range: '70-79%', count: 0 },
                { range: '60-69%', count: 0 },
                { range: '50-59%', count: 0 },
                { range: '40-49%', count: 0 },
                { range: '30-39%', count: 0 },
                { range: '20-29%', count: 0 },
                { range: '10-19%', count: 0 },
                { range: '0-9%', count: 0 }
            ]
        };
    }

    calculateFactualityDistribution(validScores) {
        return {
            very_high: validScores.filter(score => score >= 80).length,
            high: validScores.filter(score => score >= 60 && score < 80).length,
            mixed: validScores.filter(score => score >= 40 && score < 60).length,
            low: validScores.filter(score => score < 40).length
        };
    }

    calculateWeeklyActivity(articles) {
        const now = new Date();
        const weeklyActivity = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
        
        articles.forEach(article => {
            const articleDate = new Date(article.analysis_date);
            const daysDiff = Math.floor((now - articleDate) / (24 * 60 * 60 * 1000));
            if (daysDiff < 7) {
                const dayOfWeek = (articleDate.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
                weeklyActivity[dayOfWeek]++;
            }
        });
        
        return weeklyActivity;
    }

    calculateTopSources(articles) {
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
        
        return Array.from(sourceMap.entries())
            .map(([domain, data]) => ({
                domain,
                count: data.count,
                avg_factuality: data.scores.length > 0 
                    ? data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length 
                    : 0
            }))
            .sort((a, b) => b.count - a.count);
    }

    calculateStreak(articles) {
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
        return streak;
    }

    getStreakStatus(streak) {
        return streak > 0 ? `${streak} day${streak > 1 ? 's' : ''} strong!` : 'Start your streak!';
    }

    calculateUniqueSources(articles) {
        const sourceSet = new Set();
        articles.forEach(article => {
            if (article.link) {
                try {
                    const domain = new URL(article.link).hostname;
                    sourceSet.add(domain);
                } catch (e) {
                    // Invalid URL, skip
                }
            }
        });
        return sourceSet.size;
    }

    calculateDiversityScore(articles) {
        const sourceCount = this.calculateUniqueSources(articles);
        return sourceCount > 10 ? 'Excellent' : 
               sourceCount > 5 ? 'Good' : 
               sourceCount > 2 ? 'Fair' : 'Limited';
    }

    getMostActiveDay(articles) {
        const weeklyActivity = this.calculateWeeklyActivity(articles);
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const maxActivityIndex = weeklyActivity.indexOf(Math.max(...weeklyActivity));
        return weeklyActivity[maxActivityIndex] > 0 ? dayNames[maxActivityIndex] : 'None';
    }

    calculatePersonalScore(avgFactuality) {
        if (avgFactuality >= 90) return 'A+';
        if (avgFactuality >= 85) return 'A';
        if (avgFactuality >= 80) return 'A-';
        if (avgFactuality >= 75) return 'B+';
        if (avgFactuality >= 70) return 'B';
        if (avgFactuality >= 65) return 'B-';
        if (avgFactuality >= 60) return 'C+';
        if (avgFactuality >= 55) return 'C';
        if (avgFactuality >= 50) return 'C-';
        if (avgFactuality >= 40) return 'D';
        return 'F';
    }

    getRecentArticles(articles, count) {
        return this.getAllArticlesSorted(articles).slice(0, count);
    }

    getAllArticlesSorted(articles) {
        return articles
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
    }

    calculateScoreRanges(validScores) {
        return [
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
    }
}
