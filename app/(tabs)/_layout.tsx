import React from 'react';
import { Tabs } from 'expo-router';
import { Star, Users, ShirtIcon, User } from 'lucide-react-native';
import { Platform, View, Text } from 'react-native';
import { useSocialStore } from '../../store/socialStore';

export default function TabLayout() {
  // Toplam okunmamış mesaj sayısını al
  const getTotalUnreadMessageCount = useSocialStore(state => state.getTotalUnreadMessageCount);
  const totalUnreadCount = getTotalUnreadMessageCount();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0A84FF',
        tabBarInactiveTintColor: '#555555',
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: '#E0E0E0',
          backgroundColor: '#FFFFFF',
          elevation: 0,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTitleStyle: {
          fontWeight: '600',
          color: '#000000',
        },
        headerShadowVisible: false,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Try-On',
          tabBarIcon: ({ color, size }) => <Star size={size} color={color} />,
          headerTitle: 'Virtual Try-On',
        }}
      />
      <Tabs.Screen
        name="wardrobe"
        options={{
          title: 'Wardrobe',
          tabBarIcon: ({ color, size }) => <ShirtIcon size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}