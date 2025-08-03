import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide tabs as we use stack navigation
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Atik Taksi',
          tabBarIcon: ({ size, color }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}