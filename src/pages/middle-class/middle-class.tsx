import React, {useRef, useState} from 'react';
import {VideoPlayer} from '@/components/video-player';
import { ControlItem } from '@/components/control-item';
import './middle-class.scss';
import {ChatBoard} from '@/components/chat/board';
import { NetlessBoard } from '@/components/netless-board';
import { ScreenSharing } from '@/components/screen-sharing';
import { MiddleRoomBoard } from '@/components/middle-board';
import { observer } from 'mobx-react';
import { useMiddleRoomStore, useBoardStore, useAppStore, useExtensionStore} from '@/hooks';
import { MiddleGrouping } from '@/components/middle-grouping';
import { BizLogger } from '@/utils/biz-logger';
import {ChatPanel} from '@/components/chat/panel';
import { t } from '@/i18n';
import { EduMediaStream } from '@/stores/app/room';
import {StudentList} from '@/components/student-list';

export const MiddleClass = observer(() => {

  const middleRoomStore = useMiddleRoomStore()

  const extensionStore = useExtensionStore()

  const {
    mutedChat,
    muteControl,
    teacherStream: teacher,
    studentStreams,
    roomInfo,
  } = middleRoomStore

  const [chat, setChat] = useState<string>('')

  const userRole = middleRoomStore.roomInfo.userRole
  const boardStore = useBoardStore()
  const {grantUsers} = boardStore

  const studentInfoList = [
    {
      id: '34335',
      content: 'xiao'
    },
    
  ]


  const sendMessage = async () => {
    await middleRoomStore.sendMessage(chat)
    setChat('')
  }

  const handleClick = async (evt: any, id: string, type: string) => {
    const isLocal = (userUuid: string) => middleRoomStore.roomInfo.userUuid === userUuid
    if (middleRoomStore.roomInfo.userRole === 'teacher' || isLocal(id))  {
      const target = studentStreams.find((it: EduMediaStream) => it.userUuid === id)
      switch(type) {
        case 'grantBoard': {
          if (boardStore.checkUserPermission(id)) {
            boardStore.revokeBoardPermission(id)
          } else {
            boardStore.grantBoardPermission(id)
          }
          break
        }
        case 'audio': {
          if (target) {
            if (target.audio) {
              await middleRoomStore.muteAudio(id, isLocal(id))
            } else {
              await middleRoomStore.unmuteAudio(id, isLocal(id))
            }
          }
          break
        }
        case 'video': {
          if (target) {
            if (target.video) {
              await middleRoomStore.muteVideo(id, isLocal(id))
            } else {
              await middleRoomStore.unmuteVideo(id, isLocal(id))
            }
          }
          break
        }
      }
    }
  }

  const handleMute = async () => {
    if (mutedChat) {
      await middleRoomStore.unmuteChat()
    } else {
      await middleRoomStore.muteChat()
    }
  }


  const handleNotice = () => {
    // middleRoomStore.showDialog()
  }

  const foo1 = function(groups:any) {

  }
  const foo2 = function(groups:any) {
    
  }
  const foo3 = function(groups:any) {

  }
  
  return (
    <div className="room-container">
      <div className="live-container">
        <div className="biz-container">
          <NetlessBoard />
          <ScreenSharing />
          {
            extensionStore.controlGrouping ?
            <MiddleGrouping dataList={studentInfoList} sure={foo1} close={foo2} reduce={foo3}></MiddleGrouping>
            : null
          }
          <div className={`interactive ${middleRoomStore.roomInfo.userRole}`}>
            {middleRoomStore.roomInfo.userRole === 'teacher' && middleRoomStore.notice ?
              <ControlItem name={middleRoomStore.notice.reason}
                onClick={handleNotice}
                active={middleRoomStore.notice.reason ? true : false} />
            : null}
          </div>
        </div>
      </div>
      <div className="live-board">
        <div className="video-board">
          <VideoPlayer
            role="teacher"
            showClose={false}
            {...teacher}
          />
        </div>
        <div className={`small-class chat-board`}>
          <div className="menu">
            <div className={`item ${middleRoomStore.activeTab === 'student_list' ? 'active' : ''}`}
                onClick={() => {
                  middleRoomStore.switchTab('student_list')
                }}
              >
              {t('room.student_list')}
            </div>
            <div className={`item ${middleRoomStore.activeTab === 'chatroom' ? 'active' : ''}`}
            onClick={() => {
              middleRoomStore.switchTab('chatroom')
            }}>
              {t('room.chat_room')}
              {middleRoomStore.activeTab !== 'chatroom' && middleRoomStore.unreadMessageCount > 0 ? <span className={`message-count`}>{middleRoomStore.unreadMessageCount}</span> : null}
            </div>
          </div>
          <div className={`chat-container ${middleRoomStore.activeTab === 'chatroom' ? '' : 'hide'}`}>
            <ChatPanel
              canChat={middleRoomStore.roomInfo.userRole === 'teacher'}
              muteControl={middleRoomStore.muteControl}
              muteChat={middleRoomStore.mutedChat}
              handleMute={handleMute}
              messages={middleRoomStore.roomChatMessages}
              value={chat}
              sendMessage={sendMessage}
              handleChange={(evt: any) => {
                setChat(evt.target.value)
              }} />
          </div>
          <div className={`student-container ${middleRoomStore.activeTab !== 'chatroom' ? '' : 'hide'}`}>
            <StudentList
              userRole={userRole}
              studentStreams={studentStreams}
              grantUsers={grantUsers}
              handleClick={handleClick}
            />
          </div>
        </div> 
      </div>
    </div>
  )
})