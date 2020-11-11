import { BizLogger } from "@/utils/biz-logger";
import { EventEmitter } from "events";
import { AgoraRteAudioTrack, AgoraRteEngine,  AgoraRteMediaControl, AgoraRteVideoTrack } from 'rte-electron-sdk';
import { AgoraRteLocalUser } from "rte-electron-sdk/types/api2/agora_rte_local_user";
import { IAgoraRteVideoTrack, IAgoraRteAudioTrack } from "rte-electron-sdk/types/api2/agora_rte_media_control";
import { AgoraRteScene } from "rte-electron-sdk/types/api2/agora_rte_scene";
import { EduClassroomJoinOptions, EduStream, EduUser, EduUserData, IEduClassroomManager } from "../interfaces";


// type PickFunctionArgsType<T> = T extends (...args: infer R) => any ? R : never

export class EduRteClassroomManager extends EventEmitter implements IEduClassroomManager {
    
    rteEngine: AgoraRteEngine

    scene!: AgoraRteScene
    mediaControl!: AgoraRteMediaControl;
    userUuid!: string;

    cameraVideoTrack?: IAgoraRteVideoTrack;
    microphoneAudioTrack?: IAgoraRteAudioTrack;

    constructor() {
        super()
        this.rteEngine = AgoraRteEngine.instance
    }

    async init(payload: any) {
        await this.initialize(payload.initializeParams)
        //@ts-ignore
        window.sceneUuid = payload.sceneUuid
        console.log('init createScene', payload)
        this.createScene(payload.sceneUuid)
        this.createMediaControl()
        this.userUuid = payload.initializeParams.user_id
        this.scene.localUser.on('connectionstatechanged', (evt: any) => {
            BizLogger.info('event connectionstatechanged', JSON.stringify(evt))
        })
        this.scene.localUser.on('remoteuserupdated', (evt: any) => {
            BizLogger.info('event remoteuserupdated', JSON.stringify(evt))
        })
        this.scene.localUser.on('remoteuserjoined', (evt: any) => {
            BizLogger.info('event remoteuserjoined', JSON.stringify(evt))
        })
        this.scene.localUser.on('remoteuserleft', (evt: any) => {
            BizLogger.info('event remoteuserleft', JSON.stringify(evt))
        })
        this.scene.localUser.on('remotestreamupdated', (evt: any) => {
            BizLogger.info('event remotestreamupdated', JSON.stringify(evt))
        })
        this.scene.localUser.on('remotestreamadded', (evt: any) => {
            BizLogger.info('event remotestreamadded', JSON.stringify(evt))
        })
        this.scene.localUser.on('remotestreamremoved', (evt: any) => {
            BizLogger.info('event remotestreamremoved', JSON.stringify(evt))
        })
        this.scene.localUser.on('remoteuserjoined', (evt: any) => {
            BizLogger.info('event remoteuserjoined', JSON.stringify(evt))
        })
        this.scene.localUser.on('scenemessagereceived', (evt: any) => {
            BizLogger.info('event scenemessagereceived', JSON.stringify(evt))
        })
        this.scene.join({client_role: payload.client_role, user_name: payload.user_name})
        console.log('init success', payload)

    }

    async initialize(payload: any): Promise<any> {
        BizLogger.info(`initialize: ${JSON.stringify(payload)}`)
        let res = await this.rteEngine.initialize({
            appid_or_token: payload.appid_or_token,
            user_id: payload.user_id,
            user_name: payload.user_name,
            scene_preset: 0,
            log_file_path: payload.log_file_path,
            log_level: payload.log_level,
            log_file_size: payload.log_file_size
        })
        console.log('initialize')
        return res
    }

    private createScene(sceneUuid: string) {
        BizLogger.info('createScene ', sceneUuid)
        // const scene: any = null
        const scene = this.rteEngine.createAgoraRteScene({
            scene_uuid: sceneUuid
        })
        this.scene = scene
        BizLogger.info('createScene success', scene)
    }

    private createMediaControl() {
        BizLogger.info('mediaControl')
        const mediaControl = this.rteEngine.createAgoraMediaControl()
        BizLogger.info('mediaControl 2', mediaControl)
        this.mediaControl = mediaControl
        BizLogger.info('mediaControl success')
    }

