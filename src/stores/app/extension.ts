import { EduAudioSourceType, EduVideoSourceType } from '@/sdk/education/interfaces/index.d';
import { AppStore } from '@/stores/app/index';
import { observable, computed, action } from 'mobx';
import { get } from 'lodash';

export type SetInterval = ReturnType<typeof setInterval>

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

  @computed
  get enableAutoHandUpCoVideo(): boolean {
    return !!get(this.appStore.middleRoomStore,'roomProperties.handUpStates.apply', 0)
  }

  @computed
  get enableCoVideo(): boolean {
    return !!get(this.appStore.middleRoomStore,'roomProperties.handUpStates.state', 0)
  }

  @action
  async updateHandUpState(enableCoVideo: boolean, enableAutoHandUpCoVideo: boolean) {
    await this.appStore.middleRoomStore.roomManager?.userService?.updateRoomProperties2({
      "handUpStates": {
        "state": +enableCoVideo,
        "apply": +enableAutoHandUpCoVideo
      }
    })
  }

  @observable
  visibleCard: boolean = false

  @action
  toggleCard() {
    this.visibleCard = !this.visibleCard
  }

  hideCard() {
    this.visibleCard = false
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

  @computed
  get userRole(): string {
    return this.appStore.roomStore.localUser.userRole
  }

  @computed
  get showStudentHandsTool(): boolean {
    if (this.userRole === 'student' && this.enableCoVideo) {
      return true
    }
    return false
  }

  @computed
  get showTeacherHandsTool(): boolean {
    if (this.userRole === 'teacher' && this.enableCoVideo) {
      return true
    }
    return false
  }

  @observable
  tick: number = 3000

  interval?: SetInterval

  @observable
  inTick: boolean = false
  
  @action
  startTick() {
    if (this.interval !== undefined) {
      this.stopTick()
    }
    this.tick = 3000
    this.inTick = true
    this.interval = setInterval(() => {
      if (this.tick === 0) {
        if (this.interval) {
          clearInterval(this.interval)
          this.interval = undefined
        }
        this.inTick = false
        return
      }
      this.tick -= 1000
    }, 1000)
  }

  @action
  stopTick() {
    this.interval && clearInterval(this.interval)
    this.interval = undefined
    this.inTick = false
  }

  @action
  async raiseHands() {

  }

  @action
  async acceptRaiseHands(userUuid: string) {
    // await this.appStore.middleRoomStore.middleRoomApi.handInvitationStart()
  }

  @observable
  visibleUserList: boolean = false

  @action
  toggleApplyUserList() {
    this.visibleUserList = !this.visibleUserList
  }

  @action
  hideApplyUserList() {
    this.visibleUserList = false
  }
}