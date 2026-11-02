import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

export function WebBadge() {
  return (
    <Image
      source={require('@/assets/images/boutica-app-icon.png')}
      style={styles.logo}
      accessibilityLabel="Logo de Boutica"
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 48,
    height: 48,
  },
});

