import { Stack, usePathname } from "expo-router";
import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import GlobalFab from "../src/components/GlobalFab";
import { ToastProvider } from "../src/components/ToastManager";

export default function Layout() {
  const pathname = usePathname();
  const hideFab = pathname === "/login" || pathname === "/signup" || pathname === "/";

  return (
    <GluestackUIProvider mode="dark">
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }} />
        {!hideFab && <GlobalFab />}
      </ToastProvider>
    </GluestackUIProvider>
  );
}
