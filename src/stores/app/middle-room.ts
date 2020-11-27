import { CauseType } from './../../sdk/education/core/services/edu-api';
import { MiddleRoomApi } from '../../services/middle-room-api';
import { Mutex } from './../../utils/mutex';
import uuidv4 from 'uuid/v4';
import { SimpleInterval } from './../mixin/simple-interval';
import { EduBoardService } from './../../sdk/board/edu-board-service';
import { EduRecordService } from './../../sdk/record/edu-record-service';
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

export class MiddleRoomStore extends RoomStore {
  middleRoomApi!: MiddleRoomApi;

  constructor(appStore: AppStore) {
    super(appStore);
  }

  @observable
  userGroups: UserGroup[] = []

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
        this.userList = roomManager.getFullUserList()
        BizLogger.info("local-user-updated", evt)
      })
      // 本地流移除
      roomManager.on('local-stream-removed', async (evt: any) => {
        await this.mutex.dispatch<Promise<void>>(async () => {
          if (!this.joiningRTC) {
            return 
          }
          try {
            const tag = uuidv4()
            BizLogger.info(`[demo] tag: ${tag}, [${Date.now()}], handle event: local-stream-removed, `, JSON.stringify(evt))
            if (evt.type === 'main') {
              this._cameraEduStream = undefined
              await this.closeCamera()
              await this.closeMicrophone()
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
      //   this.streamList = roomManager.getFullStreamList()
      //   BizLogger.info("local-stream-added", evt)
      // })
      // 本地流更新
      roomManager.on('local-stream-updated', async (evt: any) => {
        await this.mutex.dispatch<Promise<void>>(async () => {
          if (!this.joiningRTC) {
            return 
          }
          const tag = uuidv4()
          BizLogger.info(`[demo] tag: ${tag}, seq[${evt.seqId}] time: ${Date.now()} local-stream-updated, `, JSON.stringify(evt))
          if (evt.type === 'main') {
            const localStream = roomManager.getLocalStreamData()
            BizLogger.info(`[demo] local-stream-updated tag: ${tag}, time: ${Date.now()} local-stream-updated, main stream `, JSON.stringify(localStream), this.joiningRTC)
            if (localStream && localStream.state !== 0) {
              BizLogger.info(`[demo] local-stream-updated tag: ${tag}, time: ${Date.now()} local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC)
              this._cameraEduStream = localStream.stream
              await this.prepareCamera()
              await this.prepareMicrophone()
              BizLogger.info(`[demo] tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
              if (this.joiningRTC) {
                if (this._hasCamera) {
                  if (this.cameraEduStream.hasVideo) {
                    await this.openCamera()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after openCamera  local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
                  } else {
                    await this.closeCamera()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after closeCamera  local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
                  }
                }
                if (this._hasMicrophone) {
                  if (this.cameraEduStream.hasAudio) {
                    BizLogger.info('open microphone')
                    await this.openMicrophone()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} after openMicrophone  local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
                  } else {
                    BizLogger.info('close local-stream-updated microphone')
                    await this.closeMicrophone()
                    BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()}  after closeMicrophone  local-stream-updated, main stream is online`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
                  }
                }
              }
            } else {
              BizLogger.info("reset camera edu stream", JSON.stringify(localStream), localStream && localStream.state)
              this._cameraEduStream = undefined
            }
          }
    
          if (evt.type === 'screen') {
            if (this.roomInfo.userRole === 'teacher') {
              const screenStream = roomManager.getLocalScreenData()
              BizLogger.info("local-stream-updated getLocalScreenData#screenStream ", JSON.stringify(screenStream))
              if (screenStream && screenStream.state !== 0) {
                this._screenEduStream = screenStream.stream
                this.sharing = true
              } else {
                BizLogger.info("local-stream-updated reset screen edu stream", screenStream, screenStream && screenStream.state)
                this._screenEduStream = undefined
                this.sharing = false
              }
            }
          }
    
          BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated emit done`, evt)
          BizLogger.info(`[demo] local-stream-updated tag: ${tag}, seq[${evt.seqId}], time: ${Date.now()} local-stream-updated emit done`, ' _hasCamera', this._hasCamera, ' _hasMicrophone ', this._hasMicrophone, this.joiningRTC, ' _eduStream', JSON.stringify(this._cameraEduStream))
        })
      })
      // 远端人加入
      roomManager.on('remote-user-added', (evt: any) => {
        runInAction(() => {
          this.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-added", evt)
      })
      // 远端人更新
      roomManager.on('remote-user-updated', (evt: any) => {
        runInAction(() => {
          this.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-updated", evt)
      })
      // 远端人移除
      roomManager.on('remote-user-removed', (evt: any) => {
        runInAction(() => {
          this.userList = roomManager.getFullUserList()
        })
        BizLogger.info("remote-user-removed", evt)
      })
      // 远端流加入
      roomManager.on('remote-stream-added', (evt: any) => {
        runInAction(() => {
          this.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sharing = true
            } else { 
              this.sharing = false
            }
          }
        })
        BizLogger.info("remote-stream-added", evt)
      })
      // 远端流移除
      roomManager.on('remote-stream-removed', (evt: any) => {
        runInAction(() => {
          this.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sharing = true
            } else { 
              this.sharing = false
            }
          }
        })
        BizLogger.info("remote-stream-removed", evt)
      })
      // 远端流更新
      roomManager.on('remote-stream-updated', (evt: any) => {
        runInAction(() => {
          this.streamList = roomManager.getFullStreamList()
          if (this.roomInfo.userRole !== 'teacher') {
            if (this.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
              this.sharing = true
            } else { 
              this.sharing = false
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
        await this.mutex.dispatch<Promise<void>>(async () => {
          if (!this.joiningRTC) {
            return 
          }
          try {
            BizLogger.info('[rtm] user-message', evt)
            const fromUserUuid = evt.message.fromUser.userUuid
            const fromUserName = evt.message.fromUser.userName
            const msg = decodeMsg(evt.message.message)
            BizLogger.info("user-message", msg)
            if (msg) {
              const {cmd, data} = msg
              const {type, userName} = data
              BizLogger.info("data", data)
              this.showNotice(type as PeerInviteEnum, fromUserUuid)
              if (type === PeerInviteEnum.studentApply) {
                this.showDialog(fromUserName, fromUserUuid)
              }
              if (type === PeerInviteEnum.teacherStop) {
                try {
                  await this.closeCamera()
                  await this.closeMicrophone()
                  this.appStore.uiStore.addToast(t('toast.co_video_close_success'))
                } catch (err) {
                  this.appStore.uiStore.addToast(t('toast.co_video_close_failed'))
                  BizLogger.warn(err)
                }
              }
              if (type === PeerInviteEnum.teacherAccept 
                && this.isBigClassStudent()) {
                try {
                  await this.prepareCamera()
                  await this.prepareMicrophone()
                  BizLogger.info("propertys ", this._hasCamera, this._hasMicrophone)
                  if (this._hasCamera) {
                    await this.openCamera()
                  }
      
                  if (this._hasMicrophone) {
                    BizLogger.info('open microphone')
                    await this.openMicrophone()
                  }
                } catch (err) {
                  BizLogger.warn('published failed', err) 
                  throw err
                }
                this.appStore.uiStore.addToast(t('toast.publish_rtc_success'))
              }
            }
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
          this.roomProperties = get(classroom, 'roomProperties')
          const record = get(classroom, 'roomProperties.record')
          if (record) {
            const state = record.state
            if (state === 1) {
              this.recordState = true
            } else {
              if (state === 0 && this.recordState) {
                this.addChatMessage({
                  id: 'system',
                  ts: Date.now(),
                  text: '',
                  account: 'system',
                  link: this.roomUuid,
                  sender: false
                })
                this.recordState = false
                this.recordId = ''
              }
            }
          }
          const newClassState = classroom.roomStatus.courseState
          if (this.classState !== newClassState) {
            this.classState = newClassState
            if (this.classState === 1) {
              this.startTime = get(classroom, 'roomStatus.startTime', 0)
              this.addInterval('timer', () => {
                this.appStore.updateTime(+get(classroom, 'roomStatus.startTime', 0))
              }, ms)
            } else {
              this.startTime = get(classroom, 'roomStatus.startTime', 0)
              BizLogger.info("end timeer", this.startTime)
              this.delInterval('timer')
            }
          }
          this.isMuted = !classroom.roomStatus.isStudentChatAllowed

          // 中班功能
          this.roomProperties = classroom.roomProperties
          const groups = get(classroom, 'roomProperties.groups')
          const students = get(classroom, 'roomProperties.students')

          this.userGroups = []
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
              this.userGroups.push(userGroup)
            })
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
          autoPublish: true,
        })
      } else {
        const sceneType = +this.roomInfo.roomType === 2 ? EduSceneType.SceneLarge : +this.roomInfo.roomType
        await roomManager.join({
          userRole: 'audience',
          roomUuid,
          userName: `${this.roomInfo.userName}`,
          userUuid: `${this.userUuid}`,
          autoPublish: true,
          sceneType,
        })
        const reward = 0
        this.batchUpdateRoomAttributes({
          "students": {
            [`${this.localUser.userUuid}`]: {
              "userName": `${this.localUser.userName}`,
              "reward": reward,
            },
          }
        })
      }
      this._roomManager = roomManager;
      this.appStore._boardService = new EduBoardService(roomManager.userToken, roomManager.roomUuid)
      this.appStore._recordService = new EduRecordService(roomManager.userToken)
  
      const roomInfo = roomManager.getClassroomInfo()
      this.roomProperties = roomInfo.roomProperties as any
      this.startTime = +get(roomInfo, 'roomStatus.startTime', 0)

      const mainStream = roomManager.data.streamMap['main']
  
      this.classState = roomInfo.roomStatus.courseState

      if (this.classState === 1) {
        this.addInterval('timer', () => {
          this.appStore.updateTime(+get(roomInfo, 'roomStatus.startTime', 0))
        }, ms)
      }
      this.isMuted = !roomInfo.roomStatus.isStudentChatAllowed
  
      await this.joinRTC({
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
        this._cameraEduStream = this.roomManager.userService.localStream.stream
        try {
          await this.prepareCamera()
          await this.prepareMicrophone()
          if (this._cameraEduStream) {
            if (this._cameraEduStream.hasVideo) {
              await this.openCamera()
            } else {
              await this.closeCamera()
            }
            if (this._cameraEduStream.hasAudio) {
              BizLogger.info('open microphone')
              await this.openMicrophone()
            } else {
              BizLogger.info('close microphone')
              await this.closeMicrophone()
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
        this.recordId = get(roomProperties, 'record.recordId', '')
      } else {
        this.recordId = ''
      }
    
      this.userList = roomManager.getFullUserList()
      this.streamList = roomManager.getFullStreamList()
      if (this.roomInfo.userRole !== 'teacher') {
        if (this.streamList.find((it: EduStream) => it.videoSourceType === EduVideoSourceType.screen)) {
          this.sharing = true
        } else { 
          this.sharing = false
        }
      }
      this.appStore.uiStore.stopLoading()
      this.joined = true
    } catch (err) {
      this.appStore.uiStore.stopLoading()
      throw err
    }
  }

  @observable
  groups: any[] = [
    {
      teacherStream: {
        video: false,
        audio: false
      },
      studentStreams: [],
      // studentStreams: genStudentStreams(20),
    },
    {
      teacherStream: {
        video: false,
        audio: false
      },
      studentStreams: [],
      // studentStreams: genStudentStreams(20),
    }
  ]

  @action
  async sendReward(userUuid: string, reward: number) {

  }

  @action
  async sendClose(userUuid: string) {
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


  @action
  async callApply() {
    try {
      const teacher = this.roomManager?.getFullUserList().find((it: EduUser) => it.userUuid === this.teacherStream.userUuid)
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
      await this.closeStream(this.roomInfo.userUuid, true)
    } catch (err) {
      this.appStore.uiStore.addToast(t('toast.failed_to_end_the_call') + ` ${err.msg}`)
    }
  }

  async batchUpdateStreamAttributes(streams: any[]) {
    try {
      await this.roomManager?.userService.batchUpdateStreamAttributes(streams)
    } catch (err) {
      console.warn(err)
    }
  }

  async batchRemoveStreamAttributes(streams: any[]) {
    try {
      await this.roomManager?.userService.batchRemoveStreamAttributes(streams)
    } catch (err) {
      console.warn(err)
    }
  }

  async batchUpdateRoomAttributes(properties: any) {
    try {
      await this.roomManager?.userService.batchUpdateRoomAttributes(properties)
    } catch (err) {
      console.warn(err)
    }
  }

  async batchRemoveRoomAttributes() {
    try {
      await this.roomManager?.userService.batchRemoveRoomAttributes()
    } catch (err) {
      console.warn(err)
    }
  }

  async batchUpdateUserAttributes(userUuid: string, properties: any) {
    try {
      await this.roomManager?.userService.batchUpdateUserAttributes(userUuid, properties)
    } catch (err) {
      console.warn(err)
    }
  }

  async batchRemoveUserAttributes(userUuid: string) {
    try {
      await this.roomManager?.userService.batchRemoveUserAttributes(userUuid)
    } catch (err) {
      console.warn(err)
    }
  }
}
