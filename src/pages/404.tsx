import React from 'react';

import './404.scss';

const BasicLayout: React.FC<any> = ({children}) => {
  return (
    <div className="main-layout-container">
      {children}
    </div>
  )
}

export const PageNotFound: React.FC<any> = () => {
  return (
    <BasicLayout>
      <div className="layout-content">
        <h1>404</h1>
        <h2>你似乎进错了页面</h2>
        <a href="https://solutions-edu.sh.agoralab.co/admin">进入主页</a>
      </div>
    </BasicLayout>
  )
}