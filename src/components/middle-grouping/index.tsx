import { Button } from '@material-ui/core';
import './middle-grouping.scss';
import { CustomButton } from '@/components/custom-button';
import React, { Component, useState } from 'react';
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
import { useMiddleRoomStore, useUIStore, useAppStore, useExtensionStore} from '@/hooks';
  
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
                        key={item.id}
                        draggableId={item.id}
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
                                  <div className="stu-name">{item.content}</div>
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

export const MiddleGrouping = function ({sure, close, reduce, dataList}: any) {

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

  const [groupNum, setGroupNum] = React.useState('')
  const [groupType, setGroupType] = React.useState('')

  const [groups, setGroups] = useState<Array<any>>([getItems(5), getItems(5, 10), getItems(5, 20), getItems(5, 30)])
  
  const sureGroup = function () {
    sure(groups)
  }
  
  const reduceGroup = function() {
    setAddition(false)
    setControlSpread(1)
    reduce()
  }

  const reduceGroupSmall = function() {
    setAddition(true)
    setControlSpread(2)
  }
  
  const closeGroup = function() {
    extensionStore.hiddenGrouping()
    close()
  }

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setGroupNum(event.target.value as string);
  }
  const handleChange2 = (event: React.ChangeEvent<{ value: unknown }>) => {
    setGroupType(event.target.value as string);
  }

  const classes = useStyles()

  const clickCreatGroup = function() {
    setCreatePopup(true)
  }
  
  const clickSureCreate = function() {
    setCreatePopup(false)
    setDragGrouping(true)
    
  }
  
  const clickCancelCreate = function() {
    setCreatePopup(false)
    
  }
  
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
                <InputLabel id="demo-simple-select-label" >分组数量</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={groupNum}
                  onChange={handleChange}
                >
                  <MenuItem value={0}>2</MenuItem>
                  <MenuItem value={1}>4</MenuItem>
                  <MenuItem value={2}>6</MenuItem>
                </Select>
              </FormControl>
              <FormControl className={classes.formControl}>
                <InputLabel id="demo-simple-select-label">分组方式</InputLabel>
                <Select
                  labelId="demo-simple-select-label"
                  id="demo-simple-select"
                  value={groupType}
                  onChange={handleChange2}
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