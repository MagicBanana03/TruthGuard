import { DataLoader } from './data-loader.js';
import { StatisticsCalculator } from './statistics-calculator.js';
import { UIUpdater } from './ui-updater.js';
import { ArticleManager } from './article-manager.js';
import { ExportManager } from './export-manager.js';

class HistoryController {
    constructor() {
        this.dataLoader = new DataLoader();
        this.statisticsCalculator = new StatisticsCalculator();
        this.uiUpdater = new UIUpdater();
        this.articleManager = new ArticleManager(this.dataLoader);
        this.exportManager = new ExportManager(this.uiUpdater);
        
        // Store instances globally for backward compatibility
        window.currentStatistics = null;
        window.articleManager = this.articleManager;
        window.exportManager = this.exportManager;
        
        this.setupEventListeners();
    }

    async initialize() {
        try {
            // Show initial loading for main stats only
            this.showInitialLoadingState();
            
            const articles = await this.dataLoader.loadStatistics();
            const statisticsData = this.statisticsCalculator.calculateStatistics(articles);
            console.log('Statistics calculated:', statisticsData);
            
            // Store for global access
            window.currentStatistics = statisticsData;
            
            this.updateAllUI(statisticsData);
            
        } catch (error) {
            console.error('Error initializing history dashboard:', error);
            this.uiUpdater.showError();
        }
    }

    showInitialLoadingState() {
        // Only show loading for main stats, others will show "no data" immediately
        document.getElementById('total-articles').textContent = '...';
        document.getElementById('avg-factuality').textContent = '...';
        document.getElementById('analysis-streak').textContent = '...';
        document.getElementById('sources-analyzed').textContent = '...';
        
        // Immediately show "no data" states for sections that would be empty
        this.showNoDataStates();
    }

    showNoDataStates() {
        // Show no data messages immediately in each section
        const sections = [
            { id: 'recent-summaries', icon: 'fas fa-file-alt', title: 'No article summaries available', subtitle: 'Analyze articles to see them here' },
            { id: 'factuality-analysis', icon: 'fas fa-chart-line', title: 'No factuality data available', subtitle: 'Analyze articles to see score breakdown' },
            { id: 'top-sources', icon: 'fas fa-globe', title: 'No sources analyzed yet', subtitle: 'Analyze articles with URLs to see source statistics' },
            { id: 'weekly-activity', icon: 'fas fa-calendar-alt', title: 'No activity data yet', subtitle: 'Start analyzing articles to track your weekly activity' }
        ];

        sections.forEach(section => {
            const container = document.getElementById(section.id);
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-8">
                        <i class="${section.icon} text-gray-500 text-3xl mb-3"></i>
                        <p class="text-gray-400 text-sm">${section.title}</p>
                        <p class="text-gray-500 text-xs mt-2">${section.subtitle}</p>
                    </div>
                `;
            }
        });

        // Show no data state for factuality distribution
        const distributionContainer = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2 .bg-black\\/40:first-child .space-y-3');
        if (distributionContainer) {
            distributionContainer.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-pie-chart text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No articles analyzed yet</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles to see factuality distribution</p>
                </div>
            `;
        }
    }

    updateAllUI(statisticsData) {
        try {
            this.uiUpdater.updateMainStats(statisticsData);
        } catch (error) {
            console.error('Error updating main stats:', error);
        }
        
        try {
            this.uiUpdater.updateFactualityDistribution(statisticsData);
        } catch (error) {
            console.error('Error updating factuality distribution:', error);
        }
        
        try {
            this.uiUpdater.updateWeeklyActivity(statisticsData);
        } catch (error) {
            console.error('Error updating weekly activity:', error);
        }
        
        try {
            this.uiUpdater.updateTopSources(statisticsData);
        } catch (error) {
            console.error('Error updating top sources:', error);
        }
        
        try {
            this.uiUpdater.updateQuickInsights(statisticsData);
        } catch (error) {
            console.error('Error updating quick insights:', error);
        }
        
        try {
            this.articleManager.updateRecentSummaries(statisticsData);
        } catch (error) {
            console.error('Error updating recent summaries:', error);
        }
        
        try {
            this.uiUpdater.updateFactualityAnalysis(statisticsData);
        } catch (error) {
            console.error('Error updating factuality analysis:', error);
        }
    }

    setupEventListeners() {
        // Window resize listener for responsive pagination
        window.addEventListener('resize', () => {
            clearTimeout(window.resizeTimer);
            window.resizeTimer = setTimeout(() => {
                if (window.currentStatistics) {
                    this.articleManager.updateRecentSummaries(window.currentStatistics);
                }
            }, 250);
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const historyController = new HistoryController();
    historyController.initialize();
});
