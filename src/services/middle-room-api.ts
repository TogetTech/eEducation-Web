import { AgoraFetchParams } from "@/sdk/education/interfaces/index.d";
import { EduRoomType } from "@/sdk/education/core/services/interface.d";
import { APP_ID, AUTHORIZATION } from "@/utils/config";
import { HttpClient } from "@/sdk/education/core/utils/http-client";
import { BizLogger } from "@/utils/biz-logger";

export enum InvitationEnum {
  Apply =  1,
  Invite = 2,
  Accept = 3,
  Reject = 4,
  Cancel = 5
}

export type RoomInfo = {
  roomUuid: string
  roomName: string
  userUuid: string
  userName: string
  role: string
  userToken: string
}

export class MiddleRoomApi {
  _sessionInfo!: RoomInfo;

  setSessionInfo(payload: RoomInfo) {
    this._sessionInfo = payload
  }

  get room(): any {
    return {
      name: this._sessionInfo.roomName,
      uuid: this._sessionInfo.roomUuid
    }
  }

  get me(): any {
    return {
      uuid: this._sessionInfo.userUuid,
      name: this._sessionInfo.userName,
      role: this._sessionInfo.role
    }
  }

  get userToken(): string {
    return this._sessionInfo.userToken;
  }

  get prefix(): string {
    return `${REACT_APP_AGORA_APP_SDK_DOMAIN}/scene/apps/%app_id`.replace("%app_id", APP_ID)
  }

  // 接口请求
  async fetch (params: AgoraFetchParams) {
    const {
      method,
      token,
      data,
      full_url,
      url,
    } = params
    const opts: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${AUTHORIZATION!.replace(/basic\s+|basic/i, '')}`
      }
    }
    if (data) {
      opts.body = JSON.stringify(data);
    }
    if (token) {
      opts.headers['token'] = token
    }
    let resp: any;
    if (full_url) {
      resp = await HttpClient(`${full_url}`, opts);
    } else {
      resp = await HttpClient(`${this.prefix}${url}`, opts);
    }
    if (resp.code !== 0) {
      throw {msg: resp.msg}
    }
    return resp
  }
  
  // 中班课分组
  async createGroupMiddle(roomUuid: string, memberLimit: number, userToken: string, type: number) {
    let res = await this.fetch({
      full_url: `http://115.231.168.26:3000/mock/9/scenario/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      // full_url: `${REACT_APP_AGORA_APP_SDK_DOMAIN}/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      method: 'POST',
      data: {
        type: type,   // 1 随机 2 顺序分组
        memberLimit: memberLimit
      },
      token: userToken
    })
    return res.data
  }

  // 分组更新
  async updateGroupMiddle(roomUuid: string, groupUuid: string, userToken: string) {
    let res = await this.fetch({
      full_url: `http://115.231.168.26:3000/mock/9/scenario/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      // full_url: `${REACT_APP_AGORA_APP_SDK_DOMAIN}/scenario/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      method: 'PUT',
      data: {
        groups: {
          groupUuid: groupUuid,
          members: [],
        }
      },
      token: userToken
    })
    return res.data
  }

  // 分组删除
  async deleteGroupMiddle(roomUuid: string, userToken: string) {
    let res = await this.fetch({
      full_url: `http://115.231.168.26:3000/mock/9/scenario/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      // full_url: `${REACT_APP_AGORA_APP_SDK_DOMAIN}/scenario/grouping/apps/${APP_ID}/v2/rooms/${roomUuid}/groups`,
      method: 'DELETE',
      data: {},
      token: userToken
    })
    return res.data
  }

  // 举手邀请开启
  async handInvitationStart(processUuid: string, action: number, toUserUuid: string, payload: object) {
    let res = await this.fetch({
      full_url: `http://115.231.168.26:3000/mock/9/invitation/apps/${APP_ID}/v1/rooms/${this.room.uuid}/users/${toUserUuid}/process/${processUuid}`,
      method: 'POST',
      data: {
        action: action,
        fromUser: this.me,
        fromRoom: this.room,
        payload: payload,
      },
      token: this.userToken
    })
    return res.data
  }

  // 举手邀请结束
  async handInvitationEnd(processUuid: string, action: number, toUserUuid: string, payload: object) {
    let res = await this.fetch({
      full_url: `http://115.231.168.26:3000/mock/9/invitation/apps/${APP_ID}/v1/rooms/${this.room.uuid}/users/${toUserUuid}/process/${processUuid}`,
      method: 'DELETE',
      data: {
        action: action,
        fromUser: this.me,
        fromRoom: this.room,
        payload: payload,
      },
      token: this.userToken
    })
    return res.data
  }

}
