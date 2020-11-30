import { ExtensionStore } from './extension';
import { SimpleInterval } from './../mixin/simple-interval';
import { CauseType } from './../../sdk/education/core/services/edu-api';
import { MiddleRoomApi } from '../../services/middle-room-api';
import { Mutex } from './../../utils/mutex';
import uuidv4 from 'uuid/v4';
import { EduAudioSourceType, EduTextMessage, EduSceneType, EduClassroom } from './../../sdk/education/interfaces/index.d';
import { RemoteUserRenderer } from './../../sdk/education/core/media-service/renderer/index';
import { RoomApi } from './../../services/room-api';
import { EduClassroomManager } from '@/sdk/education/room/edu-classroom-manager';
import { PeerInviteEnum } from '@/sdk/education/user/edu-user-service';
import { LocalUserRenderer, UserRenderer } from '../../sdk/education/core/media-service/renderer/index';
import { AppStore } from '@/stores/app/index';
import { RoomStore } from '@/stores/app/room';
import { AgoraWebRtcWrapper } from '../../sdk/education/core/media-service/web/index';
import { observable, computed, action, runInAction } from 'mobx';
import { AgoraElectronRTCWrapper } from '@/sdk/education/core/media-service/electron';
import { StartScreenShareParams, PrepareScreenShareParams } from '@/sdk/education/core/media-service/interfaces';
import { MediaService } from '@/sdk/education/core/media-service';
import { get } from 'lodash';
import { EduCourseState, EduUser, EduStream, EduVideoSourceType, EduRoleType, UserGroup, RoomProperties } from '@/sdk/education/interfaces/index.d';
import { ChatMessage } from '@/utils/types';
import { t } from '@/i18n';
import { DialogType } from '@/components/dialog';
import { BizLogger } from '@/utils/biz-logger';
import { EduBoardService } from '@/sdk/board/edu-board-service';
import { EduRecordService } from '@/sdk/record/edu-record-service';

const genStudentStreams = (num: number) => {
  const items = Array.from({length: num}, (v, i) => i)
  return items.map(item => ({
    video: false,
    audio: false,
    name: `${item}name`,
    id: item + +Date.now() % 2000,
    showReward: true,
    reward: +Date.now() % 2000,
    account: `${item}-account`,
    showStar: true
  }))
}

type ExtendEduMediaStream = {

}

type VideoMarqueeItem = {
  mainStream: EduMediaStream | null
  studentStreams: EduMediaStream[]
}

type MiddleRoomProperties = {
  handUpStates: {
    state: number,
    apply: number
  },
  groups: any[],
  students: Record<string, any>,
  teachers: Record<string, any>
}

type MiddleRoomSchema = Partial<MiddleRoomProperties>

const delay = 2000

const ms = 500

export const networkQualities: {[key: string]: string} = {
  'excellent': 'network-good',
  'good': 'network-good',
  'poor': 'network-normal',
  'bad': 'network-normal',
  'very bad': 'network-bad',
  'down': 'network-bad',
  'unknown': 'network-normal',
}

export type EduMediaStream = {
  streamUuid: string
  userUuid: string
  renderer?: UserRenderer
  account: string
  local: boolean
  audio: boolean
  video: boolean
  showControls: boolean
}

export class MiddleRoomStore extends SimpleInterval {
  constructor(appStore: AppStore) {
    super()
    this.appStore = appStore
  }

  static resolutions: any[] = [
    {
      name: '480p',
      value: '480p_1',
    },
    {
      name: '720p',
      value: '720p_1',
    },
    {
      name: '1080p',
      value: '1080p_1'
    }
  ]

  middleRoomApi!: MiddleRoomApi;
  roomApi!: RoomApi;
  appStore: AppStore;
  get sceneStore() {
    return this.appStore.sceneStore
  }
  
  get roomManager() {
    return this.sceneStore.roomManager
  }

  get extensionStore() {
    return this.appStore.extensionStore;
  }


  @computed
  get userUuid(): string {
    return this.sceneStore.userUuid
  }

  get uiStore() {
    return this.appStore.uiStore;
  }

  @action
  resetRoomInfo() {
    this.appStore.resetRoomInfo()
  }

  @action
  reset() {
    this.appStore.mediaStore.resetRoomState()
    this.appStore.resetTime()
    this.sceneStore.reset()
    this.roomChatMessages = []
    this.userGroups = []
    this.pkList = []
    this.messages = []
    this.notice = undefined
  }


