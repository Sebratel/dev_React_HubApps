const {
  categoryToType,
  typeToCategory,
  legacyToHubStatus,
  hubToLegacyStatus,
  mapSuggestionRow,
} = require('../../src/utils/platformSuggestions')

describe('platformSuggestions mapping', () => {
  it('maps legacy status to hub status', () => {
    expect(legacyToHubStatus('open')).toBe('pending')
    expect(legacyToHubStatus('in_progress')).toBe('in_review')
    expect(legacyToHubStatus('done')).toBe('done')
  })

  it('maps hub status to legacy status', () => {
    expect(hubToLegacyStatus('pending')).toBe('open')
    expect(hubToLegacyStatus('in_review')).toBe('in_progress')
    expect(hubToLegacyStatus('done')).toBe('done')
  })

  it('maps category and type both ways', () => {
    expect(typeToCategory('bug')).toBe('Bug')
    expect(categoryToType('Melhoria')).toBe('improvement')
  })

  it('maps platform row to hub API shape', () => {
    const mapped = mapSuggestionRow({
      id: 42,
      app_id: 'app-splitters-sebratel',
      app_name: 'Listagem Splitters',
      user_id: 'uid-1',
      user_name: 'Bruno',
      title: 'Teste',
      body: 'Descrição',
      category: 'Bug',
      legacy_status: 'open',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
      up_count: 1,
      down_count: 0,
      score: 1,
      comment_count: 0,
      my_vote: 1,
      up_voter_names: 'Bruno',
    })

    expect(mapped.id).toBe('42')
    expect(mapped.type).toBe('bug')
    expect(mapped.status).toBe('pending')
    expect(mapped.app_name).toBe('Listagem Splitters')
  })
})
