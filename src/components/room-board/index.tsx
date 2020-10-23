import React, { useState } from 'react';
import {ChatPanel} from '@/components/chat/panel';
import {StudentList} from '@/components/student-list';
import { t } from '@/i18n';
import {observer} from 'mobx-react'
import {useRoomStore, useBoardStore} from '@/hooks';
import { EduMediaStream } from '@/stores/app/room';

const RoomBoardController = observer((props: any) => {

  const roomStore = useRoomStore()

  const [value, setValue] = useState<string>('')

  const sendMessage = async (message: any) => {
    await roomStore.sendMessage(message)
    setValue('')
  }

  const handleChange = (evt: any) => {
    setValue(evt.target.value)
  }

  const toggleCollapse = (evt: any) => {
    roomStore.toggleMenu()
  }

  const {
    mutedChat,
  } = roomStore

  const handleMute = async () => {
    if (mutedChat) {
      await roomStore.unmuteChat()
    } else {
      await roomStore.muteChat()
    }
  }

  const userRole = roomStore.roomInfo.userRole

  const boardStore = useBoardStore()
  const {grantUsers} = boardStore

  const {studentStreams} = roomStore

  const handleClick = async (evt: any, id: string, type: string) => {
    const isLocal = (userUuid: string) => roomStore.roomInfo.userUuid === userUuid
    if (roomStore.roomInfo.userRole === 'teacher' || isLocal(id))  {
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
              await roomStore.muteAudio(id, isLocal(id))
            } else {
              await roomStore.unmuteAudio(id, isLocal(id))
            }
          }
          break
        }
        case 'video': {
          if (target) {
            if (target.video) {
              await roomStore.muteVideo(id, isLocal(id))
            } else {
              await roomStore.unmuteVideo(id, isLocal(id))
            }
          }
          break
        }
      }
    }
  }

  return (
    <>
    <div className={`${roomStore.menuVisible ? "icon-collapse-off" : "icon-collapse-on" } fixed`} onClick={toggleCollapse}></div>
    {roomStore.menuVisible ? 
    <div className={`small-class chat-board`}>
      <div className="menu">
        <div
         className={`item ${roomStore.activeTab === 'chatroom' ? 'active' : ''}`}
         onClick={() => {
          roomStore.switchTab('chatroom')
        }}>
          {t('room.chat_room')}
          {roomStore.activeTab !== 'chatroom' && roomStore.unreadMessageCount > 0 ? <span className={`message-count`}>{roomStore.unreadMessageCount}</span> : null}
        </div>
        <div
          className={`item ${roomStore.activeTab === 'student_list' ? 'active' : ''}`}
          onClick={() => {
            roomStore.switchTab('student_list')
          }}
        >
          {t('room.student_list')}
        </div>
      </div>
      <div className={`chat-container ${roomStore.activeTab === 'chatroom' ? '' : 'hide'}`}>
        <ChatPanel
          canChat={roomStore.roomInfo.userRole === 'teacher'}
          muteControl={roomStore.muteControl}
          muteChat={roomStore.mutedChat}
          handleMute={handleMute}
          messages={roomStore.roomChatMessages}
          value={value}
          sendMessage={sendMessage}
          handleChange={handleChange} />
      </div>
      <div className={`student-container ${roomStore.activeTab !== 'chatroom' ? '' : 'hide'}`}>
        <StudentList
          userRole={userRole}
          studentStreams={studentStreams}
          grantUsers={grantUsers}
          handleClick={handleClick}
        />
      </div>
    </div>
    : null}
    </>
  )
})

export function RoomBoard () {
  return (
    <RoomBoardController />
  )
}