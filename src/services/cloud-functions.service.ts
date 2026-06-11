// ADR-0001-D7: All JWT/token generation is EXCLUSIVELY server-side (Cloud Functions).
// This file contains ONLY typed httpsCallable wrappers — no logic, no token signing.

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/firebase'

interface AppLaunchTokenRequest {
  appId: string
  targetUrl: string
}

interface AppLaunchTokenResponse {
  token: string
  expiresAt: string // ISO UTC
}

interface UpdateUserPermissionsRequest {
  uid: string
  permissions: string[]
}

interface UpdateUserPermissionsResponse {
  success: boolean
}

interface ApproveAccessRequestRequest {
  requestId: string
}

interface ApproveAccessRequestResponse {
  success: boolean
}

interface RejectAccessRequestRequest {
  requestId: string
  reason?: string
}

interface RejectAccessRequestResponse {
  success: boolean
}

export const requestAppLaunchToken = httpsCallable<AppLaunchTokenRequest, AppLaunchTokenResponse>(
  functions,
  'generateAppLaunchToken'
)

export const updateUserPermissions = httpsCallable<
  UpdateUserPermissionsRequest,
  UpdateUserPermissionsResponse
>(functions, 'updateUserPermissions')

export const approveAccessRequest = httpsCallable<
  ApproveAccessRequestRequest,
  ApproveAccessRequestResponse
>(functions, 'approveAccessRequest')

export const rejectAccessRequest = httpsCallable<
  RejectAccessRequestRequest,
  RejectAccessRequestResponse
>(functions, 'rejectAccessRequest')
