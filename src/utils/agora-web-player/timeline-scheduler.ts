import { PlayerLogger } from './logger';
import { EventEmitter } from 'events';
import raf from 'raf'

export class TimelineScheduler extends EventEmitter {

  _state: string = 'paused'
  delay: number
  duration: number

  public rafId: number
  log: PlayerLogger

  _lastTimeoutId: any
  _stopTimer: boolean
  _internalLoop: any
  _visibilityHandler: (evt?: any) => void | any

  public currentTime: number
  public currentDuration: number

  constructor (
    public readonly fps: number = 15,
    public readonly callback: (args?: any) => void,
    public readonly startTime: number,
    public readonly endTime: number
  ) {
    super()
    this.log = new PlayerLogger()
    if (this.endTime <= this.startTime) throw `endTime must greater than startTime`
    this.delay = 1000 / this.fps
    this.rafId = -1
    this.duration = this.endTime - this.startTime
    this.currentTime = this.startTime
    this.currentDuration = 0
    this._visibilityHandler = () => {}

    this._lastTimeoutId = -1
    this._stopTimer = true

    this._internalLoop = null
  }

  private _startTimerLoop (fn: (evt?: any, v?: any) => void, fps: number): (e: void) => any {
    this._stopTimer = false

    const loop = () => {
      if (this._stopTimer === true) {
        clearTimeout(this._lastTimeoutId)
        return
      }
      const now = performance.now()
      fn(now, true)
      this._lastTimeoutId = setTimeout(loop, fps)
    }

    loop()

    return () => {
      clearTimeout(this._lastTimeoutId)
      this._stopTimer = true
    }
  }

  public start () {
    // if (this.state === 'started') {
    //   return this.log.warn('Please stop previous scheduler')
    // }
    this._visibilityHandler = (evt: any) => {
      if(document.hidden) {
        this.log.warn('switch raf to setTimeout', Date.now())
        this._internalLoop = this._startTimerLoop(nextTick, this.fps / 1000)
      } else {
        this.log.warn('switch setTimeout back to raf', Date.now())
        if (this._internalLoop) {
          this._internalLoop()
          this._internalLoop = null
        }
      }
    }

    document.addEventListener('visibilitychange', this._visibilityHandler, false);
    this.state = 'started'
    let _time = -1
    let frame = -1
    const durationBase = this.currentDuration
    const nextTick = (timestamp: number, v?: boolean): void => {
      if (this.currentTime >= this.endTime) {
        this.stop()
        return
      }
      if (_time === -1) {
        _time = timestamp
      }

      const elapsedTime = Math.ceil(timestamp - _time)
      const currentDuration = durationBase + elapsedTime

      const progress: number = Math.min(Math.ceil((currentDuration / this.duration) * 100) / 100, 1)
      const duration = Math.min(currentDuration, this.duration)
      const time = Math.min(this.startTime + duration, this.endTime)
      this.currentDuration = duration
      let currentFrame = Math.floor(elapsedTime / this.delay)
      if (currentFrame > frame) {
        const params = {
          progress,
          duration,
          time,
          startTime: this.startTime,
          endTime: this.endTime,
          isTimer: v === true
        }
        this.callback(params)
        this.currentTime = time
        frame = currentFrame
      }
      if (this.state === 'started') {
        this.rafId = raf(nextTick)
      }
    }
    this.rafId = raf(nextTick)
  }

  public stop () {
    // if (this.state !== 'started') return

    this.state = 'paused'

    raf.cancel(this.rafId)
    clearTimeout(this._lastTimeoutId)
    document.removeEventListener('visibilitychange', this._visibilityHandler, false);
    this.log.info('this.rafId canceled', this.rafId)

    if (this.currentTime === this.endTime) {
      this.state = 'ended'
    }
  }

  public resume () {
    this.start()
  }

  public seekTo (time: number) {
    if (typeof time !== 'number') {
      return this.log.warn('time should pass number')
    }

    this.currentDuration = time

    if (this.state === 'ended') {
      this.currentTime = this.startTime
      console.log("use startTime as currentTime")
    }

    this.emit('seek-changed', this.currentDuration)
  }

  public set state (newState: any) {
    this._state = newState
    this.emit("state-changed", this._state)
  }

  public get state () {
    return this._state
  }

}