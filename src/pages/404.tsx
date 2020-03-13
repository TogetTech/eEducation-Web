import React from 'react';

import './404.scss';
const url = process.env.REACT_APP_AGORA_EDU_MAIN_LINK as string

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
        <a href={`${url}`}>进入主页</a>
      </div>
    </BasicLayout>
  )
}
