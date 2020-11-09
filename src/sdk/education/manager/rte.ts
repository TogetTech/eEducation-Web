import { EventEmitter } from "events";
import { AgoraRteEngine } from 'rte-electron-sdk';
import { AgoraRteLocalUser } from "rte-electron-sdk/types/api2/agora_rte_local_user";
import { AgoraRteScene } from "rte-electron-sdk/types/api2/agora_rte_scene";
import { EduLogger } from "../core/logger";
import { EduClassroomJoinOptions, EduStream, EduUser, EduUserData, IEduClassroomManager } from "../interfaces";

export class EduRteClassroomManager extends EventEmitter implements IEduClassroomManager {
    
    rteEngine: AgoraRteEngine

    scene!: AgoraRteScene

    constructor() {
        super()
        this.rteEngine = new AgoraRteEngine()
    }

    async init(payload: any): Promise<any> {
        await this.initialize(payload.initializeParams)
        await this.createScene(payload.sceneUuid)
    }

    async initialize(payload: any): Promise<any> {
        EduLogger.info(`initialize: ${JSON.stringify(payload)}`)
        return this.rteEngine.initialize({
            appid_or_token: payload.appId,
            user_id: payload.userId,
            user_name: payload.userName,
            scene_preset: payload.scenePreset,
            log_file_path: payload.log_file_path,
            log_level: payload.log_level,
            log_file_size: payload.log_file_size
        })
    }

    private createScene(sceneUuid: string) {
        const scene = this.rteEngine.createAgoraRteScene({
            scene_uuid: sceneUuid
        })
        this.scene = scene
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