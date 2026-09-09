import { api } from '@/lib/api'

export type AvatarStyle = 'cartoon' | 'illustrated' | 'anime' | 'professional' | 'pixel' | 'watercolor'

export interface GenerateAvatarParams {
  style:        AvatarStyle
  prompt?:      string
  photoBase64?: string | null   // base64 da foto de referência (sem prefixo data:...)
}

export interface GenerateAvatarResponse {
  images: string[]   // array de strings base64 (PNG)
}

export interface SaveAvatarResponse {
  photoUrl: string
}

/** Gera 4 variações de avatar via Pollinations.ai (FLUX) */
export async function generateAvatar(params: GenerateAvatarParams): Promise<GenerateAvatarResponse> {
  return api.post<GenerateAvatarResponse>('/avatar/generate', params)
}

/** Salva o avatar escolhido como photo_url do usuário */
export async function saveAvatar(imageBase64: string): Promise<SaveAvatarResponse> {
  return api.post<SaveAvatarResponse>('/avatar/save', { imageBase64 })
}
