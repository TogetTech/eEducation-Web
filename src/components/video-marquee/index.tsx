import React, { useRef, useEffect, useState, useLayoutEffect } from 'react';
import {VideoPlayer} from '@/components/video-player';
import './video-marquee.scss';
import { AgoraMediaStream } from '@/utils/types';
import { observer } from 'mobx-react';
import { useRoomStore } from '@/hooks';

const showScrollbar = () => {
  const $marquee = document.querySelector(".video-marquee .agora-video-view");
  if ($marquee) {
    const clientWidth = $marquee.clientWidth;
    const marqueeLength: number = document.querySelectorAll(".video-marquee .agora-video-view").length;
    const videoMarqueeMark = document.querySelector('.video-marquee-mask')
    if (clientWidth && videoMarqueeMark) {
      const videoMarqueeWidth = videoMarqueeMark.clientWidth;
      const width: number = clientWidth * marqueeLength;
      if (videoMarqueeWidth <= width) {
        return true;
      }
    }
  }
  return false;
}

export const VideoMarquee = observer(() => {

  const {teacherStream, studentStreams} = useRoomStore()


  const marqueeEl = useRef(null);

  const scrollLeft = (current: any, offset: number) => {
    current.scrollLeft += (offset * current.childNodes[1].offsetWidth);
  }

  const handleScrollLeft = (evt: any) => {
    scrollLeft(marqueeEl.current, 1);
  }

  const handleScrollRight = (evt: any) => {
    scrollLeft(marqueeEl.current, -1);
  }

  const ref = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      ref.current = true;
    }
  }, []);

  const [scrollBar, setScrollBar] = useState<boolean>(false);

  useLayoutEffect(() => {
    if (!studentStreams.length) return;
    !ref.current && setScrollBar(showScrollbar());
  }, [studentStreams]);

  useEffect(() => {
    window.addEventListener('resize', (evt: any) => {
      !ref.current && setScrollBar(showScrollbar());
    });
    return () => {
      window.removeEventListener('resize', () => {});
    }
  }, []);

  return (
    <div className="video-marquee-container">
      <div className="main">
        <VideoPlayer
          showClose={false}
          role="teacher"
          {...teacherStream}
        />
      </div>
      <div className="video-marquee-mask">
        <div className="video-marquee" ref={marqueeEl}>
        {scrollBar ? 
          <div className="scroll-btn-group">
            <div className="icon icon-left" onClick={handleScrollLeft}></div>
            <div className="icon icon-right" onClick={handleScrollRight}></div>
          </div> : null
        }
          {studentStreams.map((studentStream: any, key: number) => (
            <VideoPlayer
              key={key}
              showClose={false}
              role="student"
              {...studentStream}
            />
          ))}
        </div>
      </div>
    </div>
  )
})