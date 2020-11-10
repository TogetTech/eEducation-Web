import { Mutex } from './../../utils/mutex';
import uuidv4 from 'uuid/v4';
import { SimpleInterval } from './../mixin/simple-interval';
import { EduBoardService } from './../../sdk/board/edu-board-service';
import { EduRecordService } from './../../sdk/record/edu-record-service';
import { EduAudioSourceType, EduTextMessage, EduSceneType } from './../../sdk/education/interfaces/index.d';
import { RemoteUserRenderer } from './../../sdk/education/core/media-service/renderer/index';
import { RoomApi } from './../../services/room-api';
import { EduClassroomManager } from '@/sdk/education/room/edu-classroom-manager';
import { PeerInviteEnum } from '@/sdk/education/user/edu-user-service';
import { LocalUserRenderer, UserRenderer } from '../../sdk/education/core/media-service/renderer/index';
import { AppStore } from '@/stores/app/index';
import { AgoraWebRtcWrapper } from '../../sdk/education/core/media-service/web/index';
import { observable, computed, action, runInAction } from 'mobx';
import { AgoraElectronRTCWrapper } from '@/sdk/education/core/media-service/electron';
import { StartScreenShareParams, PrepareScreenShareParams } from '@/sdk/education/core/media-service/interfaces';
import { MediaService } from '@/sdk/education/core/media-service';
import { get } from 'lodash';
import { EduCourseState, EduUser, EduStream, EduVideoSourceType, EduRoleType } from '@/sdk/education/interfaces/index.d';
import { ChatMessage } from '@/utils/types';
import { t } from '@/i18n';
import { DialogType } from '@/components/dialog';
import { BizLogger } from '@/utils/biz-logger';
import { EduRteClassroomManager } from '@/sdk/education/manager/rte';

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

export type InitializeParams = {
    appId: string,
    userId: string,
    userName: string,
    scenePreset: number,
    log_file_path: string,
    log_level: string,
    log_file_size: number
}

export type InitParams = {
    initializeParams: InitializeParams,
    sceneUuid: string
}

export class RteRoomStore {

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
    eduRteClassroomManager: EduRteClassroomManager;
    appStore: AppStore;

  constructor(appStore: AppStore) {
    this.appStore = appStore;
    this.eduRteClassroomManager = new EduRteClassroomManager()
  }

  @action
  async init(payload: InitParams) {
      let res = await this.eduRteClassroomManager.initialize(payload)
      return res
  }

  @action
  async openCamera() {
    // TODO: fix
    await this.eduRteClassroomManager.openLocalCamera()
  }

  @action
  async openMicrophone() {
    // TODO: fix
    await this.eduRteClassroomManager.openLocalMicrophone()
  }


  @action
  async closeCamera() {
    // TODO: fix
    await this.eduRteClassroomManager.closeLocalCamera()
  }

  @action
  async closeMicrophone() {
    // TODO: fix
    await this.eduRteClassroomManager.closeLocalMicrophone()
  }

}