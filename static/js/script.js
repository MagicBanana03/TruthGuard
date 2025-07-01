// static/js/script.js

document.addEventListener('DOMContentLoaded', function() {
    // Title input method handling for detector page
    const titleInputMethodRadios = document.querySelectorAll('input[name="title-input-method"]');
    const titleInputContainer = document.getElementById('title-input-container');
    
    titleInputMethodRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            titleInputMethodRadios.forEach(r => {
                const content = r.nextElementSibling;
                content.classList.remove('border-cyan-400', 'bg-cyan-500/10', 'shadow-lg');
                content.classList.add('border-gray-600');
            });
            const selectedContent = this.nextElementSibling;
            selectedContent.classList.remove('border-gray-600');
            selectedContent.classList.add('border-cyan-400', 'bg-cyan-500/10', 'shadow-lg');
            if (this.value === 'manual') {
                titleInputContainer.classList.remove('hidden');
            } else {
                titleInputContainer.classList.add('hidden');
            }
        });
    });

    // Input type handling for detector page
    const inputTypeRadios = document.querySelectorAll('input[name="input-type"]');
    const inputFieldContainer = document.getElementById('input-field-container');
    
    inputTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            inputTypeRadios.forEach(r => {
                const content = r.nextElementSibling;
                content.classList.remove('border-cyan-400', 'bg-cyan-500/10', 'shadow-lg');
                content.classList.add('border-gray-600');
            });
            const selectedContent = this.nextElementSibling;
            selectedContent.classList.remove('border-gray-600');
            selectedContent.classList.add('border-cyan-400', 'bg-cyan-500/10', 'shadow-lg');
            
            if (this.value === 'link') {
                inputFieldContainer.innerHTML = `
                    <label for="article-link" class="block text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <i class="fas fa-link text-green-400"></i>
                        <span>Article URL</span>
                    </label>
                    <div class="relative w-full">
                        <input type="url" id="article-link" name="article-link" 
                               class="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all duration-300"
                               placeholder="https://example.com/article-url" required />
                        <div class="absolute inset-y-0 right-0 flex items-center pr-4">
                            <i class="fas fa-globe text-gray-400"></i>
                        </div>
                    </div>
                `;
            } else if (this.value === 'snippet') {
                inputFieldContainer.innerHTML = `
                    <label for="article-snippet" class="block text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                        <i class="fas fa-clipboard text-yellow-400"></i>
                        <span>Article Text</span>
                    </label>
                    <div class="relative w-full">
                        <textarea id="article-snippet" name="article-snippet" rows="8"
                                  class="w-full bg-black/50 border border-gray-600 rounded-xl px-4 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition-all duration-300 resize-none"
                                  placeholder="Paste the article content here..." required></textarea>
                        <div class="absolute bottom-4 right-4 text-gray-500 text-sm">
                            <span id="snippet-char-count">0</span> characters
                        </div>
                    </div>
                `;
                const snippetTextarea = document.getElementById('article-snippet');
                const snippetCharCount = document.getElementById('snippet-char-count');
                if (snippetTextarea && snippetCharCount) {
                    snippetTextarea.addEventListener('input', function() {
                        snippetCharCount.textContent = this.value.length;
                    });
                }
            }
            updateProgress();
        });
    });

    // Progress bar animation
    const progressBar = document.getElementById('progress-bar');
    function updateProgress() {
        let progress = 0;
        if (document.querySelector('input[name="title-input-method"]:checked')) progress = 33;
        if (document.querySelector('input[name="input-type"]:checked')) progress = 66;
        if (document.getElementById('article-link')?.value || document.getElementById('article-snippet')?.value) {
            progress = 100;
        }
        if (progressBar) progressBar.style.width = progress + '%';
    }
    document.addEventListener('change', updateProgress);
    document.addEventListener('input', updateProgress);

    // Handle form submission for detector
    const detectorForm = document.getElementById('detector-form');
    if (detectorForm) {
        detectorForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(detectorForm);
            fetch(detectorForm.action, {
                method: 'POST',
                body: formData
            })
            .then(res => res.json())
            .then(data => {
                if (data.error === 'non_political') {
                    showNotification("Please submit a Philippine political news article.", 'error');
                } else if (data.error === 'explicit_content') {
                    showNotification("This article contains explicit content. Try another.", 'error');
                } else if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else if (data.error) {
                    showNotification(data.error, 'error');
                }
            })
            .catch(err => {
                console.error(err);
                showNotification('An error occurred. Please try again.', 'error');
            });
        });
    }

    // Reset form
    const resetButton = document.querySelector('button[type="reset"]');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            setTimeout(() => {
                document.querySelectorAll('.radio-card-content').forEach(card => {
                    card.classList.remove('border-cyan-400', 'bg-cyan-500/10', 'shadow-lg');
                    card.classList.add('border-gray-600');
                });
                titleInputContainer.classList.add('hidden');
                inputFieldContainer.innerHTML = '';
                updateProgress();
            }, 0);
        });
    }
});

