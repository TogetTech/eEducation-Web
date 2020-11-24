import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CustomIcon } from "../icon"
import './index.scss'
import { useMiddleRoomStore, useRoomStore } from '@/hooks'
import { RendererPlayer } from '../media-player'
import { observer } from 'mobx-react'
import { get } from 'lodash'
import { useTimeout } from '../toast'

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
  showStar?: boolean
  showHover?: boolean
  handleClickVideo?: (userUuid: string, isLocal: boolean) => void
  handleClickAudio?: (userUuid: string, isLocal: boolean) => void
}

type RewardMenuPropsType = {
  userUuid: string
  video: boolean
  audio: boolean
}

export const MediaMenu = observer((props: RewardMenuPropsType) => {
  const {video, audio, userUuid} = props
  const middleRoomStore = useMiddleRoomStore() 

  const userReward = {
    num: 111,
    reward: 10
  }

  const handleAudioClick = async () => {
    if (props.audio) {
      await middleRoomStore.muteAudio(props.userUuid, false)
    } else {
      await middleRoomStore.unmuteAudio(props.userUuid, false)
    }
  }

  const handleVideoClick = async () => {
    if (props.video) {
      await middleRoomStore.muteVideo(props.userUuid, false)
    } else {
      await middleRoomStore.unmuteVideo(props.userUuid, false)
    }
  }

  const sendReward = async () => {
    await middleRoomStore.sendReward(props.userUuid, userReward.reward)
  }

  const handleClose = async () =>{
    await middleRoomStore.sendClose(props.userUuid)
  }

  const StartEffect = (props: any) => {
    useTimeout(() => {
      props && props.destroy()
    }, 2500)

    return (
      <div className="stars-effect"></div>
    )
  }

  const rewardNumber = get(userReward, 'num', 1)

  const prevNumber = useRef<number>(rewardNumber)

  const [rewardVisible, showReward] = useState<boolean>(false)

  const onDestroy = useCallback(() => {
    showReward(false)
  }, [showReward])

  useEffect(() => {
    if (prevNumber.current !== rewardNumber) {
      showReward(true)
    }
  }, [prevNumber, rewardNumber, showReward])

  return (
    <>
      <div className="hover-menu">
        {
          userReward ? 
          <>
            <CustomIcon onClick={handleAudioClick} className={audio ? "icon-speaker-on" : "icon-speaker-off"} data={"audio"} />
            <CustomIcon onClick={handleVideoClick} className={video ? "icons-camera-unmute-s" : "icons-camera-mute-s"} data={"video"} />
            <CustomIcon onClick={handleClose} className={"icons-close-co-video"} data={"close-co-video"} />
            <CustomIcon onClick={sendReward} className={"icon-hollow-white-star"} data={"reward"} />
          </> : null
        }
        {rewardVisible ?
        <StartEffect destroy={onDestroy} /> : null}
      </div>
    </>
  )
})

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
  showStar,
  handleClickVideo,
  handleClickAudio,
  showHover
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
      {showHover ? 
        <MediaMenu
          userUuid={`${userUuid}`}
          video={video}
          audio={audio}
        /> : null}
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
          {showStar ? 
            <CustomIcon onClick={() => {}} className={audio ? "icon-hollow-white-star" : "icon-inactive-star"} data={"active-star"} />
          : null}
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