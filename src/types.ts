import type {
  Generated,
  Selectable,
  Updateable,
} from 'kysely'

export interface Database {
  videos: VideosTable,
  autodownload: AutoDownloadTable
}

export interface VideosTable {
  uuid: Generated<string>
  id: string
  title: string
  description: string
  thumbnail: string
  source: string
  published: string
  archived: string
  channel: string
  channelId: string
  channelVerified: boolean
  channelAvatar: string
  playlist?: string | null
  disabled: boolean
  hasBeenReported: boolean,
  deletion_stage: 'pending_delete' | 'soft_delete' | 'cold_storage' | 'deleted' | null
}

export type Video = Selectable<VideosTable>

export interface AutoDownloadTable {
  uuid: Generated<string>
  channel: string
  lastCrawled: string
}

export type AutoDownload = Selectable<AutoDownloadTable>
export type UpdateAutoDownload = Updateable<AutoDownloadTable>