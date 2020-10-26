import { ReplayParams } from './../replay/index';
import { Room, WhiteWebSdk, DeviceType, createPlugins, Plugins, JoinRoomParams, Player, ReplayRoomParams, ViewMode } from 'white-web-sdk';
import { EventEmitter } from 'events';
import { AgoraBoardApi } from "../education/core/services/board-api";

export class EduBoardService {
  apiService: AgoraBoardApi;

  constructor(userToken: string, roomUuid: string) {
    this.apiService = new AgoraBoardApi(userToken, roomUuid)
  }

  async getBoardInfo() {
    let info = await this.apiService.getCurrentBoardInfo()
    console.log(">>> info", info)
    return info
  }

  async updateBoardUserState(userUuid: string, grantPermission: number) {
    let info = await this.apiService.updateCurrentBoardUserState(userUuid, grantPermission)
    return info
  }

  async updateBoardRoomState(follow: number) {
    let info = await this.apiService.updateCurrentBoardState(follow)
    return info
  }
}