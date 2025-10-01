(() => {
  try { 
    console.log('[CommentFinder][content] Script loaded on', location.href);
    // Don't auto-run anything - only respond to popup messages
  } catch (_) {}
})();
// Delegate to logic in spyinstacomments.js (kept for your reference) or inline the code here

async function cfLoadAllComments(delay = 1000) {
  // Wait for page to be fully loaded
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check if we're in profile view (overlay) or dedicated post page
  const isProfileView = !location.pathname.startsWith('/p/');
  console.log('[CommentFinder][content] Page type:', isProfileView ? 'Profile view (overlay)' : 'Dedicated post page');

  // Find the comments container - different selectors for different views
  let commentsContainer;
  
  if (isProfileView) {
    // In profile view, comments might be in a different structure
    commentsContainer = document.querySelector('ul[role="list"]') || 
                       document.querySelector('div[role="dialog"] ul') ||
                       document.querySelector('article ul');
  } else {
    // In dedicated post page, use the standard selector
    commentsContainer = document.querySelector('ul[role="list"]');
  }
  
  if (commentsContainer) {
    console.log('[CommentFinder][content] Found comments container, scrolling within it...');
    // Scroll within the comments container to trigger lazy loading
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Try scrolling a bit more to ensure all comments are loaded
    commentsContainer.scrollTop = commentsContainer.scrollHeight;
    await new Promise(resolve => setTimeout(resolve, 500));
  } else {
    console.log('[CommentFinder][content] Could not find comments container, trying fallback...');
    // Fallback: try to find any scrollable container within the post
    const postElement = document.querySelector('article') || document.querySelector('[role="main"]');
    if (postElement) {
      postElement.scrollIntoView();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  let clickCount = 0;
  while (true) {
    const moreButton = document.querySelector('svg[aria-label="Load more comments"]')?.closest('button');
    if (!moreButton) break;
    moreButton.click();
    clickCount++;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  console.log('[CommentFinder][content] ✅ Loaded all comments (clicked "load more" ' + clickCount + ' times)');
  return clickCount;
}

function cfSearchComments(searchTerm) {
  // Use the exact selectors from the known-working console script
  let commentBlocks = document.querySelectorAll('li._a9zj._a9zl');
  if (!commentBlocks || commentBlocks.length === 0) {
    console.log('[CommentFinder][content] Primary selector found 0 blocks; trying fallback scan.');
    // Fallback: any li inside article that contains an h3
    const allLis = Array.from(document.querySelectorAll('article li'));
    commentBlocks = allLis.filter(li => li.querySelector('h3'));
  }

  const blocksArray = Array.from(commentBlocks);
  const matches = blocksArray.filter(block => {
    const usernameEl = block.querySelector('h3 a');
    return usernameEl && usernameEl.textContent.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const results = matches.map(block => {
    const username = block.querySelector('h3 a')?.textContent?.trim() || '';
    const comment = block.querySelector('div.xt0psk2 span')?.textContent?.trim() || '';
    return { username, comment };
  });

  console.log('[CommentFinder][content] total blocks =', blocksArray.length, '| matches =', results.length);
  return { results, totalBlocks: blocksArray.length };
}

async function cfRun(searchTerm) {
  const clicks = await cfLoadAllComments();
  const { results, totalBlocks } = cfSearchComments(searchTerm);
  return { clicks, matches: results, totalBlocks };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === 'RUN_SEARCH') {
    console.log('[CommentFinder][content] RUN_SEARCH received', message);
    const term = (message.term || '').trim();
    if (!term) {
      sendResponse({ status: 'No term provided', matches: [] });
      return true;
    }
    cfRun(term).then(({ clicks, matches, totalBlocks }) => {
      console.log('[CommentFinder][content] Completed search:', { clicks, totalBlocks, matches });
      sendResponse({
        status: `Loaded all comments (clicked load more ${clicks} times). Scanned ${totalBlocks} blocks. Found ${matches.length} match(es).`,
        matches
      });
    });
    return true;
  }
});


