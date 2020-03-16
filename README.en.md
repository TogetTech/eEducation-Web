# rtm playback integration

rtm playback please refer to replay.tsx
The replay.tsx page routing in the demo is
/ replay /: uuid /: startTime /: endTime /: mediaUrl? senderId =: senderId

Video playback depends on videojs so be sure to introduce

`` `javascript
import "video.js / dist / video-js.css";
`` `

# It is recommended to modify the replay.tsx page, and use the id of the developer's own database design to associate the following fields
   * uuid
   * startTime
   * endTime
   * medialUrl
   * rtm record

# Please discard the getOSSUrl method in replay.tsx, please get startTime (end time), endTime (end time), mediaURL (audio and video recording results), uuid (whiteboard uuid)