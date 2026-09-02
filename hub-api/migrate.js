/**
 * Migração: adiciona birth_date e hire_date em users, cria tabela kudos.
 * Execute UMA vez: node hub-api/migrate.js
 */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })
const pool = require('./src/db/pool')

async function run() {
  const conn = await pool.getConnection()
  try {
    console.log('▶ Adicionando birth_date e hire_date em users...')
    await conn.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS birth_date DATE NULL,
        ADD COLUMN IF NOT EXISTS hire_date  DATE NULL
    `)
    console.log('✓ Colunas adicionadas (ou já existiam).')

    console.log('▶ Criando tabela kudos...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS kudos (
        id           VARCHAR(36)  PRIMARY KEY,
        from_user_id VARCHAR(128) NOT NULL,
        to_user_id   VARCHAR(128) NOT NULL,
        message      VARCHAR(300) NOT NULL,
        is_anonymous TINYINT(1)   NOT NULL DEFAULT 0,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_to_user    (to_user_id),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('✓ Tabela kudos criada (ou já existia).')

    console.log('▶ Adicionando is_anonymous em kudos (caso a tabela já existisse)...')
    await conn.query(`
      ALTER TABLE kudos
        ADD COLUMN IF NOT EXISTS is_anonymous TINYINT(1) NOT NULL DEFAULT 0
    `)
    console.log('✓ Coluna is_anonymous adicionada (ou já existia).')

    console.log('▶ Adicionando status em users...')
    await conn.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS status VARCHAR(80) NULL
    `)
    console.log('✓ Coluna status adicionada (ou já existia).')

    console.log('▶ Criando tabelas de enquetes (polls, poll_options, poll_votes)...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS polls (
        id         VARCHAR(36)  PRIMARY KEY,
        question   VARCHAR(200) NOT NULL,
        created_by VARCHAR(128) NOT NULL,
        is_active  TINYINT(1)   NOT NULL DEFAULT 1,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        closes_at  TIMESTAMP    NULL,
        INDEX idx_active (is_active, closes_at)
      )
    `)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS poll_options (
        id            VARCHAR(36)  PRIMARY KEY,
        poll_id       VARCHAR(36)  NOT NULL,
        text          VARCHAR(200) NOT NULL,
        display_order TINYINT      NOT NULL DEFAULT 0,
        INDEX idx_poll (poll_id),
        FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
      )
    `)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS poll_votes (
        poll_id   VARCHAR(36)  NOT NULL,
        user_id   VARCHAR(128) NOT NULL,
        option_id VARCHAR(36)  NOT NULL,
        voted_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (poll_id, user_id),
        INDEX idx_option (option_id),
        FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE
      )
    `)
    console.log('✓ Tabelas de enquetes criadas (ou já existiam).')

    console.log('▶ Criando tabela birthday_wishes...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS birthday_wishes (
        id           VARCHAR(36)  PRIMARY KEY,
        from_user_id VARCHAR(128) NOT NULL,
        to_user_id   VARCHAR(128) NOT NULL,
        message      VARCHAR(300) NOT NULL,
        created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_to_user    (to_user_id),
        INDEX idx_created_at (created_at)
      )
    `)
    console.log('✓ Tabela birthday_wishes criada (ou já existia).')

    console.log('▶ Criando tabela board_posts (Mural da Equipe)...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS board_posts (
        id         VARCHAR(36)  PRIMARY KEY,
        user_id    VARCHAR(128) NOT NULL,
        message    VARCHAR(500) NOT NULL,
        pinned     TINYINT(1)   NOT NULL DEFAULT 0,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_created_at (created_at),
        INDEX idx_pinned     (pinned)
      )
    `)
    console.log('✓ Tabela board_posts criada (ou já existia).')

    console.log('▶ Criando tabelas de Quiz do Dia...')
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_questions (
        id         INT          AUTO_INCREMENT PRIMARY KEY,
        question   VARCHAR(300) NOT NULL,
        option_a   VARCHAR(200) NOT NULL,
        option_b   VARCHAR(200) NOT NULL,
        option_c   VARCHAR(200) NOT NULL,
        option_d   VARCHAR(200) NOT NULL,
        correct    CHAR(1)      NOT NULL,
        category   VARCHAR(50)  NOT NULL DEFAULT 'geral',
        difficulty VARCHAR(10)  NOT NULL DEFAULT 'facil',
        active     TINYINT(1)   NOT NULL DEFAULT 1,
        created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id          INT          AUTO_INCREMENT PRIMARY KEY,
        user_id     VARCHAR(128) NOT NULL,
        played_date DATE         NOT NULL,
        score       INT          NOT NULL DEFAULT 0,
        answers     TEXT         NOT NULL,
        created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_date (user_id, played_date),
        INDEX idx_played_date (played_date)
      )
    `)
    console.log('✓ Tabelas quiz_questions e quiz_attempts criadas (ou já existiam).')

    // Seed de perguntas — só insere se a tabela estiver vazia
    const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM quiz_questions')
    if (total === 0) {
      console.log('▶ Inserindo perguntas iniciais do quiz...')
      const questions = [
        ['Quantos bits tem 1 byte?', '4', '8', '16', '32', 'b', 'tech', 'facil'],
        ['O que significa a sigla CEO?', 'Chief Executive Officer', 'Chief Engineering Officer', 'Chief Economic Officer', 'Company Executive Owner', 'a', 'geral', 'facil'],
        ['Em que ano foi criada a ARPANET, precursora da internet?', '1959', '1969', '1979', '1989', 'b', 'tech', 'medio'],
        ['Qual linguagem de programação é mais usada para desenvolvimento web front-end?', 'Python', 'Java', 'JavaScript', 'C++', 'c', 'tech', 'facil'],
        ['O que é latência em redes?', 'Velocidade máxima de download', 'Atraso na transmissão de dados', 'Largura de banda disponível', 'Frequência do sinal wi-fi', 'b', 'tech', 'facil'],
        ['Quantos estados tem o Brasil (incluindo o DF)?', '24', '25', '26', '27', 'd', 'brasil', 'facil'],
        ['O que significa SaaS?', 'Software as a Service', 'Security as a Service', 'System as a Server', 'Software and Solutions', 'a', 'tech', 'facil'],
        ['Qual é o maior oceano do mundo?', 'Atlântico', 'Índico', 'Ártico', 'Pacífico', 'd', 'geral', 'facil'],
        ['O que é VoIP?', 'Video over Internet Protocol', 'Voice over Internet Protocol', 'Virtual over IP', 'Volume over IP', 'b', 'tech', 'facil'],
        ['Em que país foi fundada a Nokia?', 'Suécia', 'Noruega', 'Finlândia', 'Dinamarca', 'c', 'tech', 'medio'],
        ['O que significa API?', 'Application Program Interface', 'Advanced Protocol Interface', 'Application Programming Interface', 'Automated Process Integration', 'c', 'tech', 'facil'],
        ['Qual é o maior país do mundo em extensão territorial?', 'China', 'Estados Unidos', 'Canadá', 'Rússia', 'd', 'geral', 'facil'],
        ['Qual é o navegador mais usado no mundo?', 'Firefox', 'Safari', 'Edge', 'Chrome', 'd', 'tech', 'facil'],
        ['O que significa TI?', 'Tecnologia de Informação', 'Tecnologia Industrial', 'Tele Informação', 'Transmissão de Informação', 'a', 'tech', 'facil'],
        ['Qual é a moeda do Japão?', 'Yuan', 'Won', 'Iene', 'Ringgit', 'c', 'geral', 'facil'],
        ['O protocolo HTTPS usa qual porta padrão?', '80', '443', '8080', '8443', 'b', 'tech', 'medio'],
        ['O que é um firewall?', 'Software de backup', 'Sistema de proteção de rede', 'Banco de dados distribuído', 'Servidor web dedicado', 'b', 'tech', 'facil'],
        ['Em que ano o Brasil conquistou sua primeira Copa do Mundo?', '1950', '1958', '1962', '1970', 'b', 'brasil', 'medio'],
        ['O que significa DNS?', 'Domain Name Server', 'Domain Network System', 'Dynamic Name Service', 'Domain Name System', 'd', 'tech', 'medio'],
        ['Qual é a linguagem de programação criada pela Microsoft?', 'Java', 'Python', 'C#', 'Swift', 'c', 'tech', 'facil'],
        ['Quantos continentes tem o mundo?', '5', '6', '7', '8', 'c', 'geral', 'facil'],
        ['O que é bandwidth (largura de banda)?', 'Velocidade de processamento', 'Capacidade de transmissão de dados', 'Tempo de resposta do servidor', 'Tamanho de um pacote de dados', 'b', 'tech', 'facil'],
        ['Qual é o sistema operacional da Apple para computadores?', 'iOS', 'macOS', 'watchOS', 'tvOS', 'b', 'tech', 'facil'],
        ['Quantas horas tem uma semana?', '148', '162', '168', '172', 'c', 'geral', 'facil'],
        ['Qual planeta é conhecido como "planeta vermelho"?', 'Vênus', 'Júpiter', 'Marte', 'Saturno', 'c', 'geral', 'facil'],
        ['O que é cloud computing?', 'Processamento local de dados', 'Computação em nuvem via internet', 'Rede privada corporativa', 'Banco de dados relacional', 'b', 'tech', 'facil'],
        ['Qual é a velocidade da luz em km/s?', '150.000', '200.000', '250.000', '300.000', 'd', 'geral', 'medio'],
        ['O que é um servidor proxy?', 'Um banco de dados central', 'Um intermediário entre cliente e servidor', 'Um tipo de firewall de hardware', 'Um protocolo de segurança', 'b', 'tech', 'medio'],
        ['Qual é a capital da Austrália?', 'Sydney', 'Melbourne', 'Canberra', 'Brisbane', 'c', 'geral', 'medio'],
        ['Quantos bytes tem 1 kilobyte (KB)?', '512', '1.000', '1.024', '2.048', 'c', 'tech', 'medio'],
        ['O protocolo HTTP opera em qual camada do modelo OSI?', 'Física', 'Rede', 'Transporte', 'Aplicação', 'd', 'tech', 'dificil'],
        ['O que é um endereço MAC?', 'Endereço lógico da rede', 'Identificador único do hardware de rede', 'Protocolo de segurança Wi-Fi', 'Tipo de endereço IP', 'b', 'tech', 'medio'],
        ['Quem criou o sistema operacional Linux?', 'Bill Gates', 'Steve Jobs', 'Linus Torvalds', 'Dennis Ritchie', 'c', 'tech', 'medio'],
        ['O que é uma VPN?', 'Virtual Private Network', 'Video Processing Node', 'Virtual Public Network', 'Verified Protocol Node', 'a', 'tech', 'facil'],
        ['Qual é o elemento mais abundante na crosta terrestre?', 'Ferro', 'Silício', 'Oxigênio', 'Alumínio', 'c', 'geral', 'medio'],
      ]

      for (const [question, option_a, option_b, option_c, option_d, correct, category, difficulty] of questions) {
        await conn.query(
          `INSERT IGNORE INTO quiz_questions
            (question, option_a, option_b, option_c, option_d, correct, category, difficulty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [question, option_a, option_b, option_c, option_d, correct, category, difficulty]
        )
      }
      console.log(`✓ ${questions.length} perguntas inseridas.`)
    } else {
      console.log(`✓ Banco de perguntas já populado (${total} perguntas). Seed ignorado.`)
    }

    console.log('\n✅ Migração concluída com sucesso.')
  } catch (err) {
    console.error('❌ Erro na migração:', err.message)
    process.exit(1)
  } finally {
    conn.release()
    process.exit(0)
  }
}

run()
