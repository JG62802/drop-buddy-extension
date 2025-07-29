// Content script for detecting and interacting with cart buttons on e-commerce sites

(function() {
  'use strict';
  
  // Configuration for different e-commerce platforms
  const ECOMMERCE_SELECTORS = {
    // Generic selectors that work across many sites
    generic: [
      'button[class*="add-to-cart"]',
      'button[class*="addtocart"]', 
      'button[class*="buy-now"]',
      'button[class*="purchase"]',
      'input[value*="Add to Cart"]',
      'button:contains("Add to Cart")',
      'button:contains("Buy Now")',
      'button:contains("Purchase")',
      'button[data-action*="cart"]',
      'button[data-testid*="cart"]'
    ],
    
    // Site-specific selectors for major platforms
    shopify: [
      'button[name="add"]',
      'button.btn-product-form',
      'input.btn-product-form',
      'button[data-action="add-to-cart"]'
    ],
    
    woocommerce: [
      'button.single_add_to_cart_button',
      'button.product_type_simple'
    ],
    
    magento: [
      'button#product-addtocart-button',
      'button.action.primary.tocart'
    ],
    
    // PopMart specific (for Labubu monitoring)
    popmart: [
      'button[class*="add-to-cart"]',
      'button[class*="buy-button"]',
      '.product-buy-button',
      '.add-cart-btn'
    ]
  };
  
  // State management
  let detectedButtons = [];
  let isMonitoring = false;
  let observer = null;
  
  // Initialize content script
  initialize();
  
  function initialize() {
    console.log('Labubu Cart Automation: Content script loaded');
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
      startMonitoring();
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(handleMessage);
  }
  
  function startMonitoring() {
    console.log('Starting cart button monitoring on:', window.location.href);
    
    // Initial scan
    scanForCartButtons();
    
    // Set up mutation observer for dynamic content
    setupMutationObserver();
    
    // Periodic rescanning for SPA sites
    setInterval(scanForCartButtons, 5000);
    
    isMonitoring = true;
  }
  
  function scanForCartButtons() {
    const newButtons = [];
    const currentUrl = window.location.href;
    
    // Detect platform type
    const platform = detectPlatform(currentUrl);
    console.log('Detected platform:', platform);
    
    // Get appropriate selectors
    const selectors = getSelectorsForPlatform(platform);
    
    // Scan for buttons using all selectors
    selectors.forEach(selector => {
      try {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
          if (isValidCartButton(button)) {
            const buttonInfo = extractButtonInfo(button, selector);
            if (buttonInfo && !isDuplicateButton(buttonInfo, newButtons)) {
              newButtons.push(buttonInfo);
            }
          }
        });
      } catch (error) {
        console.log('Error with selector:', selector, error);
      }
    });
    
    // Additional text-based detection
    const textBasedButtons = findButtonsByText();
    textBasedButtons.forEach(button => {
      if (!isDuplicateButton(button, newButtons)) {
        newButtons.push(button);
      }
    });
    
    // Update detected buttons if changed
    if (newButtons.length !== detectedButtons.length || 
        !arraysEqual(newButtons, detectedButtons)) {
      detectedButtons = newButtons;
      reportDetectedButtons();
    }
  }
  
  function detectPlatform(url) {
    if (url.includes('popmart.com')) return 'popmart';
    if (url.includes('shopify')) return 'shopify';
    if (document.querySelector('meta[name="generator"][content*="WooCommerce"]')) return 'woocommerce';
    if (document.querySelector('script[src*="mage"]')) return 'magento';
    
    // Check for common platform indicators
    const bodyClasses = document.body.className.toLowerCase();
    if (bodyClasses.includes('shopify')) return 'shopify';
    if (bodyClasses.includes('woocommerce')) return 'woocommerce';
    
    return 'generic';
  }
  
  function getSelectorsForPlatform(platform) {
    const selectors = [...ECOMMERCE_SELECTORS.generic];
    
    if (ECOMMERCE_SELECTORS[platform]) {
      selectors.unshift(...ECOMMERCE_SELECTORS[platform]);
    }
    
    return selectors;
  }
  
  function isValidCartButton(element) {
    if (!element || !element.offsetParent) return false; // Hidden elements
    
    const text = element.textContent.toLowerCase();
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    // Check for cart-related keywords
    const cartKeywords = ['add to cart', 'add to bag', 'buy now', 'purchase', 'order now', 'add cart'];
    const hasCartKeyword = cartKeywords.some(keyword => 
      text.includes(keyword) || className.includes(keyword.replace(/\s/g, '')) || id.includes(keyword.replace(/\s/g, ''))
    );
    
    // Exclude obvious non-cart buttons
    const excludeKeywords = ['remove', 'delete', 'cancel', 'close', 'back', 'continue shopping'];
    const hasExcludeKeyword = excludeKeywords.some(keyword => 
      text.includes(keyword) || className.includes(keyword) || id.includes(keyword)
    );
    
    return hasCartKeyword && !hasExcludeKeyword;
  }
  
  function extractButtonInfo(button, selector) {
    try {
      const rect = button.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(button);
      
      // Extract product information from nearby elements
      const productInfo = extractProductInfo(button);
      
      return {
        id: generateButtonId(button),
        selector: selector,
        xpath: getXPath(button),
        text: button.textContent.trim(),
        className: button.className,
        position: {
          x: rect.left + window.scrollX,
          y: rect.top + window.scrollY,
          width: rect.width,
          height: rect.height
        },
        visible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        enabled: !button.disabled,
        product: productInfo,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error extracting button info:', error);
      return null;
    }
  }
  
  function extractProductInfo(button) {
    const productInfo = {
      name: null,
      price: null,
      sku: null,
      image: null,
      availability: null
    };
    
    // Look for product information in nearby elements
    const container = button.closest('.product, .item, [class*="product"], [data-product]') || 
                     button.closest('form') || 
                     button.parentElement;
    
    if (container) {
      // Product name
      const nameSelectors = [
        'h1', 'h2', 'h3', '.product-title', '.product-name', 
        '[class*="title"]', '[class*="name"]', '.item-title'
      ];
      
      for (const selector of nameSelectors) {
        const nameEl = container.querySelector(selector);
        if (nameEl && nameEl.textContent.trim()) {
          productInfo.name = nameEl.textContent.trim();
          break;
        }
      }
      
      // Price
      const priceSelectors = [
        '.price', '[class*="price"]', '.cost', '[class*="cost"]',
        '.amount', '[data-price]', '.money'
      ];
      
      for (const selector of priceSelectors) {
        const priceEl = container.querySelector(selector);
        if (priceEl && priceEl.textContent.match(/[\$£€¥₹]/)) {
          productInfo.price = priceEl.textContent.trim();
          break;
        }
      }
      
      // SKU or product ID
      const skuElement = container.querySelector('[data-sku], [data-product-id], [data-variant-id]');
      if (skuElement) {
        productInfo.sku = skuElement.dataset.sku || 
                         skuElement.dataset.productId || 
                         skuElement.dataset.variantId;
      }
      
      // Product image
      const imgElement = container.querySelector('img');
      if (imgElement && imgElement.src) {
        productInfo.image = imgElement.src;
      }
    }
    
    return productInfo;
  }
  
  function findButtonsByText() {
    const buttons = [];
    const textPatterns = [
      /add to cart/i,
      /add to bag/i, 
      /buy now/i,
      /purchase/i,
      /order now/i
    ];
    
    // Find buttons by text content
    const allButtons = document.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]');
    
    allButtons.forEach(button => {
      const text = button.textContent || button.value || '';
      if (textPatterns.some(pattern => pattern.test(text)) && isValidCartButton(button)) {
        const buttonInfo = extractButtonInfo(button, 'text-based');
        if (buttonInfo) {
          buttons.push(buttonInfo);
        }
      }
    });
    
    return buttons;
  }
  
  function setupMutationObserver() {
    if (observer) {
      observer.disconnect();
    }
    
    observer = new MutationObserver((mutations) => {
      let shouldRescan = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any added nodes contain buttons
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const hasButtons = node.tagName === 'BUTTON' || 
                               node.querySelector && node.querySelector('button, input[type="button"], input[type="submit"]');
              if (hasButtons) {
                shouldRescan = true;
              }
            }
          });
        }
      });
      
      if (shouldRescan) {
        setTimeout(scanForCartButtons, 1000); // Debounce rescanning
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  function reportDetectedButtons() {
    console.log(`Detected ${detectedButtons.length} cart buttons:`, detectedButtons);
    
    // Send to background script
    chrome.runtime.sendMessage({
      type: 'DETECT_CART_BUTTONS',
      data: {
        url: window.location.href,
        buttons: detectedButtons,
        timestamp: Date.now()
      }
    });
  }
  
  function handleMessage(message, sender, sendResponse) {
    console.log('Content script received message:', message);
    
    switch (message.type) {
      case 'GET_CART_BUTTONS':
        sendResponse({ buttons: detectedButtons });
        break;
        
      case 'EXECUTE_ADD_TO_CART':
        executeAddToCart(message.data, sendResponse);
        break;
        
      case 'HIGHLIGHT_BUTTON':
        highlightButton(message.data.buttonId);
        sendResponse({ success: true });
        break;
        
      case 'RESCAN_BUTTONS':
        scanForCartButtons();
        sendResponse({ success: true, buttons: detectedButtons });
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
    
    return true;
  }
  
  function executeAddToCart(data, sendResponse) {
    const { selector, productId, buttonId } = data;
    
    try {
      let button = null;
      
      // Find button by ID first
      if (buttonId) {
        button = detectedButtons.find(b => b.id === buttonId);
        if (button) {
          // Get actual DOM element
          button = document.evaluate(
            button.xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
        }
      }
      
      // Fallback to selector
      if (!button && selector) {
        button = document.querySelector(selector);
      }
      
      if (!button) {
        sendResponse({ 
          success: false, 
          error: 'Button not found',
          details: { selector, productId, buttonId }
        });
        return;
      }
      
      // Check if button is still valid and clickable
      if (button.disabled || !button.offsetParent) {
        sendResponse({ 
          success: false, 
          error: 'Button is disabled or hidden' 
        });
        return;
      }
      
      // Simulate human-like interaction
      setTimeout(() => {
        // Scroll button into view
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        setTimeout(() => {
          // Trigger click events
          button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
          button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
          button.click();
          
          // Check for success indicators
          setTimeout(() => {
            const success = checkAddToCartSuccess();
            sendResponse({ 
              success: true, 
              addedToCart: success,
              timestamp: Date.now() 
            });
          }, 1000);
          
        }, 500);
      }, 200);
      
    } catch (error) {
      console.error('Error executing add to cart:', error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }
  
  function checkAddToCartSuccess() {
    // Look for common success indicators
    const successIndicators = [
      '.cart-notification',
      '.add-to-cart-success', 
      '.product-added',
      '[class*="success"]',
      '.notification',
      '.alert-success'
    ];
    
    for (const selector of successIndicators) {
      const element = document.querySelector(selector);
      if (element && element.offsetParent) {
        return true;
      }
    }
    
    // Check if cart count increased
    const cartCounters = document.querySelectorAll('[class*="cart-count"], [class*="cart-counter"], .cart-qty');
    // This would need more sophisticated logic to track count changes
    
    return false; // Conservative approach
  }
  
  function highlightButton(buttonId) {
    const button = detectedButtons.find(b => b.id === buttonId);
    if (button) {
      const element = document.evaluate(
        button.xpath,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      
      if (element) {
        // Add highlight effect
        element.style.outline = '3px solid #ff6b6b';
        element.style.outlineOffset = '2px';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Remove highlight after 3 seconds
        setTimeout(() => {
          element.style.outline = '';
          element.style.outlineOffset = '';
        }, 3000);
      }
    }
  }
  
  // Utility functions
  function generateButtonId(button) {
    const text = button.textContent.trim().replace(/\s+/g, '-').toLowerCase();
    const className = button.className.replace(/\s+/g, '-');
    const position = button.getBoundingClientRect();
    
    return `btn-${text.substring(0, 20)}-${className.substring(0, 20)}-${Math.round(position.x)}-${Math.round(position.y)}`;
  }
  
  function getXPath(element) {
    if (element.id !== '') {
      return 'id("' + element.id + '")';
    }
    if (element === document.body) {
      return '/html/body';
    }
    
    let ix = 0;
    const siblings = element.parentNode.childNodes;
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling === element) {
        return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
      }
      if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
        ix++;
      }
    }
  }
  
  function isDuplicateButton(buttonInfo, existingButtons) {
    return existingButtons.some(existing => 
      existing.text === buttonInfo.text && 
      Math.abs(existing.position.x - buttonInfo.position.x) < 10 &&
      Math.abs(existing.position.y - buttonInfo.position.y) < 10
    );
  }
  
  function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => item.id === b[index].id);
  }
  
})();