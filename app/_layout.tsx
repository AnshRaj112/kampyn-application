import { Stack, Slot } from "expo-router";
  
export default function RootLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Slot />
    </Stack>
  );
} 

