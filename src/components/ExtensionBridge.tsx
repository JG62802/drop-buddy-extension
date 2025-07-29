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
        // For now, we'll simulate extension detection
        // In real implementation, you'd check for actual extension ID
        const isExtensionContext = window.location.protocol === 'chrome-extension:' || 
                                  window.location.protocol === 'moz-extension:';
        
        if (isExtensionContext) {
          resolve({ installed: true, active: true, version: '1.0.0' });
        } else {
          // Simulate checking for extension presence
          // This would be replaced with actual extension communication
          resolve({ installed: false, active: false });
        }
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
        // Simulate add to cart for demo purposes
        // In real implementation, this would send message to extension
        setTimeout(() => {
          const success = Math.random() > 0.2; // 80% success rate for demo
          resolve({
            success,
            error: success ? undefined : 'Simulated cart action failed'
          });
        }, 1000);
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
        // Simulate detected buttons for demo purposes
        const mockButtons: DetectedButton[] = [
          {
            id: 'btn-add-to-cart-1',
            selector: 'button.add-to-cart',
            xpath: '//*[@id="add-to-cart-btn"]',
            text: 'Add to Cart',
            className: 'btn btn-primary add-to-cart',
            position: { x: 200, y: 400, width: 120, height: 40 },
            visible: true,
            enabled: true,
            product: {
              name: 'Sample Product',
              price: '$29.99',
              sku: 'PROD-001'
            },
            timestamp: Date.now() - 30000
          }
        ];
        
        resolve(mockButtons);
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
        // Simulate settings update for demo
        setTimeout(() => {
          resolve(true);
        }, 500);
      } catch (error) {
        console.error('Error updating extension settings:', error);
        resolve(false);
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
      // Simulate event listening for demo
      // In real implementation, this would set up actual message listeners
      console.log('Extension event listeners set up (simulated)');
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
  
  return {
    extensionStatus,
    detectedButtons,
    isLoading,
    addToCart,
    updateExtensionSettings,
    refreshButtons,
    checkStatus
  };
}