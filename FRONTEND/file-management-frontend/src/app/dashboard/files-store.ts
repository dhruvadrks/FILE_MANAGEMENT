import { Injectable } from '@angular/core';

export interface File {
  file_id: number;
  file_name: string;
  file_size: number;
  updated_at: string;
  is_favorite: boolean;
  is_indexed: boolean;
  file_type: string
}

@Injectable({ providedIn: 'root' })
export class FilesStore {
  files: File[] = [];
  loaded = false;
}