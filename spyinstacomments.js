// Content script: runs in the context of instagram.com
// Exposes a function to load and search comments, returns structured data

async function cfLoadAllComments(delay = 1000) {
  let clickCount = 0;
  while (true) {
    const moreButton = document.querySelector('svg[aria-label="Load more comments"]')?.closest('button');
    if (!moreButton) break;
    moreButton.click();
    clickCount++;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return clickCount;
}

function cfSearchComments(searchTerm) {
  const commentBlocks = document.querySelectorAll('li._a9zj._a9zl');

  const matchedBlocks = Array.from(commentBlocks).filter(block => {
    const usernameEl = block.querySelector('h3 a');
    return usernameEl && usernameEl.textContent.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const results = matchedBlocks.map(block => {
    const username = block.querySelector('h3 a')?.textContent?.trim() || '';
    const comment = block.querySelector('div.xt0psk2 span')?.textContent?.trim() || '';
    return { username, comment };
  });

  return results;
}

async function cfRun(searchTerm) {
  const clicks = await cfLoadAllComments();
  const matches = cfSearchComments(searchTerm);
  return { clicks, matches };
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'RUN_SEARCH') {
    const term = (message.term || '').trim();
    if (!term) {
      sendResponse({ status: 'No term provided', matches: [] });
      return true;
    }
    cfRun(term).then(({ clicks, matches }) => {
      sendResponse({
        status: `Loaded all comments (clicked load more ${clicks} times). Found ${matches.length} match(es).`,
        matches
      });
    });
    return true; // keep the message channel open for async response
  }
});
