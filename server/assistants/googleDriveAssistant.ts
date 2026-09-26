import { executeSwytchcodeMethod } from '../swytchcode.js';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  size?: string;
}

/**
 * Google Drive AI Assistant powered by Swytchcode Governance
 * Handles searching drive files, reading RFC documents, and organizing architecture artifacts.
 */
export class GoogleDriveAssistant {
  public static readonly CANONICAL_TOOLS = {
    LIST_FILES: 'drive.file.list',
    GET_FILE: 'google_drive.files.get',
    CREATE_FILE: 'google_drive.files.create',
  };

  /**
   * Search and list files in Google Drive matching a query or folder
   */
  async listFiles(query?: string, pageSize: number = 10): Promise<{
    success: boolean;
    files: DriveFileItem[];
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GoogleDriveAssistant.CANONICAL_TOOLS.LIST_FILES, {
      params: { q: query, pageSize },
    });

    if (!res.success) {
      return { success: false, files: [], error: res.error };
    }

    const rawFiles = res.data?.files || res.data?.items || res.data?.data?.files || (Array.isArray(res.data) ? res.data : []);
    const files = Array.isArray(rawFiles)
      ? rawFiles.map((f: any) => ({
          id: f.id,
          name: f.name || f.title || 'Untitled Document',
          mimeType: f.mimeType || 'application/vnd.google-apps.document',
          webViewLink: f.webViewLink || f.alternateLink || `https://drive.google.com/file/d/${f.id}/view`,
          createdTime: f.createdTime || f.createdDate,
          modifiedTime: f.modifiedTime || f.modifiedDate,
          size: f.size || f.fileSize,
        }))
      : [];

    return { success: true, files };
  }

  /**
   * Retrieve file metadata and content from Google Drive
   */
  async getFile(fileId: string): Promise<{
    success: boolean;
    file: DriveFileItem | null;
    content?: string;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(GoogleDriveAssistant.CANONICAL_TOOLS.GET_FILE, {
      params: { fileId },
    });

    if (!res.success) {
      return { success: false, file: null, error: res.error };
    }

    return {
      success: true,
      file: {
        id: res.data?.id || fileId,
        name: res.data?.name || 'Architecture Document',
        mimeType: res.data?.mimeType || 'application/pdf',
        webViewLink: res.data?.webViewLink,
      },
      content: res.data?.content || res.data?.description,
    };
  }
}

export const googleDriveAssistant = new GoogleDriveAssistant();
