import { ExtensionStatusCard } from "@/components/ExtensionStatusCard";
import { DetectedButtonsList } from "@/components/DetectedButtonsList";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            🛒 Labubu Cart Automation
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Smart cart automation for e-commerce sites with real-time monitoring and intelligent button detection
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          <ExtensionStatusCard />
          <DetectedButtonsList />
        </div>
        
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">How It Works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-2xl">1️⃣</div>
              <h3 className="font-medium">Install Extension</h3>
              <p className="text-sm text-muted-foreground">
                Install the browser extension to enable cart automation across all e-commerce sites
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">2️⃣</div>
              <h3 className="font-medium">Browse Products</h3>
              <p className="text-sm text-muted-foreground">
                Visit any product page and the extension will automatically detect cart buttons
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-2xl">3️⃣</div>
              <h3 className="font-medium">Automate Purchases</h3>
              <p className="text-sm text-muted-foreground">
                Use the dashboard to monitor and automate cart actions with smart controls
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
