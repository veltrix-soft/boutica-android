import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/images/boutica-app-icon.png')}
      style={[s.mark, { width: size, height: size, borderRadius: size * 0.15 }]}
      contentFit="contain"
      accessibilityLabel="Logo de Boutica"
    />
  );
}

const s = StyleSheet.create({
  mark: { flexShrink: 0 },
});

