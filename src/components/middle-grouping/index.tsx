import { Button } from '@material-ui/core';
import './middle-grouping.scss';
import { CustomButton } from '@/components/custom-button';
import React, { Component, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
// @ts-ignore
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { AnyARecord } from 'dns';
import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import FormHelperText from '@material-ui/core/FormHelperText';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Tooltip from '@material-ui/core/Tooltip';
import { useMiddleRoomStore, useUIStore, useAppStore, useExtensionStore} from '@/hooks';
import { rangeRight, random } from 'lodash';
  
const getItems = (count:number, offset = 0) =>
  Array.from({ length: count }, (v, k) => k).map(k => ({
      id: `item-${k + offset}`,
      content: `item ${k + offset}`
  }))

// 重新排序结果
const reorder = (list:Array<any>, startIndex:any, endIndex:any) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};  

// 列表移动
const move = (source:Array<any>, destination:Array<any>, droppableSource:any, droppableDestination:any) => {
  const sourceClone = Array.from(source);
  const destClone = Array.from(destination);
  const [removed] = sourceClone.splice(droppableSource.index, 1);

  destClone.splice(droppableDestination.index, 0, removed);

  return [sourceClone, destClone];
}

const grid = 8

const getItemStyle = (isDragging:any, draggableStyle:any) => ({
  userSelect: 'none',
  padding: grid * 2,
  margin: `0 0 ${grid}px 0`,
  background: isDragging ? 'white' : 'white',
  // 拖放
  ...draggableStyle
});

const getListStyle = (isDraggingOver:boolean) => ({
  background: isDraggingOver ? 'lightblue' : 'white',
  padding: grid,
  width: 250
})

interface MiddleGroupProps {
  groups: Array<any>
  onDragEnd: (value: Array<any>) => void
}

