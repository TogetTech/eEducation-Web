import { AppStore } from '@/stores/app/index';
import { AgoraWebRtcWrapper } from '../../sdk/education/core/media-service/web/index';
import { MediaService } from '../../sdk/education/core/media-service/index';
import { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { observable, computed, action, runInAction } from 'mobx';
import { AgoraElectronRTCWrapper } from '@/sdk/education/core/media-service/electron';
import { StartScreenShareParams, PrepareScreenShareParams } from '@/sdk/education/core/media-service/interfaces';
import { LocalUserRenderer } from '@/sdk/education/core/media-service/renderer';


// 控制管理扩展工具的状态显示
export class ExtensionStore {
  
  appStore!: AppStore

  constructor(appStore: AppStore) {
    this.appStore = appStore
  }

  @observable
  controlGrouping: boolean = false

  @action 
  showGrouping() {
    this.controlGrouping = true
  }

  @observable
  controlSpread: boolean = false

  @action 
  showspread() {
    this.controlSpread = true
  }
  
  @action 
  hiddenGrouping() {
    this.controlGrouping = false
  }

  @observable
  controlCreate: boolean = false

  @action 
  showCreate() {
    this.controlCreate = true
  }

  @action
  hiddenCreate() {
    this.controlCreate = false
  }
  
}