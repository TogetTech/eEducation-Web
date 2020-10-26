import uuidv4 from 'uuid/v4';
import { EventEmitter } from 'events';
import { AgoraEduApi } from '../core/services/edu-api';
import { EduLogger } from '../core/logger';

class SyncRoomTask {

  apiService: AgoraEduApi

  id: number = -1
  args: any[] = []

  constructor(apiService: AgoraEduApi) {
    this.apiService = apiService
  }

  setJob(payload: any) {
    this.id = payload.id
    this.args = payload.args
  }
  
  async perform(params: any) {
    let n = 3;
    do {
      try {
        // this.step = params.step
        // this.requestId = params.requestId
        // this.nextId = params.nextId
        // this.nextTs = params.nextTs
        const res = await this.apiService.subRoomData(params)
        console.log("perform >>>> ", params)
        return {
          step: params.step,
          requestId: params.requestId,
          nextId: params.nextId,
          nextTs: params.nextTs,
          data: res,
        }
      } catch (err) {
        --n;
        if (n === 0) {
          throw err
        }
      }
    } while(n !== 0)
  }
}

export class TaskScheduler extends EventEmitter {

  jobQueue: any[] = []
  data: any[] = []

  _lock: boolean = false

  timer: any = null

  num: number = 0

  release: boolean = false

  apiService: AgoraEduApi

  constructor(apiService: AgoraEduApi) {
    super()
    this.reset()
    this.apiService = apiService
    this.on('task', (task: any) => {
      if (this.lock) {
        console.log("locking", this.lock)
      } else {
        this.run(task)
      }
    })
    // this.on('data', (data: any) => {
      // this.emit('data', data)
    // })
  }

  private retry(task: any, delay: number) {
    if (this.timer || this.release) return
    const {id, args} = task

    this.timer = setTimeout(() => {
      console.log("retrying >>>", task)
      const onSuccess = (res: any) => {
        console.log('重试成功', task.name, args)
        this.handleSuccess(res)
      }

      const onFailure = (err: any) => {
        console.log('重试失败', task.name, 'id', id, 'delay', delay, 'queue', this.jobQueue, args)
        this.handleFailure(task, delay, err)
      }
      task.perform(args)
      .then(onSuccess)
      .catch(onFailure)
    }, delay)
  }

  handleSuccess(res: any) {
    if (this.release) return
    this.data.push(res)
    if (this.jobQueue.length === 0) {
      console.log("...data", this.data)
      this.emit('request-success', this.data)
      this.data = []
    } else {
      const task = this.jobQueue.shift()
      this._lock = false
      this.run(task)
      this.timer && clearTimeout(this.timer)
      this.timer = null
    }
  }

  handleFailure(task: any, delay: number, err: any) {
    if (this.release) return
    this.timer && clearTimeout(this.timer)
    this.timer = null
    console.log(err)
    this.retry(task, delay)
  }

  private run (task: any) {

    const {id, args} = task

    this._lock = true
    console.log("run >>>", task.name, id, args)

    const onSuccess = (res: any) => {
      console.log('执行成功', task.name, args)
      this.handleSuccess(res)
    }

    const onFailure = (err: any) => {
      console.log('执行失败', task.name, id, args)
      this.handleFailure(task, 1000, err)
    }

    task.perform(args)
      .then(onSuccess)
      .catch(onFailure)
  }

  get lock(): boolean {
    return this._lock;
  }

  append(task: any, args: any) {
    task.setJob({
      id: ++this.num,
      args,
    })
    console.log("task ", task.id, args)
    // const _task = {run: task, id: ++this.num, args}
    this.emit("task", task)
  }

  step: number = 1
  requestId: string = ``
  nextId: string = ''
  nextTs: number = 0
  isFinish: number = 0

  async fetchRoomData(params: any) {
    let n = 3;
    do {
      try {
        // this.step = params.step
        // this.requestId = params.requestId
        // this.nextId = params.nextId
        // this.nextTs = params.nextTs
        const res = await this.apiService.subRoomData(params)
        return {
          step: params.step,
          requestId: params.requestId,
          nextId: params.nextId,
          nextTs: params.nextTs,
          data: res,
        }
      } catch (err) {
        --n;
        if (n === 0) {
          throw err
        }
      }
    } while(n !== 0)
  }

  syncRoom(args: any) {
    this.requestId = uuidv4()
    console.log("syncRoom ", args.text)
    this.append(new SyncRoomTask(
      this.apiService
    ), {
      ...args,
      requestId: this.requestId
    })
  }

  stop() {
    this._lock = true
    this.jobQueue = []
    this.timer && clearTimeout(this.timer)
    this.timer = null
    this.release = true
  }
  
  reset () {
    this.num = 0
    this._lock = false
    this.jobQueue = []
    this.nextId = ''
    this.nextTs = 0
    this.timer && clearTimeout(this.timer)
    this.timer = null
    this.release = false
    EduLogger.info('reset task scheduler')
  }
}


interface ITaskTimer {
  step: string
  requestId: string
  nextId: string
  nextTs: number
  isFinished: number
}

export class TaskTimer {

  private  _taskInfo?: ITaskTimer

  constructor(attrs: ITaskTimer) {
    this.updateTaskProtocol(attrs)
  }

  updateTaskProtocol(attrs: ITaskTimer) {
    this._taskInfo = attrs
  } 

  get taskInfo(): ITaskTimer {
    return this._taskInfo as ITaskTimer
  }
}

interface InternalSyncState {
  step1: number
  step2: number
  room: string
  users: string
  requestId: string
  timerId: any
}


export class InternalTaskScheduler extends EventEmitter {

  public resetInternalState() {
    this._state = InternalTaskScheduler.defaultInternalSyncMapState
  }

  private _state: InternalSyncState = InternalTaskScheduler.defaultInternalSyncMapState;

  private static defaultInternalSyncMapState: InternalSyncState = {
    requestId: '',
    step1: -1,
    step2: -1,
    room: '',
    users: '',
    timerId: null
  }

  get state(): InternalSyncState{
    return this._state;
  }

  constructor() {
    super()
  }

  updateState(args: Partial<InternalSyncState>) {
    this._state = {
      ...this._state,
      ...args
    }
  }

  appendTimer(evt: any) {
    const taskTimer = new TaskTimer(evt)
    this.emit('timer-added', taskTimer)
  }

  appendData(evt: any) {
    this.emit('data-added', evt)
  }

  release() {
    console.log("release")
    this.removeAllListeners()
    const timerId = InternalTaskScheduler.defaultInternalSyncMapState.timerId
    if (timerId !== null) {
      clearTimeout(timerId)
    }
    this.resetInternalState()
  }

}