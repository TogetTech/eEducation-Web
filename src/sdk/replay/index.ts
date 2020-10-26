export interface ReplayParams {
  videoPath: string
  startTime: number
  endTime: number
  boardId: string
  boardToken: string
}

export class ReplayBoardManager<T> {
  nativeView?: HTMLElement
  readonly board!: T

  constructor(
    board: T
  ) {
    this.board = board
  }

  mount(nativeView?: HTMLElement) {
    this.nativeView = nativeView
  }

  async init() {

  }

  // releaseCombineReplay
  async destroy() {

  }

  play() {

  }

  pause() {

  }
  
  seekToTime() {

  }
}