import { useState, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView, Dimensions, TextInput, Modal, TouchableWithoutFeedback } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import TimelineItem from '@/components/editor/TimeLineItem';
import DraggableOverlay from '@/components/editor/DraggableOverlay';
import { Overlay, TIMELINE_SCALE, THUMBNAIL_INTERVAL } from '@/types/editor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function EditorScreen() {
  const params = useLocalSearchParams<{ videoUri: string }>();
  const videoUri = typeof params?.videoUri === 'string' ? params.videoUri : null;
  
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEditingText, setIsEditingText] = useState(false);
  const [editingTextContent, setEditingTextContent] = useState('');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  const player = videoUri ? useVideoPlayer({ uri: videoUri }) : null;
  const timelineRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (player) {
      const checkDuration = setInterval(() => {
        if (player.duration > 0) {
          setDuration(player.duration);
          clearInterval(checkDuration);
          generateThumbnails(player.duration);
        }
      }, 500);

      return () => clearInterval(checkDuration);
    }
  }, [player]);

  const generateThumbnails = async (videoDuration: number) => {
    if (!videoUri) return;
    try {
      const thumbs = [];
      const count = Math.ceil(videoDuration / THUMBNAIL_INTERVAL);
      for (let i = 0; i < count; i++) {
        const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
          time: i * THUMBNAIL_INTERVAL * 1000,
          quality: 0.5,
        });
        thumbs.push(uri);
      }
      setThumbnails(thumbs);
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    if (player) {
      player.loop = true;
      const interval = setInterval(() => {
        if (player.playing) {
          setCurrentTime(player.currentTime);
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [player]);

  const addTextOverlay = () => {
    if (!player) return;
    const newOverlay: Overlay = {
      id: Date.now().toString(),
      type: 'text',
      content: 'Double Tap to Edit',
      x: 50,
      y: 50,
      width: 200,
      height: 50,
      scale: 1,
      rotation: 0,
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
    };
    setOverlays([...overlays, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const addImageOverlay = async () => {
    if (!player) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newOverlay: Overlay = {
        id: Date.now().toString(),
        type: 'image',
        content: result.assets[0].uri,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        scale: 1,
        rotation: 0,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
      };
      setOverlays([...overlays, newOverlay]);
      setSelectedOverlayId(newOverlay.id);
    }
  };

  const addVideoOverlay = async () => {
    if (!player) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newOverlay: Overlay = {
        id: Date.now().toString(),
        type: 'video',
        content: result.assets[0].uri,
        x: 150,
        y: 150,
        width: 200,
        height: 112,
        scale: 1,
        rotation: 0,
        startTime: currentTime,
        endTime: Math.min(currentTime + 5, duration),
      };
      setOverlays([...overlays, newOverlay]);
      setSelectedOverlayId(newOverlay.id);
    }
  };

  const updateOverlay = (id: string, updates: Partial<Overlay>) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  };

  const deleteOverlay = () => {
    if (selectedOverlayId) {
      setOverlays(overlays.filter(o => o.id !== selectedOverlayId));
      setSelectedOverlayId(null);
    }
  };

  const handleEdit = (id: string) => {
    const overlay = overlays.find(o => o.id === id);
    if (overlay && overlay.type === 'text') {
      setEditingTextContent(overlay.content);
      setIsEditingText(true);
      setSelectedOverlayId(id);
    }
  };

  const saveTextEdit = () => {
    if (selectedOverlayId) {
      updateOverlay(selectedOverlayId, { content: editingTextContent });
      setIsEditingText(false);
    }
  };

  const submit = async () => {
    if (!videoUri) {
      Alert.alert('Error', 'No video selected.');
      return;
    }
    Alert.alert('Info', 'Export functionality to be implemented with backend integration.');
  };

  const togglePlayback = () => {
    if (player) {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        player.play();
        setIsPlaying(true);
      }
    }
  };

  const seekBy = (seconds: number) => {
    if (player) {
      const newTime = Math.max(0, Math.min(player.currentTime + seconds, duration));
      const seekAmount = newTime - player.currentTime;
      player.seekBy(seekAmount);
      setCurrentTime(newTime);
      timelineRef.current?.scrollTo({ x: newTime * TIMELINE_SCALE - SCREEN_WIDTH / 2, animated: true });
    }
  };

  const scrollOffsetRef = useRef(0);
  const scrollViewContainerRef = useRef<View>(null);

  const handleTimelinePress = (e: any) => {
    const pageX = e.nativeEvent.pageX;
    
    if (scrollViewContainerRef.current) {
      scrollViewContainerRef.current.measure((x, y, width, height, pageXOffset, pageYOffset) => {
        const relativeX = pageX - pageXOffset;
        const actualX = relativeX + scrollOffsetRef.current;
        const time = Math.max(0, Math.min(actualX / TIMELINE_SCALE, duration));
        
        if (player) {
          const seekAmount = time - player.currentTime;
          player.seekBy(seekAmount);
          setCurrentTime(time);
        }
      });
    }
  };

  const timelineWidth = Math.max(SCREEN_WIDTH, duration * TIMELINE_SCALE);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <ThemedText style={styles.headerTitle}>Video Editor</ThemedText>
          <TouchableOpacity onPress={submit} style={styles.saveButton}>
            <ThemedText style={styles.saveButtonText}>Export</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.canvasContainer}>
          <View 
            style={styles.videoWrapper}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              setContainerDimensions({ width, height });
            }}
          >
            {videoUri && player ? (
              <VideoView 
                style={styles.video} 
                player={player} 
                contentFit="contain" 
                nativeControls={false}
              />
            ) : (
              <View style={styles.placeholder}>
                <ThemedText>No Video Loaded</ThemedText>
              </View>
            )}

            <View style={styles.overlaysLayer} pointerEvents="box-none">
              {overlays.map(overlay => (
                <DraggableOverlay
                  key={overlay.id}
                  overlay={overlay}
                  isSelected={selectedOverlayId === overlay.id}
                  onSelect={() => setSelectedOverlayId(overlay.id)}
                  onUpdate={updateOverlay}
                  onEdit={handleEdit}
                  isVisible={currentTime >= overlay.startTime && currentTime <= overlay.endTime}
                  isPlaying={isPlaying}
                  containerWidth={containerDimensions.width}
                  containerHeight={containerDimensions.height}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.videoTime}>
          <ThemedText style={styles.videoTimeText}>
            {`${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60)
              .toString()
              .padStart(2, '0')}`}
          </ThemedText>
          <ThemedText style={styles.videoTimeText}>/</ThemedText>
          <ThemedText style={styles.videoTimeText}>
            {`${Math.floor(duration / 60)}:${Math.floor(duration % 60)
              .toString()
              .padStart(2, '0')}`}
          </ThemedText>
        </View>

        <View style={styles.controlsRow}>

          <TouchableOpacity onPress={() => seekBy(-10)} style={styles.controlButton}>
            <Ionicons name="play-back" size={24} color="white" />
            <ThemedText style={styles.controlLabel}>-10s</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
            <Ionicons name={isPlaying ? "pause" : "play"} size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => seekBy(10)} style={styles.controlButton}>
            <Ionicons name="play-forward" size={24} color="white" />
            <ThemedText style={styles.controlLabel}>+10s</ThemedText>
          </TouchableOpacity>
        </View>

        <View ref={scrollViewContainerRef} style={styles.timelineContainer}>
          <ScrollView 
            ref={timelineRef}
            style={styles.timeline} 
            horizontal 
            showsHorizontalScrollIndicator={false}
            scrollEnabled={true}
            contentContainerStyle={{ width: timelineWidth }}
            onScroll={(e) => {
              scrollOffsetRef.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
          >
            <TouchableWithoutFeedback onPress={handleTimelinePress}>
              <View style={[styles.timelineTrack, { width: timelineWidth }]}>
                <View style={styles.thumbnailsLayer}>
                  {thumbnails.map((uri, index) => (
                    <Image 
                      key={index} 
                      source={{ uri }} 
                      style={{ 
                        width: THUMBNAIL_INTERVAL * TIMELINE_SCALE, 
                        height: '100%', 
                        position: 'absolute',
                        left: index * THUMBNAIL_INTERVAL * TIMELINE_SCALE 
                      }} 
                      contentFit="cover"
                    />
                  ))}
                </View>

                <View style={[styles.playhead, { left: currentTime * TIMELINE_SCALE }]} />
                
                {overlays.map((overlay, index) => (
                  <TimelineItem 
                    key={overlay.id}
                    overlay={overlay}
                    isSelected={selectedOverlayId === overlay.id}
                    onSelect={() => setSelectedOverlayId(overlay.id)}
                    onUpdate={updateOverlay}
                  />
                ))}
              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>

        <View style={styles.toolsRow}>
          <TouchableOpacity onPress={addTextOverlay} style={styles.toolButton}>
            <Ionicons name="text" size={24} color="white" />
            <ThemedText style={styles.toolLabel}>Text</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={addImageOverlay} style={styles.toolButton}>
            <Ionicons name="image" size={24} color="white" />
            <ThemedText style={styles.toolLabel}>Image</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={addVideoOverlay} style={styles.toolButton}>
            <Ionicons name="videocam" size={24} color="white" />
            <ThemedText style={styles.toolLabel}>Video</ThemedText>
          </TouchableOpacity>
          {selectedOverlayId && (
            <TouchableOpacity onPress={deleteOverlay} style={styles.toolButton}>
              <Ionicons name="trash" size={24} color="#ff3b30" />
              <ThemedText style={[styles.toolLabel, { color: '#ff3b30' }]}>Delete</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <Modal visible={isEditingText} transparent animationType="fade">
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Edit Text</ThemedText>
              <TextInput
                style={styles.textInput}
                value={editingTextContent}
                onChangeText={setEditingTextContent}
                autoFocus
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsEditingText(false)} style={styles.modalButtonCancel}>
                  <ThemedText>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveTextEdit} style={styles.modalButtonSave}>
                  <ThemedText style={{ color: 'white' }}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  iconButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoWrapper: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#222',
  },
  overlaysLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    backgroundColor: '#1E1E1E',
  },
  toolButton: {
    alignItems: 'center',
    minWidth: 60,
  },
  toolLabel: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
  },
  timelineContainer: {
    height: 100,
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
  },
  timeline: {
    flex: 1,
  },
  timelineTrack: {
    height: 100,
    backgroundColor: '#252525',
    position: 'relative',
  },
  thumbnailsLayer: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5,
  },
  playhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#FF3B30',
    zIndex: 20,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  videoTime: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    padding: 5,
  },
  videoTimeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 32,
    backgroundColor: '#1E1E1E',
  },
  controlButton: {
    alignItems: 'center',
  },
  playButton: {
    padding: 12,
    backgroundColor: '#333',
    borderRadius: 30,
  },
  controlLabel: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#222',
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: 'white',
  },
  textInput: {
    backgroundColor: '#333',
    color: 'white',
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButtonCancel: {
    padding: 10,
  },
  modalButtonSave: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
});
