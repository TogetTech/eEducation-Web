import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Theme, FormControl } from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import Button from '../components/custom-button';
import RoleRadio from '../components/role-radio';
import Icon from '../components/icon';
import FormInput from '../components/form-input';
import FormSelect from '../components/form-select';
import LangSelect from '../components/lang-select';
import { isElectron } from '../utils/platform';
import { usePlatform } from '../containers/platform-container';
import {useHistory, useParams, Redirect} from 'react-router-dom';
import { roomStore } from '../stores/room';
import { genUid, genUUID } from '../utils/helper';
import MD5 from 'js-md5';
import { globalStore, roomTypes } from '../stores/global';
import { t } from '../utils/i18n';
import GlobalStorage from '../utils/custom-storage';
import {useAsync} from 'react-use';
import { AgoraFetch } from '../utils/fetch';
import {get, isEmpty} from 'lodash';
import moment from 'moment';
import './entry-home.scss';
import { agoraOpenEduApi } from '../services/agora-openedu-api';

const useStyles = makeStyles ((theme: Theme) => ({
  formControl: {
    minWidth: '240px',
    maxWidth: '240px',
  }
}));

type SessionInfo = {
  yourName: string
  password: string
}

const defaultState: SessionInfo = {
  yourName: '',
  password: ''
}

interface HomePageProps {
  roomId: string
  title: string
  type: number
  startTime: number
  endTime: number
  role: number
}