  @observable
  roomChatMessages: ChatMessage[] = []

  @action
  addChatMessage(args: any) {
    this.roomChatMessages.push(args)
  }
  
  @observable
  unreadMessageCount: number = 0

  @observable
  messages: any[] = []

  @observable
  userGroups: UserGroup[] = []

  @observable
  pkList: any[] = []

  @observable
  notice?: any = undefined

  @action
  showNotice(type: PeerInviteEnum, userUuid: string, userName: string) {
    BizLogger.info(`type: ${type}, userUuid: ${userUuid}`)
    let text = t('toast.you_have_a_default_message')
    switch(type) {
      case PeerInviteEnum.teacherAccept: {
        text = t('middle_room.the_teacher_accepted')
        break;
      }
      case PeerInviteEnum.studentApply: {
        text = t('middle_room.student_hands_up', {reason: userName})
        break;
      }
      case PeerInviteEnum.teacherStop: {
        text = t('middle_room.end_covideo_by_teacher')
        break;
      }
      case PeerInviteEnum.studentStop:
      case PeerInviteEnum.studentCancel: 
        text = t('middle_room.end_covideo_by_self')
        this.removeDialogBy(userUuid)
        break;
      // case PeerInviteEnum.teacherReject: {
      //   text = t('toast.the_teacher_refused')
      //   break;
      // }
    }
    this.notice = {
      reason: text,
      userUuid
    }
    this.appStore.uiStore.addToast(this.notice.reason)
  }

  @action
  async callApply() {
    try {
      const teacher = this.roomManager?.getFullUserList().find((it: EduUser) => it.userUuid === this.sceneStore.teacherStream.userUuid)
      if (teacher) {
        await this.roomManager?.userService.sendCoVideoApply(teacher)
      }
    } catch (err) {
      this.appStore.uiStore.addToast(t('toast.failed_to_initiate_a_raise_of_hand_application') + ` ${err.msg}`)
    }
  }

  @action
  async callEnded() {
    try {
      await this.sceneStore.closeStream(this.roomInfo.userUuid, true)
    } catch (err) {
      this.appStore.uiStore.addToast(t('toast.failed_to_end_the_call') + ` ${err.msg}`)
    }
  }

  showDialog(userName: string, userUuid: any) {
    const isExists = this.appStore
      .uiStore
      .dialogs.filter((it: DialogType) => it.dialog.userUuid)
      .find((it: DialogType) => it.dialog.userUuid === userUuid)
    if (isExists) {
      return
    }
    this.appStore.uiStore.showDialog({
      type: 'apply',
      userUuid: userUuid,
      message: `${userName}` + t('icon.requests_to_connect_the_microphone')
    })
  }

  removeDialogBy(userUuid: any) {
    const target = this.appStore
    .uiStore
    .dialogs.filter((it: DialogType) => it.dialog.userUuid)
    .find((it: DialogType) => it.dialog.userUuid === userUuid)
    if (target) {
      this.appStore.uiStore.removeDialog(target.id)
    }
  }

