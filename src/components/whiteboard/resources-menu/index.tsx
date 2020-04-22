import React, {useRef, useState, useEffect} from 'react';
import { SceneResource, whiteboard } from '../../../stores/whiteboard';
import { t } from '../../../i18n';
import { Input } from '@material-ui/core';
import { useDebounce } from 'react-use';
import { globalStore } from '../../../stores/global';
import Icon from '../../icon'; 
import {omit} from 'lodash';

type ResourceMenuProps = {
  active: number
  items: SceneResource[]
  onClose: (evt: any) => void
  onClick: (rootPath: string) => void
}

const debounceDelay = 800

export const ResourceItem: React.FC<any> = (props: any) => {

  const [name, setName] = useState<string>(props.item.name);

  const mounted = useRef<boolean>(false);

  // `useDebounce` documentation: https://github.com/streamich/react-use/blob/master/docs/useDebounce.md
  // `useDebounce` 文档请参考: https://github.com/streamich/react-use/blob/master/docs/useDebounce.md
  const [, cancel] = useDebounce(
    () => {
      if (!mounted.current || !name) return
      if (whiteboard.state.room) {
        const globalState: any = whiteboard.state.room.state.globalState as any;
        const sceneMap: any = globalState['sceneMap'];
        if (!sceneMap) {
          whiteboard.state.room?.setGlobalState({
            sceneMap: {
              [`${props.item.path}`]: `${name}`
            }
          })
        } else {
          const blob = new Blob([JSON.stringify(globalState)])
          const globalStateLength = Object.keys(globalState).length
          const sceneMapLength = Object.keys(sceneMap).length
          // WARN: Please do not use too large size with room.setGlobalState api especially in production environment.
          // 警告: 请不要给room.setGlobalState传递过大的参数，以免造成网络问题
          if (
            globalStateLength <= 30 
            && sceneMapLength <= 30
            && blob.size <= (1000 * 50)) {
            whiteboard.state.room?.setGlobalState({sceneMap: {
              ...sceneMap,
              [`${props.item.path}`]: `${name}`
            }})
          } else {
            globalStore.showToast({
              type: 'whiteboard',
              message: t("whiteboard.global_state_limit")
            })
          }
        }
      }
    },
    debounceDelay,
    [name]
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel()
    }
  }, [cancel])

  const onChange = (evt: any) => {
    setName(evt.target.value)
  }

  return (
    <>
    <div className={`item ${props.activeClass} relative`}>
      <Icon className="icon-delete" onClick={() => {
        const room = whiteboard.state.room
        if (room) {
          room.removeScenes(props.item.path)
          const roomGlobalState = room.state.globalState as any;
          const sceneMap = roomGlobalState['sceneMap'];
          const newSceneMap = omit(sceneMap, [`${props.item.path}`])
          console.log("currentGlobalState", newSceneMap)
          room.setGlobalState({
            sceneMap: newSceneMap
          })
        }
      }}></Icon>
      <div className={`cover-item ${props.coverType}`}
        onClick={() => {
          props.handleClick(props.item.rootPath);
        }}
      ></div>
      <span>
        <Input className="title"
          onChange={onChange}
          defaultValue={props.item.file.name}
        />
      </span>
    </div>
  </>
  )
}

export const ResourcesMenu: React.FC<ResourceMenuProps> = (
  {
    onClose,
    items,
    active,
    onClick
  }
) => {
  return (
    <div className="resource-menu-container">
      <div className="menu-header">
      <div className="menu-title">{t('doc_center')}</div>
        <div className="menu-close" onClick={onClose}></div>
      </div>
      <div className="menu-body">
        <div className="menu-items">
          {items.map((item: any, key: number) => (
            <ResourceItem
              activeClass={active === key ? 'active' : ''}
              coverType={item.file.type.match(/ppt/) ? 'ppt-cover' : 'doc-cover'}
              item={item}
              key={key}
              handleClick={onClick}
            ></ResourceItem>
          ))}
        </div>
      </div>
    </div>
  )
}