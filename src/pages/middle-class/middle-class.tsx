import React, {useState} from 'react';
import {VideoPlayer} from '@/components/video-player';
import { ControlItem } from '@/components/control-item';
import './middle-class.scss';
import { NetlessBoard } from '@/components/netless-board';
import { ScreenSharing } from '@/components/screen-sharing';
import { observer } from 'mobx-react';
import { CustomCard } from '@/components/cards';
import { VideoMarquee } from '@/components/video-marquee';
import { useMiddleRoomStore, useBoardStore, useExtensionStore, useUIStore, useSceneStore} from '@/hooks';
import { MiddleGroupCard, MiddleGrouping } from '@/components/middle-grouping';
import {ChatPanel} from '@/components/chat/panel';
import { t } from '@/i18n';
import {StudentList} from '@/components/student-list';

const FirstGroupVideoMarquee = observer(() => {
  const store = useMiddleRoomStore()
  return <VideoMarquee
    className="group first-group"
    canHover={true}
    mainStream={store.groups[0].mainStream}
    othersStreams={store.groups[0].studentStreams}
  />
})

const SecondGroupVideoMarquee = observer(() => {
  const store = useMiddleRoomStore()
  return <VideoMarquee
    className="group second-group"
    canHover={true}
    mainStream={store.groups[1].mainStream}
    othersStreams={store.groups[1].studentStreams}
  />
})

export const MiddleClass = observer(() => {

  const middleRoomStore = useMiddleRoomStore()

  const extensionStore = useExtensionStore()

  const sceneStore = useSceneStore()

  const uiStore = useUIStore()

  const {
    mutedChat,
    muteControl,
    teacherStream: teacher,
    studentStreams,
    roomInfo,
  } = sceneStore

  const {
    roomProperties,
    userGroups
  } = middleRoomStore

  const [chat, setChat] = useState<string>('')
  const [showGroupCard, setShowGroupCard] = useState<boolean>(false)
  
  const userRole = middleRoomStore.roomInfo.userRole
  const boardStore = useBoardStore()
  const {grantUsers} = boardStore

  const students = roomProperties.students? roomProperties.students: {}
 
  const studentInfoList = Object.keys(students).map(uuid => {
    return {
      userUuid: uuid,
      userName: students[uuid].userName
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
      await sceneStore.unmuteChat()
    } else {
      await sceneStore.muteChat()
    }
  }


  const handleNotice = () => {
    // middleRoomStore.showDialog()
  }

  const saveGroupModify = function(groups:any) {
    setShowGroupCard(true)
    let backendGroups: Object[] = []
    for(let i = 0; i < groups.length; i++) {
      let groupNum: number = i + 1
      let groupItem: any = {
        groupName: "",
        members: [],
        groupProperties: {},
      }
      groupItem.groupName = "group" + groupNum
      groupItem.members = groups[i].map((stu:any) => stu.userUuid)
      backendGroups.push(groupItem)
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
    let properties: any = {
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
        <FirstGroupVideoMarquee />
        <div className="biz-container">
          <NetlessBoard />
          <ScreenSharing />
          {
            extensionStore.controlGrouping ?
            <MiddleGrouping dataList={studentInfoList} sure={saveGroupModify} deleteGroups={deleteGroups}></MiddleGrouping>
            : null
          }
          {
            extensionStore.visibleCard ? 
            <CustomCard />
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
        <SecondGroupVideoMarquee />
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
            <div className={`item ${uiStore.activeTab === 'student_list' ? 'active' : ''}`}
                onClick={() => {
                  uiStore.switchTab('student_list')
                }}
              >
              {t('room.student_list')}
            </div>
            <div className={`item ${uiStore.activeTab === 'chatroom' ? 'active' : ''}`}
            onClick={() => {
              uiStore.switchTab('chatroom')
            }}>
              {t('room.chat_room')}
              {uiStore.activeTab !== 'chatroom' && middleRoomStore.unreadMessageCount > 0 ? <span className={`message-count`}>{middleRoomStore.unreadMessageCount}</span> : null}
            </div>
          </div>
          <div className={`chat-container ${uiStore.activeTab === 'chatroom' ? '' : 'hide'}`}>
            <ChatPanel
              canChat={sceneStore.roomInfo.userRole === 'teacher'}
              muteControl={sceneStore.muteControl}
              muteChat={sceneStore.mutedChat}
              handleMute={handleMute}
              messages={middleRoomStore.roomChatMessages}
              value={chat}
              sendMessage={sendMessage}
              handleChange={(evt: any) => {
                setChat(evt.target.value)
              }} />
          </div>
          <div className={`student-container ${uiStore.activeTab !== 'chatroom' ? '' : 'hide'}`}>
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
