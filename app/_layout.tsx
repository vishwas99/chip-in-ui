import { Stack } from "expo-router";

import "@/global.css";
import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";

export default function Layout() {
  return <GluestackUIProvider mode="light"><Stack screenOptions={{ headerShown: false }} /></GluestackUIProvider>;
}
