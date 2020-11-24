import React from 'react'
import { useExtensionStore } from "@/hooks"
import { observer } from 'mobx-react'
import {CustomIcon} from '@/components/icon'

export const ApplyUserList = observer(() => {
  const extensionStore = useExtensionStore()

  return (
    <div className="hand_tools">
      <CustomIcon className={"active_hands_up"} />
      {extensionStore.applyUsers.length}/{extensionStore.applyUsers.length}
      <div className="apply-user-list">
        {extensionStore.applyUsers.map((user) => (
          <div className="user-item" onClick={async (evt: any) => {
            await extensionStore.acceptApply(user.userUuid, user.streamUuid)
          }}>{user.userName}</div>
        ))}
      </div>
    </div>
  )
})