    get userService(): AgoraRteLocalUser {
        return this.scene.localUser
    }

    sendChannelMessage(message: string) {
        return new Promise((resolve, reject) => {
            const onCompleted = (evt: any[]) => {
                BizLogger.info('invoke sendSceneMessageToAllRemoteUsers send completed')
                resolve()
                this.userService.off("sendroommessagetoallremoteuserscompleted", onCompleted)
            }
            this.userService.on("sendroommessagetoallremoteuserscompleted", onCompleted)
            const agoraMessage = this.mediaControl.createMessage()
            agoraMessage.setMessageInfo(message)
            //@ts-ignore
            let ret = this.userService.sendSceneMessageToAllRemoteUsers(agoraMessage.agoraMessage, this.userUuid)

            if (ret && !ret.ok()) {
                BizLogger.error('invoke sendSceneMessageToAllRemoteUsers failure')
                this.userService.off("sendroommessagetoallremoteuserscompleted", onCompleted)
                reject('invoke sendSceneMessageToAllRemoteUsers failure ')
            }
            
        })
    }

    openLocalCamera() {
        if (this.cameraVideoTrack) {
            BizLogger.warn(' cameraTrack already exists!')
            return
        } else {
            const key = Date.now()
            const videoTrack = this.mediaControl.createCameraVideoTrack({streamId: `video${key}`, streamName: `video${key}`} as any)
            this.cameraVideoTrack = videoTrack;
            this.userService.publishLocalCameraVideoTrack({
                track: this.cameraVideoTrack,
                operate_id: this.userUuid
            })
            BizLogger.info('create & published video camera track success')
        }
    }

    openLocalMicrophone() {
        if (this.microphoneAudioTrack) {
            BizLogger.warn(' microphoneAudioTrack already exists!')
            return
        } else {
            const key = Date.now()
            const microphoneAudioTrack = this.mediaControl.createMicrophoneAudioTrack({streamId: `audio${key}`, streamName: `audio${key}`} as any)
            this.microphoneAudioTrack = microphoneAudioTrack;
            this.userService.publishMicrophoneAudioTrack({
                track: this.microphoneAudioTrack,
                operate_id: this.userUuid
            })
            BizLogger.info('create & published audio camera track success')
        }
    }

    closeLocalCamera() {
        if (this.cameraVideoTrack) {
            let res = this.userService.unpublishLocalCameraVideoTrack({
                track: this.cameraVideoTrack,
                operate_id: this.userUuid
            })
            this.cameraVideoTrack = undefined
            BizLogger.warn(' unpublishLocalCameraVideoTrack success!')
            return res
        } else {
            BizLogger.warn(' local camera already closed ')
        }
    }

    closeLocalMicrophone() {
        if (this.microphoneAudioTrack) {
            let res= this.userService.unpublishMicrophoneAudioTrack({
                track: this.microphoneAudioTrack,
                operate_id: this.userUuid
            })
            this.microphoneAudioTrack = undefined
            BizLogger.warn(' unpublishMicrophoneAudioTrack success!')
            return res
        } else {
            BizLogger.warn(' local microphone already closed ')
        }
    }

    getLocalUser(): EduUserData {
        throw new Error("Method not implemented.");
    }
    getStudentCount(): number {
        
        throw new Error("Method not implemented.");
    }
    getTeacherCount(): number {
        throw new Error("Method not implemented.");
    }
    getTeacherList(): EduUser[] {
        throw new Error("Method not implemented.");
    }
    getStudentList(): EduUser[] {
        throw new Error("Method not implemented.");
    }
    getFullUserList(): EduUser[] {
        throw new Error("Method not implemented.");
    }
    getFullStreamList(): EduStream[] {
        throw new Error("Method not implemented.");
    }
    joinClassroomAsTeacher(option: EduClassroomJoinOptions): Promise<void> {
        throw new Error("Method not implemented.");
    }
    joinClassroomAsStudent(option: EduClassroomJoinOptions): Promise<void> {
        throw new Error("Method not implemented.");
    }
    leaveClassroom(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
}