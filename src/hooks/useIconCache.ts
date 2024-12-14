import { useMemo } from 'react';
import { Building2, Car, Globe, Hammer, Home, Package, User, Wallet } from 'lucide-react';
import React from 'react';

const iconMap = {
  Building2,
  Car,
  Globe,
  Hammer,
  Home,
  Package,
  User,
  Wallet
};

export const useIconCache = () => {
  const cachedIcons = useMemo(() => {
    const cache = new Map();
    
    Object.entries(iconMap).forEach(([name, Icon]) => {
      cache.set(name, React.createElement(Icon, { 
        size: 24,
        className: "text-white"
      }));
    });
    
    return cache;
  }, []);

  const getIcon = (name: string) => {
    return cachedIcons.get(name) || cachedIcons.get('Package');
  };

  return { getIcon };
};