import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, runOnJS, useAnimatedStyle } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Image } from 'expo-image';
import { Overlay } from '@/types/editor';
import { ThemedText } from '@/components/themed-text';

const DraggableOverlay = ({ 
  overlay, 
  isSelected, 
  onSelect, 
  onUpdate,
  onEdit,
  isVisible,
  isPlaying,
  containerWidth,
  containerHeight
}: { 
  overlay: Overlay; 
  isSelected: boolean; 
  onSelect: () => void;
  onUpdate: (id: string, updates: Partial<Overlay>) => void;
  onEdit: (id: string) => void;
  isVisible: boolean;
  isPlaying: boolean;
  containerWidth: number;
  containerHeight: number;
}) => {
  const translateX = useSharedValue(overlay.x);
  const translateY = useSharedValue(overlay.y);
  const scale = useSharedValue(overlay.scale || 1);
  const savedScale = useSharedValue(overlay.scale || 1);
  
  const videoPlayer = overlay.type === 'video' ? useVideoPlayer({ uri: overlay.content }) : null;

  useEffect(() => {
    if (videoPlayer) {
      videoPlayer.loop = true;
      if (isVisible && isPlaying) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    }
  }, [videoPlayer, isVisible, isPlaying]);
  
  useEffect(() => {
    translateX.value = overlay.x;
    translateY.value = overlay.y;
    scale.value = overlay.scale || 1;
    savedScale.value = overlay.scale || 1;
  }, [overlay.id]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      // No restrictions - allow overlay to move freely, even outside the canvas
      translateX.value = overlay.x + e.translationX;
      translateY.value = overlay.y + e.translationY;
    })
    .onEnd(() => {
      runOnJS(onUpdate)(overlay.id, { x: translateX.value, y: translateY.value });
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      runOnJS(onSelect)();
    })
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      runOnJS(onUpdate)(overlay.id, { scale: scale.value });
    });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (overlay.type === 'text') {
        runOnJS(onEdit)(overlay.id);
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    // Position the overlay so x,y represents the center point
    // This makes scaling happen from the center naturally
    const centerX = translateX.value + overlay.width / 2;
    const centerY = translateY.value + overlay.height / 2;
    
    // Calculate the top-left position after scaling from center
    const scaledWidth = overlay.width * scale.value;
    const scaledHeight = overlay.height * scale.value;
    const left = centerX - scaledWidth / 2;
    const top = centerY - scaledHeight / 2;
    
    return {
      transform: [
        { translateX: left },
        { translateY: top },
        { scale: scale.value },
      ],
      opacity: isVisible ? 1 : 0,
    };
  });

  if (!isVisible) return null;

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View 
        style={[
          styles.overlayItem, 
          animatedStyle,
          { 
            width: overlay.width, 
            height: overlay.height,
            borderColor: isSelected ? '#007AFF' : 'transparent',
            borderWidth: isSelected ? 2 : 0,
            zIndex: isSelected ? 100 : 1,
          }
        ]}
      >
        {overlay.type === 'text' && (
          <ThemedText style={styles.overlayText}>{overlay.content}</ThemedText>
        )}
        {overlay.type === 'image' && (
          <Image source={{ uri: overlay.content }} style={{ width: '100%', height: '100%' }} />
        )}
        {overlay.type === 'video' && videoPlayer && (
          <VideoView 
            player={videoPlayer} 
            style={{ width: '100%', height: '100%' }} 
            contentFit="cover" 
            nativeControls={false}
          />
        )}
        {isSelected && (
          <View style={styles.resizeHandle} />
        )}
      </Animated.View>
    </GestureDetector>
  );
};

export default DraggableOverlay;

const styles = StyleSheet.create({
 overlayText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 15,
    height: 15,
    backgroundColor: '#007AFF',
    borderRadius: 7.5,
    borderWidth: 2,
    borderColor: 'white',
  },
  overlayItem: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});