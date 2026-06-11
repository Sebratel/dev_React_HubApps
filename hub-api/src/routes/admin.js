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
      pool.query("SELECT COUNT(*) AS count FROM suggestions WHERE status = 'pending'"),
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
      pendingSuggestions: Number(suggCount),
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

module.exports = router
