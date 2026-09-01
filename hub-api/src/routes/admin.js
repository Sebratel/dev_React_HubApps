const router = require('express').Router()
const pool   = require('../db/pool')
const { requireAuth, requireAdmin } = require('../middleware/auth')

// GET /admin/stats — agrega métricas para o dashboard admin
router.get('/stats', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [
      [profileRows],
      [topAppsRows],
      [[{ count: suggCount }]],
      [[teamsRow]],
      [[annoRow]],
      [[{ count: pendingReqCount }]],
      [[{ count: inactiveUsersCount }]],
    ] = await Promise.all([
      pool.query(
        `SELECT COALESCE(NULLIF(profile,''), 'sem perfil') AS profile, COUNT(*) AS count
         FROM users WHERE is_active = 1
         GROUP BY profile ORDER BY count DESC`
      ),
      pool.query(
        `SELECT
           JSON_UNQUOTE(JSON_EXTRACT(details, '$.appName')) AS app_name,
           COUNT(*) AS open_count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND details IS NOT NULL
           AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY app_name
         HAVING app_name IS NOT NULL
         ORDER BY open_count DESC
         LIMIT 5`
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM platform_suggestions
         WHERE status IN ('open', 'in_progress', 'planned')`,
      ),
      pool.query(
        `SELECT
           SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
           COUNT(*) AS total
         FROM teams`
      ),
      pool.query(
        `SELECT
           SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active,
           COUNT(*) AS total
         FROM announcements`
      ),
      pool.query("SELECT COUNT(*) AS count FROM access_requests WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) AS count FROM users WHERE is_active = 0"),
    ])

    res.json({
      profileDistribution: profileRows.map((r) => ({
        profile:  r.profile,
        count:    Number(r.count),
      })),
      topApps: topAppsRows.map((r) => ({
        appName:   r.app_name,
        openCount: Number(r.open_count),
      })),
      pendingSuggestions:  Number(suggCount),
      pendingRequests:     Number(pendingReqCount),
      inactiveUsers:       Number(inactiveUsersCount),
      teams: {
        active: Number(teamsRow?.active ?? 0),
        total:  Number(teamsRow?.total  ?? 0),
      },
      announcements: {
        active: Number(annoRow?.active ?? 0),
        total:  Number(annoRow?.total  ?? 0),
      },
    })
  } catch (err) {
    next(err)
  }
})

// GET /admin/analytics?period=7d|30d|90d|1y
// Retorna ranking de apps mais acessados, acessos por dia e top usuários.
router.get('/analytics', requireAuth, requireAdmin, async (req, res, next) => {
  const PERIODS = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }
  const period  = PERIODS[req.query.period] ? req.query.period : '30d'
  const days    = PERIODS[period]

  try {
    const [topAppsRows, dailyRows, topUsersRows, [[{ total }]]] = await Promise.all([
      // Top 10 apps por número de acessos no período
      pool.query(
        `SELECT
           JSON_UNQUOTE(JSON_EXTRACT(details, '$.appId'))   AS app_id,
           JSON_UNQUOTE(JSON_EXTRACT(details, '$.appName')) AS app_name,
           COUNT(*) AS open_count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND details IS NOT NULL
           AND JSON_EXTRACT(details, '$.appName') IS NOT NULL
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY app_id, app_name
         ORDER BY open_count DESC
         LIMIT 10`,
        [days]
      ),
      // Acessos por dia (para gráfico de linha)
      pool.query(
        `SELECT
           DATE(created_at) AS date,
           COUNT(*)         AS count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE(created_at)
         ORDER BY date ASC`,
        [days]
      ),
      // Top 5 usuários que mais abriram apps
      pool.query(
        `SELECT
           user_id,
           user_name,
           COUNT(*) AS open_count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY user_id, user_name
         ORDER BY open_count DESC
         LIMIT 5`,
        [days]
      ),
      // Total de acessos no período
      pool.query(
        `SELECT COUNT(*) AS total
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
        [days]
      ),
    ])

    res.json({
      period,
      totalAccesses: Number(total),
      topApps: topAppsRows.map((r) => ({
        appId:     r.app_id     ?? null,
        appName:   r.app_name   ?? '—',
        openCount: Number(r.open_count),
      })),
      dailyAccesses: dailyRows.map((r) => ({
        date:  r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date),
        count: Number(r.count),
      })),
      topUsers: topUsersRows.map((r) => ({
        userId:    r.user_id,
        userName:  r.user_name,
        openCount: Number(r.open_count),
      })),
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
