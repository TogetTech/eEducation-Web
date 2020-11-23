import React, { useState } from 'react';
import {ChatPanel} from '@/components/chat/panel';
import {StudentList} from '@/components/student-list';
import { t } from '@/i18n';
import {observer} from 'mobx-react'
import {useMiddleRoomStore, useBoardStore} from '@/hooks';
import { EduMediaStream } from '@/stores/app/room';

const RoomBoardController = observer((props: any) => {

  const middleRoomStore = useMiddleRoomStore()

  const [value, setValue] = useState<string>('')

  const sendMessage = async (message: any) => {
    await middleRoomStore.sendMessage(message)
    setValue('')
  }

  const handleChange = (evt: any) => {
    setValue(evt.target.value)
  }

  const toggleCollapse = (evt: any) => {
    middleRoomStore.toggleMenu()
  }

  const {
    mutedChat,
  } = middleRoomStore

  const handleMute = async () => {
    if (mutedChat) {
      await middleRoomStore.unmuteChat()
    } else {
      await middleRoomStore.muteChat()
    }
  }

  const userRole = middleRoomStore.roomInfo.userRole

  const boardStore = useBoardStore()
  const {grantUsers} = boardStore

  const {studentStreams} = middleRoomStore

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

  return (
    <>
    {middleRoomStore.menuVisible ? 
    <div className={`small-class chat-board`}>
      <div className="menu">
        <div
            className={`item ${middleRoomStore.activeTab === 'student_list' ? 'active' : ''}`}
            onClick={() => {
              middleRoomStore.switchTab('student_list')
            }}
          >
          {t('room.student_list')}
        </div>
        <div
         className={`item ${middleRoomStore.activeTab === 'chatroom' ? 'active' : ''}`}
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
          value={value}
          sendMessage={sendMessage}
          handleChange={handleChange} />
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
    : null}
    </>
  )
})

export function MiddleRoomBoard () {
  return (
    <RoomBoardController />
  )
}