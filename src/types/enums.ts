// App type: hosted internally or externally
export type AppType = 'internal' | 'external'

// App visibility status
export type AppStatus = 'active' | 'maintenance' | 'novo'

// Access request lifecycle — terminal states cannot be re-opened
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected'

// Period selector used in audit log filtering
export type AuditPeriod = 'all' | 'today' | 'last7days' | 'last30days'

// Announcement display type
export type NoticeType = 'info' | 'warning' | 'success' | 'alert' | 'danger'

// Tipo de aviso (hub-api)
export type AnnouncementType = 'info' | 'warning' | 'urgent' | 'success'
