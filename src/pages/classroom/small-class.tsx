import React from 'react';
import {VideoMarquee} from '@/components/video-marquee';
import {NetlessBoard} from '@/components/netless-board';
import { ScreenSharing } from '@/components/screen-sharing';
import { RoomBoard } from '@/components/room-board';
import './small-class.scss';

export const SmallClass = () => {
  return (
    <div className="room-container">
      <VideoMarquee />
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