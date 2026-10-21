import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = { label: string };

// Tapping any widget opens the app; the app then lands on Home where Record is one tap away.
const RecordWidget = (props: Props, _env: WidgetEnvironment) => {
  'widget';
  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ size: 28 }), foregroundStyle('#12A878')]}>🎙</Text>
      <Text modifiers={[font({ size: 14, weight: 'semibold' }), foregroundStyle('#18352C')]}>{props.label}</Text>
    </VStack>
  );
};

export default createWidget('RecordWidget', RecordWidget, { label: 'Record a bark' });
