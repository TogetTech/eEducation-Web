import React from 'react'
import { CustomIcon } from "../icon"
import './index.scss'
import { useRoomStore } from '@/hooks'
import { RendererPlayer } from '../media-player'

type VideoPlayerProps = {
  className?: string
  userUuid: string
  streamUuid: string
  showClose: boolean
  account: string
  renderer?: any
  role: string
  audio: boolean
  video: boolean
  local?: boolean
  share?: boolean
  showControls: boolean
  handleClickVideo?: (userUuid: string, isLocal: boolean) => void
  handleClickAudio?: (userUuid: string, isLocal: boolean) => void
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  className,
  showClose,
  streamUuid,
  userUuid,
  account,
  renderer,
  local = false,
  role,
  audio,
  video,
  showControls,
  share = false,
  handleClickVideo,
  handleClickAudio
}) => {

  const roomStore = useRoomStore()

  const handleClose = async () => {
    await roomStore.closeStream(userUuid, local)
  }

  const handleAudioClick = async () => {
    if (handleClickAudio) {
      return handleClickAudio(userUuid, local)
    }
    if (audio) {
      await roomStore.muteAudio(userUuid, local)
    } else {
      await roomStore.unmuteAudio(userUuid, local)
    }
  }

  const handleVideoClick = async () => {
    if (handleClickVideo) {
      return handleClickVideo(userUuid, local)
    }
    if (video) {
      await roomStore.muteVideo(userUuid, local)
    } else {
      await roomStore.unmuteVideo(userUuid, local)
    }
  }

  return (
    <div className={`${className ? className : 'agora-video-view'}`}>
      {showClose ? <div className="icon-close" onClick={handleClose}></div> : null}
      {
        share === true ? null : 
        <div className={role === 'teacher' ? 'teacher-placeholder' : 'student-placeholder'}>
        </div>
      }
      { share ? 
        <RendererPlayer key={renderer && renderer.videoTrack ? renderer.videoTrack.getTrackId() : ''} track={renderer} id={streamUuid} fitMode={true} className="rtc-video" /> :
        <>
          { renderer && video ? <RendererPlayer key={renderer && renderer.videoTrack ? renderer.videoTrack.getTrackId() : ''} track={renderer} id={streamUuid} className="rtc-video" /> : null}
        </>
      }
      { 
        account ? 
        <div className="video-profile">
          <span className="account">{account}</span>
          {showControls ?
            <span className="media-btn">
              <CustomIcon onClick={handleAudioClick} className={audio ? "icon-speaker-on" : "icon-speaker-off"} data={"audio"} />
              <CustomIcon onClick={handleVideoClick} className={video ? "icons-camera-unmute-s" : "icons-camera-mute-s"} data={"video"} />
            </span> : null}
        </div>
        : null
      }
    </div>
  )
}