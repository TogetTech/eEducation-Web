# rtm回放集成

# 推荐改造replay.tsx页，通过开发者自己数据库设计的id去关联如下字段  
  * uuid
  * startTime
  * endTime
  * medialUrl
  * rtm记录

# 请废弃replay.tsx里的getOSSUrl方法，请从开发者自己实现的业务服务端获取startTime（开始时间）, endTime（结束时间）, mediaURL（音视频录制结果), uuid(白板uuid)

# 注意事项

rtm回放请参考 replay.tsx
demo里replay.tsx页路由为
/replay/:uuid/:startTime/:endTime/:mediaUrl?senderId=:senderId

视频播放依赖videojs 所以请务必引入

```javascript
import "video.js/dist/video-js.css";
```