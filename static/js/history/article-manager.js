import { UIUpdater } from './ui-updater.js';

export class ArticleManager {
    constructor(dataLoader) {
        this.dataLoader = dataLoader;
        this.currentPage = 1;
        this.articlesPerPage = 5;
    }

    updateRecentSummaries(data) {
        const container = document.getElementById('recent-summaries');
        const allArticles = data.all_articles || data.recent_articles || [];
        
        if (allArticles.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i class="fas fa-file-alt text-gray-500 text-3xl mb-3"></i>
                    <p class="text-gray-400 text-sm">No article summaries available</p>
                    <p class="text-gray-500 text-xs mt-2">Analyze articles to see them here</p>
                    <div class="mt-4">
                        <a href="/detector" class="inline-flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300 text-sm">
                            <i class="fas fa-plus text-xs"></i>
                            <span>Analyze Your First Article</span>
                        </a>
                    </div>
                </div>
            `;
            return;
        }
        
        // Pagination logic
        const currentPage = this.currentPage || 1;
        const articlesPerPage = this.articlesPerPage || 5;
        const totalPages = Math.ceil(allArticles.length / articlesPerPage);
        const startIndex = (currentPage - 1) * articlesPerPage;
        const endIndex = startIndex + articlesPerPage;
        const currentPageArticles = allArticles.slice(startIndex, endIndex);
        
        container.innerHTML = `
            <div class="space-y-4 mb-6" id="articles-list">
                ${currentPageArticles.map((article, index) => {
                    const actualIndex = startIndex + index;
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
            ${totalPages > 1 ? this.generatePaginationHTML(currentPage, totalPages, startIndex, endIndex, allArticles) : ''}
        `;
    }

    generatePaginationHTML(currentPage, totalPages, startIndex, endIndex, allArticles) {
        return `
            <div class="pt-4 border-t border-gray-600">
                <div class="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
                    <div class="text-sm text-gray-400 text-center sm:text-left">
                        Showing ${startIndex + 1}-${Math.min(endIndex, allArticles.length)} of ${allArticles.length} articles
                    </div>
                    
                    <div class="flex items-center justify-center space-x-1 sm:space-x-2">
                        <button onclick="window.articleManager.changePage(${currentPage - 1})" 
                                class="flex items-center px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border border-gray-600 rounded hover:border-cyan-400 text-gray-300 hover:text-white transition-colors ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
                                ${currentPage === 1 ? 'disabled' : ''}>
                            <i class="fas fa-chevron-left mr-1"></i>
                            <span class="hidden sm:inline">Previous</span>
                            <span class="sm:hidden">Prev</span>
                        </button>
                        
                        <div class="flex items-center space-x-1">
                            ${this.generatePaginationPages(currentPage, totalPages).map(pageNum => {
                                if (pageNum === '...') {
                                    return `<span class="px-2 py-1 text-xs sm:text-sm text-gray-500">...</span>`;
                                }
                                return `
                                    <button onclick="window.articleManager.changePage(${pageNum})" 
                                            class="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border rounded transition-colors cursor-pointer ${pageNum === currentPage 
                                                ? 'border-cyan-400 bg-cyan-400/20 text-cyan-300' 
                                                : 'border-gray-600 text-gray-300 hover:border-cyan-400 hover:text-white'}">
                                        ${pageNum}
                                    </button>
                                `;
                            }).join('')}
                        </div>
                        
                        <button onclick="window.articleManager.changePage(${currentPage + 1})" 
                                class="flex items-center px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm border border-gray-600 rounded hover:border-cyan-400 text-gray-300 hover:text-white transition-colors ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}"
                                ${currentPage === totalPages ? 'disabled' : ''}>
                            <span class="hidden sm:inline">Next</span>
                            <span class="sm:hidden">Next</span>
                            <i class="fas fa-chevron-right ml-1"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mt-2 text-center sm:hidden">
                    <span class="text-xs text-gray-500">
                        Page ${currentPage} of ${totalPages}
                    </span>
                </div>
            </div>
        `;
    }

    async showArticleBreakdown(articleIndex) {
        const allArticles = window.currentStatistics?.all_articles || window.currentStatistics?.recent_articles || [];
        const article = allArticles[articleIndex];
        
        if (!article) {
            console.error('Article not found');
            return;
        }
        
        // Try to fetch additional details if available
        let articleData = article;
        if (article.id && article.id !== articleIndex) {
            const fullData = await this.dataLoader.fetchArticleDetails(article.id);
            if (fullData) {
                articleData = fullData;
            }
        }
        
        this.displayArticleBreakdown(articleData);
    }

    displayArticleBreakdown(article) {
        const modal = document.getElementById('article-breakdown-modal');
        const content = document.getElementById('breakdown-content');
        
        content.innerHTML = this.generateBreakdownHTML(article);
        modal.classList.remove('hidden');
    }

    generateBreakdownHTML(article) {
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
                                ${this.getFactualityDescription(factualityScore)}
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
                    ${this.getFactualityBreakdownSection(article)}
                </div>
            </div>
        `;
    }

    getFactualityDescription(score) {
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

    getFactualityBreakdownSection(article) {
        const breakdown = article.factuality_breakdown || article.breakdown || [];
        
        if (breakdown && breakdown.length > 0) {
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
            const factualityScore = article.factuality_score || 0;
            return `
                <div class="space-y-3">
                    ${this.getScoreBasedBreakdown(factualityScore).map((explanation, index) => `
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

    getScoreBasedBreakdown(score) {
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

    changePage(newPage) {
        const allArticles = window.currentStatistics?.all_articles || window.currentStatistics?.recent_articles || [];
        const totalPages = Math.ceil(allArticles.length / this.articlesPerPage);
        
        if (newPage < 1 || newPage > totalPages) {
            return;
        }
        
        this.currentPage = newPage;
        this.updateRecentSummaries(window.currentStatistics);
    }

    generatePaginationPages(currentPage, totalPages) {
        const isMobile = window.innerWidth < 640;
        const maxVisiblePages = isMobile ? 3 : 5;
        let pages = [];
        
        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            const end = Math.min(totalPages, start + maxVisiblePages - 1);
            
            if (start > 1) {
                pages.push(1);
                if (start > 2) pages.push('...');
            }
            
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
            
            if (end < totalPages) {
                if (end < totalPages - 1) pages.push('...');
                pages.push(totalPages);
            }
        }
        
        return pages;
    }

    closeBreakdownModal() {
        document.getElementById('article-breakdown-modal').classList.add('hidden');
    }
}

// Global function for backward compatibility
window.closeBreakdownModal = function() {
    if (window.articleManager) {
        window.articleManager.closeBreakdownModal();
    }
};
