// Popup script: sends a message to the content script on the active tab
(function initPopup() {
  const runButton = document.getElementById('runSearch');
  const searchInput = document.getElementById('searchTerm');
  const statusEl = document.getElementById('status');
  const resultsEl = document.getElementById('results');

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function renderResults(items) {
    resultsEl.innerHTML = '';
    if (!items || items.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No matches found on this post.';
      resultsEl.appendChild(li);
      return;
    }
    items.forEach((it, idx) => {
      const li = document.createElement('li');
      li.textContent = `${idx + 1}: @${it.username}: "${it.comment}"`;
      resultsEl.appendChild(li);
    });
  }

  async function sendSearch() {
    const term = (searchInput.value || '').trim();
    if (!term) {
      setStatus('Enter a username to search.');
      return;
    }
    setStatus('Searching… Make sure an Instagram post is open.');
    renderResults([]);

    try {
      console.log('[CommentFinder][popup] Querying active tab…');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        setStatus('No active tab.');
        return;
      }

      console.log('[CommentFinder][popup] Sending RUN_SEARCH to tab', tab.id, 'url=', tab.url);
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'RUN_SEARCH', term });
      console.log('[CommentFinder][popup] Received response', response);
      if (!response) {
        setStatus('No response from page. Is Instagram open?');
        return;
      }
      setStatus(response.status || 'Done');
      renderResults(response.matches || []);
    } catch (err) {
      console.error('[CommentFinder][popup] Error while sending message', err);
      setStatus('Error: ' + (err && err.message ? err.message : String(err)));
    }
  }

  runButton.addEventListener('click', sendSearch);
})();