  @action
  async join() {
    try {
      this.appStore.uiStore.startLoading()
      this.roomApi = new RoomApi()
      this.middleRoomApi = new MiddleRoomApi()
      let {roomUuid} = await this.roomApi.fetchRoom({
        roomName: `${this.roomInfo.roomName}`,
        roomType: +this.roomInfo.roomType as number,
      })
      await this.eduManager.login(this.userUuid)
  
      const roomManager = this.eduManager.createClassroom({
        roomUuid: roomUuid,
        roomName: this.roomInfo.roomName
      })
      roomManager.on('seqIdChanged', (evt: any) => {
        BizLogger.info("seqIdChanged", evt)
        this.appStore.uiStore.updateCurSeqId(evt.curSeqId)
        this.appStore.uiStore.updateLastSeqId(evt.latestSeqId)
      })
      // 本地用户更新
      roomManager.on('local-user-updated', (evt: any) => {
        this.sceneStore.userList = roomManager.getFullUserList()
        BizLogger.info("local-user-updated", evt)
      })
      // 本地流移除
      roomManager.on('local-stream-removed', async (evt: any) => {
        await this.sceneStore.mutex.dispatch<Promise<void>>(async () => {
          if (!this.sceneStore.joiningRTC) {
            return 
          }
          try {
            const tag = uuidv4()
            BizLogger.info(`[demo] tag: ${tag}, [${Date.now()}], handle event: local-stream-removed, `, JSON.stringify(evt))
            if (evt.type === 'main') {
              this.sceneStore._cameraEduStream = undefined
              await this.sceneStore.closeCamera()
              await this.sceneStore.closeMicrophone()
              BizLogger.info(`[demo] tag: ${tag}, [${Date.now()}], main stream closed local-stream-removed, `, JSON.stringify(evt))
            }
            BizLogger.info("[demo] local-stream-removed emit done", evt)
          } catch (error) {
            BizLogger.error(`[demo] local-stream-removed async handler failed`)
            BizLogger.error(error)
          }
        })
      })
      // 本地流加入
      // roomManager.on('local-stream-added', (evt: any) => {
      //   this.sceneStore.streamList = roomManager.getFullStreamList()
      //   BizLogger.info("local-stream-added", evt)
      // })
      // 本地流更新
      roomManager.on('local-stream-updated', async (evt: any) => {
        await this.sceneStore.mutex.dispatch<Promise<void>>(async () => {
          if (!this.sceneStore.joiningRTC) {
            return 
          }
          const tag = uuidv4()
          BizLogger.info(`[demo] tag: ${tag}, seq[${evt.seqId}] time: ${Date.now()} local-stream-updated, `, JSON.stringify(evt))
          if (evt.type === 'main') {
            const localStream = roomManager.getLocalStreamData()
            BizLogger.info(`[demo] local-stream-updated tag: ${tag}, time: ${Date.now()} local-stream-updated, main stream `, JSON.stringify(localStream), this.sceneStore.joiningRTC)
            if (localStream && localStream.state !== 0) {
              BizLogger.info(`[demo] local-stream-updated tag: ${tag}, time: ${Date.now()} local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC)
              this.sceneStore._cameraEduStream = localStream.stream
              await this.sceneStore.prepareCamera()
              await this.sceneStore.prepareMicrophone()
              BizLogger.info(`[demo] tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
              if (this.sceneStore.joiningRTC) {
                if (this.sceneStore._hasCamera) {
                  if (this.sceneStore.cameraEduStream.hasVideo) {
                    await this.sceneStore.openCamera()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after openCamera  local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
                  } else {
                    await this.sceneStore.closeCamera()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after closeCamera  local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
                  }
                }
                if (this.sceneStore._hasMicrophone) {
                  if (this.sceneStore.cameraEduStream.hasAudio) {
                    BizLogger.info('open microphone')
                    await this.sceneStore.openMicrophone()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} after openMicrophone  local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
                  } else {
                    BizLogger.info('close local-stream-updated microphone')
                    await this.sceneStore.closeMicrophone()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after closeMicrophone  local-stream-updated, main stream is online`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
                  }
                }
              }
            } else {
              BizLogger.info("reset camera edu stream", JSON.stringify(localStream), localStream && localStream.state)
              this.sceneStore._cameraEduStream = undefined
            }
          }
    
          if (evt.type === 'screen') {
            if (this.roomInfo.userRole === 'teacher') {
              const screenStream = roomManager.getLocalScreenData()
              BizLogger.info("local-stream-updated getLocalScreenData#screenStream ", JSON.stringify(screenStream))
              if (screenStream && screenStream.state !== 0) {
                this.sceneStore._screenEduStream = screenStream.stream
                this.sceneStore.sharing = true
              } else {
                BizLogger.info("local-stream-updated reset screen edu stream", screenStream, screenStream && screenStream.state)
                this.sceneStore._screenEduStream = undefined
                this.sceneStore.sharing = false
              }
            }
          }
    
          BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated emit done`, evt)
          BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated emit done`, ' _hasCamera', this.sceneStore._hasCamera, ' _hasMicrophone ', this.sceneStore._hasMicrophone, this.sceneStore.joiningRTC, ' _eduStream', JSON.stringify(this.sceneStore._cameraEduStream))
        })
      })
      // 远端人加入
      roomManager.on('remote-user-added', (evt: any) => {
        runInAction(() => {
          this.sceneStore.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-added", evt)
      })
      // 远端人更新
      roomManager.on('remote-user-updated', (evt: any) => {
        runInAction(() => {
          this.sceneStore.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-updated", evt)
      })
      // 远端人移除
      roomManager.on('remote-user-removed', (evt: any) => {
        runInAction(() => {
          this.sceneStore.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-removed", evt)
      })
      // 远端流加入
      roomManager.on('remote-stream-added', (evt: any) => {
        runInAction(() => {
          this.sceneStore.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.sceneStore.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sceneStore.sharing = true
            } else { 
              this.sceneStore.sharing = false
            }
          }
        })
        BizLogger.info("remote-stream-added", evt)
      })
      // 远端流移除
      roomManager.on('remote-stream-removed', (evt: any) => {
        runInAction(() => {
          this.sceneStore.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.sceneStore.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sceneStore.sharing = true
            } else { 
              this.sceneStore.sharing = false
            }
          }
        })
        BizLogger.info("remote-stream-removed", evt)
      })
      // 远端流更新
      roomManager.on('remote-stream-updated', (evt: any) => {
        runInAction(() => {
          this.sceneStore.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.sceneStore.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sceneStore.sharing = true
            } else { 
              this.sceneStore.sharing = false
            }
          }
        })
        BizLogger.info("remote-stream-updated", evt)
      })
      const decodeMsg = (str: string) => {
        try {
          return JSON.parse(str)
        } catch(err) {
          BizLogger.warn(err)
          return null
        }
      }
      this.eduManager.on('user-message', async (evt: any) => {
        await this.sceneStore.mutex.dispatch<Promise<void>>(async () => {
          if (!this.sceneStore.joiningRTC) {
            return 
          }
          try {
            BizLogger.info('[rtm] user-message', evt)
            const fromUserUuid = evt.message.fromUser.userUuid
            const fromUserName = evt.message.fromUser.userName
            const msg = decodeMsg(evt.message.message)
            BizLogger.info("user-message", msg)
            if (msg) {
              const {payload} = msg
              const {action} = payload
              // const payload = msg.payload
              const {name, role, uuid} = payload.fromUser
              this.showNotice(action as PeerInviteEnum, uuid, name)
              if (action === PeerInviteEnum.studentApply) {
                const userExists = this.extensionStore.applyUsers.find((user) => user.userUuid === uuid)
                const user = this.roomManager?.data.userList.find(it => it.user.userUuid === uuid)
                if (!userExists && user) {
                  this.extensionStore.applyUsers.push({
                    userName: name,
                    userUuid: uuid,
                    streamUuid: user.streamUuid,
                    userState: true
                  })
                }
                this.uiStore.showShakeHands()
              }
              if (action === PeerInviteEnum.teacherStop) {
                try {
                  await this.sceneStore.closeCamera()
                  await this.sceneStore.closeMicrophone()
                  this.appStore.uiStore.addToast(t('toast.co_video_close_success'))
                } catch (err) {
                  this.appStore.uiStore.addToast(t('toast.co_video_close_failed'))
                  BizLogger.warn(err)
                }
              }
              if (action === PeerInviteEnum.teacherAccept 
                && this.isBigClassStudent()) {
                try {
                  await this.sceneStore.prepareCamera()
                  await this.sceneStore.prepareMicrophone()
                  BizLogger.info("propertys ", this.sceneStore._hasCamera, this.sceneStore._hasMicrophone)
                  if (this.sceneStore._hasCamera) {
                    await this.sceneStore.openCamera()
                  }
      
                  if (this.sceneStore._hasMicrophone) {
                    BizLogger.info('open microphone')
                    await this.sceneStore.openMicrophone()
                  }
                } catch (err) {
                  BizLogger.warn('published failed', err) 
                  throw err
                }
                this.appStore.uiStore.addToast(t('toast.publish_rtc_success'))
              }
            }
            // if (msg) {
            //   const {cmd, data} = msg
            //   const {type, userName} = data
            //   BizLogger.info("data", data)
            //   this.showNotice(type as PeerInviteEnum, fromUserUuid)
            //   if (type === PeerInviteEnum.studentApply) {
            //     this.showDialog(fromUserName, fromUserUuid)
            //   }
            //   if (type === PeerInviteEnum.teacherStop) {
            //     try {
            //       await this.sceneStore.closeCamera()
            //       await this.sceneStore.closeMicrophone()
            //       this.appStore.uiStore.addToast(t('toast.co_video_close_success'))
            //     } catch (err) {
            //       this.appStore.uiStore.addToast(t('toast.co_video_close_failed'))
            //       BizLogger.warn(err)
            //     }
            //   }
            //   if (type === PeerInviteEnum.teacherAccept 
            //     && this.isBigClassStudent()) {
            //     try {
            //       await this.sceneStore.prepareCamera()
            //       await this.sceneStore.prepareMicrophone()
            //       BizLogger.info("propertys ", this.sceneStore._hasCamera, this.sceneStore._hasMicrophone)
            //       if (this.sceneStore._hasCamera) {
            //         await this.sceneStore.openCamera()
            //       }
      
            //       if (this.sceneStore._hasMicrophone) {
            //         BizLogger.info('open microphone')
            //         await this.sceneStore.openMicrophone()
            //       }
            //     } catch (err) {
            //       BizLogger.warn('published failed', err) 
            //       throw err
            //     }
            //     this.appStore.uiStore.addToast(t('toast.publish_rtc_success'))
            //   }
            // }
          } catch (error) {
            BizLogger.error(`[demo] user-message async handler failed`)
            BizLogger.error(error)
          }
        })
      })
      // 教室更新
      roomManager.on('classroom-property-updated', (classroom: any) => {
        BizLogger.info("classroom-property-updated", classroom)
        // if (evt.reason === EduClassroomStateType.EduClassroomStateTypeRoomAttrs) {
          this.roomProperties = classroom.roomProperties
          const record = get(classroom, 'roomProperties.record')
          if (record) {
            const state = record.state
            if (state === 1) {
              this.sceneStore.recordState = true
            } else {
              if (state === 0 && this.sceneStore.recordState) {
                this.addChatMessage({
                  id: 'system',
                  ts: Date.now(),
                  text: '',
                  account: 'system',
                  link: this.sceneStore.roomUuid,
                  sender: false
                })
                this.sceneStore.recordState = false
                this.sceneStore.recordId = ''
              }
            }
          }
          const newClassState = classroom.roomStatus.courseState
          if (this.sceneStore.classState !== newClassState) {
            this.sceneStore.classState = newClassState
            if (this.sceneStore.classState === 1) {
              this.sceneStore.startTime = get(classroom, 'roomStatus.startTime', 0)
              this.addInterval('timer', () => {
                this.appStore.updateTime(+get(classroom, 'roomStatus.startTime', 0))
              }, ms)
            } else {
              this.sceneStore.startTime = get(classroom, 'roomStatus.startTime', 0)
              BizLogger.info("end timeer", this.sceneStore.startTime)
              this.delInterval('timer')
            }
          }
          this.sceneStore.isMuted = !classroom.roomStatus.isStudentChatAllowed
          // 中班功能
          this.roomProperties = classroom.roomProperties
          const groups = get(classroom, 'roomProperties.groups')
          const students = get(classroom, 'roomProperties.students')

          let userGroups: UserGroup[] = []
          if (groups) {
            Object.keys(groups).forEach(groupUuid => {
              let group = groups[groupUuid]
              let userGroup: UserGroup = {
                groupName: group.groupName,
                groupUuid: groupUuid,
                members: []
              }
              group.members.forEach((stuUuid: string) => {
                let info = students[stuUuid]
                userGroup.members.push({
                  userUuid: stuUuid,
                  userName: info.userName,
                  reward: info.reward
                })
              })
              userGroups.push(userGroup)
            })
            this.userGroups = userGroups
          }
      })
      roomManager.on('room-chat-message', (evt: any) => {
        const {textMessage} = evt;
        const message = textMessage as EduTextMessage
        this.addChatMessage({
          id: message.fromUser.userUuid,
          ts: message.timestamp,
          text: message.message,
          account: message.fromUser.userName,
          sender: false
        })
        BizLogger.info('room-chat-message', evt)
      })
  
      if (this.roomInfo.userRole === 'teacher') {
        await roomManager.join({
          userRole: `host`,
          roomUuid,
          userName: `${this.roomInfo.userName}`,
          userUuid: `${this.userUuid}`,
        })
      } else {
        const {sceneType, userRole} = this.getStudentConfig()
        await roomManager.join({
          userRole: userRole,
          roomUuid,
          userName: `${this.roomInfo.userName}`,
          userUuid: `${this.userUuid}`,
          sceneType,
        })
        const reward = 0
        this.batchUpdateRoomAttributes({
          "students": {
            [`${this.sceneStore.localUser.userUuid}`]: {
              "userName": `${this.sceneStore.localUser.userName}`,
              "reward": reward,
            },
          }
        })
      }
      this.sceneStore._roomManager = roomManager;
      this.appStore._boardService = new EduBoardService(roomManager.userToken, roomManager.roomUuid)
      this.appStore._recordService = new EduRecordService(roomManager.userToken)
  
      const roomInfo = roomManager.getClassroomInfo()
      this.roomProperties = roomInfo.roomProperties as any
      this.sceneStore.startTime = +get(roomInfo, 'roomStatus.startTime', 0)

      this.middleRoomApi.setSessionInfo({
        roomName: roomManager.roomName,
        roomUuid: roomManager.roomUuid,
        userUuid: this.sceneStore.roomInfo.userUuid,
        userToken: roomManager.userToken,
        userName: this.sceneStore.roomInfo.userName,
        role: this.sceneStore.roomInfo.userRole
      })
      const mainStream = roomManager.data.streamMap['main']
  
      this.sceneStore.classState = roomInfo.roomStatus.courseState

      if (this.sceneStore.classState === 1) {
        this.addInterval('timer', () => {
          this.appStore.updateTime(+get(roomInfo, 'roomStatus.startTime', 0))
        }, ms)
      }
      this.sceneStore.isMuted = !roomInfo.roomStatus.isStudentChatAllowed
  
      await this.sceneStore.joinRTC({
        uid: +mainStream.streamUuid,
        channel: roomInfo.roomInfo.roomUuid,
        token: mainStream.rtcToken
      })
  
      const localStreamData = roomManager.data.localStreamData
  
      let canPublish = this.roomInfo.userRole === 'teacher' ||
         localStreamData && !!(+localStreamData.state)
  
      if (canPublish) {
  
        const localStreamData = roomManager.data.localStreamData
  
        BizLogger.info("localStreamData", localStreamData)
        await roomManager.userService.publishStream({
          videoSourceType: EduVideoSourceType.camera,
          audioSourceType: EduAudioSourceType.mic,
          streamUuid: mainStream.streamUuid,
          streamName: '',
          hasVideo: localStreamData && localStreamData.stream ? localStreamData.stream.hasVideo : true,
          hasAudio: localStreamData && localStreamData.stream ? localStreamData.stream.hasAudio : true,
          userInfo: {} as EduUser
        })
        this.appStore.uiStore.addToast(t('toast.publish_business_flow_successfully'))
        this.sceneStore._cameraEduStream = this.roomManager.userService.localStream.stream
        try {
          await this.sceneStore.prepareCamera()
          await this.sceneStore.prepareMicrophone()
          if (this.sceneStore._cameraEduStream) {
            if (this.sceneStore._cameraEduStream.hasVideo) {
              await this.sceneStore.openCamera()
            } else {
              await this.sceneStore.closeCamera()
            }
            if (this.sceneStore._cameraEduStream.hasAudio) {
              BizLogger.info('open microphone')
              await this.sceneStore.openMicrophone()
            } else {
              BizLogger.info('close microphone')
              await this.sceneStore.closeMicrophone()
            }
          }
        } catch (err) {
          this.appStore.uiStore.addToast(t('toast.media_method_call_failed') + `: ${err.msg}`)
          BizLogger.warn(err)
        }
      }
  
      await this.appStore.boardStore.init()
  
      const roomProperties = roomManager.getClassroomInfo().roomProperties
      if (roomProperties) {
        this.sceneStore.recordId = get(roomProperties, 'record.recordId', '')
      } else {
        this.sceneStore.recordId = ''
      }
    
      this.sceneStore.userList = roomManager.getFullUserList()
      this.sceneStore.streamList = roomManager.getFullStreamList()
      if (this.roomInfo.userRole !== 'teacher') {
        if (this.sceneStore.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
          this.sceneStore.sharing = true
        } else { 
          this.sceneStore.sharing = false
        }
      }
      this.appStore.uiStore.stopLoading()
      this.joined = true
    } catch (err) {
      this.appStore.uiStore.stopLoading()
      throw err
    }
  }

  getStudentConfig() {
    const roomType = +this.roomInfo.roomType
    if (roomType === 2 || roomType === 4) {
      return {
        sceneType: EduSceneType.SceneLarge,
        userRole: 'audience'
      }
    }
    return {
      sceneType: roomType,
      userRole: 'broadcaster'
    }
  }

  @computed
  get groups() {
    const firstGroup: VideoMarqueeItem = {
      mainStream: null,
      studentStreams: [],
    }
    const secondGroup: VideoMarqueeItem = {
      mainStream: null,
      studentStreams: [],
    }

    if (this.userGroups.length) {
      // this.userGroups[0].members.
    }

    const userIdsNotInPkList = this.sceneStore
      .userList.filter((user) => !this.pkList.includes(user.userUuid))
      .map((user) => user.userUuid)

    if (userIdsNotInPkList) {
      const streams = this.sceneStore.studentStreams.filter((stream) => userIdsNotInPkList.includes(stream.userUuid))
      firstGroup.studentStreams = firstGroup.studentStreams.concat(streams)
      firstGroup.studentStreams = firstGroup.studentStreams.map((stream) => ({
        ...stream,
        showStar: true,
        showControls: false,
        showHover: this.roomInfo.userRole === 'teacher'
      }))
    }

    return [firstGroup, secondGroup]
  }

  // @observable
  // groups: any[] = [
  //   {
  //     mainStream: null,
  //     studentStreams: [],
  //     // studentStreams: genStudentStreams(20),
  //   },
  //   {
  //     mainStream: null,
  //     studentStreams: [],
  //     // studentStreams: genStudentStreams(20),
  //   }
  // ]

  @action
  async sendReward(userUuid: string, reward: number) {

  }

  @action
  async sendClose(userUuid: string) {
    const isLocal = this.roomInfo.userUuid === userUuid
    await this.sceneStore.closeStream(userUuid, isLocal)
  }

  @action
  async updateRoomBatchProperties(payload: {properties: MiddleRoomSchema, cause: CauseType}) {
    await this.roomManager.userService.updateRoomBatchProperties(payload)
  }

  @observable
  roomProperties: MiddleRoomProperties = {
    handUpStates: {
      state: 0,
      apply: 0
    },
    groups: [],
    students: {},
    teachers: {}
  }

  async batchUpdateStreamAttributes(streams: any[]) {
    try {
      await this.roomManager?.userService.batchUpdateStreamAttributes(streams)
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  async batchRemoveStreamAttributes(streams: any[]) {
    try {
      await this.roomManager?.userService.batchRemoveStreamAttributes(streams)
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  async batchUpdateRoomAttributes(properties: any) {
    try {
      await this.roomManager?.userService.batchUpdateRoomAttributes(properties)
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  async batchRemoveRoomAttributes() {
    try {
      await this.roomManager?.userService.batchRemoveRoomAttributes()
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  async batchUpdateUserAttributes(userUuid: string, properties: any) {
    try {
      await this.roomManager?.userService.batchUpdateUserAttributes(userUuid, properties)
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  async batchRemoveUserAttributes(userUuid: string) {
    try {
      await this.roomManager?.userService.batchRemoveUserAttributes(userUuid)
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  @action
  async sendMessage(message: string) {
    try {
      await this.roomManager.userService.sendRoomChatMessage(message)
      this.addChatMessage({
        id: this.userUuid,
        ts: +Date.now(),
        text: message,
        account: this.roomInfo.userName,
        sender: true,
      })
    } catch (err) {
      BizLogger.warn(err)
    }
  }

  isBigClassStudent(): boolean {
    const userRole = this.roomInfo.userRole
    return +this.roomInfo.roomType === 2 && userRole === 'student'
  }

  get eduManager() {
    return this.appStore.eduManager
  }

  @observable
  joined: boolean = false


  @computed
  get roomInfo() {
    return this.appStore.roomInfo
  }

  @action
  async leave() {
    try {
      this.sceneStore.joiningRTC = true
      await this.sceneStore.leaveRtc()
      await this.appStore.boardStore.leave()
      await this.eduManager.logout()
      await this.roomManager?.leave()
      this.appStore.uiStore.addToast(t('toast.successfully_left_the_business_channel'))
      this.delInterval('timer')
      this.reset()
      this.resetRoomInfo()
      this.appStore.uiStore.updateCurSeqId(0)
      this.appStore.uiStore.updateLastSeqId(0)
    } catch (err) {
      this.reset()
      BizLogger.error(err)
    }
  }
}
