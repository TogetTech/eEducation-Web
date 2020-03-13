import {globalStore} from '../stores/global'

export function setIntlError (payload: any) {
  if (payload) {
    localStorage.setItem('i18n-error', JSON.stringify(payload))
  }
}

function _getIntlError (error: string) {
  const locale = globalStore.getLanguage().match(/^zh/) ? 'zh-cn' : 'en-us';
  try {
    const rawData: any = localStorage.getItem('i18n-error')
    const json = JSON.parse(rawData)
    return json[locale][error]
  } catch(err) {
    return null
  }
}

export function getIntlError (errorCode: string) {
  const res = _getIntlError(errorCode)
  // TODO: return errorCode when error message not reached 
  // TODO: 处理错误码
  if (!res) {
    return errorCode
  }
  return res;
}