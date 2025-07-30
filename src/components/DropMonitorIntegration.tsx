import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useExtensionBridge } from './ExtensionBridge';
import { Webhook, MessageSquare, Database, Zap } from 'lucide-react';

interface DropAlert {
  id: string;
  productName: string;
  productUrl: string;
  timestamp: number;
  processed: boolean;
}

export function DropMonitorIntegration() {
  const { toast } = useToast();
  const { addToCart, extensionStatus } = useExtensionBridge();
  
  // States for different integration methods
  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoProcess, setAutoProcess] = useState(false);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState(false);
  const [dropAlerts, setDropAlerts] = useState<DropAlert[]>([]);
  const [isListening, setIsListening] = useState(false);

  // Webhook endpoint simulation
  const [serverUrl] = useState('http://localhost:3001'); // You'd deploy this

  useEffect(() => {
    // Listen for storage changes (for browser storage integration)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'labubu_drop_alert') {
        const alert = JSON.parse(e.newValue || '{}');
        handleNewDrop(alert);
      }
    };

    // Listen for custom events (for same-page integration)
    const handleDropEvent = (e: CustomEvent) => {
      handleNewDrop(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('labubu-drop-detected', handleDropEvent as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('labubu-drop-detected', handleDropEvent as EventListener);
    };
  }, [autoProcess]);

  const handleNewDrop = async (alert: any) => {
    const dropAlert: DropAlert = {
      id: Date.now().toString(),
      productName: alert.productName || 'Unknown Labubu',
      productUrl: alert.productUrl || alert.url,
      timestamp: Date.now(),
      processed: false
    };

    setDropAlerts(prev => [dropAlert, ...prev.slice(0, 9)]); // Keep last 10

    toast({
      title: "🎯 Labubu Drop Detected!",
      description: `${dropAlert.productName} is now available`,
      duration: 5000,
    });

    if (autoProcess && extensionStatus.installed) {
      await processDropAlert(dropAlert);
    }
  };

  const processDropAlert = async (alert: DropAlert) => {
    try {
      // Navigate to product page
      window.open(alert.productUrl, '_blank');
      
      // Add to cart after a delay to allow page load
      setTimeout(async () => {
        const result = await addToCart(alert.id);
        
        setDropAlerts(prev => 
          prev.map(a => a.id === alert.id ? { ...a, processed: true } : a)
        );

        if (result.success) {
          toast({
            title: "✅ Auto-Purchase Successful",
            description: `${alert.productName} added to cart automatically`,
            duration: 5000,
          });
        } else {
          toast({
            title: "❌ Auto-Purchase Failed", 
            description: `Failed to add ${alert.productName} to cart`,
            variant: "destructive",
            duration: 5000,
          });
        }
      }, 3000);
    } catch (error) {
      console.error('Error processing drop alert:', error);
    }
  };

  const generateWebhookUrl = () => {
    const endpoint = `${window.location.origin}/api/labubu-webhook`;
    setWebhookUrl(endpoint);
    toast({
      title: "Webhook URL Generated",
      description: "Configure your monitoring app to send POST requests to this URL",
      duration: 3000,
    });
  };

  const testIntegration = () => {
    // Simulate a drop detection for testing
    const testAlert = {
      productName: "Test Labubu Figure",
      productUrl: "https://popmart.com/us/pop-now/set/40",
      timestamp: Date.now()
    };
    
    handleNewDrop(testAlert);
  };

  const toggleAutoCheckout = async () => {
    try {
      // Send message to extension to toggle auto-checkout
      const response = await new Promise<{ success: boolean }>((resolve) => {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_AUTO_CHECKOUT',
          enabled: !autoCheckoutEnabled
        }, resolve);
      });

      if (response?.success) {
        setAutoCheckoutEnabled(!autoCheckoutEnabled);
        toast({
          title: autoCheckoutEnabled ? "Auto-Checkout Disabled" : "Auto-Checkout Enabled",
          description: autoCheckoutEnabled 
            ? "Extension will stop checking for Labubu products"
            : "Extension will now check for Labubu products every second and auto-purchase them",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not toggle auto-checkout mode",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Drop Monitor Integration
        </CardTitle>
        <CardDescription>
          Connect your Labubu monitoring app for automated purchasing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="webhook" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="webhook">Webhook</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="webhook" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Webhook className="h-4 w-4" />
              <span className="font-medium">Webhook Integration</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="webhook">Webhook URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="webhook"
                    placeholder="Enter webhook URL or generate one"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                  />
                  <Button onClick={generateWebhookUrl} variant="outline">
                    Generate
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your monitoring app should POST to this URL when drops are detected
                </p>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Expected payload format:</p>
                <code className="text-xs">
                  {JSON.stringify({
                    productName: "Labubu Figure Name",
                    productUrl: "https://popmart.com/product/...",
                    timestamp: "ISO timestamp"
                  }, null, 2)}
                </code>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="storage" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Database className="h-4 w-4" />
              <span className="font-medium">Browser Storage Integration</span>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                For apps running in the same browser, use localStorage communication:
              </p>
              
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">From your monitoring app:</p>
                <code className="text-xs">
                  localStorage.setItem('labubu_drop_alert', JSON.stringify(alertData))
                </code>
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-2">Or dispatch custom event:</p>
                <code className="text-xs">
                  window.dispatchEvent(new CustomEvent('labubu-drop-detected', {`{detail: alertData}`}))
                </code>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Recent Drop Alerts</span>
              <Badge variant="secondary">{dropAlerts.length}</Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={autoProcess}
                    onCheckedChange={setAutoProcess}
                    disabled={!extensionStatus.installed}
                  />
                  <Label>Auto-process drops</Label>
                </div>
                <Button onClick={testIntegration} variant="outline" size="sm">
                  Test Integration
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                <div>
                  <h4 className="font-medium">🤖 Auto-Checkout Mode</h4>
                  <p className="text-sm text-muted-foreground">
                    Extension checks every 1 second for Labubu products and auto-purchases them
                  </p>
                </div>
                <Switch 
                  checked={autoCheckoutEnabled}
                  onCheckedChange={toggleAutoCheckout}
                  disabled={!extensionStatus.installed}
                />
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {dropAlerts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No drop alerts yet. Test the integration or connect your monitoring app.
                </p>
              ) : (
                dropAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{alert.productName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={alert.processed ? "default" : "secondary"}>
                        {alert.processed ? "Processed" : "Pending"}
                      </Badge>
                      {!alert.processed && (
                        <Button
                          size="sm"
                          onClick={() => processDropAlert(alert)}
                          disabled={!extensionStatus.installed}
                        >
                          Process
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}