import React, { useRef } from 'react';
import {t} from '@/i18n';
import { observer } from 'mobx-react';
import { useBoardStore, useExtensionStore } from '@/hooks';
import Popper from '@material-ui/core/Popper';
import Paper from '@material-ui/core/Paper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import './extension-card.scss'

export const ExtensionCard: React.FC<any> = observer(() => {

  const extensionStore = useExtensionStore()

  const bindMiddleGroup = function() {
    extensionStore.showGrouping()
  }

  const bindMiddleHand = function() {
    
  }

  return (
    <div className="extension-card">
      <Paper className="paperCard">
        <MenuList>
          <MenuItem onClick={bindMiddleGroup}>
          <div className="group-item"></div>
          分组
          </MenuItem>
          <MenuItem onClick={bindMiddleHand}>
          <div className="hand-item"></div>
          举手
          </MenuItem>
        </MenuList>
      </Paper>
    </div>
  )
})