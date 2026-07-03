import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type OperatingSystem = "macos" | "linux" | "windows";

const extensionOrigins = "chrome-extension://*,moz-extension://*";

function detectOperatingSystem(): OperatingSystem {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes("mac")) {
    return "macos";
  }

  if (userAgent.includes("linux")) {
    return "linux";
  }

  if (userAgent.includes("win")) {
    return "windows";
  }

  return "macos";
}

function CodeBlock({ children }: { readonly children: string }) {
  return (
    <pre className="bg-muted text-foreground overflow-x-auto rounded-xl p-3 font-mono text-sm leading-relaxed break-all whitespace-pre-wrap sm:break-normal">
      <code>{children}</code>
    </pre>
  );
}

export function OllamaCorsDialog() {
  const defaultOperatingSystem = detectOperatingSystem();

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="link" size="xs" className="h-auto px-0 text-sm" />}>
        CORS settings are properly configured
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:max-w-2xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl">Configuring CORS for Ollama</DialogTitle>
          <DialogDescription className="text-foreground text-base leading-relaxed">
            To use Ollama with browser extensions, you need to configure CORS (Cross-Origin Resource
            Sharing) settings. Follow the instructions for your operating system below.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultOperatingSystem} className="gap-4">
          <TabsList className="h-10">
            <TabsTrigger value="macos" className="px-4">
              macOS
            </TabsTrigger>
            <TabsTrigger value="linux" className="px-4">
              Linux
            </TabsTrigger>
            <TabsTrigger value="windows" className="px-4">
              Windows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="macos" className="grid gap-4 text-sm">
            <p className="text-muted-foreground">
              If you're running Ollama as an application, use{" "}
              <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                launchctl
              </code>{" "}
              to set environment variables:
            </p>
            <div className="grid gap-2">
              <p className="font-medium">For allowing all domains:</p>
              <CodeBlock>{'launchctl setenv OLLAMA_ORIGINS "*"'}</CodeBlock>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">For extension origins:</p>
              <CodeBlock>{`launchctl setenv OLLAMA_ORIGINS "${extensionOrigins}"`}</CodeBlock>
            </div>
            <p className="text-muted-foreground">
              After setting the environment variables, restart the Ollama application to apply the
              changes.
            </p>
          </TabsContent>

          <TabsContent value="linux" className="grid gap-4 text-sm">
            <p className="text-muted-foreground">
              For Linux users running Ollama as a systemd service:
            </p>
            <div className="grid gap-2">
              <p className="font-medium">Open the service override file:</p>
              <CodeBlock>systemctl edit ollama.service</CodeBlock>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">
                In the{" "}
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  [Service]
                </code>{" "}
                section, allow all domains:
              </p>
              <CodeBlock>{`[Service]\nEnvironment="OLLAMA_ORIGINS=*"`}</CodeBlock>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">Or restrict access to extension origins:</p>
              <CodeBlock>{`[Service]\nEnvironment="OLLAMA_ORIGINS=${extensionOrigins}"`}</CodeBlock>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">Reload systemd and restart Ollama:</p>
              <CodeBlock>{`systemctl daemon-reload\nsystemctl restart ollama`}</CodeBlock>
            </div>
          </TabsContent>

          <TabsContent value="windows" className="grid gap-4 text-sm">
            <p className="text-muted-foreground">
              On Windows, configure environment variables through System Properties:
            </p>
            <ol className="text-muted-foreground grid list-inside list-decimal gap-2">
              <li>Quit Ollama from the taskbar.</li>
              <li>Open Control Panel and search for "Edit system environment variables".</li>
              <li>
                Create or edit a variable named{" "}
                <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                  OLLAMA_ORIGINS
                </code>
                .
              </li>
            </ol>
            <div className="grid gap-2">
              <p className="font-medium">To allow all domains:</p>
              <CodeBlock>OLLAMA_ORIGINS=*</CodeBlock>
            </div>
            <div className="grid gap-2">
              <p className="font-medium">Or restrict access to extension origins:</p>
              <CodeBlock>{`OLLAMA_ORIGINS=${extensionOrigins}`}</CodeBlock>
            </div>
            <p className="text-muted-foreground">
              Apply the changes, close the Control Panel, and start Ollama from a new terminal
              window.
            </p>
          </TabsContent>
        </Tabs>

        <div className="bg-muted/50 rounded-xl border p-4 text-sm">
          <p className="mb-2 font-medium">Important:</p>
          <p className="text-muted-foreground">
            Properly configured CORS settings ensure that Ollama can securely communicate with the
            browser extension. After making these changes, restart Ollama and test the connection
            using the "Test Connection" button.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
