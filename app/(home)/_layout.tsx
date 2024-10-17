import React from 'react';
import { Drawer } from 'expo-router/drawer';

const HomeLayout: React.FC = () => {
  return (
    <Drawer>
      <Drawer.Screen name="index" options={{ headerShown: false }} />
    </Drawer>
  );
};

export default HomeLayout;
