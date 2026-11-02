import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { ScreenContainer, ScreenHeader } from './ui';

export function FormScreen({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScreenContainer scroll maxContentWidth={640}>
        <ScreenHeader title={title} subtitle={subtitle} />
        {children}
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
});
