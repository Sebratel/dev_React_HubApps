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
           CASE WHEN JSON_VALID(details)
             THEN JSON_UNQUOTE(JSON_EXTRACT(details, '$.appName'))
             ELSE TRIM(SUBSTRING_INDEX(details, ': ', -1))
           END AS app_name,
           COUNT(*) AS open_count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND details IS NOT NULL
           AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY app_name
         HAVING app_name IS NOT NULL AND app_name != ''
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
      // Top 10 apps — subquery extrai app_name antes de agrupar para garantir GROUP BY correto.
      // Suporta JSON {"appId","appName"} (novo) e string legada "Abriu: Nome" via SUBSTRING_INDEX.
      pool.query(
        `SELECT app_id, app_name, COUNT(*) AS open_count
         FROM (
           SELECT
             CASE WHEN JSON_VALID(details)
               THEN JSON_UNQUOTE(JSON_EXTRACT(details, '$.appId'))
               ELSE NULL
             END AS app_id,
             CASE WHEN JSON_VALID(details)
               THEN JSON_UNQUOTE(JSON_EXTRACT(details, '$.appName'))
               ELSE TRIM(SUBSTRING_INDEX(details, ': ', -1))
             END AS app_name
           FROM audit_logs
           WHERE action = 'APP_OPEN'
             AND details IS NOT NULL
             AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         ) sub
         WHERE app_name IS NOT NULL AND app_name != ''
         GROUP BY app_id, app_name
         ORDER BY open_count DESC
         LIMIT 10`,
        [days]
      ),
      // Acessos por dia — GROUP BY usa expressão direta (não alias) para compatibilidade MySQL
      pool.query(
        `SELECT
           DATE_FORMAT(created_at, '%Y-%m-%d') AS access_date,
           COUNT(*)                             AS count
         FROM audit_logs
         WHERE action = 'APP_OPEN'
           AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')
         ORDER BY access_date ASC`,
        [days]
      ),
      // Top 5 usuários — JOIN com users para nome atual (audit_log pode ter nome vazio se user sem nome)
      pool.query(
        `SELECT
           al.user_id,
           COALESCE(NULLIF(u.name, ''), NULLIF(al.user_name, ''), al.user_id) AS user_name,
           COUNT(*) AS open_count
         FROM audit_logs al
         LEFT JOIN users u ON u.id = al.user_id
         WHERE al.action = 'APP_OPEN'
           AND al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
         GROUP BY al.user_id
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
        date:  r.access_date,
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
