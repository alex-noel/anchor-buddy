import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Sheet from './Sheet';
import { Button, Icon, type IconName } from './ui';
import { colors as c } from '../theme';

type Section = 'explore' | 'saved' | 'settings';
export interface AppTourProps {
  onClose: () => void;
  onSearch: () => void;
  onSection?: (section: Section) => void;
}

const steps: { title: string; body: string; icon: IconName; items: string[] }[] = [
  {
    title: 'Start with a search',
    body: 'Explore starts with no results. Choose a search area, stay dates and your preferences to find places.',
    icon: 'search',
    items: [
      'Pick the centre and radius on the map.',
      'Review the stay window and operating limits.',
    ],
  },
  {
    title: 'Compare places',
    body: 'Use Quick filters for place types. Advanced filters & sorting let you narrow the same results in either map or list view.',
    icon: 'sliders',
    items: [
      'Switch depth, seabed and marks layers on the map.',
      'Open a place to review its evidence, forecast and estimated price.',
    ],
  },
  {
    title: 'Plan from a place',
    body: 'Choose an anchor position from the place details. Review or adjust it, set the deployed rode and check the complete swing footprint.',
    icon: 'anchor',
    items: [
      'A place assessment does not verify its approach.',
      'Complete arrival checks before moving to the anchor watch.',
    ],
  },
  {
    title: 'Monitor your stay',
    body: 'In the installed iOS or Android app, record the actual anchor position, confirm an alarm radius and test the alarm before arming the watch. The browser cannot run a watch.',
    icon: 'bell',
    items: [
      'The anchor position never moves automatically.',
      'Check GPS accuracy and monitoring health; keep the device powered.',
    ],
  },
  {
    title: 'Save and return',
    body: 'Save a search to return to its area and preferences, or close it to clear Explore. Find saved searches and maps in Saved.',
    icon: 'bookmark',
    items: [
      'Settings contains your vessel, defaults, units and offline data.',
      'Reopen this tour from Settings whenever you need it.',
    ],
  },
];

export function AppTour({ onClose, onSearch, onSection }: AppTourProps) {
  const [index, setIndex] = useState(0);
  const current = steps[index]!;
  const last = index === steps.length - 1;
  return (
    <Sheet title="App tour" subtitle={`Step ${index + 1} of ${steps.length}`} onClose={onClose}>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {steps.map((step, i) => (
          <Pressable
            key={step.title}
            accessibilityRole="button"
            accessibilityLabel={`Tour step ${i + 1}: ${step.title}`}
            accessibilityState={{ selected: i === index }}
            onPress={() => setIndex(i)}
            style={{ flex: 1, height: 20, justifyContent: 'center' }}
          >
            <View
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: i === index ? c.green : c.line,
              }}
            />
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 18 }}>
        <View
          style={{
            width: 54,
            height: 54,
            borderRadius: 14,
            backgroundColor: c.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={current.icon} size={25} color={c.green} />
        </View>
        <View style={{ gap: 10 }}>
          <Text
            accessibilityRole="header"
            style={{ fontSize: 22, fontWeight: '600', color: c.ink }}
          >
            {current.title}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: c.muted }}>{current.body}</Text>
        </View>
        <View
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: c.white,
            borderWidth: 1,
            borderColor: c.line,
            gap: 14,
          }}
        >
          {current.items.map((item) => (
            <View key={item} style={{ flexDirection: 'row', gap: 10 }}>
              <Icon name="check" size={16} color={c.green} />
              <Text style={{ flex: 1, fontSize: 13, lineHeight: 20, color: c.ink }}>{item}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button secondary onPress={index === 0 ? onClose : () => setIndex(index - 1)}>
            {index === 0 ? 'Skip tour' : 'Back'}
          </Button>
        </View>
        <View style={{ flex: 1 }}>
          <Button
            onPress={
              last
                ? () => {
                    onClose();
                    onSearch();
                  }
                : () => setIndex(index + 1)
            }
            icon={last ? 'search' : 'arrow-right'}
          >
            {last ? 'Start a search' : 'Next'}
          </Button>
        </View>
      </View>
      {last && onSection ? (
        <Button
          secondary
          onPress={() => {
            onClose();
            onSection('settings');
          }}
        >
          Open Settings
        </Button>
      ) : null}
    </Sheet>
  );
}

export default AppTour;