// Notification helper
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 z-50 max-w-sm w-full transform transition-all duration-300 translate-x-full`;
    const bgColor = type === 'error' ? 'bg-red-500/90' : 'bg-cyan-500/90';
    const icon = type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle';
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
    }, 5000);
}

// Search & filter for History Page
const searchBar    = document.getElementById('search-bar');
const filterSelect = document.getElementById('filter');
const historyList  = document.getElementById('history-list');
const pagination   = document.getElementById('pagination');

if (searchBar && filterSelect && historyList && pagination) {
    let currentPage = 1, targetId = null;
    const perPage = 5;

    function loadArticles(page = 1, highlightId = null) {
        const params = {
            items_per_page: perPage,
            search_term: searchBar.value.toLowerCase(),
            filter_order: filterSelect.value
        };
        if (highlightId) params.article_id = highlightId;
        else params.page = page;

        fetch(`/get_articles?${new URLSearchParams(params)}`)
          .then(r => r.json())
          .then(data => {
            if (data.error) return console.error(data.error);
            currentPage = data.current_page;
            renderArticles(data.articles);
            setupPagination(data.total_pages);
            if (highlightId) highlightAndScroll(highlightId);
          });
    }

    function renderArticles(list) {
        historyList.innerHTML = '';
        list.forEach(a => historyList.appendChild(createArticleItem(a)));
    }

    function createArticleItem(article) {
        const c = document.createElement('div');
        c.id = `article-${article.id}`;
        c.className = 'bg-black/40 backdrop-blur-lg rounded-2xl border border-gray-600 hover:border-cyan-400/50 p-4 sm:p-6 history-item';
        c.tabIndex = 0;

        c.innerHTML = `
          <div class="flex flex-col lg:flex-row lg:items-start lg:space-x-6">
            <div class="flex-1 min-w-0">
              <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <div class="flex-1 min-w-0 pr-2">
                  <h3 class="text-lg sm:text-xl font-semibold text-white mb-2 line-clamp-2 break-words">${article.title}</h3>
                  <div class="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-1 sm:space-y-0 text-sm text-gray-400">
                    <span class="flex items-center space-x-1 flex-shrink-0">
                      <i class="fas fa-calendar text-cyan-400"></i>
                      <span>${article.analysis_date}</span>
                    </span>
                    ${article.input_type==='link'
                      ? `<span class="flex items-center space-x-1 flex-shrink-0">
                           <i class="fas fa-link text-purple-400"></i>
                           <span class="truncate">${article.source_display}</span>
                         </span>`
                      : `<span class="flex items-center space-x-1 flex-shrink-0">
                           <i class="fas fa-clipboard text-yellow-400"></i>
                           <span>User Snippet</span>
                         </span>`
                    }
                  </div>
                </div>
              </div>
              <p class="text-gray-300 text-sm mb-4 line-clamp-3 break-words">${article.summary}</p>
            </div>
            
            <div class="w-full lg:w-80 flex lg:flex-col mt-4 lg:mt-0">
              <div class="w-full bg-black/30 rounded-xl p-6 pb-10 border border-cyan-500/20 flex flex-col justify-center">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm text-gray-400">Factuality</span>
                  <span class="text-lg font-bold text-cyan-400">${article.fact_score}%</span>
                </div>
                <div class="w-full bg-gray-700 rounded-full h-2">
                  <div class="bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full" style="width:${article.fact_score}%"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-6 pt-4 border-t border-gray-600 space-y-4 sm:space-y-0">
            <div class="flex items-center space-x-4">
              <span class="px-3 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded-full border border-green-500/30 whitespace-nowrap">
                ${article.fact_score >= 80 ? 'Very High'
                  : article.fact_score >= 60 ? 'High'
                  : article.fact_score >= 40 ? 'Mixed'
                  : article.fact_score >= 20 ? 'Low'
                  : 'Very Low'}
              </span>
            </div>
            <div class="flex items-center justify-center sm:justify-end space-x-6 flex-shrink-0">
              <button class="text-gray-400 hover:text-cyan-400 transition-colors p-2" title="View Full Analysis" onclick="event.stopPropagation(); viewFullAnalysis(${article.id})">
                <i class="fas fa-eye"></i>
              </button>
              <button class="text-gray-400 hover:text-purple-400 transition-colors p-2" title="Share" onclick="event.stopPropagation(); shareArticle(${article.id})">
                <i class="fas fa-share"></i>
              </button>
              <button class="text-gray-400 hover:text-red-400 transition-colors p-2" title="Delete" onclick="event.stopPropagation(); deleteArticle(${article.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        `;
        return c;
    }

    function setupPagination(totalPages) {
        pagination.innerHTML = '';
        if (totalPages < 2) return;
        const frag = document.createDocumentFragment();

        const prev = document.createElement('button');
        prev.textContent = 'Prev'; prev.disabled = currentPage===1;
        prev.className='px-4 py-2';
        prev.onclick = () => loadArticles(currentPage-1);
        frag.appendChild(prev);

        for(let i=1;i<=totalPages;i++){
            const btn=document.createElement('button');
            btn.textContent=i;
            btn.className=`mx-1 px-3 py-1 ${i===currentPage?'bg-cyan-500':'bg-black/40'}`;
            btn.onclick=()=>loadArticles(i);
            frag.appendChild(btn);
        }

        const next = document.createElement('button');
        next.textContent = 'Next'; next.disabled = currentPage===totalPages;
        next.className='px-4 py-2';
        next.onclick = () => loadArticles(currentPage+1);
        frag.appendChild(next);

        pagination.appendChild(frag);
    }

    function highlightAndScroll(id) {
        const el = document.getElementById(`article-${id}`);
        if (!el) return;
        el.classList.add('ring-2','ring-cyan-400');
        const top = el.getBoundingClientRect().top + window.pageYOffset - 100;
        window.scrollTo({ top, behavior:'smooth' });
    }

    searchBar.oninput   = ()=>loadArticles(1);
    filterSelect.onchange=()=>loadArticles(1);
    window.addEventListener('load', ()=>loadArticles());
}

