import { globalStore } from './../stores/global';
import { AgoraFetch } from "../utils/fetch";
import { getIntlError, setIntlError } from "./i18n-error";

const AUTHORIZATION_KEY: string = process.env.REACT_APP_AGORA_OPEN_EDU_AUTH_KEY as string;

const PREFIX = process.env.REACT_APP_AGORA_OPEN_EDU_API as string;

interface AgoraFetchJsonInit {
  url: string
  method: string
  data?: any
  token?: string
  authorization?: string
  authToken?: string
}

const AgoraFetchJson = async ({
  url,
  method,
  data,
  token,
  authToken,
  authorization,
}: AgoraFetchJsonInit) => {
  const opts: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Basic ${authToken}`,
    }
  }

  if (authorization) {
    opts.headers['Authorization'] = authorization;
  }

  if (token) {
    opts.token = token;
  }

  if (data) {
    opts.body = JSON.stringify(data);
  }

  let resp = await AgoraFetch(`${PREFIX}${url}`, opts);
  return resp.json();
}

export interface EntryRoomParams {
  roomId: string
  userName: string
  password: string
  role: number
  uuid: string
}

export class AgoraOpenEduApi {

  appID: string = '';
  token: string = '';
  authorization: string = '';

  private async fetchWrapper (props: any) {

    const params = props;

    if (this.authorization) {
      params.authorization = this.authorization
    }
    if (this.token) {
      params.token = this.token
    }
    if (this.appID) {
      params.appID = this.appID
    }
    let resp = await AgoraFetchJson(params);
    if (resp.code !== 0) {
      globalStore.showToast({
        type: 'requsetMessage', 
        message: getIntlError(resp.code)
      })
      throw {api_error: getIntlError(resp.code)}
    }

    return resp
  }

  async config() {
    let json = await this.fetchWrapper({
      url: `/edu/v1/config`,
      method: 'GET',
    })
    this.appID = json.data.appId;
    this.authorization = json.data.authorization;

    setIntlError(json.data.multiLanguage || null)

    return {
      appId: json.data.appId,
      room: json.data.room,
    }
  }

  async roomInfo(roomId: string) {
    await this.config();
    let json = await this.fetchWrapper({
      url: `/edu/v2/apps/${this.appID}/room/${roomId}`,
      method: 'GET',
    });
    return {
      code: json.code,
      msg: json.msg,
      data: json.data
    }
  }

  /**
   * entry
   * @param params {@link EntryRoomParams}
   */
  async entry(params: EntryRoomParams) {
    const {appId} = await this.config();
    let json = await this.fetchWrapper({
      url: `/edu/v2/apps/${this.appID}/room/entry`,
      method: 'POST',
      data: params,
      authToken: this.authorization,
    });
    const data = json.data
    return {
      room: data.room,
      user: data.user,
      appId,
    }
  }

}

export const agoraOpenEduApi = new AgoraOpenEduApi();