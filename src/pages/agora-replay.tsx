import React, { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import "video.js/dist/video-js.css";
import './replay.scss';
import { WhiteboardAPI, RTMRestful } from '../utils/api';
import { whiteboard } from '../stores/whiteboard';
import Slider from '@material-ui/core/Slider';
import { Subject, Scheduler } from 'rxjs';
import { useParams, useLocation, Redirect } from 'react-router';
import moment from 'moment';
import { Progress } from '../components/progress/progress';
import { RTMReplayer, RtmPlayerState } from '../components/whiteboard/agora/rtm-player';
import { t } from '../i18n';
import {AgoraPlayer, PhaseState, TimelineScheduler} from '../utils/agora-web-player/agora-player';
import { globalStore } from '../stores/global';
import { PlayerPhase } from 'white-web-sdk';

interface IObserver<T> {
  subscribe: (setState: (state: T) => void) => void
  unsubscribe: () => void
  defaultState: T
}

function useObserver<T>(store: IObserver<T>) {
  const [state, setState] = React.useState<T>(store.defaultState);
  React.useEffect(() => {
    store.subscribe((state: any) => {
      setState(state);
    });
    return () => {
      store.unsubscribe();
    }
  }, []);

  return state;
}


export interface IPlayerState {
  beginTimestamp: number
  duration: number
  roomToken: string
  mediaURL: string
  progress: number

  currentTime: number
  phase: any
  seenMessagesLength: number
  player: any
  timelineScheduler: any
  videoPlayer: any
}

export const defaultState: IPlayerState = Object.freeze({
  beginTimestamp: 0,
  duration: 0,
  roomToken: '',
  mediaURL: '',
  progress: 0,

  currentTime: 0,
  phase: 'waiting',
  seenMessagesLength: 0,
  player: null,
  videoPlayer: null,
  timelineScheduler: null
})

class ReplayStore {
  public subject: Subject<IPlayerState> | null;
  private _state: IPlayerState | null;
  public defaultState: IPlayerState = defaultState;

  constructor() {
    this.subject = null;
    this._state = {
      ...this.defaultState
    };
  }

  get state () {
    return this._state
  }

  set state(newState) {
    this._state = newState
  }

  initialize() {
    this.subject = new Subject<IPlayerState>();
    this.state = {...this.defaultState};
    this.subject.next(this.state);
  }

  subscribe(setState: any) {
    this.initialize();
    this.subject && this.subject.subscribe(setState);
  }

  unsubscribe() {
    this.subject && this.subject.unsubscribe();
    this.state = null;
    this.subject = null;
  }

  commit(state: IPlayerState) {
    this.subject && this.subject.next(state);
  }

  updatePlayState(phase: any) {
    if (!this.state) return

    this.state = {
      ...this.state,
      phase,
    }
    
    this.commit(this.state);
  }

  setCurrentTime(scheduleTime: number) {
    if (!this.state) return;
    this.state = {
      ...this.state,
      currentTime: scheduleTime
    }
    this.commit(this.state);
  }

  updateProgress(progress: number) {
    if (!this.state) return
    this.state = {
      ...this.state,
      progress
    }
    this.commit(this.state);
  }

  addWhiteboardPlayer(player: any) {
    if (!this.state) return
    this.state = {
      ...this.state,
      player: player
    }
    this.commit(this.state)
  }

  addVideoPlayer(player: any) {
    if (!this.state) return
    this.state = {
      ...this.state,
      videoPlayer: player
    }
    this.commit(this.state)
  }

  addTimeline(scheduler: any) {
    if (!this.state) return
    this.state = {
      ...this.state,
      timelineScheduler: scheduler
    }
    this.commit(this.state)
  }

  async joinRoom(_uuid: string) {
    return await WhiteboardAPI.joinRoom(_uuid);
  }
}

const store = new ReplayStore();

//@ts-ignore
window.replayStore = store

const ReplayContext = React.createContext({} as IPlayerState);

const useReplayContext = () => React.useContext(ReplayContext);

const ReplayContainer: React.FC<{}> = () => {
  const replayState = useObserver<IPlayerState>(store)

  const location = useLocation()
  const {startTime, endTime} = useParams()
  const searchParams = new URLSearchParams(location.search)
  const uuid = searchParams.get("uuid") as string
  const url = searchParams.get("url") as string
  const rid = searchParams.get("rid") as string
  const senderId = searchParams.get("senderId") as string

  const value = replayState;

  console.log("replayState ", value)

  // const [playState, updatePlayState] = useState<string>('paused')

  useEffect(() => {

    const startTimestamp: number = +(startTime as string)
    const endTimestamp: number = +(endTime as string)
    const duration = Math.abs(endTimestamp - startTimestamp)

    const initPlayer = async () => {
      const videoPlayer = new AgoraPlayer(url, {
        onPhaseChanged: state => {
          console.log("[agore-replay phase] video phase ", state)
          if (state === 'ready') {
            store.updatePlayState('ready')
          }

          if (state !== 'playing') {
            // store.state?.timelineScheduler.stop();
            console.log("[agore-replay phase] timeline stop in video phase ")
          }
        }
      })
  
      //@ts-ignore
      window.videoPlayer = videoPlayer
      store.addVideoPlayer(videoPlayer)
  
      const timeline = new TimelineScheduler(30, (args: any) => {
        store.setCurrentTime(args.duration)
        store.updateProgress(args.progress)
      }, startTimestamp, endTimestamp)
  
      timeline.on('seek-changed', (duration: number) => {
        if (store.state && store.state.videoPlayer && store.state.player) {
          if (duration / 1000 < store.state.videoPlayer.player.duration()) {
            store.state.videoPlayer.seekTo(duration / 1000)
            store.state.player.seekToScheduleTime(duration)
          }
        }
      })
  
      timeline.on("state-changed", async (state: any) => {
        console.log("[agore-replay phase] timeline " ,state, 'store is not empty?: ', store.state !== null)
        if (store.state && store.state.videoPlayer && store.state.player) {
          if (state === 'started') {
            store.state.videoPlayer.play()
            store.state.player.play()
            store.updatePlayState('playing')
          } else if (state === 'ended') {
            store.state.videoPlayer.pause()
            store.state.player.pause()
            store.updatePlayState('ended')
            console.log("set ended>>>", state)
          } else {
            store.state.videoPlayer.pause()
            store.state.player.pause()
            store.updatePlayState('paused')
          }
        }
      })
      store.addTimeline(timeline)


      if (uuid) {
        let {roomToken} = await store.joinRoom(uuid)
        let player = await WhiteboardAPI.replayRoom(whiteboard.client, {
          beginTimestamp: startTimestamp,
          duration: duration,
          room: uuid,
          roomToken,
        },  {
          onCatchErrorWhenRender: error => {
            error && console.warn(error);
            globalStore.showToast({
              message: t('toast.replay_failed'),
              type: 'notice'
            });
          },
          onCatchErrorWhenAppendFrame: error => {
            error && console.warn(error);
            globalStore.showToast({
              message: t('toast.replay_failed'),
              type: 'notice'
            });
          },
          onPhaseChanged: phase => {
            console.log("[agore-replay phase] whiteboard ", phase)

            let whiteboardPlayStatus = 'ready';

            if (phase === PlayerPhase.Playing) {
              whiteboardPlayStatus = 'playing'
            } else if (phase === PlayerPhase.Pause ||
              phase === PlayerPhase.Ended ||
              phase === PlayerPhase.WaitingFirstFrame) {
              whiteboardPlayStatus = 'paused'
              store.state?.timelineScheduler.stop()
            } else {
              whiteboardPlayStatus = 'waiting'
            }
            store.updatePlayState(whiteboardPlayStatus)
          },
          onStoppedWithError: (error) => {
            error && console.warn(error);
            globalStore.showToast({
              message: t('toast.replay_failed'),
              type: 'notice'
            });
          }
        })
        store.addWhiteboardPlayer(player)
        console.log("[agore-replay phase] join whiteboard")
      }
    }

    initPlayer()
  }, [])


  useEffect(() => {
    console.log("phase", value.phase)
  }, [value])

  if (!startTime || !endTime || !url || !rid || !uuid) {
    return <Redirect to="/404"></Redirect>
  }

  return (
    <ReplayContext.Provider value={value}>
      <TimelineReplay
        senderId={senderId}
        startTime={+startTime}
        endTime={+endTime}
        mediaUrl={url}
        rid={rid}
        player={value.player}
        videoPlayer={value.videoPlayer}
        timelineScheduler={value.timelineScheduler}
        playState={value.phase}
      />
    </ReplayContext.Provider>
  )
}

export default ReplayContainer;

export const TimelineReplay: React.FC<any> = ({
  startTime,
  endTime,
  mediaUrl,
  rid,
  videoPlayer,
  player,
  timelineScheduler,
  senderId,
  playState
}) => {
  const state = useReplayContext()

  const playerElementRef = useRef<any>(null)
  const whiteboardElementRef = useRef<any>(null)


  const onWindowResize = () => {
    if (state.player) {
      state.player.refreshViewSize()
    }
  }

  useEffect(() => {
    if (playerElementRef.current) {
      if (videoPlayer) {
        videoPlayer.initVideo(playerElementRef.current.id)
        return () => {
          videoPlayer.destroy()
        }
      }
    }
  }, [videoPlayer, playerElementRef])

  useEffect(() => {
    if (whiteboardElementRef.current) {
      if (player) {
        console.log("bind", player)
        player.bindHtmlElement(whiteboardElementRef.current as HTMLDivElement);
        window.addEventListener('resize', onWindowResize);
        return () => {
          window.removeEventListener('resize', onWindowResize);
        }
      }
    }
  }, [player, whiteboardElementRef])

  const handlePlayerClick = () => {
    if (!store.state || !videoPlayer || !timelineScheduler) return;

    if (store.state.phase === 'paused' || store.state.phase === 'ready') {
      timelineScheduler.start()
      return
    }

    if (store.state.phase === 'started' || store.state.phase === 'playing') {
      timelineScheduler.stop()
      return
    }

    if (store.state.phase === 'ended') {
      timelineScheduler.seekTo(0)
      timelineScheduler.start()
      return
    }
  }

  const handleChange = (event: any, newValue: any) => {
    store.setCurrentTime(newValue);
    store.updateProgress(newValue);
  }

  const duration = useMemo(() => {
    if (!startTime || !endTime) return 0;
    const _duration = Math.abs(+startTime - +endTime);
    return _duration;
  }, [startTime, endTime]);

  const totalTime = useMemo(() => {
    return moment(duration).format("mm:ss")
  }, [duration]);

  const time = useMemo(() => {
    return moment(state.currentTime).format("mm:ss");
  }, [state.currentTime]);

  const PlayerCover = useCallback(() => {

    document.title = playState

    if (!videoPlayer || !player || playState === 'waiting' || playState === 'loading') {
      return (<Progress title={t("replay.loading")} />)
    }

    if (playState === 'playing') return null;

    return (
      <div className="player-cover">
        {playState !== 'playing' ? 
          <div className="play-btn" onClick={handlePlayerClick}></div> : null}
      </div>
    )
  }, [videoPlayer, player, playState]);

  const onMouseDown = () => {
    if (timelineScheduler) {
      console.log("seek to replay. down")
      timelineScheduler.stop()
      store.updatePlayState('paused')
    }
  }

  const onMouseUp = () => {
    if (timelineScheduler) {
      console.log("seek to replay. up")
      timelineScheduler.seekTo(state.currentTime)
      timelineScheduler.start()
    }
  }

  return (
    <div className="replay">
      <div className={`player-container`} >
        <PlayerCover />
        <div className="player">
          <div className="agora-logo"></div>
          <div ref={whiteboardElementRef} id="whiteboard" className="whiteboard"></div>
          <div className="video-menu">
            <div className="control-btn">
              <div className={`btn ${playState === 'playing' ? 'paused' : 'play'}`} onClick={handlePlayerClick}></div>
            </div>
            <div className="progress">
              <Slider
                className='custom-video-progress'
                value={state.currentTime}
                onMouseDown={onMouseDown}
                onMouseUp={onMouseUp}
                onChange={handleChange}
                min={0}
                max={duration}
                aria-labelledby="continuous-slider"
              />
              <div className="time">
                <div className="current_duration">{time}</div>
                  /
                <div className="video_duration">{totalTime}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="video-container">
        <div className="video-player">
          <div ref={playerElementRef} id="player" style={{width: "100%", height: "100%", objectFit: "cover"}}></div>
        </div>
        <div className="chat-holder chat-board chat-messages-container">
          <RTMReplayer
            senderId={senderId}
            rid={rid}
            startTime={startTime}
            endTime={endTime}
            currentSeekTime={state.currentTime}
            onPhaseChanged={(e: RtmPlayerState) => {
              if (e !== RtmPlayerState.load) {
                timelineScheduler?.stop();
              }
            }}
          ></RTMReplayer>
        </div>
      </div>
    </div>
  )
}