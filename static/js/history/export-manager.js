export class ExportManager {
    constructor(uiUpdater) {
        this.uiUpdater = uiUpdater;
    }

    openExportModal() {
        const today = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(today.getDate() - 30);
        
        document.getElementById('export-date-from').value = thirtyDaysAgo.toISOString().split('T')[0];
        document.getElementById('export-date-to').value = today.toISOString().split('T')[0];
        
        document.getElementById('export-options-modal').classList.remove('hidden');
    }

    closeExportModal() {
        document.getElementById('export-options-modal').classList.add('hidden');
    }

    executeExport() {
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
            this.exportToPDF(options);
        } else {
            this.exportToJSON(options);
        }
        
        this.closeExportModal();
    }

    exportToPDF(options) {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const stats = window.currentStatistics;
        
        if (!stats) {
            this.uiUpdater.showNotification('No statistics data available to export', 'error');
            return;
        }
        
        // PDF generation logic
        this.generatePDFContent(pdf, stats, options);
        
        const fileName = `truthguard_statistics_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        this.uiUpdater.showNotification('PDF export completed successfully!', 'success');
    }

    exportToJSON(options) {
        const stats = window.currentStatistics;
        
        if (!stats) {
            this.uiUpdater.showNotification('No statistics data available to export', 'error');
            return;
        }
        
        const exportData = this.buildExportData(stats, options);
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `truthguard_statistics_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        this.uiUpdater.showNotification('JSON export completed successfully!', 'success');
    }

    generatePDFContent(pdf, stats, options) {
        // ...existing PDF generation logic...
    }

    buildExportData(stats, options) {
        const exportData = {
            generated_at: new Date().toISOString(),
            date_range: {
                from: options.dateFrom,
                to: options.dateTo
            },
            export_options: options
        };

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

        return exportData;
    }
}

// Global functions for backward compatibility
window.openExportModal = function() {
    if (window.exportManager) {
        window.exportManager.openExportModal();
    }
};

window.closeExportModal = function() {
    if (window.exportManager) {
        window.exportManager.closeExportModal();
    }
};

window.executeExport = function() {
    if (window.exportManager) {
        window.exportManager.executeExport();
    }
};
