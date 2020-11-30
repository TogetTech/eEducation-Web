import React, {useRef, useState} from 'react';
import {VideoPlayer} from '@/components/video-player';
import { ControlItem } from '@/components/control-item';
import './middle-class.scss';
import {ChatBoard} from '@/components/chat/board';
import { NetlessBoard } from '@/components/netless-board';
import { ScreenSharing } from '@/components/screen-sharing';
import { observer } from 'mobx-react';
import { useMiddleRoomStore, useBoardStore, useAppStore, useExtensionStore} from '@/hooks';
import { MiddleGroupCard, MiddleGrouping } from '@/components/middle-grouping';
import { BizLogger } from '@/utils/biz-logger';
import {ChatPanel} from '@/components/chat/panel';
import { t } from '@/i18n';
import { EduMediaStream } from '@/stores/app/room';
import {StudentList} from '@/components/student-list';
import { subtract } from 'lodash';

export const MiddleClass = observer(() => {

  const middleRoomStore = useMiddleRoomStore()

  const extensionStore = useExtensionStore()

  const {
    mutedChat,
    muteControl,
    teacherStream: teacher,
    studentStreams,
    roomInfo,
    roomProperties,
    userGroups
  } = middleRoomStore

  const [chat, setChat] = useState<string>('')
  const [showGroupCard, setShowGroupCard] = useState<boolean>(false)
  
  const userRole = middleRoomStore.roomInfo.userRole
  const boardStore = useBoardStore()
  const {grantUsers} = boardStore

  const sutdents = roomProperties.students? roomProperties.students: {}
 
  const studentInfoList = Object.keys(sutdents).map(uuid => {
    return {
      userUuid: uuid,
      userName: sutdents[uuid].userName
    }
  })

  const studentList = function() {
    let students = {}
    let list = studentInfoList
    for(let i = 0; i < list.length; i++) {
      students[list[i].userUuid] = {
        reward: '',
        userName: list[i].userName
      }
    }
    return students
  }

  const sendMessage = async () => {
    await middleRoomStore.sendMessage(chat)
    setChat('')
  }

  const handleClick = async (evt: any, id: string, type: string) => {
    
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

  const saveGroupModify = function(groups:any) {
    setShowGroupCard(true)
    let backendGroups: object = {}
    for(let i = 0; i < groups.length; i++) {
      let groupNum: number = i + 1
      let groupItem: any = {
        groupName: "",
        members: [],
        groupProperties: {},
      }
      groupItem.groupName = "group" + groupNum
      groupItem.members = groups[i].map((stu:any) => stu.userUuid)
      backendGroups[groupNum] = groupItem
    }

    let properties = {
      groups: backendGroups
    }
    let cause = {cmd:"102"}
    middleRoomStore.updateRoomBatchProperties({ properties, cause })

  }

  // 删除
  const deleteGroups = function() {
    let cause = {cmd:"101"}
    let properties = {
      groups: {}
    }
    middleRoomStore.updateRoomBatchProperties({ properties, cause })

  }

  // 整组上台
  const handelPlatform = function(group:any) {
    // batchAddStudentsStream()
    console.log('***', group)
  }

  // 整组加星
  const handelAddStar = function() {

  }
  
  return (
    <div className="room-container">
      <div className="live-container">
        <div className="biz-container">
          <NetlessBoard />
          <ScreenSharing />
          {
            extensionStore.controlGrouping ?
            <MiddleGrouping dataList={studentInfoList} sure={saveGroupModify} deleteGroups={deleteGroups}></MiddleGrouping>
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
          {/* <div className="group-card-list">
                { userGroups.map((group, index) => (
                    <MiddleGroupCard key={index} groupName={group.groupName} groupStuList={group.members}></MiddleGroupCard>
                  ))
                }
              </div> */}
            {
              showGroupCard ? 
              <div className="group-card-list">
                { userGroups.map((group, index) => (
                    <MiddleGroupCard key={index} 
                      groupName={group.groupName} 
                      groupStuList={group.members} 
                      platform={() => handelPlatform(group)} 
                      addStar={handelAddStar}>

                      </MiddleGroupCard>
                  ))
                }
              </div>
              :
              <StudentList
                userRole={userRole}
                studentStreams={studentStreams}
                grantUsers={grantUsers}
                handleClick={handleClick}
                isMiddleClassRoom={true}
              />
            }
          </div>
        </div> 
      </div>
    </div>
  )
})
