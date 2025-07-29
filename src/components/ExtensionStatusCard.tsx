import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useExtensionBridge, ExtensionStatus } from "./ExtensionBridge";
import { Download, CheckCircle, XCircle, RefreshCw, ExternalLink } from "lucide-react";

interface ExtensionStatusCardProps {
  className?: string;
}

export function ExtensionStatusCard({ className }: ExtensionStatusCardProps) {
  const { extensionStatus, isLoading, checkStatus } = useExtensionBridge();
  
  const getStatusColor = (status: ExtensionStatus) => {
    if (!status.installed) return "destructive";
    if (status.active) return "default";
    return "secondary";
  };
  
  const getStatusIcon = (status: ExtensionStatus) => {
    if (!status.installed) return <XCircle className="h-4 w-4" />;
    if (status.active) return <CheckCircle className="h-4 w-4" />;
    return <XCircle className="h-4 w-4" />;
  };
  
  const getStatusText = (status: ExtensionStatus) => {
    if (!status.installed) return "Not Installed";
    if (status.active) return "Active";
    return "Inactive";
  };
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold">Browser Extension</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={checkStatus}
          disabled={isLoading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(extensionStatus)}
            <span className="font-medium">Status</span>
          </div>
          <Badge variant={getStatusColor(extensionStatus)}>
            {getStatusText(extensionStatus)}
          </Badge>
        </div>
        
        {extensionStatus.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-mono">{extensionStatus.version}</span>
          </div>
        )}
        
        {!extensionStatus.installed && (
          <Alert>
            <Download className="h-4 w-4" />
            <AlertDescription>
              Install the Labubu Cart Extension to enable real-time cart automation across all e-commerce sites.
            </AlertDescription>
          </Alert>
        )}
        
        {extensionStatus.installed && !extensionStatus.active && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Extension is installed but not active. Please check extension settings.
            </AlertDescription>
          </Alert>
        )}
        
        {extensionStatus.installed && extensionStatus.active && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Extension is active and ready for cart automation.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex gap-2 pt-2">
          {!extensionStatus.installed ? (
            <Button className="flex-1" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Install Extension
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              Extension Settings
            </Button>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">Extension Features:</div>
          <ul className="space-y-0.5 ml-2">
            <li>• Detects cart buttons on any e-commerce site</li>
            <li>• Automates add-to-cart actions</li>
            <li>• Works with PopMart, Shopify, and more</li>
            <li>• Real-time button monitoring</li>
            <li>• Safe automation with user confirmation</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}