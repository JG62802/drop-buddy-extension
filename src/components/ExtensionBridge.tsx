import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";

// Simple type for extension APIs to avoid conflicts
interface ExtensionAPI {
  runtime?: {
    sendMessage: (message: any, callback?: (response: any) => void) => void;
    lastError?: { message: string };
  };
}

export interface ExtensionStatus {
  installed: boolean;
  active: boolean;
  version?: string;
}

export interface DetectedButton {
  id: string;
  selector: string;
  xpath: string;
  text: string;
  className: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  enabled: boolean;
  product: {
    name?: string;
    price?: string;
    sku?: string;
    image?: string;
    availability?: string;
  };
  timestamp: number;
}

export class ExtensionBridge {
  private static instance: ExtensionBridge;
  private toast: any;
  
  constructor(toast: any) {
    this.toast = toast;
  }
  
  static getInstance(toast?: any): ExtensionBridge {
    if (!ExtensionBridge.instance && toast) {
      ExtensionBridge.instance = new ExtensionBridge(toast);
    }
    return ExtensionBridge.instance;
  }
  
  // Check if extension is installed and active
  async checkExtensionStatus(): Promise<ExtensionStatus> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !(window as any).chrome?.runtime) {
        resolve({ installed: false, active: false });
        return;
      }
      
      try {
        // Try to communicate with the extension
        (window as any).chrome.runtime.sendMessage(
          { type: 'GET_EXTENSION_STATUS' },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              console.log('Extension not found:', (window as any).chrome.runtime.lastError.message);
              resolve({ installed: false, active: false });
            } else if (response && response.installed) {
              resolve({
                installed: true,
                active: response.active || true,
                version: response.version || '1.0.0'
              });
            } else {
              resolve({ installed: false, active: false });
            }
          }
        );
        
        // Timeout after 2 seconds
        setTimeout(() => {
          resolve({ installed: false, active: false });
        }, 2000);
      } catch (error) {
        console.error('Error checking extension status:', error);
        resolve({ installed: false, active: false });
      }
    });
  }
  
  // Send add to cart command to extension
  async addToCart(productId: string, selector?: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!(window as any).chrome?.runtime) {
        resolve({ success: false, error: 'Extension not available' });
        return;
      }
      
      try {
        (window as any).chrome.runtime.sendMessage(
          { 
            type: 'ADD_TO_CART', 
            productId, 
            selector 
          },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              resolve({ 
                success: false, 
                error: (window as any).chrome.runtime.lastError.message 
              });
            } else {
              resolve(response || { success: false, error: 'No response from extension' });
            }
          }
        );
        
        // Timeout after 10 seconds
        setTimeout(() => {
          resolve({ success: false, error: 'Add to cart operation timed out' });
        }, 10000);
      } catch (error) {
        console.error('Error sending add to cart command:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }
  
  // Get detected cart buttons from extension
  async getDetectedButtons(): Promise<DetectedButton[]> {
    return new Promise((resolve) => {
      if (!window.chrome?.runtime) {
        resolve([]);
        return;
      }
      
      try {
        (window as any).chrome.runtime.sendMessage(
          { type: 'DETECT_CART_BUTTONS' },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              console.log('Error getting buttons:', (window as any).chrome.runtime.lastError.message);
              resolve([]);
            } else if (response && response.buttons) {
              resolve(response.buttons);
            } else {
              resolve([]);
            }
          }
        );
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve([]);
        }, 5000);
      } catch (error) {
        console.error('Error getting detected buttons:', error);
        resolve([]);
      }
    });
  }
  
  // Update extension settings
  async updateSettings(settings: any): Promise<boolean> {
    return new Promise((resolve) => {
      if (!window.chrome?.runtime) {
        resolve(false);
        return;
      }
      
      try {
        (window as any).chrome.runtime.sendMessage(
          { type: 'UPDATE_SETTINGS', settings },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(response?.success || false);
            }
          }
        );
        
        // Timeout after 3 seconds
        setTimeout(() => {
          resolve(false);
        }, 3000);
      } catch (error) {
        console.error('Error updating extension settings:', error);
        resolve(false);
      }
    });
  }
  
  // Toggle auto-checkout mode
  async toggleAutoCheckout(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!(window as any).chrome?.runtime) {
        resolve({ success: false, error: 'Extension not available' });
        return;
      }
      
      try {
        (window as any).chrome.runtime.sendMessage(
          { 
            type: 'TOGGLE_AUTO_CHECKOUT',
            data: { enabled }
          },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              resolve({ 
                success: false, 
                error: (window as any).chrome.runtime.lastError.message 
              });
            } else {
              resolve(response || { success: false, error: 'No response from extension' });
            }
          }
        );
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve({ success: false, error: 'Toggle auto-checkout timed out' });
        }, 5000);
      } catch (error) {
        console.error('Error toggling auto-checkout:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }
  
  // Store payment information
  async storePaymentInfo(paymentInfo: any): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      if (!(window as any).chrome?.runtime) {
        resolve({ success: false, error: 'Extension not available' });
        return;
      }
      
      try {
        (window as any).chrome.runtime.sendMessage(
          { 
            type: 'STORE_PAYMENT_INFO',
            data: { paymentInfo }
          },
          (response: any) => {
            if ((window as any).chrome.runtime.lastError) {
              resolve({ 
                success: false, 
                error: (window as any).chrome.runtime.lastError.message 
              });
            } else {
              resolve(response || { success: false, error: 'No response from extension' });
            }
          }
        );
        
        // Timeout after 5 seconds
        setTimeout(() => {
          resolve({ success: false, error: 'Store payment info timed out' });
        }, 5000);
      } catch (error) {
        console.error('Error storing payment info:', error);
        resolve({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });
  }

  // Listen for extension events
  setupEventListeners(callbacks: {
    onButtonsDetected?: (buttons: DetectedButton[]) => void;
    onCartAction?: (result: any) => void;
  }) {
    if (!window.chrome?.runtime) {
      return;
    }
    
    try {
      // Set up message listener for extension events
      (window as any).chrome.runtime.onMessage?.addListener?.((message: any, sender: any, sendResponse: any) => {
        if (message.type === 'BUTTONS_DETECTED' && callbacks.onButtonsDetected) {
          callbacks.onButtonsDetected(message.buttons || []);
        } else if (message.type === 'CART_ACTION_RESULT' && callbacks.onCartAction) {
          callbacks.onCartAction(message.result);
        }
      });
      
      console.log('Extension event listeners set up');
    } catch (error) {
      console.error('Error setting up extension listeners:', error);
    }
  }
}

// React hook for using the extension bridge
export function useExtensionBridge() {
  const { toast } = useToast();
  const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus>({
    installed: false,
    active: false
  });
  const [detectedButtons, setDetectedButtons] = useState<DetectedButton[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const bridge = ExtensionBridge.getInstance(toast);
  
  // Check extension status on mount
  useEffect(() => {
    checkStatus();
  }, []);
  
  // Set up event listeners
  useEffect(() => {
    if (extensionStatus.installed) {
      bridge.setupEventListeners({
        onButtonsDetected: (buttons) => {
          setDetectedButtons(buttons);
          toast({
            title: "Cart Buttons Detected",
            description: `Found ${buttons.length} cart buttons on current page`,
            duration: 3000,
          });
        },
        onCartAction: (result) => {
          if (result.success) {
            toast({
              title: "Added to Cart",
              description: "Product successfully added to cart",
              duration: 3000,
            });
          } else {
            toast({
              title: "Cart Action Failed",
              description: result.error || "Failed to add product to cart",
              variant: "destructive",
              duration: 5000,
            });
          }
        }
      });
    }
  }, [extensionStatus.installed, toast]);
  
  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const status = await bridge.checkExtensionStatus();
      setExtensionStatus(status);
      
      if (status.installed && status.active) {
        // Load detected buttons
        const buttons = await bridge.getDetectedButtons();
        setDetectedButtons(buttons);
      }
    } catch (error) {
      console.error('Error checking extension status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const addToCart = async (productId: string, selector?: string) => {
    if (!extensionStatus.installed) {
      toast({
        title: "Extension Required",
        description: "Please install the Labubu Cart Extension to use automation features",
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, error: 'Extension not installed' };
    }
    
    return await bridge.addToCart(productId, selector);
  };
  
  const updateExtensionSettings = async (settings: any) => {
    if (!extensionStatus.installed) {
      return false;
    }
    
    return await bridge.updateSettings(settings);
  };
  
  const refreshButtons = async () => {
    if (extensionStatus.installed) {
      const buttons = await bridge.getDetectedButtons();
      setDetectedButtons(buttons);
    }
  };
  
  const toggleAutoCheckout = async (enabled: boolean) => {
    if (!extensionStatus.installed) {
      toast({
        title: "Extension Required",
        description: "Please install the Labubu Cart Extension to use this feature",
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, error: 'Extension not installed' };
    }
    
    return await bridge.toggleAutoCheckout(enabled);
  };
  
  const storePaymentInfo = async (paymentInfo: any) => {
    if (!extensionStatus.installed) {
      toast({
        title: "Extension Required",
        description: "Please install the Labubu Cart Extension to use this feature",
        variant: "destructive",
        duration: 5000,
      });
      return { success: false, error: 'Extension not installed' };
    }
    
    return await bridge.storePaymentInfo(paymentInfo);
  };
  
  return {
    extensionStatus,
    detectedButtons,
    isLoading,
    addToCart,
    updateExtensionSettings,
    refreshButtons,
    checkStatus,
    toggleAutoCheckout,
    storePaymentInfo
  };
}