// Plugins
import { FilePicker, PickFilesResult } from '@capawesome/capacitor-file-picker';

export interface JsonExportData {
    type: string,
    versionCode: string,
    data: any
}

export async function fileImporter(types: string[]): Promise<PickFilesResult|null >{
    const result = await FilePicker.pickFiles({ types, readData: true }).catch(()=> null);
    return result;
}

/**
 * Import data from image/* file
 * @returns image data : mimeType + data or null
 */
export async function imageImporter(): Promise<{data: string, mimeType: string} | null> {
    const result = await fileImporter(['image/gif', 'image/jpeg', 'image/png']);
    if(result && result.files[0] && result.files[0].data){
        return { data: result.files[0].data, mimeType: result.files[0].mimeType  };
    }
    return null;
}

/**
 * Import data from JSON file
 * @returns string of data or null
 */
export async function jsonImporter(): Promise<string | null>{
    const result = await fileImporter(['application/json']);
    if(result && result.files[0] && result.files[0].data) return window.atob(result.files[0].data);
    return null;
}

