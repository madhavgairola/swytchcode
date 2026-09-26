import { executeSwytchcodeMethod } from '../swytchcode.js';

export interface BoxFileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  size?: number;
  sha1?: string;
  modifiedAt?: string;
}

/**
 * Box AI Assistant powered by Swytchcode Governance
 * Handles SOC-2 audit compliance packages, legal agreements, zip downloads, and storage policies.
 */
export class BoxAssistant {
  public static readonly CANONICAL_TOOLS = {
    GET_FILE: 'box.files.get',
    LIST_FOLDER: 'box.folder.items.get',
    CREATE_ZIP: 'box.zip_download.create',
    GET_ZIP_STATUS: 'box.zip_download.status.get',
    GET_STORAGE_POLICY: 'box.storage_policy.get',
  };

  /**
   * Retrieve file metadata or legal compliance document by ID
   */
  async getFile(fileId: string): Promise<{
    success: boolean;
    file: BoxFileItem | null;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(BoxAssistant.CANONICAL_TOOLS.GET_FILE, {
      params: { file_id: fileId },
    });

    if (!res.success) {
      return { success: false, file: null, error: res.error };
    }

    return {
      success: true,
      file: {
        id: res.data?.id || fileId,
        name: res.data?.name || 'Compliance Package 2026',
        type: res.data?.type || 'file',
        size: res.data?.size,
        modifiedAt: res.data?.modified_at,
      },
    };
  }

  /**
   * Create a zip download package for multiple compliance audit items
   */
  async createZipDownload(items: Array<{ type: 'file' | 'folder'; id: string }>, downloadFileName: string = 'audit-package.zip'): Promise<{
    success: boolean;
    downloadUrl?: string;
    statusUrl?: string;
    error?: string;
  }> {
    const res = await executeSwytchcodeMethod(BoxAssistant.CANONICAL_TOOLS.CREATE_ZIP, {
      body: {
        download_file_name: downloadFileName,
        items,
      },
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return {
      success: true,
      downloadUrl: res.data?.download_url,
      statusUrl: res.data?.status_url,
    };
  }
}

export const boxAssistant = new BoxAssistant();
