export class DataLoader {
    constructor() {
        this.endpoints = [
            '/get_articles?items_per_page=1000&include_breakdowns=true',
            '/get_articles?items_per_page=1000',
            '/get_articles'
        ];
        this.isUsingSampleData = false;
    }

    async loadStatistics() {
        // Show loading state
        document.getElementById('total-articles').textContent = '...';
        document.getElementById('avg-factuality').textContent = '...';
        
        return this.tryEndpoints(this.endpoints, 0);
    }

    async tryEndpoints(endpoints, index) {
        if (index >= endpoints.length) {
            console.warn('All endpoints failed or returned no data');
            this.isUsingSampleData = false;
            // Return empty array instead of sample data - let UI components handle empty state
            return [];
        }
        
        const endpoint = endpoints[index];
        console.log(`Trying endpoint: ${endpoint}`);
        
        try {
            const response = await fetch(endpoint);
            console.log(`Response from ${endpoint}:`, response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    // User not authenticated, redirect to login
                    window.location.href = '/login';
                    return [];
                }
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('User articles data received:', data);
            const articles = data.articles || [];
            console.log('Number of user articles:', articles.length);
            
            this.isUsingSampleData = false;
            return articles;
        } catch (error) {
            console.error(`Error with endpoint ${endpoint}:`, error);
            return this.tryEndpoints(endpoints, index + 1);
        }
    }

    async fetchArticleDetails(articleId) {
        try {
            const response = await fetch(`/get_article_details/${articleId}`);
            if (!response.ok) {
                if (response.status === 401) {
                    window.location.href = '/login';
                    return null;
                }
                if (response.status === 404) {
                    console.warn('Article not found or access denied');
                    return null;
                }
                console.warn('Article details endpoint error:', response.status);
                return null;
            }
            return await response.json();
        } catch (error) {
            console.warn('Error fetching article details:', error);
            return null;
        }
    }
}
