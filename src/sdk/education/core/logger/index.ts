import { logApi } from "../services/log-upload";
import { get } from "http";
import { isElectron } from "@/utils/platform";
import db from "./db";
import Dexie from "dexie";
// eslint-disable
import LogWorker from 'worker-loader!./log.worker';

export enum EduLogLevel {
  Debug = 'Debug',
  None = 'None'
}

const flat = (arr: any[]) => {
  return arr.reduce((arr, elem) => arr.concat(elem), []);
};

export class EduLogger {
  static logLevel: EduLogLevel = EduLogLevel.Debug

  private static get currentTime(): string {
    const date = new Date();
    return `${date.toTimeString().split(" ")[0] + ":" + date.getMilliseconds()}`;
  }

  static setLogLevel(v: EduLogLevel) {
    this.logLevel = v
  }

  // static enableUpload() {

  // }

  static warn(...args: any[]) {
    this.log(`WARN`, ...args)
  }

  static debug(...args: any[]) {
    this.log(`DEBUG`, ...args)
  }

  static info(...args: any[]) {
    this.log(`INFO`, ...args)
  }

  private static log(type: string, ...args: any[]) {
    if (this.logLevel === EduLogLevel.None) {
      return
    }
    const prefix = `${this.currentTime} %cAgoraEdu-SDK [${type}]: `

    let loggerArgs: any[] = [] 

    const pattern: {[key: string]: any} = {
      'WARN': {
        call: () => {
          loggerArgs = [prefix, "color: #9C640C;"].concat(args) as any
          (console as any).log.apply(console, loggerArgs)
        }
      },
      'DEBUG': {
        call: () => {
          loggerArgs = [prefix, "color: #99CC66;"].concat(args) as any
          (console as any).log.apply(console, loggerArgs)
        }
      },
      'INFO': {
        call: () => {
          loggerArgs = [prefix, "color: #99CC99; font-weight: bold;"].concat(args) as any
          (console as any).log.apply(console, loggerArgs)
        }
      }
    }
  
    if (pattern.hasOwnProperty(type)) {
      (pattern[type] as any).call()
    } else {
      loggerArgs = [prefix, "color: #64B5F6;"].concat(args) as any
      (console as any).log.apply(console, loggerArgs)
    }
  }

  static originConsole = window.console;

  static thread = null;

  static init() {
    if (!this.thread) {
      //@ts-ignore
      this.thread = new LogWorker()
      this.debugLog();
    }
  }

  static debugLog() {
    const thread = this.thread as any;
    function proxy(context: any, method: any) {
      return function() {
        let args = [...arguments];
        flat(args).join('');
        thread.postMessage({
          type: 'log',
          data: JSON.stringify([flat(args).join('')])
        });
        method.apply(context, args);
      };
    }

    Object.keys(console)
      .filter(e => ['info', 'error', 'warn', 'log', 'debug'].indexOf(e) >= 0)
      .forEach((method: any, _) => {
        //@ts-ignore
        console[method] = proxy(console, console[method]);
      });
    //@ts-ignore
    window.console = console;
  }

  static async uploadElectronLog(roomId: any) {
    //@ts-ignore
    let file = await window.doGzip();
    const res = await logApi.uploadZipLogFile(
      roomId,
      file
    )
    return res;
  }

  static async enableUpload(roomUuid: string) {
    const ids = [];
    // Upload Electron log
    if (isElectron) {
      ids.push(await this.uploadElectronLog(roomUuid))
    }
    // Web upload log
    ids.push(await this.uploadLog(roomUuid))
    return ids.join("#")
  }

  static async uploadLog(roomId: string) {
    console.log('[upload] roomId: ', roomId)
    // let ua = getUserAgent();
    //@ts-ignore
    let logs = await db.logs.toArray();
    const logsStr = logs
      .reverse()
      .map((e: any) => JSON.parse(e.content))
      .map((e: any) => (Array.isArray(e) ? e[0] : e))
      .join('\n');

    //@ts-ignore
    window.logsStr = logsStr

    const file = await new File([logsStr], `${+Date.now()}`)

    //@ts-ignore
    window.file = file
    
    let res: any = await logApi.uploadLogFile(
      roomId,
      file,
    )
    await db.delete();
    if (!(await Dexie.exists(db.name))) {
      db.version(1).stores({
        logs: 'content'
      });
    }
    await db.open();
    console.log(">>>>> res", res)
    return res;
  }
}

//@ts-ignore
window.EduLogger = EduLogger