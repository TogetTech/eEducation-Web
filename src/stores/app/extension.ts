import { EduAudioSourceType } from './../../sdk/education/interfaces/index.d';
import { EduVideoSourceType } from '@/sdk/education/interfaces/index.d';
import { AppStore } from '@/stores/app/index';
import { AgoraWebRtcWrapper } from '../../sdk/education/core/media-service/web/index';
import { MediaService } from '../../sdk/education/core/media-service/index';
import { IMicrophoneAudioTrack } from 'agora-rtc-sdk-ng';
import { observable, computed, action, runInAction } from 'mobx';
import { AgoraElectronRTCWrapper } from '@/sdk/education/core/media-service/electron';
import { StartScreenShareParams, PrepareScreenShareParams } from '@/sdk/education/core/media-service/interfaces';
import { LocalUserRenderer } from '@/sdk/education/core/media-service/renderer';
import { Dialog } from '@material-ui/core';
import { get } from 'lodash';

type ApplyUser = {
  userName: string
  userUuid: string
  streamUuid: string
  userState: boolean
}

// 控制管理扩展工具的状态显示
export class ExtensionStore {
  appStore!: AppStore

  @observable
  applyUsers: ApplyUser[] = []

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

  @observable
  handVisible: boolean = false

  @action
  showHand() {
    this.handVisible = true
  }
  
  @action
  hiddenHand() {
    this.handVisible = false
  }

  // @observable
  // enableCoVideo: boolean = false

  // @observable
  // enableAutoHandUpCoVideo: boolean = false

  @computed
  get enableAutoHandUpCoVideo(): boolean {
    return !!get(this.appStore.middleRoomStore,'roomProperties.handUpStates.apply', 0)
  }

  @action
  async toggleEnableAutoHandUpCoVideo() {
    await this.appStore.middleRoomStore.roomManager?.userService?.updateRoomProperties2({
      "handUpStates": {
        "state": +this.enableCoVideo,
        "apply": +!this.enableAutoHandUpCoVideo
      }
    })
  }

  @computed
  get enableCoVideo(): boolean {
    return !!get(this.appStore.middleRoomStore,'roomProperties.handUpStates.state', 0)
  }

  @action
  async toggleEnableCoVideo() {
    await this.appStore.middleRoomStore.roomManager?.userService?.updateRoomProperties2({
      "handUpStates": {
        "state": +!this.enableCoVideo,
        "apply": +this.enableAutoHandUpCoVideo
      }
    })
  }

  @observable
  visibleCard: boolean = false

  @action
  toggleCard() {
    this.visibleCard = !this.visibleCard
  }

  async acceptApply(userUuid: string, streamUuid: string) {
    await this.appStore.roomStore.roomManager.userService.batchUpdateStreamAttributes([
      {
        streamUuid,
        userUuid,
        videoSourceType: EduVideoSourceType.camera,
        audioSourceType: EduAudioSourceType.mic,
        hasVideo: 1,
        hasAudio: 1
      }
    ])
  }
}