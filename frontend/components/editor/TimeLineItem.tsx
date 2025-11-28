import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/themed-text';

import { Overlay, TIMELINE_SCALE } from '@/types/editor';

const TimelineItem = ({ 
  overlay, 
  isSelected, 
  onSelect, 
  onUpdate 
}: { 
  overlay: Overlay; 
  isSelected: boolean; 
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<Overlay>) => void;
}) => {
  const startX = useSharedValue(overlay.startTime * TIMELINE_SCALE);
  const width = useSharedValue((overlay.endTime - overlay.startTime) * TIMELINE_SCALE);
  const initialStartRef = useSharedValue(0);

  useEffect(() => {
    startX.value = overlay.startTime * TIMELINE_SCALE;
    width.value = (overlay.endTime - overlay.startTime) * TIMELINE_SCALE;
  }, [overlay.startTime, overlay.endTime]);

  const leftHandleGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newStartX = Math.max(0, overlay.startTime * TIMELINE_SCALE + e.translationX);
      const newWidth = (overlay.endTime * TIMELINE_SCALE) - newStartX;
      
      if (newWidth > TIMELINE_SCALE) { // Minimum 1 second
         startX.value = newStartX;
         width.value = newWidth;
      }
    })
    .onEnd(() => {
      const newStartTime = startX.value / TIMELINE_SCALE;
      runOnJS(onUpdate)(overlay.id, { startTime: newStartTime });
    });

  const rightHandleGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newWidth = Math.max(TIMELINE_SCALE, (overlay.endTime - overlay.startTime) * TIMELINE_SCALE + e.translationX);
      width.value = newWidth;
    })
    .onEnd(() => {
      const newEndTime = (startX.value + width.value) / TIMELINE_SCALE;
      runOnJS(onUpdate)(overlay.id, { endTime: newEndTime });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    left: startX.value,
    width: width.value,
  }));

  // Position overlays based on type: text top, image middle, video bottom
  const getTopPosition = () => {
    switch (overlay.type) {
      case 'text':
        return 5;
      case 'image':
        return 35;
      case 'video':
        return 65;
      default:
        return 30;
    }
  };

  // Gesture to move the whole timeline item
  const moveGesture = Gesture.Pan()
    .onStart(() => {
      initialStartRef.value = startX.value;
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      const newStart = Math.max(0, initialStartRef.value + e.translationX);
      startX.value = newStart;
    })
    .onEnd(() => {
      const newStartTime = startX.value / TIMELINE_SCALE;
      const duration = width.value / TIMELINE_SCALE;
      const newEndTime = newStartTime + duration;
      runOnJS(onUpdate)(overlay.id, { startTime: newStartTime, endTime: newEndTime });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(onSelect)();
  });

  const composedGesture = Gesture.Simultaneous(moveGesture, tapGesture);

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View 
        style={[
          styles.timelineItem, 
          animatedStyle,
          { 
            top: getTopPosition(),
            backgroundColor: overlay.type === 'text' ? 'rgba(74, 144, 226, 0.8)' : overlay.type === 'image' ? 'rgba(226, 74, 74, 0.8)' : 'rgba(74, 226, 160, 0.8)',
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? '#fff' : 'rgba(255,255,255,0.3)'
          }
        ]}
      >
        <ThemedText style={styles.timelineItemText} numberOfLines={1}>{overlay.type}</ThemedText>

        {isSelected && (
          <>
            <GestureDetector gesture={leftHandleGesture}>
              <View style={[styles.timelineHandle, { left: 0 }]} />
            </GestureDetector>
            <GestureDetector gesture={rightHandleGesture}>
              <View style={[styles.timelineHandle, { right: 0 }]} />
            </GestureDetector>
          </>
        )}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
   timelineItem: {
    position: 'absolute',
    height: 30,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  timelineItemText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  timelineHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
});

export default TimelineItem;