import { EduClassroom, EduStreamData, EduUserData } from "../interfaces";
import { EduUserService } from "../user/edu-user-service";

export interface IEduClassroomManager {
    roomName: string
    roomUuid: string
    localUser: EduUserData
    userService: EduUserService
    async join(): Promise<any>
    async leave(): Promise<any>

    userToken: string
    getLocalStreamData: EduStreamData
    getLocalScreenData: EduStreamData

    getLocalUser: EduUserData
    getFullUserList: EduUser[]
    getFullStreamList: EduStream[]
    getClassroomInfo: EduClassroom
    getStudentCount: number
    getTeacherCount: number
    studentList: EduUser[]
    teacherList: EduUser[]
    getTeacherList: EduUser[]
    getStudentList: EduUser[]
}