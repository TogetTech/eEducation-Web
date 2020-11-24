import React from 'react';
import {VideoMarquee} from '@/components/video-marquee';
import {NetlessBoard} from '@/components/netless-board';
import { ScreenSharing } from '@/components/screen-sharing';
import { RoomBoard } from '@/components/room-board';
import './small-class.scss';
import { observer } from 'mobx-react';
import { useRoomStore } from '@/hooks';

export const LiveRoomVideoMarquee = observer(() => {
  const store = useRoomStore()
  return <VideoMarquee
    className={'small-class-room'}
    showMain={true}
    teacherStream={store.teacherStream}
    studentStreams={store.studentStreams}
  />
})

export const SmallClass = () => {
  return (
    <div className="room-container">
      <LiveRoomVideoMarquee />
      <div className="container">
        <div className="biz-container">
          <NetlessBoard />
          <ScreenSharing />
        </div>
        <RoomBoard />
      </div>
    </div>
  )
}