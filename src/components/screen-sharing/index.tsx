import React from 'react'
import { observer } from 'mobx-react'
import { useRoomStore, useBreakoutRoomStore } from '@/hooks'
import { useLocation } from 'react-router-dom';
import { VideoPlayer } from '@/components/video-player'
import './index.scss';
export const ScreenSharing = () => {
  const location = useLocation()

  const isBreakoutClass = location.pathname.match('breakout-class')

  return (
    isBreakoutClass ? <BreakoutClassSceneScreenSharing /> : <BasicSceneScreenSharing />
  )
}
const BasicSceneScreenSharing = observer(() => {
  const roomStore = useRoomStore()
  return (
    roomStore.sharing ? 
    <VideoPlayer 
      showClose={false}
      role="teacher"
      share={true}
      className="screen-sharing"
      {...roomStore.screenShareStream}
    /> : null
  )
})

const BreakoutClassSceneScreenSharing = observer(() => {
  const roomStore = useBreakoutRoomStore()
  return (
    roomStore.sharing ? 
    <VideoPlayer 
      showClose={false}
      role="teacher"
      share={true}
      className="screen-sharing"
      {...roomStore.screenShareStream}
    /> : null
  )
})
