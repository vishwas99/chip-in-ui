import { Stack } from "expo-router";

import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";

import GlobalFab from "../src/components/GlobalFab";

export default function Layout() {
  return (
    <GluestackUIProvider mode="dark">
      <Stack screenOptions={{ headerShown: false }} />
      <GlobalFab />
    </GluestackUIProvider>
  );
}