function HomePage({type: roomType, roomId, title, startTime, endTime, role}: HomePageProps) {
  const classes = useStyles();

  const history = useHistory();

  const handleSetting = (evt: any) => {
    history.push({pathname: `/device_test`});
  }

  const {
    HomeBtn
  } = usePlatform();

  const ref = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      ref.current = true;
    }
  }, []);

  const [session, setSessionInfo] = useState<SessionInfo>(defaultState);

  const [required, setRequired] = useState<any>({} as any);

  const handleSubmit = async () => {

    if (!session.yourName) {
      setRequired({...required, yourName: t('home.missing_your_name')});
      return;
    }

    if (!session.password) {
      setRequired({...required, password: t('home.missing_password')});
      return;
    }

    if (session.yourName.length > 20) {
      setRequired({
        ...required,
        yourName: t('home.name_too_long')
      });
      return;
    }

    const resp: any = await agoraOpenEduApi.entry({
      roomId,
      userName: session.yourName,
      password: session.password,
      role,
      uuid: genUUID(),
    });

    if (resp.code !== 0) {
      globalStore.showToast({
        type: 'loginFailure',
        message: t('toast.api_login_failured', {reason: resp.msg}),
      })
      return;
    }

    const {room, user} = resp.data;

    const userRole = user.role === 1 ? 'teacher' : 'student';
    const payload = {
      uid: `${user.uid}`,
      rid: room.channelName,
      role: userRole,
      roomName: room.roomName,
      roomType: room.type,
      video: 1,
      audio: 1,
      chat: 1,
      account: session.yourName,
      rtmToken: user.rtmToken,
      rtcToken: user.rtcToken,
      boardId: room.boardId,
      linkId: 0,
      sharedId: user.screenId,
      lockBoard: 0,
      homePage: `/entry/${roomId}/${userRole}`
    }
    
    const path = roomTypes[payload.roomType].path;

    ref.current = true;
    globalStore.showLoading();
    // console.log("loginAndJoin", payload);
    roomStore.loginAndJoin(payload).then(() => {
      roomStore.updateSessionInfo(payload);
      history.push(`/classroom/${path}`);
    }).catch((err: any) => {
      if (err.reason) {
        globalStore.showToast({
          type: 'rtmClient',
          message: t('toast.rtm_login_failed_reason', {reason: err.reason}),
        })
      } else {
        globalStore.showToast({
          type: 'rtmClient',
          message: t('toast.rtm_login_failed'),
        })
      }
      console.warn(err);
    })
    .finally(() => {
        ref.current = false;
        globalStore.stopLoading();
    })
  }

  const roomTitle = useMemo(() => {
    let result = title;
    if (roomType !== undefined) {
      result = `${result} (${t(roomTypes[roomType].text)})`
    }
    return result;
  }, [title, roomType]);

  const dates = useMemo(() => {
    return `${moment(startTime).format('YYYY-MM-DD HH:mm:ss')} ~ ${moment(endTime).format('YYYY-MM-DD HH:mm:ss')}`
  }, [startTime, endTime]);

  return (
    <div className={`flex-container ${isElectron ? 'draggable' : 'home-cover-web' } entry-home`}>
      {isElectron ? null : 
      <div className="web-menu">
        <div className="web-menu-container">
          <div className="short-title">
            <span className="title">{t('home.short_title.title')}</span>
            <span className="subtitle">{t('home.short_title.subtitle')}</span>
            <span className="build-version">{t("build_version")}</span>
          </div>
          <div className="setting-container">
            <Icon className="icon-setting" onClick={handleSetting}/>
            {/* <LangSelect
            value={GlobalStorage.getLanguage().language !== 'zh-CN' ? 1 : 0}
            onChange={(evt: any) => {
              const value = evt.target.value;
              if (value === 0) {
                globalStore.setLanguage('zh-CN');
              } else {
                globalStore.setLanguage('en');
              }
            }}
            items={[
              {text: '中文', name: 'zh-CN'},
              {text: 'En', name: 'en'}
            ]}></LangSelect> */}
          </div>
        </div>
      </div>
      }
      <div className="custom-card">
        <div className="flex-item cover">
          {isElectron ? 
          <>
          <div className={`short-title ${globalStore.state.language}`}>
            <span className="title">{t('home.short_title.title')}</span>
            <span className="subtitle">{t('home.short_title.subtitle')}</span>
          </div>
          <div className={`cover-placeholder ${t('home.cover_class')}`}></div>
          <div className='build-version'>{t("build_version")}</div>
          </>
          : <div className={`cover-placeholder-web ${t('home.cover_class')}`}></div>
          }
        </div>
        <div className="flex-item card">
          <div className="position-top card-menu">
            <HomeBtn handleSetting={handleSetting}/>
          </div>
          <div className="position-content flex-direction-column">
            <div className="room-summary">
              <span>
                <h2 className="main-title">{t('home.entry-home')}</h2>
              </span>
              <div className="subtitle-md">
                {roomTitle}
              </div>
              <span className="subtitle">
                {dates}
              </span>
            </div>
            <FormControl className={classes.formControl}>
              <FormInput Label={t('home.account')} value={session.yourName} onChange={
                (val: string) => {
                  setSessionInfo({
                    ...session,
                    yourName: val
                  });
                  if (val.length > 20) {
                    setRequired({
                      ...required,
                      yourName: t('home.name_too_long')
                    })
                  } else if (required.yourName) {
                    setRequired({
                      ...required,
                      yourName: ''
                    })
                  }
                }}
                requiredText={required.yourName}
              />
            </FormControl>
            <FormControl className={classes.formControl}>
              <FormInput pattern={/^[a-zA-Z0-9]*/} Label={t('home.password')} value={session.password} onChange={
                (val: string) => {
                  setSessionInfo({
                    ...session,
                    password: val
                  });
                }}
                requiredText={required.password}
              />
            </FormControl>
            <Button name={t('home.room_join')} onClick={handleSubmit}/>
          </div>
        </div>
      </div>
    </div>
  )
}

const HomePageComp = React.memo(HomePage);

const EntryHomeContainer = () => {
  const params: any = useParams();

  const {id, role} = params;

  const roles: any = {
    'teacher': 1,
    'student': 2
  }

  const currentRole = roles[role as string];

  const {value, loading}: any = useAsync(async () => {
    const res = await agoraOpenEduApi.roomInfo(id);
    return res;
  }, []);

  const state: HomePageProps | any = useMemo(() => { 
    if (value) {
      return {
        roomId: get(value, 'data.roomId'),
        title: get(value, 'data.roomName'),
        type: get(value, 'data.type'),
        startTime: get(value, 'data.startTime'),
        endTime: get(value, 'data.endTime'),
        role: currentRole,
      }
    }
    return {};
  }, [value]);

  if (loading || isEmpty(state)) {
    globalStore.showLoading();
  } else {
    globalStore.stopLoading();
  }

  if (!id || !currentRole) {
    return <Redirect to="/404"></Redirect>
  }

  return (
    <HomePageComp {...state}></HomePageComp>
  )
}

export default React.memo(EntryHomeContainer);