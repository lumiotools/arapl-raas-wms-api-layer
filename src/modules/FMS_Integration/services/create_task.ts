
import {authenticate} from "./authentication";
import fetch from 'node-fetch';
import { TaskGenerationReq, TaskGenerationRes } from "src/modules/robot-job/dto/Task_Generation.dto";

const CREATE_TASK_URL = 'https://api.araplraas.com/operator/v1/tasks';


export async function createTask(payload: TaskGenerationReq): Promise<TaskGenerationRes> {
    try{
        const Token = await authenticate();
        const response = await fetch(CREATE_TASK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Token}`
            },
            body: JSON.stringify(payload)
        });
        console.log("token: ",Token);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to create task: ${response.status} ${errorText}`);
        }

        return await response.json();
            
    }
    catch (error) {
        console.error('Error during create-task:', error);
        throw new Error('Create task failed');
    }
}