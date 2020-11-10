import { BizLogger } from "@/utils/biz-logger";
import { EventEmitter } from "events";
import { AgoraRteEngine } from 'rte-electron-sdk';
import { AgoraRteLocalUser } from "rte-electron-sdk/types/api2/agora_rte_local_user";
import { AgoraRteScene } from "rte-electron-sdk/types/api2/agora_rte_scene";
import { EduClassroomJoinOptions, EduStream, EduUser, EduUserData, IEduClassroomManager } from "../interfaces";


// type PickFunctionArgsType<T> = T extends (...args: infer R) => any ? R : never

export class EduRteClassroomManager extends EventEmitter implements IEduClassroomManager {
    
    rteEngine: AgoraRteEngine

    scene!: AgoraRteScene

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
        console.log('init createScene after ', payload)

    }

    async initialize(payload: any): Promise<any> {
        BizLogger.info(`initialize: ${JSON.stringify(payload)}`)
        debugger
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
        BizLogger.info('biz- createScene ', sceneUuid)
        // const scene: any = null
        const scene = this.rteEngine.createAgoraRteScene({
            scene_uuid: sceneUuid
        })
        BizLogger.info('biz- createScene 222', sceneUuid, scene)

        BizLogger.info('createScene #createAgoraRteScene 2', scene)

        this.scene = scene
        BizLogger.info('createScene #createAgoraRteScene', scene)

    }

    get userService(): AgoraRteLocalUser {
        return this.scene.getLocalUser()
    }

    openLocalCamera(payload: any) {
        return this.userService.publishLocalCameraVideoTrack(payload)
    }

    openLocalMicrophone(payload: any) {
        return this.userService.publishMicrophoneAudioTrack(payload)
    }

    closeLocalCamera(payload: any) {
        return this.userService.unpublishLocalCameraVideoTrack(payload)
    }

    closeLocalMicrophone(payload: any) {
        return this.userService.unpublishMicrophoneAudioTrack(payload)
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