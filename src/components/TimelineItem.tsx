import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReservationTimelineEvent } from '@/types';
import { colors } from '@/theme/colors';

interface Props {
  event: ReservationTimelineEvent;
}

export const TimelineItem: React.FC<Props> = ({ event }) => (
  <View style={styles.container}>
    <View style={styles.marker} />
    <View style={styles.content}>
      <Text style={styles.timestamp}>{new Date(event.timestamp).toLocaleString()}</Text>
      <Text style={styles.type}>{event.type.toUpperCase()}</Text>
      <Text style={styles.text}>{event.content}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginRight: 12,
    marginTop: 6
  },
  content: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12
  },
  timestamp: {
    fontSize: 12,
    color: colors.muted
  },
  type: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary
  },
  text: {
    marginTop: 4,
    fontSize: 15,
    color: colors.text
  }
});
