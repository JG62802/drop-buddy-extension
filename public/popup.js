// Popup script for Labubu Cart Automation Extension

document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
});

async function initializePopup() {
  console.log('Initializing popup...');
  
  // Get current tab info
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  updateCurrentSite(tab.url);
  
  // Load detected buttons
  loadDetectedButtons();
  
  // Set up event listeners
  setupEventListeners();
  
  // Load extension settings
  loadExtensionStatus();
}

function updateCurrentSite(url) {
  try {
    const hostname = new URL(url).hostname;
    const siteName = hostname.replace('www.', '');
    document.getElementById('currentSite').textContent = siteName;
  } catch (error) {
    document.getElementById('currentSite').textContent = 'Invalid URL';
  }
}

async function loadDetectedButtons() {
  try {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Request cart buttons from content script
    chrome.tabs.sendMessage(tab.id, { type: 'GET_CART_BUTTONS' }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Content script not available, checking storage...');
        loadButtonsFromStorage(tab.id);
      } else {
        displayButtons(response.buttons || []);
      }
    });
  } catch (error) {
    console.error('Error loading buttons:', error);
    displayButtons([]);
  }
}

async function loadButtonsFromStorage(tabId) {
  chrome.storage.local.get([`cartButtons_${tabId}`], (result) => {
    const data = result[`cartButtons_${tabId}`];
    if (data && data.buttons) {
      displayButtons(data.buttons);
    } else {
      displayButtons([]);
    }
  });
}

function displayButtons(buttons) {
  const buttonsList = document.getElementById('buttonsList');
  const buttonCount = document.getElementById('buttonCount');
  
  buttonCount.textContent = buttons.length;
  
  if (buttons.length === 0) {
    buttonsList.innerHTML = `
      <div class="no-buttons">
        No cart buttons detected on this page.<br>
        Try navigating to a product page.
      </div>
    `;
    return;
  }
  
  buttonsList.innerHTML = buttons.map((button, index) => `
    <div class="button-item">
      <div class="button-text" title="${button.text}">
        ${button.text || 'Unnamed Button'}
        ${button.product && button.product.name ? `<br><small>${button.product.name}</small>` : ''}
      </div>
      <button class="highlight-btn" onclick="highlightButton('${button.id}')">
        👁️ Show
      </button>
    </div>
  `).join('');
}

function setupEventListeners() {
  // Rescan button
  document.getElementById('rescanBtn').addEventListener('click', async () => {
    const button = document.getElementById('rescanBtn');
    const originalText = button.textContent;
    
    button.textContent = '🔄 Scanning...';
    button.disabled = true;
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.tabs.sendMessage(tab.id, { type: 'RESCAN_BUTTONS' }, (response) => {
        if (response && response.success) {
          displayButtons(response.buttons || []);
        }
        
        button.textContent = originalText;
        button.disabled = false;
      });
    } catch (error) {
      console.error('Error rescanning:', error);
      button.textContent = originalText;
      button.disabled = false;
    }
  });
  
  // Settings button
  document.getElementById('settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // Web app link
  document.getElementById('webAppLink').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:8080' }); // Update with your web app URL
  });
}

async function loadExtensionStatus() {
  try {
    chrome.storage.local.get(['extensionActive', 'automationEnabled'], (result) => {
      const isActive = result.extensionActive !== false;
      const statusElement = document.getElementById('extensionStatus');
      
      if (isActive) {
        statusElement.innerHTML = `
          Active
          <span class="status-indicator status-active"></span>
        `;
      } else {
        statusElement.innerHTML = `
          Inactive
          <span class="status-indicator status-inactive"></span>
        `;
      }
    });
  } catch (error) {
    console.error('Error loading extension status:', error);
  }
}

// Global function for highlighting buttons
window.highlightButton = async function(buttonId) {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, { 
      type: 'HIGHLIGHT_BUTTON', 
      data: { buttonId } 
    }, (response) => {
      if (response && response.success) {
        // Visual feedback in popup
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✨ Highlighted';
        
        setTimeout(() => {
          button.textContent = originalText;
        }, 2000);
      }
    });
  } catch (error) {
    console.error('Error highlighting button:', error);
  }
};

// Listen for storage changes to update UI
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    // Reload buttons if cart button data changed
    for (const key in changes) {
      if (key.startsWith('cartButtons_')) {
        loadDetectedButtons();
        break;
      }
    }
    
    // Update status if settings changed
    if (changes.extensionActive || changes.automationEnabled) {
      loadExtensionStatus();
    }
  }
});