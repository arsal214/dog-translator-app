import { Text, VStack } from '@expo/ui/swift-ui';
import { font, foregroundStyle } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

type Props = { title: string; mood: string; color: string };

// Layout functions must be pure and self-contained ('widget' directive): no module-level constants.
const MoodWidget = (props: Props, _env: WidgetEnvironment) => {
  'widget';
  return (
    <VStack spacing={4}>
      <Text modifiers={[font({ size: 12, weight: 'semibold' }), foregroundStyle('#74847D')]}>{props.title}</Text>
      <Text modifiers={[font({ size: 22, weight: 'bold' }), foregroundStyle(props.color)]}>{props.mood}</Text>
    </VStack>
  );
};

export default createWidget('MoodWidget', MoodWidget, { title: "Today's mood", mood: 'No moods yet', color: '#18352C' });
