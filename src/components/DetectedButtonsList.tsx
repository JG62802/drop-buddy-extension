import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useExtensionBridge, DetectedButton } from "./ExtensionBridge";
import { ShoppingCart, Eye, MapPin, Clock, Package } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DetectedButtonsListProps {
  className?: string;
}

export function DetectedButtonsList({ className }: DetectedButtonsListProps) {
  const { detectedButtons, addToCart, refreshButtons, extensionStatus } = useExtensionBridge();
  
  const handleAddToCart = async (button: DetectedButton) => {
    const productId = button.product?.sku || button.id;
    const result = await addToCart(productId, button.selector);
    
    if (result.success) {
      console.log('Successfully added to cart:', productId);
    }
  };
  
  const formatButtonPosition = (button: DetectedButton) => {
    return `${Math.round(button.position.x)}, ${Math.round(button.position.y)}`;
  };
  
  if (!extensionStatus.installed) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Detected Cart Buttons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Install the browser extension to detect cart buttons</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center">
          <ShoppingCart className="h-5 w-5 mr-2" />
          Detected Cart Buttons
          <Badge variant="secondary" className="ml-2">
            {detectedButtons.length}
          </Badge>
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshButtons}
          className="h-8"
        >
          <Eye className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </CardHeader>
      
      <CardContent>
        {detectedButtons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No cart buttons detected</p>
            <p className="text-sm">Navigate to a product page to see detected buttons</p>
          </div>
        ) : (
          <div className="space-y-4">
            {detectedButtons.map((button) => (
              <div
                key={button.id}
                className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-sm">{button.text}</h4>
                      <div className="flex space-x-1">
                        <Badge variant={button.visible ? "default" : "secondary"} className="text-xs">
                          {button.visible ? "Visible" : "Hidden"}
                        </Badge>
                        <Badge variant={button.enabled ? "default" : "destructive"} className="text-xs">
                          {button.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>
                    </div>
                    
                    {button.product?.name && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Package className="h-3 w-3 mr-1" />
                        <span>{button.product.name}</span>
                        {button.product.price && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {button.product.price}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                      <div className="flex items-center">
                        <MapPin className="h-3 w-3 mr-1" />
                        <span>{formatButtonPosition(button)}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>{formatDistanceToNow(button.timestamp, { addSuffix: true })}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-muted-foreground font-mono bg-muted/30 rounded px-2 py-1 truncate">
                      {button.selector}
                    </div>
                  </div>
                  
                  <div className="flex flex-col space-y-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3"
                      disabled={!button.enabled || !button.visible}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Highlight
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAddToCart(button)}
                      disabled={!button.enabled || !button.visible}
                      className="h-8 px-3"
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Add to Cart
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}