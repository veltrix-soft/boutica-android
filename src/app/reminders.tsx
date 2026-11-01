import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useState } from 'react';
import {
  Platform, Pressable, StyleSheet, Switch, Text, View,
} from 'react-native';
import {
  Button, FormField, Notice, ScreenContainer, ScreenHeader, SectionHeader,
} from '../components/ui';
import {
  cancelCustomReminder, type CustomReminder, DEFAULT_DAILY_REMINDERS,
  loadReminderSettings, saveDailyReminderSettings, scheduleCustomReminder, scheduleTestReminder,
} from '../features/reminders/reminder-service';
import {
  DEFAULT_SERVER_PUSH_SETTINGS, type ServerPushSettings, loadServerPushSettings,
  saveServerPushSettings, syncServerPushSettings,
} from '../features/reminders/push-alert-service';
import { colors, radius, spacing } from '../theme/colors';

type PickerMode = 'daily' | 'custom-date' | 'custom-time' | null;

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function RemindersScreen() {
  const [daily, setDaily] = useState(DEFAULT_DAILY_REMINDERS);
  const [serverPush, setServerPush] = useState(DEFAULT_SERVER_PUSH_SETTINGS);
  const [custom, setCustom] = useState<CustomReminder[]>([]);
  const [message, setMessage] = useState('');
  const [customDate, setCustomDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [picker, setPicker] = useState<PickerMode>(null);
  const [loading, setLoading] = useState(true);
  const [savingDaily, setSavingDaily] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [testing, setTesting] = useState(false);
  const [savingServerPush, setSavingServerPush] = useState(false);
  const [busyReminder, setBusyReminder] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'danger' | 'warning';
    text: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([loadReminderSettings(), loadServerPushSettings()])
      .then(async ([reminderSettings, serverPushSettings]) => {
        if (!active) return;
        setDaily(reminderSettings.daily);
        setCustom(reminderSettings.custom);
        if (serverPushSettings.stock || serverPushSettings.sales) {
          try {
            await syncServerPushSettings(serverPushSettings);
          } catch (error) {
            if (active) {
              setServerPush(DEFAULT_SERVER_PUSH_SETTINGS);
              setNotice({
                tone: 'warning',
                text: error instanceof Error ? error.message : 'Impossible de synchroniser les alertes serveur.',
              });
            }
            return;
          }
        }
        if (active) setServerPush(serverPushSettings);
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice({
            tone: 'danger',
            text: error instanceof Error ? error.message : 'Impossible de charger les rappels.',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function saveDaily() {
    setSavingDaily(true);
    setNotice(null);
    try {
      await saveDailyReminderSettings(daily);
      setNotice({ tone: 'success', text: 'Les rappels quotidiens ont été mis à jour.' });
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Impossible d’enregistrer les rappels.',
      });
    } finally {
      setSavingDaily(false);
    }
  }

  async function changeServerPush(settings: ServerPushSettings) {
    const previous = serverPush;
    setServerPush(settings);
    setSavingServerPush(true);
    setNotice(null);
    try {
      await saveServerPushSettings(settings);
      setNotice({ tone: 'success', text: 'Les alertes serveur ont été mises à jour.' });
    } catch (error) {
      setServerPush(previous);
      setNotice({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Impossible d’activer les alertes serveur.',
      });
    } finally {
      setSavingServerPush(false);
    }
  }

  async function createCustomReminder() {
    setSavingCustom(true);
    setNotice(null);
    try {
      const reminder = await scheduleCustomReminder(message, customDate);
      setCustom((current) => [...current, reminder]);
      setMessage('');
      setNotice({ tone: 'success', text: 'Votre rappel a été programmé sur ce téléphone.' });
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Impossible de programmer ce rappel.',
      });
    } finally {
      setSavingCustom(false);
    }
  }

  async function testNotification() {
    setTesting(true);
    setNotice(null);
    try {
      await scheduleTestReminder();
      setNotice({ tone: 'success', text: 'Une notification de test va apparaître dans quelques secondes.' });
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Impossible d’envoyer la notification de test.',
      });
    } finally {
      setTesting(false);
    }
  }

  async function removeCustomReminder(reminder: CustomReminder) {
    setBusyReminder(reminder.notificationId);
    setNotice(null);
    try {
      await cancelCustomReminder(reminder.notificationId);
      setCustom((current) => current.filter((item) => item.notificationId !== reminder.notificationId));
    } catch (error) {
      setNotice({
        tone: 'danger',
        text: error instanceof Error ? error.message : 'Impossible d’annuler ce rappel.',
      });
    } finally {
      setBusyReminder(null);
    }
  }

  function onPickerChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') setPicker(null);
    if (event.type !== 'set' || !selectedDate) return;

    if (picker === 'daily') {
      setDaily((current) => ({ ...current, time: formatTime(selectedDate) }));
    } else if (picker === 'custom-date') {
      setCustomDate((current) => {
        const next = new Date(current);
        next.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        return next;
      });
    } else if (picker === 'custom-time') {
      setCustomDate((current) => {
        const next = new Date(current);
        next.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
        return next;
      });
    }
  }

  const hasDailyReminder = daily.stock || daily.receivables || daily.sales;

  return (
    <ScreenContainer scroll maxContentWidth={640}>
      <ScreenHeader title="Rappels" subtitle="Notifications sur cet appareil" />
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <SectionHeader title="Alertes du serveur" />
      <View style={s.card}>
        <Text style={s.description}>
          Recevez une notification lorsqu’une vente est enregistrée ou qu’un stock passe à 5 unités ou moins.
        </Text>
        <ReminderToggle
          label="Stock faible"
          value={serverPush.stock}
          onValueChange={(stock) => changeServerPush({ ...serverPush, stock })}
          disabled={savingServerPush || loading}
        />
        <View style={s.divider} />
        <ReminderToggle
          label="Nouvelle vente"
          value={serverPush.sales}
          onValueChange={(sales) => changeServerPush({ ...serverPush, sales })}
          disabled={savingServerPush || loading}
        />
        <Text style={s.hint}>
          Ces alertes nécessitent une connexion Internet, un compte actif et une version installée de Boutica.
          Expo Go sur Android ne prend pas en charge les notifications push.
        </Text>
      </View>

      <SectionHeader title="Rappels quotidiens" />
      <View style={s.card}>
        <Text style={s.description}>
          Choisissez les sujets à revoir. Boutica enverra un rappel chaque jour à l’heure choisie.
        </Text>
        <ReminderToggle
          label="Stock faible"
          value={daily.stock}
          onValueChange={(stock) => setDaily((current) => ({ ...current, stock }))}
        />
        <View style={s.divider} />
        <ReminderToggle
          label="Créances à suivre"
          value={daily.receivables}
          onValueChange={(receivables) => setDaily((current) => ({ ...current, receivables }))}
        />
        <View style={s.divider} />
        <ReminderToggle
          label="Suivi des ventes"
          value={daily.sales}
          onValueChange={(sales) => setDaily((current) => ({ ...current, sales }))}
        />
        <View style={s.divider} />
        <Text style={s.fieldLabel}>Heure</Text>
        <Pressable
          onPress={() => setPicker(picker === 'daily' ? null : 'daily')}
          accessibilityRole="button"
          accessibilityLabel={`Heure du rappel quotidien : ${daily.time}`}
          style={s.pickerButton}
        >
          <Text style={s.pickerButtonText}>{daily.time}</Text>
        </Pressable>
        {picker === 'daily' ? (
          <DateTimePicker
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={new Date(`2000-01-01T${daily.time}:00`)}
            onChange={onPickerChange}
            is24Hour
          />
        ) : null}
        <Button
          label={hasDailyReminder ? 'Enregistrer les rappels' : 'Désactiver les rappels quotidiens'}
          icon="notifications-outline"
          onPress={saveDaily}
          loading={savingDaily || loading}
        />
        <Text style={s.hint}>
          Ces rappels sont programmés localement et peuvent s’afficher même lorsque l’application est fermée.
        </Text>
        <Button
          label="Tester les notifications"
          icon="notifications-outline"
          variant="secondary"
          onPress={testNotification}
          loading={testing}
        />
      </View>

      <SectionHeader title="Rappel personnalisé" />
      <View style={s.card}>
        <FormField
          label="À quoi faut-il penser ?"
          value={message}
          onChangeText={setMessage}
          maxLength={120}
          returnKeyType="done"
        />
        <View style={s.dateTimeRow}>
          <View style={s.dateTimeField}>
            <Text style={s.fieldLabel}>Date</Text>
            <Pressable
              onPress={() => setPicker(picker === 'custom-date' ? null : 'custom-date')}
              accessibilityRole="button"
              style={s.pickerButton}
            >
              <Text style={s.pickerButtonText}>{formatDate(customDate)}</Text>
            </Pressable>
          </View>
          <View style={s.dateTimeField}>
            <Text style={s.fieldLabel}>Heure</Text>
            <Pressable
              onPress={() => setPicker(picker === 'custom-time' ? null : 'custom-time')}
              accessibilityRole="button"
              style={s.pickerButton}
            >
              <Text style={s.pickerButtonText}>{formatTime(customDate)}</Text>
            </Pressable>
          </View>
        </View>
        {picker === 'custom-date' ? (
          <DateTimePicker
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={customDate}
            minimumDate={new Date()}
            onChange={onPickerChange}
          />
        ) : null}
        {picker === 'custom-time' ? (
          <DateTimePicker
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            value={customDate}
            onChange={onPickerChange}
            is24Hour
          />
        ) : null}
        <Button
          label="Programmer le rappel"
          icon="add-outline"
          onPress={createCustomReminder}
          loading={savingCustom}
        />
      </View>

      {custom.length > 0 ? (
        <>
          <SectionHeader title={`À venir (${custom.length})`} />
          <View style={s.card}>
            {custom.map((reminder, index) => (
              <View key={reminder.notificationId}>
                {index > 0 ? <View style={s.divider} /> : null}
                <View style={s.customReminder}>
                  <View style={s.customReminderText}>
                    <Text style={s.reminderMessage}>{reminder.message}</Text>
                    <Text style={s.hint}>
                      {formatDate(new Date(reminder.scheduledAt))} à {formatTime(new Date(reminder.scheduledAt))}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeCustomReminder(reminder)}
                    disabled={busyReminder === reminder.notificationId}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Annuler le rappel : ${reminder.message}`}
                    style={s.cancelButton}
                  >
                    <Text style={s.cancelButtonText}>
                      {busyReminder === reminder.notificationId ? '…' : 'Annuler'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </ScreenContainer>
  );
}

function ReminderToggle({
  label, value, onValueChange, disabled = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={s.toggleRow}>
      <Text style={s.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.surface}
        accessibilityLabel={`Rappel ${label.toLowerCase()}`}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  description: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  toggleRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toggleLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  divider: { height: 1, backgroundColor: colors.border },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  pickerButton: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  pickerButtonText: { fontSize: 15, color: colors.text },
  hint: { fontSize: 12, lineHeight: 18, color: colors.textMuted },
  dateTimeRow: { flexDirection: 'row', gap: spacing.sm },
  dateTimeField: { flex: 1, gap: spacing.xs },
  customReminder: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  customReminderText: { flex: 1, gap: spacing.xs },
  reminderMessage: { fontSize: 15, fontWeight: '600', color: colors.text },
  cancelButton: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
  cancelButtonText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