// Navigation helpers
function viewFullAnalysis(id){ window.location.href=`/results/${id}` }
function shareArticle(id){ showNotification('Share coming soon','info') }
function deleteArticle(id){ if(confirm('Delete?')) showNotification('Deleted','info') }
function viewFullAnalysis(id){ window.location.href=`/results/${id}` }
function shareArticle(id){ showNotification('Share coming soon','info') }
function deleteArticle(id){ if(confirm('Delete?')) showNotification('Deleted','info') }

// Feedback Form Modal & AJAX Submit
;(function() {
  const feedbackForm      = document.getElementById('feedback-form');
  const submitBtn         = document.getElementById('submit-btn');
  const confirmationModal = document.getElementById('confirmation-modal');
  const successModal      = document.getElementById('success-modal');
  const confirmSubmit     = document.getElementById('confirm-submit');
  const cancelSubmit      = document.getElementById('cancel-submit');
  const commentsTextarea  = document.getElementById('comments');
  const charCount         = document.getElementById('char-count');
  const ratingInputs      = document.querySelectorAll('input[name="rating"]');
  const ratingText        = document.getElementById('rating-text');

  // Character counter for comments
  commentsTextarea.addEventListener('input', () => {
    let len = commentsTextarea.value.length;
    charCount.textContent = len > 500 ? '500' : len;
    if (len > 500) commentsTextarea.value = commentsTextarea.value.slice(0, 500);
    charCount.className = len > 450
      ? 'text-red-400'
      : len > 400
        ? 'text-yellow-400'
        : 'text-gray-500';
  });

  // Rating label update
  const ratingLabels = {
    5: 'Excellent! ⭐⭐⭐⭐⭐',
    4: 'Very Good! ⭐⭐⭐⭐',
    3: 'Good! ⭐⭐⭐',
    2: 'Fair ⭐⭐',
    1: 'Poor ⭐'
  };
  ratingInputs.forEach(r => r.addEventListener('change', () => {
    ratingText.textContent = ratingLabels[r.value];
    ratingText.className = 'text-yellow-400 text-lg font-semibold';
  }));

  // Open confirmation modal
  submitBtn.addEventListener('click', e => {
    e.preventDefault();
    const nameVal    = document.getElementById('name').value.trim();
    const commentsVal = commentsTextarea.value.trim();
    const ratingVal   = document.querySelector('input[name="rating"]:checked');
    if (!nameVal || !commentsVal || !ratingVal) {
      showNotification('Please fill in all required fields.', 'error');
      return;
    }
    confirmationModal.classList.remove('hidden');
  });

  // Cancel
  cancelSubmit.addEventListener('click', () => {
    confirmationModal.classList.add('hidden');
  });

  // On confirm, do AJAX POST
  confirmSubmit.addEventListener('click', e => {
    e.preventDefault();
    confirmationModal.classList.add('hidden');
    const data = new FormData(feedbackForm);

    fetch(feedbackForm.action, {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: data
    })
    .then(res => {
      if (!res.ok) throw new Error('Network error');
      return res.json();
    })
    .then(json => {
      if (json.success) {
        successModal.classList.remove('hidden');
        feedbackForm.reset();
        ratingText.textContent = 'Click to rate your experience';
        ratingText.className   = 'text-gray-400 text-sm';
        charCount.textContent  = '0';
        charCount.className    = 'text-gray-500';
      } else if (json.error) {
        showNotification(json.error, 'error');
      }
    })
    .catch(() => {
      showNotification('An error occurred. Please try again.', 'error');
    });
  });

  // Close success modal
  successModal.querySelector('button').addEventListener('click', () => {
    successModal.classList.add('hidden');
  });

  // Click outside to close
  window.addEventListener('click', e => {
    if (e.target === confirmationModal) confirmationModal.classList.add('hidden');
    if (e.target === successModal)      successModal.classList.add('hidden');
  });
})();

