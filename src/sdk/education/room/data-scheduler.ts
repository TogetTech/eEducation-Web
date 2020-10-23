export type SeqData = {
  seqId: SeqId
  data: any
}

export type SeqDataBuffer = SeqData[]

export type SeqId = number

export class DataScheduler {

  private _buffer: SeqDataBuffer

  private _curSeqId: SeqId | null

  constructor() {
    this._buffer = []
    this._curSeqId = null
  }

  private sort(buffer: SeqDataBuffer) {
    buffer.sort((a: SeqData, b: SeqData) => {
      const aSeqId = a.hasOwnProperty('seqId') ? a.seqId : -1
      const bSeqId = b.hasOwnProperty('seqId') ? b.seqId : -1
      if (bSeqId < aSeqId) {
        return 1
      }
      return -1
    })
  }

  get isReady(): boolean {
    if (this.last && this._curSeqId !== null && this._curSeqId <= this.last.seqId) {
      return true
    }
    return false
  }

  get last(): SeqData {
    return this._buffer.slice(-1)[0]
  }

  append(buffer: SeqDataBuffer) {
    this.sort(buffer)
    if (this._buffer.length) {
      const tmpArray = this._buffer.concat(buffer)
      this.sort(tmpArray)
      this._buffer = tmpArray
    } else {
      // when buffer is empty
      this._buffer = buffer
    }
  }

  async syncTask() {
    if (this.last && this.last.seqId) {
      // 当current seqId不存在时初始化seqId
      if (this._curSeqId === null) {
        this._curSeqId = this.last.seqId
      } else {
      // 当current seqId存在时比较是否连续
        if (this._curSeqId + 1 === this.last.seqId) {
          this._curSeqId = this.last.seqId
        }
      }
    }
  }

  reset() {
    this._buffer = []
    this._curSeqId = null
  }
}