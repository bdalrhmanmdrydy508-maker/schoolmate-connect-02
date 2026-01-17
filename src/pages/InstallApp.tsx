import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Download, Smartphone, Check, Share, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto mb-4 w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center shadow-glow"
            >
              <Smartphone className="w-10 h-10 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold">تثبيت التطبيق</CardTitle>
            <CardDescription className="text-base mt-2">
              قم بتثبيت التطبيق على جهازك للوصول السريع والعمل بدون إنترنت
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {isInstalled ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                  <Check className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  تم التثبيت بنجاح!
                </h3>
                <p className="text-muted-foreground mb-4">
                  يمكنك الآن استخدام التطبيق من الشاشة الرئيسية
                </p>
                <Button onClick={() => navigate("/")} className="w-full">
                  الذهاب للتطبيق
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Android / Desktop with install prompt */}
                {deferredPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Button
                      onClick={handleInstallClick}
                      size="lg"
                      className="w-full h-14 text-lg gradient-primary hover:opacity-90 transition-opacity"
                    >
                      <Download className="w-5 h-5 ml-2" />
                      تثبيت التطبيق
                    </Button>
                  </motion.div>
                )}

                {/* iOS Instructions */}
                {isIOS && !deferredPrompt && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-center text-foreground">
                      لتثبيت التطبيق على iPhone:
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Share className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">1. اضغط على زر المشاركة</p>
                          <p className="text-sm text-muted-foreground">في أسفل المتصفح</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">2. اختر "إضافة إلى الشاشة الرئيسية"</p>
                          <p className="text-sm text-muted-foreground">Add to Home Screen</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">3. اضغط "إضافة"</p>
                          <p className="text-sm text-muted-foreground">لتأكيد التثبيت</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Android Instructions (fallback if no prompt) */}
                {isAndroid && !deferredPrompt && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-center text-foreground">
                      لتثبيت التطبيق على Android:
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <MoreVertical className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">1. اضغط على القائمة</p>
                          <p className="text-sm text-muted-foreground">النقاط الثلاث في أعلى المتصفح</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Download className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">2. اختر "تثبيت التطبيق"</p>
                          <p className="text-sm text-muted-foreground">Install app أو Add to Home screen</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">3. اضغط "تثبيت"</p>
                          <p className="text-sm text-muted-foreground">لتأكيد التثبيت</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop without prompt */}
                {!isIOS && !isAndroid && !deferredPrompt && (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">
                      افتح هذه الصفحة من هاتفك لتثبيت التطبيق، أو استخدم متصفح Chrome للتثبيت على الكمبيوتر
                    </p>
                  </div>
                )}

                {/* Features */}
                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-3 text-foreground">مميزات التطبيق:</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      وصول سريع من الشاشة الرئيسية
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      يعمل بدون اتصال بالإنترنت
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      تحميل أسرع من الموقع
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-success" />
                      تجربة تطبيق أصلي
                    </li>
                  </ul>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              onClick={() => navigate("/")}
              className="w-full"
            >
              متابعة بدون تثبيت
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default InstallApp;
