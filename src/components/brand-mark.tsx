import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export function BrandMark({ size = 48 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/images/boutica-mark-red.png')}
      style={[s.mark, { width: size, height: size }]}
      contentFit="contain"
      accessibilityLabel="Logo de Boutica"
    />
  );
}

const s = StyleSheet.create({
  mark: { flexShrink: 0 },
});
