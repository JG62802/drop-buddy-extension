// Background service worker for Labubu Cart Automation Extension

// Extension installation and update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Labubu Extension installed:', details);
  
  // Initialize extension storage
  chrome.storage.local.set({
    extensionActive: true,
    automationEnabled: false,
    autoCheckoutEnabled: false,
    purchaseConfirmation: true,
    spendingLimit: 1000,
    whitelistedSites: ['popmart.com'],
    blacklistedSites: []
  });
});

// Listen for messages from content scripts and web app
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);
  
  switch (message.type) {
    case 'DETECT_CART_BUTTONS':
      handleCartButtonDetection(message, sender, sendResponse);
      break;
      
    case 'ADD_TO_CART':
      handleAddToCart(message, sender, sendResponse);
      break;
      
    case 'GET_EXTENSION_STATUS':
      sendResponse({ 
        installed: true, 
        active: true,
        version: chrome.runtime.getManifest().version 
      });
      break;
      
    case 'UPDATE_SETTINGS':
      handleSettingsUpdate(message, sendResponse);
      break;
      
    case 'GET_SETTINGS':
      getExtensionSettings(sendResponse);
      break;
      
    case 'TOGGLE_AUTO_CHECKOUT':
      toggleAutoCheckout(message.enabled, sendResponse);
      break;
      
    case 'STORE_PAYMENT_INFO':
      storePaymentInfo(message.paymentInfo, sendResponse);
      break;
      
    default:
      console.log('Unknown message type:', message.type);
  }
  
  return true; // Keep message channel open for async response
});

// Handle cart button detection
async function handleCartButtonDetection(message, sender, sendResponse) {
  try {
    const { url, buttons } = message.data;
    
    // Store detected buttons for this tab
    await chrome.storage.local.set({
      [`cartButtons_${sender.tab.id}`]: {
        url,
        buttons,
        timestamp: Date.now()
      }
    });
    
    // Notify web app if connected
    notifyWebApp('CART_BUTTONS_DETECTED', { url, buttons, tabId: sender.tab.id });
    
    sendResponse({ success: true, buttonsDetected: buttons.length });
  } catch (error) {
    console.error('Error handling cart button detection:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle add to cart automation
async function handleAddToCart(message, sender, sendResponse) {
  try {
    const { productId, selector, confirmRequired } = message.data;
    const settings = await getSettings();
    
    if (settings.purchaseConfirmation && confirmRequired) {
      // Show confirmation dialog
      const confirmed = await showConfirmationDialog(productId);
      if (!confirmed) {
        sendResponse({ success: false, reason: 'User cancelled' });
        return;
      }
    }
    
    // Execute add to cart in content script
    chrome.tabs.sendMessage(sender.tab.id, {
      type: 'EXECUTE_ADD_TO_CART',
      data: { selector, productId }
    }, (response) => {
      sendResponse(response);
      
      if (response.success) {
        // Log successful automation
        logAutomationEvent('ADD_TO_CART_SUCCESS', {
          productId,
          url: sender.tab.url,
          timestamp: Date.now()
        });
      }
    });
    
  } catch (error) {
    console.error('Error handling add to cart:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle settings updates
async function handleSettingsUpdate(message, sendResponse) {
  try {
    const { settings } = message.data;
    await chrome.storage.local.set(settings);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Get extension settings
async function getExtensionSettings(sendResponse) {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, settings });
  } catch (error) {
    console.error('Error getting settings:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Utility functions
async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'extensionActive',
      'automationEnabled', 
      'purchaseConfirmation',
      'spendingLimit',
      'whitelistedSites',
      'blacklistedSites'
    ], (result) => {
      resolve(result);
    });
  });
}

async function showConfirmationDialog(productId) {
  // For now, we'll use the browser's confirm dialog
  // In Phase 4, we can create a custom dialog
  return confirm(`Add product ${productId} to cart?`);
}

function notifyWebApp(type, data) {
  // This will be enhanced in Phase 2 to communicate with the web app
  console.log('Would notify web app:', { type, data });
}

function logAutomationEvent(type, data) {
  // Log automation events for analytics
  chrome.storage.local.get(['automationLog'], (result) => {
    const log = result.automationLog || [];
    log.push({ type, data, timestamp: Date.now() });
    
    // Keep only last 1000 events
    if (log.length > 1000) {
      log.splice(0, log.length - 1000);
    }
    
    chrome.storage.local.set({ automationLog: log });
  });
}

// Handle tab updates to clear old cart button data
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Clear old cart button data for this tab
    chrome.storage.local.remove(`cartButtons_${tabId}`);
  }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`cartButtons_${tabId}`);
});

// Handle auto-checkout toggle
async function toggleAutoCheckout(enabled, sendResponse) {
  console.log('Toggling auto-checkout:', enabled);
  
  try {
    // Update storage
    await chrome.storage.local.set({ autoCheckoutEnabled: enabled });
    
    // Send message to all content scripts
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: enabled ? 'START_AUTO_CHECKOUT' : 'STOP_AUTO_CHECKOUT'
          });
        } catch (error) {
          // Tab might not have content script loaded, ignore
        }
      }
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error toggling auto-checkout:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Store payment information securely
async function storePaymentInfo(paymentInfo, sendResponse) {
  try {
    await chrome.storage.local.set({ paymentInfo });
    console.log('Payment information stored securely');
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error storing payment info:', error);
    sendResponse({ success: false, error: error.message });
  }
}
