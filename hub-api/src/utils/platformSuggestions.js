const TYPE_TO_CATEGORY = {
  feature:     'Funcionalidade',
  improvement: 'Melhoria',
  bug:         'Bug',
  other:       'Outro',
}

const CATEGORY_TO_TYPE = {
  Funcionalidade:        'feature',
  'Nova funcionalidade': 'feature',
  Melhoria:              'improvement',
  Bug:                   'bug',
  'Bug / problema':      'bug',
  Outro:                 'other',
}

const HUB_TO_LEGACY_STATUS = {
  pending:   'open',
  in_review: 'in_progress',
  done:      'done',
  rejected:  'rejected',
}

const LEGACY_TO_HUB_STATUS = {
  open:        'pending',
  planned:     'in_review',
  in_progress: 'in_review',
  done:        'done',
  rejected:    'rejected',
}

function categoryToType(category) {
  if (!category) return 'other'
  return CATEGORY_TO_TYPE[category] || 'other'
}

function typeToCategory(type) {
  return TYPE_TO_CATEGORY[type] || TYPE_TO_CATEGORY.other
}

function legacyToHubStatus(status) {
  return LEGACY_TO_HUB_STATUS[status] || 'pending'
}

function hubToLegacyStatus(status) {
  return HUB_TO_LEGACY_STATUS[status] || 'open'
}

function voteTypeToValue(voteType) {
  if (voteType === 'like') return 1
  if (voteType === 'dislike') return -1
  return null
}

function valueToVoteType(value) {
  if (value === 1) return 'like'
  if (value === -1) return 'dislike'
  return null
}

/** SELECT enriquecido — 1º placeholder = uid do usuário logado. */
function listQuery(whereClause) {
  return `
    SELECT
      s.id,
      a.id AS app_id,
      s.sector AS app_name,
      s.author_uid AS user_id,
      s.author_name AS user_name,
      s.title,
      s.description AS body,
      s.category,
      s.status AS legacy_status,
      NULL AS admin_note,
      s.created_at,
      s.updated_at,
      COALESCE(s.likes_count, 0) AS up_count,
      COALESCE(s.dislikes_count, 0) AS down_count,
      COALESCE(s.score, 0) AS score,
      COALESCE(s.comments_count, 0) AS comment_count,
      CASE
        WHEN mv.vote_type = 'like' THEN 1
        WHEN mv.vote_type = 'dislike' THEN -1
        ELSE NULL
      END AS my_vote,
      uv.up_voter_names
    FROM platform_suggestions s
    LEFT JOIN apps a ON a.name = s.sector
    LEFT JOIN platform_suggestion_votes mv
      ON mv.suggestion_id = s.id AND mv.user_uid = ?
    LEFT JOIN (
      SELECT suggestion_id,
        GROUP_CONCAT(user_name ORDER BY created_at DESC SEPARATOR '||') AS up_voter_names
      FROM platform_suggestion_votes
      WHERE vote_type = 'like'
      GROUP BY suggestion_id
    ) uv ON uv.suggestion_id = s.id
    ${whereClause}
    ORDER BY s.created_at DESC
  `
}

function mapSuggestionRow(row) {
  if (!row) return row
  return {
    id:            String(row.id),
    app_id:        row.app_id ?? null,
    app_name:      row.app_name ?? null,
    user_id:       row.user_id,
    user_name:     row.user_name,
    title:         row.title,
    body:          row.body,
    type:          categoryToType(row.category),
    status:        legacyToHubStatus(row.legacy_status),
    admin_note:    row.admin_note ?? null,
    created_at:    row.created_at,
    updated_at:    row.updated_at,
    up_count:      row.up_count,
    down_count:    row.down_count,
    score:         row.score,
    comment_count: row.comment_count,
    my_vote:       row.my_vote ?? null,
    up_voter_names: row.up_voter_names ?? null,
  }
}

function mapCommentRow(row) {
  return {
    id:            String(row.id),
    suggestion_id: String(row.suggestion_id),
    user_id:       row.author_uid,
    user_name:     row.author_name,
    body:          row.message,
    created_at:    row.created_at,
  }
}

async function refreshCounts(conn, suggestionId) {
  await conn.query(
    `UPDATE platform_suggestions s SET
       likes_count = (
         SELECT COUNT(*) FROM platform_suggestion_votes v
         WHERE v.suggestion_id = s.id AND v.vote_type = 'like'
       ),
       dislikes_count = (
         SELECT COUNT(*) FROM platform_suggestion_votes v
         WHERE v.suggestion_id = s.id AND v.vote_type = 'dislike'
       ),
       comments_count = (
         SELECT COUNT(*) FROM platform_suggestion_comments c
         WHERE c.suggestion_id = s.id
       ),
       score = (
         SELECT COALESCE(SUM(
           CASE
             WHEN v.vote_type = 'like' THEN 1
             WHEN v.vote_type = 'dislike' THEN -1
             ELSE 0
           END
         ), 0)
         FROM platform_suggestion_votes v
         WHERE v.suggestion_id = s.id
       )
     WHERE s.id = ?`,
    [suggestionId],
  )
}

module.exports = {
  listQuery,
  mapSuggestionRow,
  mapCommentRow,
  typeToCategory,
  categoryToType,
  hubToLegacyStatus,
  legacyToHubStatus,
  valueToVoteType,
  refreshCounts,
  voteTypeToValue,
}
