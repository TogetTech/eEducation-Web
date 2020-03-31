import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Theme, FormControl } from '@material-ui/core';
import {makeStyles} from '@material-ui/core/styles';
import Button from '../components/custom-button';
import Icon from '../components/icon';
import FormInput from '../components/form-input';
import LangSelect from '../components/lang-select';
import { isElectron } from '../utils/platform';
import { usePlatform } from '../containers/platform-container';
import {useHistory, useParams, Redirect} from 'react-router-dom';
import { roomStore } from '../stores/room';
import { genUUID } from '../utils/api';
import { globalStore, roomTypes } from '../stores/global';
import { t } from '../i18n';
import GlobalStorage from '../utils/custom-storage';
import {useAsync} from 'react-use';
import {get, isEmpty} from 'lodash';
import moment from 'moment';
import './entry-home.scss';
import { eduApi } from '../services/edu-api';
import Log from '../utils/LogUploader';

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
  document.title = t(`home.short_title.title`)
  const classes = useStyles();
  const history = useHistory();

  const handleSetting = (evt: any) => {
    history.push({pathname: `/device_test`});
  }

  const [lock, setLock] = useState<boolean>(false);

  const handleUpload = (evt: any) => {
    setLock(true)
    Log.doUpload().then((resultCode: any) => {
      globalStore.showDialog({
        type: 'uploadLog',
        message: t('toast.show_log_id', {reason: `${resultCode}`})
      });
    }).finally(() => {
      setLock(false)
    })
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
    
    const path = roomTypes[roomType].path;

    ref.current = true;
    globalStore.showLoading();
    roomStore.LoginToRoom({
      roomId,
      userName: session.yourName,
      password: session.password,
      role,
      uuid: genUUID(),
    }).then(() => {
      history.push(`/classroom/${path}`);
    }).catch((err: any) => {
      if (err.hasOwnProperty('api_error')) return
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
            <div className="flex-row">
              <Icon className={lock ? "icon-loading" : "icon-upload"} onClick={handleUpload}></Icon>
              <Icon className="icon-setting" onClick={handleSetting}/>
            </div>
            <LangSelect
            value={GlobalStorage.getLanguage().language.match(/^zh/) ? 0 : 1 }
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
            ]}></LangSelect>
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

  const {roomId, role} = params;

  const roles: any = {
    'teacher': 1,
    'student': 2
  }

  const currentRole = roles[role as string];

  const {value, loading}: any = useAsync(async () => {
    const res = await eduApi.roomInfo(roomId);
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

  if (!roomId || !currentRole) {
    return <Redirect to="/404"></Redirect>
  }

  return (
    <HomePageComp {...state} roomId={roomId} ></HomePageComp>
  )
}

export default React.memo(EntryHomeContainer);