function MiddleGroup(props: MiddleGroupProps) {
  const getList = (index:any) => props.groups[index];

  const onDragEnd = (result:any) => {
    const { source, destination } = result;

    if (!destination) {
        return
    }
    let sourceIndex = Number(source.droppableId.split("-")[1])
    let destIndex = Number(destination.droppableId.split("-")[1])
    if (source.droppableId === destination.droppableId) {
        const items = reorder(
            getList(sourceIndex),
            source.index,
            destination.index
        );
        
        let groups = [...props.groups]
        groups[sourceIndex] = items

        props.onDragEnd(groups)
    } else {
        const result = move(
          getList(sourceIndex),
          getList(destIndex),
          source,
          destination
        )
        
        let groups = [...props.groups]
        groups[sourceIndex] = result[0]
        groups[destIndex] = result[1]

        props.onDragEnd(groups)
    }
  } 

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      {props.groups.map((groupItem:any, groupsIndex:any) => (
        <Droppable droppableId={`droppable-${groupsIndex}`} key={groupsIndex}>
            {(provided:any, snapshot:any) => (
              <div
                className="group-item"
                ref={provided.innerRef}
                style={getListStyle(snapshot.isDraggingOver)}>
                <div className="group-item-title">
                  <span className="group">组{groupsIndex + 1}</span>
                  <span className="num">({groupItem.length}人)</span>
                </div>
                {groupItem.map((item:any, index:any) => (
                    <Draggable
                        key={item.userUuid}
                        draggableId={item.userUuid}
                        index={index}>
                        {(provided:any, snapshot:any) => (
                            <div 
                                className="group-item-item"
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={getItemStyle(
                                    snapshot.isDragging,
                                    provided.draggableProps.style
                                )}>
                                <div className="stu-identity">
                                  <div className="stu-head"></div>
                                  <div className="stu-name">{item.userName}</div>
                                </div>
                            </div>
                        )}
                    </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
        </Droppable>
        ))}
    </DragDropContext>
  )
}

export const MiddleGroupCard = function({groupStuList, groupName}: any) {

  const handleClickAddStar = function() {
    // 整组加星奖励
  }
  
  return (
    <div className="middle-group-card">
      <div className="head">
        <div className="text">
          <div className="group-text">{groupName}:</div>
          <div className="group-stu-num">({groupStuList.length}人)</div>
        </div>
        <div className="icon">
          <div className="microphone"></div>
          <div className="platform"></div>
          <div className="add-star" onClick={handleClickAddStar}></div>
        </div>
      </div>
      <hr />
      <div className="group-body">
      {groupStuList.map((item: any) => (
        <div className="group-stu" key={item.userUuid}>
          <div className="stu-head"></div>
          <span className="stu-name">{item.userName}</span>
          <div className="star-box">
            <div className="stu-star"></div>
            <span className="star-num"></span>
            {item.reward}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}

export const MiddleGrouping = function ({sure, dataList}: any) {
  let itemList = [...dataList]

  const useStyles = makeStyles((theme: Theme) =>
    createStyles({
      formControl: {
        margin: theme.spacing(1),
        marginLeft: 20,
        minWidth: 120,
      },
      selectEmpty: {
        marginTop: theme.spacing(2),
      },
    }),
  )

  const extensionStore = useExtensionStore()

  const [createPopup, setCreatePopup] = useState<boolean>(false)
  const [dragGrouping, setDragGrouping] = useState<boolean>(false)
  const [controlSpread, setControlSpread] = useState<number>(2)
  const [addition, setAddition] = useState<boolean>(true)

  const [groupStuNum, setGroupStuNum] = React.useState<number>(4)
  
  const [groupType, setGroupType] = React.useState<number>(0)

  const [groups, setGroups] = useState<Array<any>>([])
  
  const sureGroup = function () {
    sure(groups)
  }
  
  const reduceGroup = function() {
    setAddition(false)
    setControlSpread(1)
  }

  const reduceGroupSmall = function() {
    setAddition(true)
    setControlSpread(2)
  }
  
  const closeGroup = function() {
    extensionStore.hiddenGrouping()
  }

  const handleChangeStuNum = useCallback((event: React.ChangeEvent<{ value: unknown }>) => {
    setGroupStuNum(event.target.value as number)
  }, [setGroupStuNum, groupStuNum])
  
  const handleChangeType = (event: React.ChangeEvent<{ value: unknown }>) => {
    setGroupType(Number(event.target.value) as number);
  }

  const classes = useStyles()

  const clickCreatGroup = function() {
    setCreatePopup(true)
  }
  
  const clickSureCreate = function() {
    setCreatePopup(false)
    setDragGrouping(true)

    if (groupType === 1) {
      const len = itemList.length
      for (let i = 0; i < len; i++) {
        let a = random(0, len - 1)
        let b = random(0, len - 1)
        let temp = itemList[a]
        itemList[a] = itemList[b]
        itemList[b] = temp
      }
    }

    let singleGroup: Array<any> = []
    let multGroups: Array<any> = []
    for(let i = 0; i < itemList.length; i++) {
      let item = itemList[i]
      if (singleGroup.length !== groupStuNum) {
        singleGroup.push(item)
      } else {
        multGroups.push(singleGroup)
        singleGroup = [item]
      }
    }

    if(singleGroup.length > 0) {
      multGroups.push(singleGroup)
    } 
    setGroups(multGroups)

  }
  
  const clickCancelCreate = function() {
    setCreatePopup(false)
    
  }

  const groupText = '分组使用说明：选择每组人数上限进行分组。例如：教室内共5名学生，选择每组上限2人则分成3组（2 2 1），选择每组上限4人则分成两组（4 1），选择每组上限6人则分成1组（5）。'
  
  return (
    <div className="grouping">
      {
        controlSpread === 1 && !addition?
        <div className="group-card-packup">
          <div className="text">分组</div>
          <span className="stu-num">学生总数 15</span>
          <div className="spread-group-card" onClick={reduceGroupSmall}></div>
          <div className="close-group-card" onClick={closeGroup}></div>
        </div> 
        : null 
      }
      { 
        controlSpread === 2 && addition?
        <div className="group-card">
          <span className="text-group">分组</span>
          <span className="text-num">学生总数 </span>
          <div className="btn-operation">
            {
              dragGrouping? <Button variant="contained" className="btn-reset" >重新分组</Button>
              : <Button variant="contained" className="btn-create" onClick={clickCreatGroup}>创建分组</Button>
            }
            <Button variant="contained" className="btn-delete" disabled={!dragGrouping}>删除分组</Button>
          </div>
          <div className="icon-reduce" onClick={reduceGroup}></div>
          <div className="icon-close" onClick={closeGroup}></div>
          {
            createPopup ? 
            <div className="creat-group">
              <div className="creat-text">创建分组</div>
              <FormControl className={classes.formControl}>
                <Tooltip title={groupText}>
                  <InputLabel id="demo-simple-select-label" >分组内人数上限</InputLabel>
                </Tooltip>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={groupStuNum}
                  onChange={handleChangeStuNum}
                >
                  <MenuItem value={2}>2</MenuItem>
                  <MenuItem value={3}>3</MenuItem>
                  <MenuItem value={4}>4</MenuItem>
                  <MenuItem value={5}>5</MenuItem>
                  <MenuItem value={6}>6</MenuItem>
                </Select>
              </FormControl>
              <FormControl className={classes.formControl}>
                <InputLabel id="demo-simple-select-label">分组方式</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={groupType}
                  onChange={handleChangeType}
                >
                  <MenuItem value={0}>顺序</MenuItem>
                  <MenuItem value={1}>随机</MenuItem>
                </Select>
              </FormControl>
              <div className="creat-btn-box">
              <Button variant="contained" className="btn-sure" onClick={clickSureCreate}>确定</Button>
              <Button variant="contained" className="btn-cancel" onClick={clickCancelCreate}>取消</Button>
              </div>
            </div> 
            : null   
          }
          {
            dragGrouping ? 
            <div>
              <div className="drag-card">
                <MiddleGroup groups={groups} onDragEnd={setGroups}></MiddleGroup>
              </div> 
              <Button variant="contained"  className="btn-save" onClick={sureGroup}>保存修改</Button>
            </div>
          : null
          }
        </div> : null
      }
    </div>
  )
}