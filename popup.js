// Popup script: sends a message to the content script on the active tab
(function initPopup() {
  const runButton = document.getElementById('runSearch');
  const searchInput = document.getElementById('searchTerm');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');

  // Set initial status
  setStatus('Ready to search! Make sure you\'re on an Instagram post.');

  function setStatus(text, type = '') {
    statusEl.textContent = text || '';
    statusEl.className = `status ${type}`;
  }

  function setLoading(isLoading) {
    if (isLoading) {
      runButton.disabled = true;
      runButton.innerHTML = `
        <div class="loading-spinner"></div>
        Searching...
      `;
    } else {
      runButton.disabled = false;
      runButton.innerHTML = `
        <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        Search Comments
      `;
    }
  }

  function renderResults(items) {
    resultsEl.innerHTML = '';
    resultsEl.style.display = 'block';
    
    if (!items || items.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 8px;">🔍</div>
        <div>No matches found on this post.</div>
        <div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">Try a different username or check if the post has comments.</div>
      `;
      resultsEl.appendChild(noResults);
      return;
    }

    items.forEach((item, idx) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      resultItem.innerHTML = `
        <div class="username">@${item.username}</div>
        <div class="comment">${item.comment}</div>
      `;
      resultsEl.appendChild(resultItem);
    });
  }

  async function sendSearch() {
    const term = (searchInput.value || '').trim();
    if (!term) {
      setStatus('Please enter a username to search.', 'error');
      return;
    }

    // Check if we're on Instagram
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes('instagram.com')) {
        setStatus('Please open an Instagram post first.', 'error');
        return;
      }
      
      // Check if it's specifically a post page
      if (!tab.url.includes('/p/') && !tab.url.includes('/reel/')) {
        setStatus('Please navigate to a specific Instagram post or reel.', 'error');
        return;
      }
    } catch (err) {
      setStatus('Unable to detect current tab.', 'error');
      return;
    }

    setLoading(true);
    setStatus('Searching comments... This may take a moment.', 'loading');
    renderResults([]);

    try {
      console.log('[CommentFinder][popup] Querying active tab…');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      console.log('[CommentFinder][popup] Sending RUN_SEARCH to tab', tab.id, 'url=', tab.url);
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'RUN_SEARCH', term });
      console.log('[CommentFinder][popup] Received response', response);
      
      if (!response) {
        setStatus('No response from page. Make sure you\'re on an Instagram post.', 'error');
        return;
      }

      const matches = response.matches || [];
      if (matches.length > 0) {
        setStatus(`Found ${matches.length} comment${matches.length === 1 ? '' : 's'} by @${term}`, 'success');
      } else {
        setStatus(`No comments found by @${term}`, 'success');
      }
      
      renderResults(matches);
    } catch (err) {
      console.error('[CommentFinder][popup] Error while sending message', err);
      if (err.message && err.message.includes('Receiving end does not exist')) {
        setStatus('Extension not loaded on this page. Please refresh the Instagram page and try again.', 'error');
      } else if (err.message && err.message.includes('Could not establish connection')) {
        setStatus('Connection failed. Please refresh the Instagram page and try again.', 'error');
      } else {
        setStatus('Error: ' + (err && err.message ? err.message : String(err)), 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  // Add Enter key support
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendSearch();
    }
  });

  // Add click listener
  runButton.addEventListener('click', sendSearch);

  // Focus the input on load
  searchInput.focus();
})();