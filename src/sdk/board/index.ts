export class WhiteBoardManager<T> {
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

  async join() {

  }

  async grantPermission(): Promise<boolean> {
    return true
  }

  async revokePermission(): Promise<boolean> {
    return true
  }

  async leave() {

  }
}