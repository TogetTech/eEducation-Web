import { MediaStore } from './../stores/app/media';
import { MobXProviderContext } from 'mobx-react';
import { useContext } from 'react';
import { 
  AppStore,
  RoomStore,
  BoardStore,
  DeviceStore,
  UIStore,
  BreakoutRoomStore,
  ReplayStore,
  RecordingStore
 } from '@/stores/app';

export type appContext = Record<string, AppStore>

export const useAppStore = (): AppStore => {
  const context = useContext<appContext>(MobXProviderContext);
  return context.store
}

export const useUIStore = (): UIStore => {
  const context = useContext<appContext>(MobXProviderContext);
  return context.store.uiStore
}

export const useRoomStore = (): RoomStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.roomStore;
}

export const useBreakoutRoomStore = (): BreakoutRoomStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.breakoutRoomStore;
}

export const useBoardStore = (): BoardStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.boardStore
}

export const useRecordingStore = (): RecordingStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.recordingStore
}

export const useDeviceStore = (): DeviceStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.deviceStore
}

export const useReplayStore = (): ReplayStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.replayStore
}

export const useMediaStore = (): MediaStore => {
  const context = useContext<appContext>(MobXProviderContext)
  return context.store.mediaStore
}